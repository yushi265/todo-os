import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import CompletedTodoListItem from "./CompletedTodoListItem";
import type { TagResponse, TodoResponse } from "../../shared/types";

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

function makeTodo(overrides: Partial<TodoResponse>): TodoResponse {
  return {
    id: 1,
    title: "サンプル",
    description: null,
    status: "DONE",
    priority: null,
    dueDate: null,
    sortOrder: 0,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-10T00:00:00.000Z",
    tags: [],
    ...overrides,
  };
}

describe("CompletedTodoListItem", () => {
  // [代表値] 完了済み TODO（DONE）が取り消し線タイトル＋緑チェックアイコンで表示される（AC-5）
  it("renders a strikethrough title and a green check icon for a DONE todo", () => {
    const todo = makeTodo({ status: "DONE", title: "完了タスク" });

    render(
      <ul>
        <CompletedTodoListItem
          todo={todo}
          onClick={vi.fn()}
          onDeleteClick={vi.fn()}
        />
      </ul>,
    );

    const title = screen.getByText("完了タスク");
    expect(title).toHaveClass("line-through");
    const icon = screen.getByText("✓");
    expect(icon).toHaveClass("text-status-done-fg", "h-11", "w-11");
    expect(screen.getByTestId("status-icon-DONE")).toBe(icon);
    expect(screen.queryByText("完了", { exact: true })).not.toBeInTheDocument();
  });

  // [代表値] 完了済み TODO（CANCELED）が取り消し線タイトル＋グレー×アイコンで表示される（AC-5）
  it("renders a strikethrough title and a gray x icon for a CANCELED todo", () => {
    const todo = makeTodo({ status: "CANCELED", title: "中止タスク" });

    render(
      <ul>
        <CompletedTodoListItem
          todo={todo}
          onClick={vi.fn()}
          onDeleteClick={vi.fn()}
        />
      </ul>,
    );

    const title = screen.getByText("中止タスク");
    expect(title).toHaveClass("line-through");
    const icon = screen.getByText("×");
    expect(icon).toHaveClass("text-status-canceled-fg", "h-11", "w-11");
    expect(screen.getByTestId("status-icon-CANCELED")).toBe(icon);
    expect(screen.queryByText("中止", { exact: true })).not.toBeInTheDocument();
  });

  // [デシジョンテーブル] 完了済みセクション（DONE/CANCELED）の行にはステータス進行の操作 UI が存在しない（AC-2）
  it.each([{ status: "DONE" }, { status: "CANCELED" }] as const)(
    "does not render a status-advance affordance for $status",
    ({ status }) => {
      const todo = makeTodo({ status, title: "対象" });

      render(
        <ul>
          <CompletedTodoListItem
            todo={todo}
            onClick={vi.fn()}
            onDeleteClick={vi.fn()}
          />
        </ul>,
      );

      expect(
        screen.queryByRole("button", { name: /に変更/ }),
      ).not.toBeInTheDocument();
    },
  );

  // [代表値] 完了済み TODO は常にドラッグ対象にしない
  it("does not make a completed todo draggable", () => {
    render(
      <ul>
        <CompletedTodoListItem
          todo={makeTodo({ title: "完了済み" })}
          onClick={vi.fn()}
          onDeleteClick={vi.fn()}
        />
      </ul>,
    );

    expect(screen.getByTestId("todo-item-1")).toHaveAttribute(
      "draggable",
      "false",
    );
  });

  // [境界値] 手動並び順でも完了済み TODO はドラッグできないが、カードは操作可能
  it("keeps a completed todo card non-draggable while keeping it focusable", () => {
    render(
      <ul>
        <CompletedTodoListItem
          todo={makeTodo({ title: "完了済み" })}
          onClick={vi.fn()}
          onDeleteClick={vi.fn()}
        />
      </ul>,
    );

    const card = screen.getByTestId("todo-item-1");
    expect(card).toHaveAttribute("draggable", "false");
    expect(card).toHaveAttribute("tabindex", "0");
  });

  // [代表値] 行クリックで onClick(todo) が正しい todo で呼ばれる
  it("calls onClick with the todo when the row is clicked", async () => {
    const todo = makeTodo({ id: 9, title: "編集対象" });
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(
      <ul>
        <CompletedTodoListItem
          todo={todo}
          onClick={onClick}
          onDeleteClick={vi.fn()}
        />
      </ul>,
    );
    await user.click(screen.getByText("編集対象"));

    expect(onClick).toHaveBeenCalledWith(todo);
  });

  // [代表値] 削除ボタンクリックで onDeleteClick(todo) が呼ばれ、onClick は呼ばれない（イベント伝播制御・AC-7）
  it("calls onDeleteClick without triggering onClick when the delete button is clicked", async () => {
    const todo = makeTodo({ id: 8, title: "削除対象" });
    const onClick = vi.fn();
    const onDeleteClick = vi.fn();
    const user = userEvent.setup();

    render(
      <ul>
        <CompletedTodoListItem
          todo={todo}
          onClick={onClick}
          onDeleteClick={onDeleteClick}
        />
      </ul>,
    );
    const deleteButton = screen.getByLabelText(`「${todo.title}」を削除`);
    expect(deleteButton).not.toHaveTextContent("削除");
    expect(deleteButton.querySelector("svg")).toBeInTheDocument();

    await user.click(deleteButton);

    expect(onDeleteClick).toHaveBeenCalledWith(todo);
    expect(onClick).not.toHaveBeenCalled();
  });

  // [代表値] 完了済みTODOのタグは#プレフィックス付き・薄色バッジで表示される（AC-6）
  it("displays all assigned tags as muted badges with hash prefixes", () => {
    const todo = makeTodo({
      tags: [
        makeTag({ id: 1, name: "仕事" }),
        makeTag({ id: 2, name: "私用" }),
      ],
    });

    render(
      <ul>
        <CompletedTodoListItem
          todo={todo}
          onClick={vi.fn()}
          onDeleteClick={vi.fn()}
        />
      </ul>,
    );

    expect(screen.getByText("#仕事")).toHaveClass("text-tag-fg-muted");
    expect(screen.getByText("#私用")).toHaveClass("text-tag-fg-muted");
  });

  // [境界値] タグが1件も無い TODO はタグバッジ領域が表示されない
  it("does not render a tag badge area when there are no tags", () => {
    const todo = makeTodo({ id: 3, tags: [] });

    render(
      <ul>
        <CompletedTodoListItem
          todo={todo}
          onClick={vi.fn()}
          onDeleteClick={vi.fn()}
        />
      </ul>,
    );

    expect(screen.queryByTestId("todo-tags-3")).not.toBeInTheDocument();
  });

  // [代表値] 完了済みTODO行とメタ情報はsm以上でコンパクトになる
  it("applies compact responsive classes to the row and metadata", () => {
    const todo = makeTodo({
      id: 10,
      title: "完了密度調整確認",
      updatedAt: "2026-08-10T00:00:00.000Z",
    });

    render(
      <ul>
        <CompletedTodoListItem
          todo={todo}
          onClick={vi.fn()}
          onDeleteClick={vi.fn()}
        />
      </ul>,
    );

    const row = screen.getByTestId("todo-item-10");
    const metadata = screen.getByText(todo.updatedAt).parentElement;

    expect(row).toHaveClass("gap-2", "sm:gap-1.5");
    expect(row).toHaveClass("p-4", "sm:p-3");
    expect(metadata).toHaveClass("text-sm", "sm:text-xs");
  });

  it("applies the subtle row entrance animation", () => {
    render(
      <ul>
        <CompletedTodoListItem
          todo={makeTodo({ id: 11 })}
          onClick={vi.fn()}
          onDeleteClick={vi.fn()}
        />
      </ul>,
    );

    expect(screen.getByTestId("todo-item-11")).toHaveClass(
      "animate-[todo-item-in_0.24s_ease-out]",
    );
  });
});
