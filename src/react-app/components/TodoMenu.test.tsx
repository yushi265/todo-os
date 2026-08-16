import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TodoMenu from "./TodoMenu";

afterEach(() => {
  cleanup();
});

function renderMenu(onClose = vi.fn()) {
  render(
    <TodoMenu
      showCompleted={false}
      onShowCompletedChange={vi.fn()}
      isFilterBarOpen={false}
      onFilterBarOpenChange={vi.fn()}
      onSettingsClick={vi.fn()}
      onTagManagementClick={vi.fn()}
      onClose={onClose}
    />,
  );
  return screen.getByRole("dialog", { name: "メニュー" });
}

describe("TodoMenu", () => {
  it("closes when the backdrop itself is clicked", () => {
    const onClose = vi.fn();
    const dialog = renderMenu(onClose);
    const backdrop = dialog.parentElement;

    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);

    expect(onClose).toHaveBeenCalledOnce();
  });
});
