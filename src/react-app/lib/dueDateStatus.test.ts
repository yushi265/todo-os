import { describe, expect, it } from "vitest";
import type { TodoStatus } from "../../shared/types";
import { dueDateStatus } from "./dueDateStatus";

const NOW = new Date("2026-08-15T03:00:00.000Z");

describe("dueDateStatus", () => {
  it.each([
    ["2026-08-14", "overdue"],
    ["2026-08-15", "today"],
    ["2026-08-16", "soon"],
    ["2026-08-18", "soon"],
    ["2026-08-19", null],
  ] as const)("returns %s for due date %s", (dueDate, expected) => {
    expect(dueDateStatus(dueDate, "TODO", NOW)).toBe(expected);
  });

  it("uses the Asia/Tokyo calendar date at the UTC boundary", () => {
    const justBeforeTokyoMidnight = new Date("2026-08-14T14:59:59.000Z");
    const TokyoMidnight = new Date("2026-08-14T15:00:00.000Z");

    expect(
      dueDateStatus("2026-08-14", "IN_PROGRESS", justBeforeTokyoMidnight),
    ).toBe("today");
    expect(dueDateStatus("2026-08-15", "TODO", TokyoMidnight)).toBe("today");
  });

  it.each(["DONE", "CANCELED"] as TodoStatus[])(
    "does not mark a completed todo as urgent (%s)",
    (status) => {
      expect(dueDateStatus("2026-08-14", status, NOW)).toBeNull();
    },
  );

  it("returns null when no due date is set", () => {
    expect(dueDateStatus(null, "TODO", NOW)).toBeNull();
  });
});
