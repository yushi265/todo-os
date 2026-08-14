// context-budget guard CLI
// 使い方: pnpm -C .claude/aidlc contextguard <transcript.jsonl のパス>
// 判定 JSON を stdout に 1 行出力する（shell 側が "decision":"block" を grep して exit 2 にする）。
//
// 全経路 fail-open: transcript 不読・config 破損など何が起きても allow を出して exit 0
//（委譲を誤って止める事故を構造的に防ぐ）。transcript は肥大するため末尾のみ読む。

import { openSync, readSync, fstatSync, closeSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkContextBudget, type ContextGuardConfig } from "./check";

const aidlcRoot = fileURLToPath(new URL("../..", import.meta.url)); // .claude/aidlc

/** 末尾 maxBytes だけ読む（transcript は数十 MB になりうる） */
function readTail(path: string, maxBytes: number): string {
  const fd = openSync(path, "r");
  try {
    const size = fstatSync(fd).size;
    const start = Math.max(0, size - maxBytes);
    const buf = Buffer.alloc(size - start);
    readSync(fd, buf, 0, buf.length, start);
    return buf.toString("utf8");
  } finally {
    closeSync(fd);
  }
}

try {
  const transcript = process.argv[2];
  if (!transcript) throw new Error("usage: contextguard <transcript.jsonl>");

  const config = JSON.parse(
    readFileSync(join(aidlcRoot, "context-guard.json"), "utf8"),
  ) as ContextGuardConfig;

  const decision = checkContextBudget(readTail(transcript, 256 * 1024), config);
  process.stdout.write(JSON.stringify(decision) + "\n");
} catch (e) {
  process.stdout.write(
    JSON.stringify({
      decision: "allow",
      usedTokens: null,
      ratio: null,
      reason: `fail-open: ${e instanceof Error ? e.message : String(e)}`,
    }) + "\n",
  );
}
