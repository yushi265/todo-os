// context-budget guard: 委譲（サブエージェント起動）前のコンテキスト残量判定（純粋関数）
// PreToolUse(Task|Agent) hook から CLI 経由で呼ばれ、会話 transcript（JSONL）の
// 直近 assistant usage から現コンテキスト使用量を推定し、閾値以上なら block を返す。
//
// 背景: worker が委譲サイクル中にコンテキスト/トークン枯渇で死ぬと作業文脈が失われる。
// 委譲の入口で燃料計を見て、残量不足なら「チェックポイント確定 → compact → 再開」へ誘導する。
//
// 安全設計:
// - fail-open: usage が読めない・config 不正・空入力はすべて allow（誤 block でフローを
//   止める事故を構造的に防ぐ。検知漏れ側は worklog / 再開プロトコルが受け止める）。
// - transcript の JSONL スキーマは非公式。usage の位置は .message.usage / .usage の両形を
//   許容し、壊れた行はスキップする（実測ベース・スキーマ変更に強い側へ倒す）。

export interface ContextGuardConfig {
  /** モデルのコンテキスト窓（トークン）。モデル依存のため config で宣言する */
  contextWindow: number;
  /** block する使用率の閾値（0–1。例: 0.9 = 90% 以上で委譲を抑制） */
  blockRatio: number;
}

export interface ContextGuardDecision {
  decision: "allow" | "block";
  /** 直近 assistant usage から推定した現コンテキスト量（読めなければ null） */
  usedTokens: number | null;
  /** usedTokens / contextWindow（読めなければ null） */
  ratio: number | null;
  reason: string;
}

interface UsageLike {
  input_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
  output_tokens?: number;
}

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** usage オブジェクト → 現コンテキスト量（次ターンにプロンプトへ載る分の合算） */
function totalTokens(u: UsageLike): number {
  return (
    num(u.input_tokens) +
    num(u.cache_read_input_tokens) +
    num(u.cache_creation_input_tokens) +
    num(u.output_tokens)
  );
}

/** JSONL 1 行から usage を取り出す（.message.usage / .usage の両形。無ければ null） */
function usageOfLine(line: string): UsageLike | null {
  try {
    const obj = JSON.parse(line) as {
      usage?: UsageLike;
      message?: { usage?: UsageLike };
    };
    const u = obj?.message?.usage ?? obj?.usage;
    return u && typeof u === "object" ? u : null;
  } catch {
    return null; // 壊れた行はスキップ（部分書き込み・非公式スキーマへの耐性）
  }
}

const allow = (usedTokens: number | null, ratio: number | null, reason: string): ContextGuardDecision => ({
  decision: "allow",
  usedTokens,
  ratio,
  reason,
});

/**
 * transcript（JSONL テキスト）と config から委譲可否を判定する。
 * 末尾から走査し、最初に見つかった usage（= 直近 assistant メッセージ）を現在量とみなす。
 */
export function checkContextBudget(
  jsonlText: string,
  config: ContextGuardConfig,
): ContextGuardDecision {
  if (!(config.contextWindow > 0) || !(config.blockRatio > 0)) {
    return allow(null, null, "fail-open: config 不正（contextWindow / blockRatio は正の数）");
  }

  const lines = jsonlText.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    const usage = usageOfLine(line);
    if (!usage) continue;

    const used = totalTokens(usage);
    const ratio = used / config.contextWindow;
    const pct = Math.round(ratio * 100);
    if (ratio >= config.blockRatio) {
      return {
        decision: "block",
        usedTokens: used,
        ratio,
        reason: `コンテキスト使用率 ${pct}%（${used}/${config.contextWindow}）が閾値 ${Math.round(config.blockRatio * 100)}% 以上`,
      };
    }
    return allow(used, ratio, `コンテキスト使用率 ${pct}%（閾値未満）`);
  }

  return allow(null, null, "fail-open: transcript から usage を読み取れない");
}
