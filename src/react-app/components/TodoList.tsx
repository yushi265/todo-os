import { useState } from "react";
import type { DragEvent } from "react";
import type { TodoResponse } from "../../shared/types";
import CompletedTodoListItem from "./CompletedTodoListItem";
import TodoListItem from "./TodoListItem";

const COMPLETED_STATUSES: readonly TodoResponse["status"][] = [
  "DONE",
  "CANCELED",
];

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
  const visibleTodos = showCompleted
    ? todos
    : todos.filter((todo) => !isCompleted(todo));

  const draggableTodos = visibleTodos.filter((todo) => !isCompleted(todo));
  const draggableTodoIds = new Set(draggableTodos.map((todo) => todo.id));

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

      const ids = draggableTodos.map((todo) => todo.id);
      const sourceIndex = ids.indexOf(dragId);
      const targetIndex = ids.indexOf(todoId);
      if (sourceIndex === -1 || targetIndex === -1) {
        setDragId(null);
        setDragOverId(null);
        return;
      }

      const [movedId] = ids.splice(sourceIndex, 1);
      ids.splice(targetIndex, 0, movedId);
      onReorder(ids);
      setDragId(null);
      setDragOverId(null);
    };
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
            isDragOver={dragOverId === todo.id}
          />
        ),
      )}
    </ul>
  );
}

export default TodoList;
