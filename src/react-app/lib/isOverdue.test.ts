import { describe, expect, it } from "vitest";
import { isOverdue } from "./isOverdue";

// 基準時刻: 2026-08-14 12:00 JST（= 2026-08-14T03:00:00Z）
const NOW = new Date("2026-08-14T03:00:00Z");

describe("isOverdue", () => {
  // [代表値] 期限が昨日・ステータス TODO → true
  it("returns true when dueDate is yesterday and status is TODO", () => {
    expect(isOverdue("2026-08-13", "TODO", NOW)).toBe(true);
  });

  // [境界値] 期限が本日（Asia/Tokyo基準） → false（本日は期限切れ扱いにしない）
  it("returns false when dueDate is today (Asia/Tokyo basis)", () => {
    expect(isOverdue("2026-08-14", "TODO", NOW)).toBe(false);
  });

  // [デシジョンテーブル] isOverdue():
  // 期限あり×未完了=判定対象 / 期限あり×完了済み(DONE/CANCELED)=常にfalse / 期限なし=常にfalse
  it.each([
    {
      dueDate: "2026-08-13",
      status: "TODO",
      expected: true,
      label: "期限あり(過去)×TODO",
    },
    {
      dueDate: "2026-08-13",
      status: "IN_PROGRESS",
      expected: true,
      label: "期限あり(過去)×IN_PROGRESS",
    },
    {
      dueDate: "2026-08-13",
      status: "DONE",
      expected: false,
      label: "期限あり(過去)×DONE",
    },
    {
      dueDate: "2026-08-13",
      status: "CANCELED",
      expected: false,
      label: "期限あり(過去)×CANCELED",
    },
    { dueDate: null, status: "TODO", expected: false, label: "期限なし×TODO" },
    { dueDate: null, status: "DONE", expected: false, label: "期限なし×DONE" },
  ] as const)("$label → $expected", ({ dueDate, status, expected }) => {
    expect(isOverdue(dueDate, status, NOW)).toBe(expected);
  });
});
