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
}: TodoListProps) {
  const visibleTodos = showCompleted
    ? todos
    : todos.filter((todo) => !isCompleted(todo));

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
          />
        ),
      )}
    </ul>
  );
}

export default TodoList;
