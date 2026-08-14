import { describe, expect, it } from "vitest";
import { calculateNextSortOrder } from "./todos";

describe("calculateNextSortOrder", () => {
  // [代表値] 既存TODOが無い（MAX が null）→ 0
  it("returns 0 when there are no existing todos", () => {
    expect(calculateNextSortOrder(null)).toBe(0);
  });

  // [代表値] 既存の最大値 + 1
  it("returns the existing max + 1", () => {
    expect(calculateNextSortOrder(5)).toBe(6);
  });

  // [境界値] 既存の最大値が 0（最初の1件のみ存在）
  it("returns 1 when the existing max is 0", () => {
    expect(calculateNextSortOrder(0)).toBe(1);
  });
});
