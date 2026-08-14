#!/usr/bin/env bash
# PreToolUse(Task|Agent) hook — context-budget guard（委譲の起動抑制）
#
# サブエージェント起動の直前に、会話 transcript（JSONL）の直近 usage から現コンテキスト
# 使用率を推定し、閾値（context-guard.json: 既定 90%）以上なら起動を exit 2 でブロックして
# 「チェックポイント確定 → compact → 再開」へ誘導する。
# 背景: 残量不足のまま委譲を始めると、委譲サイクル中の枯渇で worker の作業文脈が失われる。
# 本 hook は入口の予防。事後回復は progress.md の worklog + 再開プロトコル（ai-dlc-flow）が担う。
#
# 全経路 fail-open: jq / pnpm / 依存 / transcript が無ければ黙って通す（誤 block でフローを
# 止める事故を構造的に防ぐ）。判定ロジックと usage の仕様は src/contextguard/check.ts が正本。
set -u

input="$(cat)"

command -v jq >/dev/null 2>&1 || exit 0
transcript="$(printf '%s' "$input" | jq -r '.transcript_path // empty' 2>/dev/null)"
[ -z "$transcript" ] && exit 0
[ -f "$transcript" ] || exit 0

repo_root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
aidlc="$repo_root/.claude/aidlc"

# フェイルセーフ: 依存未導入 / pnpm 不在なら黙って通す（環境差で誤 block しない）。
[ -d "$aidlc/node_modules" ] || exit 0
command -v pnpm >/dev/null 2>&1 || exit 0

out="$(pnpm -s -C "$aidlc" contextguard "$transcript" 2>/dev/null)" || exit 0

if printf '%s' "$out" | grep -q '"decision":"block"'; then
  {
    echo "[aidlc:context-guard] コンテキスト残量が不足しています。サブエージェント起動をブロックしました。"
    printf '  %s\n' "$out"
    echo "  → 次の順で退避してから再開してください:"
    echo "    1. progress.md の worklog・現在位置を確定する（作業文脈の不揮発化）"
    echo "    2. コミット可能な単位があれば Gate 3 を提案する（成果の確定）"
    echo "    3. 人間に /compact（または新セッション + progress.md からの再開）を提案する"
    echo "  （使用率が実態と合わない場合は .claude/aidlc/context-guard.json の contextWindow をモデルの実窓に合わせる）"
  } >&2
  exit 2
fi
exit 0
