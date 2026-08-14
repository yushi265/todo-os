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
  // [代表値] タグ名がバッジとして表示される
  it("renders the tag name", () => {
    render(<TagBadge tag={makeTag({ name: "仕事" })} />);

    expect(screen.getByText("仕事")).toBeInTheDocument();
  });
});
