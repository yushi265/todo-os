import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TodoResponse } from "../../shared/types";
import TodoCardShell from "./TodoCardShell";

const todo: TodoResponse = {
  id: 1,
  title: "キーボード操作対象",
  description: null,
  status: "TODO",
  priority: null,
  dueDate: null,
  sortOrder: 0,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  tags: [],
};

afterEach(() => {
  cleanup();
});

function renderCard(
  onCardClick = vi.fn(),
  options: { dragEnabled?: boolean; children?: React.ReactNode } = {},
) {
  render(
    <TodoCardShell
      todo={todo}
      statusIcon={null}
      onCardClick={onCardClick}
      onDeleteClick={vi.fn()}
      dragEnabled={options.dragEnabled}
    >
      {options.children ?? <span>本文</span>}
    </TodoCardShell>,
  );
  return screen.getByTestId("todo-item-1");
}

describe("TodoCardShell", () => {
  it.each(["Enter", " "])(
    "opens the card with %s when dragging is disabled",
    (key) => {
      const onCardClick = vi.fn();
      const card = renderCard(onCardClick);

      fireEvent.keyDown(card, { key });

      expect(onCardClick).toHaveBeenCalledWith(todo);
    },
  );

  it("does not open the card for Space while dragging is enabled", () => {
    const onCardClick = vi.fn();
    const card = renderCard(onCardClick, { dragEnabled: true });

    fireEvent.keyDown(card, { key: " " });

    expect(onCardClick).not.toHaveBeenCalled();
  });

  it("does not treat excluded controls as card activation", () => {
    const onCardClick = vi.fn();
    const card = renderCard(onCardClick, {
      children: <button data-drag-exclude="true">操作</button>,
    });

    fireEvent.keyDown(screen.getByRole("button", { name: "操作" }), {
      key: "Enter",
    });

    expect(onCardClick).not.toHaveBeenCalled();
    expect(card).toBeInTheDocument();
  });
});
