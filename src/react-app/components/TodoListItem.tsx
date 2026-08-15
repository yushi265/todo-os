import type { DragEventHandler, TouchEventHandler } from "react";
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
  dragEnabled?: boolean;
  isDragOver?: boolean;
  onDragStart?: DragEventHandler<HTMLButtonElement>;
  onDragOver?: DragEventHandler<HTMLLIElement>;
  onDrop?: DragEventHandler<HTMLLIElement>;
  onDragEnd?: DragEventHandler<HTMLButtonElement>;
  onTouchStart?: TouchEventHandler<HTMLButtonElement>;
  onTouchMove?: TouchEventHandler<HTMLButtonElement>;
  onTouchEnd?: TouchEventHandler<HTMLButtonElement>;
  onTouchCancel?: TouchEventHandler<HTMLButtonElement>;
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
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onTouchCancel,
  isDragOver = false,
  dragEnabled = false,
}: TodoListItemProps) {
  const overdue = isOverdue(todo.dueDate, todo.status);
  const next = nextStatus(todo.status);

  return (
    <li
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`flex items-center gap-2 rounded-2xl border p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)] sm:gap-4 ${isDragOver ? "border-chip-border bg-chip-bg" : "border-border-subtle bg-card"}`}
      data-testid={`todo-item-${todo.id}`}
    >
      <button
        type="button"
        aria-label="ドラッグして並び替え"
        title="ドラッグして並び替え"
        draggable={dragEnabled}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
        className={`inline-flex min-h-11 min-w-11 shrink-0 touch-pan-y items-center justify-center rounded-xl text-text-tertiary ${dragEnabled ? "cursor-grab hover:bg-surface" : "cursor-default opacity-30"}`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="currentColor"
        >
          <circle cx="8" cy="6" r="1.5" />
          <circle cx="16" cy="6" r="1.5" />
          <circle cx="8" cy="12" r="1.5" />
          <circle cx="16" cy="12" r="1.5" />
          <circle cx="8" cy="18" r="1.5" />
          <circle cx="16" cy="18" r="1.5" />
        </svg>
      </button>

      <div className="flex min-h-11 min-w-0 flex-1 flex-col gap-1">
        <button
          type="button"
          onClick={() => onClick(todo)}
          className="inline-flex min-h-11 items-center text-left"
        >
          <span className="font-medium text-text-primary">{todo.title}</span>
        </button>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary">
          <button
            type="button"
            aria-label={`「${todo.title}」を「${STATUS_LABEL[next]}」に変更`}
            onClick={(e) => {
              e.stopPropagation();
              onAdvanceStatus(todo);
            }}
            className={`inline-flex shrink-0 items-center justify-center rounded-full px-3 py-1 text-xs font-medium ${STATUS_BADGE_CLASSES[todo.status]}`}
          >
            {STATUS_LABEL[todo.status]}
          </button>
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
      </div>

      <button
        type="button"
        aria-label={`「${todo.title}」を削除`}
        onClick={(e) => {
          e.stopPropagation();
          onDeleteClick(todo);
        }}
        className="min-h-11 min-w-11 shrink-0 rounded-xl px-2 text-text-tertiary hover:bg-danger-bg hover:text-danger"
      >
        削除
      </button>
    </li>
  );
}

export default TodoListItem;
