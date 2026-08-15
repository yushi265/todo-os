import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import TagBadge from "./TagBadge";
import type { TagResponse } from "../../shared/types";

afterEach(() => {
  cleanup();
});

function makeTag(overrides: Partial<TagResponse> = {}): TagResponse {
  return {
    id: 1,
    name: "タグ1",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("TagBadge", () => {
  // [代表値] muted未指定のタグ名は#プレフィックス付き・通常色で表示される（AC-6）
  it("renders the tag name with a hash prefix and the default color", () => {
    render(<TagBadge tag={makeTag({ name: "仕事" })} />);

    const badge = screen.getByText("#仕事");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("text-tag-fg");
  });

  // [代表値] muted=trueのタグ名は薄色で表示される（AC-6）
  it("renders a muted tag badge when muted is true", () => {
    render(<TagBadge tag={makeTag({ name: "私用" })} muted />);

    expect(screen.getByText("#私用")).toHaveClass("text-tag-fg-muted");
  });
});
