import { describe, expect, it } from "vitest";
import { formatDateTimeInTokyo } from "./formatDateTime";

describe("formatDateTimeInTokyo", () => {
  it.each([
    ["2026-08-01T00:30:00.000Z", "2026/08/01 09:30"],
    ["2026-08-01 15:30:00", "2026/08/02 00:30"],
    ["2026-08-01T15:30:00", "2026/08/02 00:30"],
  ])("converts %s to Tokyo time", (value, expected) => {
    expect(formatDateTimeInTokyo(value)).toBe(expected);
  });

  it("keeps an invalid value visible instead of throwing", () => {
    expect(formatDateTimeInTokyo("invalid date")).toBe("invalid date");
  });
});
