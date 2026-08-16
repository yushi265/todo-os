import type { TodoResponse } from "../../shared/types";

/** 表示対象の未完了 TODO 配列で、sourceId を targetId の位置へ移動する。 */
export function buildReorderedIds(
  draggableIds: number[],
  sourceId: number,
  targetId: number,
): number[] | null {
  if (sourceId === targetId) return null;
  const sourceIndex = draggableIds.indexOf(sourceId);
  const targetIndex = draggableIds.indexOf(targetId);
  if (sourceIndex === -1 || targetIndex === -1) return null;

  const reorderedIds = [...draggableIds];
  const [movedId] = reorderedIds.splice(sourceIndex, 1);
  reorderedIds.splice(targetIndex, 0, movedId);
  return reorderedIds;
}

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
