import { describe, expect, it } from "vitest";
import type { TodoResponse } from "../../shared/types";
import {
  isDataInOptimisticOrder,
  orderTodosByIds,
  todoToCreateInput,
  todoToUpdateInput,
} from "./todoTransforms";

function makeTodo(
  id: number,
  overrides: Partial<TodoResponse> = {},
): TodoResponse {
  return {
    id,
    title: `TODO ${id}`,
    description: null,
    status: "IN_PROGRESS",
    priority: "HIGH",
    dueDate: "2026-08-20",
    sortOrder: id,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    tags: [
      {
        id: 7,
        name: "仕事",
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z",
      },
    ],
    ...overrides,
  };
}

describe("todoToUpdateInput", () => {
  it("maps editable fields and tag ids", () => {
    const todo = makeTodo(1);

    expect(todoToUpdateInput(todo)).toEqual({
      title: "TODO 1",
      description: null,
      status: "IN_PROGRESS",
      priority: "HIGH",
      dueDate: "2026-08-20",
      tagIds: [7],
    });
  });
});

describe("todoToCreateInput", () => {
  it("omits the status and maps fields needed for restore", () => {
    const todo = makeTodo(1, { status: "DONE" });

    expect(todoToCreateInput(todo)).toEqual({
      title: "TODO 1",
      description: null,
      priority: "HIGH",
      dueDate: "2026-08-20",
      tagIds: [7],
    });
  });
});

describe("orderTodosByIds", () => {
  it("orders known ids and keeps unknown ids at the end", () => {
    const todos = [makeTodo(1), makeTodo(2), makeTodo(3)];

    expect(orderTodosByIds(todos, [3, 1])).toEqual([
      todos[2],
      todos[0],
      todos[1],
    ]);
  });
});

describe("isDataInOptimisticOrder", () => {
  it.each([
    [true, [3, 1, 2]],
    [false, [1, 2, 3]],
  ] as const)("returns %s for optimistic ids %j", (expected, ids) => {
    const todos = [makeTodo(3), makeTodo(1), makeTodo(2)];

    expect(isDataInOptimisticOrder(todos, ids)).toBe(expected);
  });
});
