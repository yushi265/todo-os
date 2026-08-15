import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import TodoList from "./TodoList";
import type { TodoResponse } from "../../shared/types";

afterEach(() => {
  cleanup();
});

function makeTodo(overrides: Partial<TodoResponse>): TodoResponse {
  return {
    id: 1,
    title: "サンプル",
    description: null,
    status: "TODO",
    priority: null,
    dueDate: null,
    sortOrder: 0,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    tags: [],
    ...overrides,
  };
}

describe("TodoList", () => {
  // [代表値] 終了済みトグル OFF で DONE/CANCELED の TODO が一覧に表示されない
  it("hides DONE/CANCELED todos when showCompleted is false", () => {
    const todos = [
      makeTodo({ id: 1, title: "未完了タスク", status: "TODO" }),
      makeTodo({ id: 2, title: "完了タスク", status: "DONE" }),
      makeTodo({ id: 3, title: "中止タスク", status: "CANCELED" }),
    ];

    render(
      <TodoList
        todos={todos}
        showCompleted={false}
        onItemClick={vi.fn()}
        onDeleteClick={vi.fn()}
        onAdvanceStatus={vi.fn()}
      />,
    );

    expect(screen.getByText("未完了タスク")).toBeInTheDocument();
    expect(screen.queryByText("完了タスク")).not.toBeInTheDocument();
    expect(screen.queryByText("中止タスク")).not.toBeInTheDocument();
  });

  // [代表値] 終了済みトグル ON で全ステータスの TODO が表示される
  it("shows all statuses when showCompleted is true", () => {
    const todos = [
      makeTodo({ id: 1, title: "未完了タスク", status: "TODO" }),
      makeTodo({ id: 2, title: "完了タスク", status: "DONE" }),
      makeTodo({ id: 3, title: "中止タスク", status: "CANCELED" }),
    ];

    render(
      <TodoList
        todos={todos}
        showCompleted={true}
        onItemClick={vi.fn()}
        onDeleteClick={vi.fn()}
        onAdvanceStatus={vi.fn()}
      />,
    );

    expect(screen.getByText("未完了タスク")).toBeInTheDocument();
    expect(screen.getByText("完了タスク")).toBeInTheDocument();
    expect(screen.getByText("中止タスク")).toBeInTheDocument();
  });

  // [代表値] 期限切れの TODO は一覧上で視覚的に判別できる（AC-4）
  it("marks an overdue todo visually", () => {
    const overdueTodo = makeTodo({
      id: 1,
      title: "対象タスク",
      status: "TODO",
      dueDate: "2000-01-01",
    });

    render(
      <TodoList
        todos={[overdueTodo]}
        showCompleted={false}
        onItemClick={vi.fn()}
        onDeleteClick={vi.fn()}
        onAdvanceStatus={vi.fn()}
      />,
    );

    expect(screen.getByText(/期限切れ/)).toBeInTheDocument();
  });

  // [デシジョンテーブル] 未完了（TODO/IN_PROGRESS）は TodoListItem（ステータス進行 UI あり）で描画される
  it("renders open todos with a status-advance affordance and no strikethrough", () => {
    const todos = [makeTodo({ id: 1, title: "未完了タスク", status: "TODO" })];

    render(
      <TodoList
        todos={todos}
        showCompleted={true}
        onItemClick={vi.fn()}
        onDeleteClick={vi.fn()}
        onAdvanceStatus={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "「未完了タスク」を「進行中」に変更",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("未完了タスク")).not.toHaveClass("line-through");
  });

  // [デシジョンテーブル] 完了・キャンセル済み（DONE/CANCELED）は CompletedTodoListItem
  // （取り消し線・ステータス進行 UI なし）で描画される
  it.each([{ status: "DONE" }, { status: "CANCELED" }] as const)(
    "renders $status todos with a strikethrough title and no status-advance affordance",
    ({ status }) => {
      const todos = [makeTodo({ id: 2, title: "完了系タスク", status })];

      render(
        <TodoList
          todos={todos}
          showCompleted={true}
          onItemClick={vi.fn()}
          onDeleteClick={vi.fn()}
          onAdvanceStatus={vi.fn()}
        />,
      );

      expect(screen.getByText("完了系タスク")).toHaveClass("line-through");
      expect(
        screen.queryByRole("button", { name: /に変更/ }),
      ).not.toBeInTheDocument();
    },
  );

  // [代表値] 未完了 TODO のステータスバッジをクリックすると onAdvanceStatus(todo) が呼ばれる
  it("wires onAdvanceStatus into the open todo item", async () => {
    const todo = makeTodo({ id: 4, title: "対象", status: "TODO" });
    const onAdvanceStatus = vi.fn();
    const user = userEvent.setup();

    render(
      <TodoList
        todos={[todo]}
        showCompleted={false}
        onItemClick={vi.fn()}
        onDeleteClick={vi.fn()}
        onAdvanceStatus={onAdvanceStatus}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "「対象」を「進行中」に変更" }),
    );

    expect(onAdvanceStatus).toHaveBeenCalledWith(todo);
  });
});
