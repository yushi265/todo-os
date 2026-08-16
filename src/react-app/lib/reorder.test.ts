import { describe, expect, it } from "vitest";
import type { TodoResponse } from "../../shared/types";
import { buildFullReorderedIds, buildReorderedIds } from "./reorder";

function makeTodo(id: number): TodoResponse {
  return {
    id,
    title: `TODO ${id}`,
    description: null,
    status: "TODO",
    priority: null,
    dueDate: null,
    sortOrder: id - 1,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    tags: [],
    subtasks: [],
  };
}

describe("buildFullReorderedIds", () => {
  // [代表値] 全件表示（フィルタなし）で並び替え → 新順序がそのまま返る
  it("returns the new order when all todos are visible", () => {
    const todos = [makeTodo(1), makeTodo(2), makeTodo(3)];

    expect(buildFullReorderedIds(todos, [3, 1, 2])).toEqual([3, 1, 2]);
  });

  // [代表値] フィルタ対象外の相対順序を維持して表示対象だけを差し替える
  it("preserves the relative order of filtered-out todos", () => {
    const todos = [makeTodo(1), makeTodo(2), makeTodo(3), makeTodo(4)];

    expect(buildFullReorderedIds(todos, [3, 1])).toEqual([3, 2, 1, 4]);
  });

  // [境界値] 表示中 TODO が0件 → 元の順序がそのまま返る
  it("returns the original order when no todo is visible", () => {
    const todos = [makeTodo(1), makeTodo(2), makeTodo(3)];

    expect(buildFullReorderedIds(todos, [])).toEqual([1, 2, 3]);
  });

  // [境界値] 全 TODO が表示中 → 新順序がそのまま返る
  it("returns the new order when every todo is visible", () => {
    const todos = [makeTodo(10), makeTodo(20)];

    expect(buildFullReorderedIds(todos, [20, 10])).toEqual([20, 10]);
  });
});

describe("buildReorderedIds", () => {
  it("moves the source id to the target position", () => {
    expect(buildReorderedIds([1, 2, 3], 1, 3)).toEqual([2, 3, 1]);
  });

  it.each([
    [1, 1],
    [99, 2],
    [1, 99],
  ] as const)(
    "returns null when the move is not applicable: %s -> %s",
    (sourceId, targetId) => {
      expect(buildReorderedIds([1, 2, 3], sourceId, targetId)).toBeNull();
    },
  );
});
