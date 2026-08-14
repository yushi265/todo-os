import type { TodoResponse } from "../../shared/types";
import { isOverdue } from "../lib/isOverdue";

const STATUS_LABEL: Record<TodoResponse["status"], string> = {
  TODO: "未着手",
  IN_PROGRESS: "進行中",
  DONE: "完了",
  CANCELED: "中止",
};

const PRIORITY_LABEL: Record<NonNullable<TodoResponse["priority"]>, string> = {
  HIGH: "高",
  MEDIUM: "中",
  LOW: "低",
};

interface TodoListItemProps {
  todo: TodoResponse;
  onClick: (todo: TodoResponse) => void;
  onDeleteClick: (todo: TodoResponse) => void;
}

function TodoListItem({ todo, onClick, onDeleteClick }: TodoListItemProps) {
  const overdue = isOverdue(todo.dueDate, todo.status);

  return (
    <li
      className="flex flex-col gap-1 border-b border-gray-200 px-4 py-3 last:border-b-0 hover:bg-gray-50 md:flex-row md:items-center md:gap-4"
      data-testid={`todo-item-${todo.id}`}
    >
      <button
        type="button"
        onClick={() => onClick(todo)}
        className="flex min-h-11 flex-1 flex-col gap-1 text-left md:flex-row md:items-center md:gap-4"
      >
        <span className="flex-1 font-medium text-gray-900">{todo.title}</span>
        <span className="text-sm text-gray-600">
          {STATUS_LABEL[todo.status]}
        </span>
        <span className="text-sm text-gray-600">
          {todo.priority ? PRIORITY_LABEL[todo.priority] : "-"}
        </span>
        <span
          className={
            overdue
              ? "text-sm font-semibold text-red-600"
              : "text-sm text-gray-600"
          }
        >
          {todo.dueDate ?? "-"}
        </span>
        {overdue && (
          <span className="text-sm font-semibold text-red-600">期限切れ</span>
        )}
      </button>
      <button
        type="button"
        aria-label={`「${todo.title}」を削除`}
        onClick={(e) => {
          e.stopPropagation();
          onDeleteClick(todo);
        }}
        className="min-h-11 min-w-11 shrink-0 rounded px-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
      >
        削除
      </button>
    </li>
  );
}

export default TodoListItem;
