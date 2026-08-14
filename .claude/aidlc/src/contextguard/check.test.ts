import { test } from "node:test";
import assert from "node:assert/strict";
import { checkContextBudget, type ContextGuardConfig } from "./check";

// transcript JSONL の行を組み立てるフィクスチャ（実セッションの transcript 構造から採取した形）
function assistantLine(usage: Record<string, unknown>): string {
  return JSON.stringify({ type: "assistant", message: { role: "assistant", usage } });
}
function usageOf(total: number): Record<string, number> {
  // input + cache_read + cache_creation + output = total になるよう分配
  return {
    input_tokens: 2,
    cache_read_input_tokens: total - 2 - 100 - 50,
    cache_creation_input_tokens: 100,
    output_tokens: 50,
  };
}

const CONFIG: ContextGuardConfig = { contextWindow: 1000, blockRatio: 0.9 };

// --- 境界値: blockRatio 前後（contextWindow=1000 / blockRatio=0.9 → 閾値 900） -------------

test("[境界値] 使用量 899/1000（閾値未満）→ allow", () => {
  const d = checkContextBudget(assistantLine(usageOf(899)), CONFIG);
  assert.equal(d.decision, "allow");
  assert.equal(d.usedTokens, 899);
});

test("[境界値] 使用量 900/1000（閾値ちょうど）→ block", () => {
  const d = checkContextBudget(assistantLine(usageOf(900)), CONFIG);
  assert.equal(d.decision, "block");
  assert.equal(d.usedTokens, 900);
  assert.match(d.reason, /90/); // 使用率が reason に含まれる
});

test("[境界値] 使用量 901/1000（閾値超）→ block", () => {
  const d = checkContextBudget(assistantLine(usageOf(901)), CONFIG);
  assert.equal(d.decision, "block");
});

// --- 代表値: usage の抽出 -----------------------------------------------------------

test("[代表値] usage 行が無い transcript → allow（fail-open・usedTokens は null）", () => {
  const text = [
    JSON.stringify({ type: "user", message: { content: "hi" } }),
    JSON.stringify({ type: "system" }),
  ].join("\n");
  const d = checkContextBudget(text, CONFIG);
  assert.equal(d.decision, "allow");
  assert.equal(d.usedTokens, null);
});

test("[代表値] 複数 usage 行 → 最後（最新）の usage を採用する", () => {
  // usageOf は total>=152 で全フィールドが非負になる（現実的なフィクスチャを保つ）
  const text = [assistantLine(usageOf(950)), assistantLine(usageOf(200))].join("\n");
  const d = checkContextBudget(text, CONFIG);
  assert.equal(d.decision, "allow");
  assert.equal(d.usedTokens, 200);
});

test("[代表値] 壊れた JSON 行・usage 無し行はスキップして直近の有効 usage を使う", () => {
  const text = [assistantLine(usageOf(950)), "{not json", JSON.stringify({ type: "user" })].join(
    "\n",
  );
  const d = checkContextBudget(text, CONFIG);
  assert.equal(d.decision, "block");
  assert.equal(d.usedTokens, 950);
});

test("[代表値] usage がトップレベル（.usage）にある行も読める", () => {
  const line = JSON.stringify({ type: "assistant", usage: usageOf(950) });
  const d = checkContextBudget(line, CONFIG);
  assert.equal(d.decision, "block");
  assert.equal(d.usedTokens, 950);
});

test("[境界値] usage のフィールド欠落は 0 扱いで合算する", () => {
  const line = JSON.stringify({
    type: "assistant",
    message: { usage: { input_tokens: 901 } }, // cache_* / output 欠落
  });
  const d = checkContextBudget(line, CONFIG);
  assert.equal(d.decision, "block");
  assert.equal(d.usedTokens, 901);
});

// --- 異常系: config 不正・空入力（fail-open） ---------------------------------------

test("[異常系] 空文字列 → allow（fail-open）", () => {
  assert.equal(checkContextBudget("", CONFIG).decision, "allow");
});

test("[異常系] contextWindow が 0 以下 → allow（fail-open・誤 block を防ぐ）", () => {
  const d = checkContextBudget(assistantLine(usageOf(950)), {
    contextWindow: 0,
    blockRatio: 0.9,
  });
  assert.equal(d.decision, "allow");
  assert.match(d.reason, /fail-open/);
});

test("[異常系] blockRatio が 0 以下 → allow（fail-open）", () => {
  const d = checkContextBudget(assistantLine(usageOf(950)), {
    contextWindow: 1000,
    blockRatio: 0,
  });
  assert.equal(d.decision, "allow");
});
