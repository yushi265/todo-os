import type { TodoResponse } from "../../shared/types";
import { STATUS_ICON, STATUS_ICON_CLASSES } from "../lib/statusStyles";
import TagBadge from "./TagBadge";
import TodoCardShell from "./TodoCardShell";

interface CompletedTodoListItemProps {
  todo: TodoResponse;
  onClick: (todo: TodoResponse) => void;
  onDeleteClick: (todo: TodoResponse) => void;
}

/**
 * 完了・キャンセル済み（`DONE`/`CANCELED`）専用の表示簡略化リスト項目（AC-5）。
 * ステータス進行 UI は持たず、操作は削除のみ（行クリックでの編集モーダル導線は維持）。
 */
function CompletedTodoListItem({
  todo,
  onClick,
  onDeleteClick,
}: CompletedTodoListItemProps) {
  // props 契約上は DONE/CANCELED のみが渡される想定（TodoList が振り分ける）。
  const iconKey = todo.status === "DONE" ? "DONE" : "CANCELED";

  return (
    <TodoCardShell
      todo={todo}
      statusIcon={
        <span
          aria-hidden="true"
          data-testid={`status-icon-${todo.status}`}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${STATUS_ICON_CLASSES[iconKey]}`}
        >
          {STATUS_ICON[iconKey]}
        </span>
      }
      onCardClick={onClick}
      onDeleteClick={onDeleteClick}
    >
      <div className="flex min-w-0 flex-1 flex-col items-stretch gap-1 text-left">
        <span className="font-medium text-text-secondary line-through">
          {todo.title}
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-tertiary sm:text-xs">
          <span>{todo.updatedAt}</span>
        </span>
        {todo.tags.length > 0 && (
          <span
            data-testid={`todo-tags-${todo.id}`}
            className="flex flex-wrap gap-1"
          >
            {todo.tags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} muted />
            ))}
          </span>
        )}
      </div>
    </TodoCardShell>
  );
}

export default CompletedTodoListItem;
