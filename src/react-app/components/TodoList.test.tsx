import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
      />,
    );

    expect(screen.getByText(/期限切れ/)).toBeInTheDocument();
  });
});
