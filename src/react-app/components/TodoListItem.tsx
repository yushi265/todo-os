import type { TodoResponse } from "../../shared/types";
import { isOverdue } from "../lib/isOverdue";
import {
  nextStatus,
  PRIORITY_LABEL_CLASSES,
  STATUS_BADGE_CLASSES,
  STATUS_LABEL,
} from "../lib/statusStyles";
import TagBadge from "./TagBadge";

interface TodoListItemProps {
  todo: TodoResponse;
  onClick: (todo: TodoResponse) => void;
  onDeleteClick: (todo: TodoResponse) => void;
  /** ステータスバッジクリックによる進行ショートカット（AC-2）。呼び出し元が PATCH 送信を担う。 */
  onAdvanceStatus: (todo: TodoResponse) => void;
}

/**
 * 未完了 TODO（`TODO`/`IN_PROGRESS`）専用のカード型リスト項目（AC-1）。
 * 完了・キャンセル済み TODO は `CompletedTodoListItem` が担当する（判断根拠は index.md 参照）。
 */
function TodoListItem({
  todo,
  onClick,
  onDeleteClick,
  onAdvanceStatus,
}: TodoListItemProps) {
  const overdue = isOverdue(todo.dueDate, todo.status);
  const next = nextStatus(todo.status);

  return (
    <li
      className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)] sm:flex-row sm:items-center sm:gap-4"
      data-testid={`todo-item-${todo.id}`}
    >
      <button
        type="button"
        aria-label={`「${todo.title}」を「${STATUS_LABEL[next]}」に変更`}
        onClick={(e) => {
          e.stopPropagation();
          onAdvanceStatus(todo);
        }}
        className={`inline-flex min-h-11 shrink-0 items-center justify-center self-start rounded-full px-3 py-1 text-xs font-medium ${STATUS_BADGE_CLASSES[todo.status]}`}
      >
        {STATUS_LABEL[todo.status]}
      </button>

      <button
        type="button"
        onClick={() => onClick(todo)}
        className="flex min-h-11 flex-1 flex-col gap-1 text-left"
      >
        <span className="font-medium text-text-primary">{todo.title}</span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary">
          <span
            className={
              todo.priority
                ? PRIORITY_LABEL_CLASSES[todo.priority].className
                : ""
            }
          >
            {todo.priority ? PRIORITY_LABEL_CLASSES[todo.priority].label : "-"}
          </span>
          <span className={overdue ? "font-semibold text-danger" : undefined}>
            {todo.dueDate ?? "-"}
          </span>
          {overdue && (
            <span className="font-semibold text-danger">期限切れ</span>
          )}
        </span>
        {todo.tags.length > 0 && (
          <span
            data-testid={`todo-tags-${todo.id}`}
            className="flex flex-wrap gap-1"
          >
            {todo.tags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} />
            ))}
          </span>
        )}
      </button>

      <button
        type="button"
        aria-label={`「${todo.title}」を削除`}
        onClick={(e) => {
          e.stopPropagation();
          onDeleteClick(todo);
        }}
        className="min-h-11 min-w-11 shrink-0 self-start rounded-xl px-2 text-text-tertiary hover:bg-danger-bg hover:text-danger sm:self-center"
      >
        削除
      </button>
    </li>
  );
}

export default TodoListItem;
