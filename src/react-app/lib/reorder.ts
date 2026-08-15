import type { TodoResponse } from "../../shared/types";

/**
 * フィルターで非表示の TODO の位置を保ったまま、表示中 TODO の新順序を
 * 全 TODO の ID 配列へマージする。
 */
export function buildFullReorderedIds(
  allTodos: TodoResponse[],
  visibleIdsInNewOrder: number[],
): number[] {
  const visibleIdSet = new Set(visibleIdsInNewOrder);
  let cursor = 0;

  return allTodos.map((todo) => {
    if (visibleIdSet.has(todo.id)) {
      const id = visibleIdsInNewOrder[cursor];
      cursor += 1;
      return id;
    }
    return todo.id;
  });
}
