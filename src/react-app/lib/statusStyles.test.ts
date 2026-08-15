import { describe, expect, it } from "vitest";
import { nextStatus } from "./statusStyles";

describe("nextStatus", () => {
  // [状態遷移] TODO → IN_PROGRESS に1段階進む
  it('advances "TODO" to "IN_PROGRESS"', () => {
    expect(nextStatus("TODO")).toBe("IN_PROGRESS");
  });

  // [状態遷移] IN_PROGRESS → DONE に1段階進む
  it('advances "IN_PROGRESS" to "DONE"', () => {
    expect(nextStatus("IN_PROGRESS")).toBe("DONE");
  });

  // [状態遷移/禁止] DONE は変更しない（呼び出し元は本来この状態で呼ばないが防御的に検証）
  it('keeps "DONE" unchanged', () => {
    expect(nextStatus("DONE")).toBe("DONE");
  });

  // [状態遷移/禁止] CANCELED は変更しない
  it('keeps "CANCELED" unchanged', () => {
    expect(nextStatus("CANCELED")).toBe("CANCELED");
  });
});
