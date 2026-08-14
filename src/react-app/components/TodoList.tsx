import type { TodoResponse } from "../../shared/types";
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
}

/** TODO 一覧表示（AC-3）。終了済みトグルの状態に応じて DONE/CANCELED を絞り込む（AC-7）。 */
function TodoList({
  todos,
  showCompleted,
  onItemClick,
  onDeleteClick,
}: TodoListProps) {
  const visibleTodos = showCompleted
    ? todos
    : todos.filter((todo) => !COMPLETED_STATUSES.includes(todo.status));

  if (visibleTodos.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-gray-500">
        表示する TODO がありません
      </p>
    );
  }

  return (
    <ul className="divide-y divide-gray-200 rounded border border-gray-200 bg-white">
      {visibleTodos.map((todo) => (
        <TodoListItem
          key={todo.id}
          todo={todo}
          onClick={onItemClick}
          onDeleteClick={onDeleteClick}
        />
      ))}
    </ul>
  );
}

export default TodoList;
