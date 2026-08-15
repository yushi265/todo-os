import { useRef, useState } from "react";
import type { DragEvent, TouchEvent } from "react";
import type { TodoResponse } from "../../shared/types";
import CompletedTodoListItem from "./CompletedTodoListItem";
import TodoListItem from "./TodoListItem";

const COMPLETED_STATUSES: readonly TodoResponse["status"][] = [
  "DONE",
  "CANCELED",
];
const LONG_PRESS_MS = 500;
const CANCEL_THRESHOLD_PX = 10;

interface TodoListProps {
  todos: TodoResponse[];
  showCompleted: boolean;
  onItemClick: (todo: TodoResponse) => void;
  onDeleteClick: (todo: TodoResponse) => void;
  /** ステータスバッジクリックによる進行ショートカット（AC-2）。未完了行にのみ配線する。 */
  onAdvanceStatus: (todo: TodoResponse) => void;
  dragEnabled?: boolean;
  onReorder?: (visibleIdsInNewOrder: number[]) => void;
}

function isCompleted(todo: TodoResponse): boolean {
  return COMPLETED_STATUSES.includes(todo.status);
}

/**
 * TODO 一覧表示（AC-1, AC-5）。終了済みトグルの状態に応じて DONE/CANCELED を絞り込み（AC-7）、
 * `todo.status` に応じて未完了専用（`TodoListItem`）/完了済み専用（`CompletedTodoListItem`）の
 * レイアウトへ振り分けて描画する（判断根拠は index.md 参照）。
 */
function TodoList({
  todos,
  showCompleted,
  onItemClick,
  onDeleteClick,
  onAdvanceStatus,
  onReorder = () => undefined,
  dragEnabled = false,
}: TodoListProps) {
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const touchStateRef = useRef<{
    todoId: number;
    startX: number;
    startY: number;
    timerId: ReturnType<typeof setTimeout> | null;
  } | null>(null);
  const visibleTodos = showCompleted
    ? todos
    : todos.filter((todo) => !isCompleted(todo));

  const draggableTodos = visibleTodos.filter((todo) => !isCompleted(todo));
  const draggableTodoIds = new Set(draggableTodos.map((todo) => todo.id));

  function commitReorder(sourceId: number, targetId: number) {
    if (sourceId === targetId) return;
    const ids = draggableTodos.map((todo) => todo.id);
    const sourceIndex = ids.indexOf(sourceId);
    const targetIndex = ids.indexOf(targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;
    const [movedId] = ids.splice(sourceIndex, 1);
    ids.splice(targetIndex, 0, movedId);
    onReorder(ids);
  }

  function handleDragStart(todoId: number) {
    return (event: DragEvent<HTMLButtonElement>) => {
      if (!dragEnabled) return;
      setDragId(todoId);
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(todoId));
      }
    };
  }

  function handleDragOver(todoId: number) {
    return (event: DragEvent<HTMLLIElement>) => {
      if (!dragEnabled || dragId === null || !draggableTodoIds.has(todoId)) {
        return;
      }
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      setDragOverId(todoId);
    };
  }

  function handleDrop(todoId: number) {
    return (event: DragEvent<HTMLLIElement>) => {
      event.preventDefault();
      if (!dragEnabled || dragId === null || dragId === todoId) {
        setDragOverId(null);
        return;
      }

      commitReorder(dragId, todoId);
      setDragId(null);
      setDragOverId(null);
    };
  }

  function handleTouchStart(todoId: number) {
    return (event: TouchEvent<HTMLButtonElement>) => {
      if (!dragEnabled) return;
      const touch = event.touches[0];
      const timerId = setTimeout(() => {
        setDragId(todoId);
        if (touchStateRef.current) touchStateRef.current.timerId = null;
      }, LONG_PRESS_MS);
      touchStateRef.current = {
        todoId,
        startX: touch.clientX,
        startY: touch.clientY,
        timerId,
      };
    };
  }

  function handleTouchMove(event: TouchEvent<HTMLButtonElement>) {
    const state = touchStateRef.current;
    if (!state) return;
    const touch = event.touches[0];
    const dx = Math.abs(touch.clientX - state.startX);
    const dy = Math.abs(touch.clientY - state.startY);

    if (state.timerId !== null) {
      if (dx > CANCEL_THRESHOLD_PX || dy > CANCEL_THRESHOLD_PX) {
        clearTimeout(state.timerId);
        touchStateRef.current = null;
      }
      return;
    }

    event.preventDefault();
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const li = target?.closest('li[data-testid^="todo-item-"]');
    const idAttr = li?.getAttribute("data-testid");
    const todoId = idAttr ? Number(idAttr.replace("todo-item-", "")) : NaN;
    if (!Number.isNaN(todoId) && draggableTodoIds.has(todoId)) {
      setDragOverId(todoId);
    }
  }

  function handleTouchEnd() {
    const state = touchStateRef.current;
    if (!state) return;
    if (state.timerId !== null) {
      clearTimeout(state.timerId);
    } else if (dragId !== null && dragOverId !== null) {
      commitReorder(dragId, dragOverId);
    }
    touchStateRef.current = null;
    setDragId(null);
    setDragOverId(null);
  }

  function handleDragEnd() {
    setDragId(null);
    setDragOverId(null);
  }

  if (visibleTodos.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border-dashed px-4 py-6 text-center text-sm text-text-tertiary">
        表示する TODO がありません
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {visibleTodos.map((todo) =>
        isCompleted(todo) ? (
          <CompletedTodoListItem
            key={todo.id}
            todo={todo}
            onClick={onItemClick}
            onDeleteClick={onDeleteClick}
          />
        ) : (
          <TodoListItem
            key={todo.id}
            todo={todo}
            onClick={onItemClick}
            onDeleteClick={onDeleteClick}
            onAdvanceStatus={onAdvanceStatus}
            dragEnabled={dragEnabled}
            onDragStart={handleDragStart(todo.id)}
            onDragOver={handleDragOver(todo.id)}
            onDrop={handleDrop(todo.id)}
            onDragEnd={handleDragEnd}
            onTouchStart={handleTouchStart(todo.id)}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            isDragOver={dragOverId === todo.id}
          />
        ),
      )}
    </ul>
  );
}

export default TodoList;
