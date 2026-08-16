import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TagResponse } from "../../shared/types";
import { renderWithQueryClient } from "../test-utils";
import TagSwitcher from "./TagSwitcher";

afterEach(() => {
  cleanup();
});

function makeTag(overrides: Partial<TagResponse> = {}): TagResponse {
  return {
    id: 1,
    name: "仕事",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("TagSwitcher", () => {
  it("renders an all button and one quick-switch button per tag", () => {
    renderWithQueryClient(
      <TagSwitcher
        tags={[makeTag(), makeTag({ id: 2, name: "私用" })]}
        selectedTagId={null}
        onTagChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("navigation", { name: "一覧をタグで絞り込む" }),
    ).toBeInTheDocument();
    expect(screen.getByText("一覧を絞り込む:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "すべて" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "#仕事" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "#私用" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("marks the selected tag and reports quick-switch changes", async () => {
    const onTagChange = vi.fn();
    const user = userEvent.setup();

    renderWithQueryClient(
      <TagSwitcher
        tags={[makeTag(), makeTag({ id: 2, name: "私用" })]}
        selectedTagId={2}
        onTagChange={onTagChange}
      />,
    );

    const selectedTag = screen.getByRole("button", { name: "#私用" });
    expect(selectedTag).toHaveAttribute("aria-pressed", "true");
    expect(selectedTag).toHaveClass("bg-primary", "text-white");
    await user.click(screen.getByRole("button", { name: "#仕事" }));
    expect(onTagChange).toHaveBeenCalledWith(1);
    await user.click(screen.getByRole("button", { name: "すべて" }));
    expect(onTagChange).toHaveBeenCalledWith(null);
  });

  it("does not render a switcher when there are no tags", () => {
    renderWithQueryClient(
      <TagSwitcher tags={[]} selectedTagId={null} onTagChange={vi.fn()} />,
    );

    expect(
      screen.queryByRole("navigation", { name: "一覧をタグで絞り込む" }),
    ).not.toBeInTheDocument();
  });
});
