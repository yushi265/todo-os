import type {
  DragEventHandler,
  KeyboardEventHandler,
  TouchEventHandler,
} from "react";
import type { TodoResponse } from "../../shared/types";
import { STATUS_LABEL } from "../lib/statusStyles";
import TagBadge from "./TagBadge";

interface CompletedTodoListItemProps {
  todo: TodoResponse;
  onClick: (todo: TodoResponse) => void;
  onDeleteClick: (todo: TodoResponse) => void;
  dragEnabled?: boolean;
  isDragOver?: boolean;
  isKeyboardDragging?: boolean;
  onDragStart?: DragEventHandler<HTMLElement>;
  onDragOver?: DragEventHandler<HTMLLIElement>;
  onDrop?: DragEventHandler<HTMLLIElement>;
  onDragEnd?: DragEventHandler<HTMLElement>;
  onKeyDown?: KeyboardEventHandler<HTMLLIElement>;
  onTouchStart?: TouchEventHandler<HTMLElement>;
  onTouchMove?: TouchEventHandler<HTMLElement>;
  onTouchEnd?: TouchEventHandler<HTMLElement>;
  onTouchCancel?: TouchEventHandler<HTMLElement>;
}

const ICON: Record<"DONE" | "CANCELED", string> = {
  DONE: "✓",
  CANCELED: "×",
};

const ICON_CLASSES: Record<"DONE" | "CANCELED", string> = {
  DONE: "bg-status-done-bg text-status-done-fg",
  CANCELED: "bg-status-canceled-bg text-status-canceled-fg",
};

/**
 * 完了・キャンセル済み（`DONE`/`CANCELED`）専用の表示簡略化リスト項目（AC-5）。
 * ステータス進行 UI は持たず、操作は削除のみ（行クリックでの編集モーダル導線は維持）。
 */
function CompletedTodoListItem({
  todo,
  onClick,
  onDeleteClick,
  dragEnabled = false,
  isDragOver = false,
  isKeyboardDragging = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onKeyDown,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onTouchCancel,
}: CompletedTodoListItemProps) {
  // props 契約上は DONE/CANCELED のみが渡される想定（TodoList が振り分ける）。
  const iconKey = todo.status === "DONE" ? "DONE" : "CANCELED";

  return (
    <li
      draggable={dragEnabled}
      tabIndex={dragEnabled ? 0 : undefined}
      aria-label={`「${todo.title}」`}
      aria-grabbed={isKeyboardDragging}
      aria-describedby={dragEnabled ? "todo-reorder-help" : undefined}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      className={`flex animate-[todo-item-in_0.24s_ease-out] items-center gap-3 rounded-2xl border p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:gap-2 sm:p-3 ${dragEnabled ? "cursor-grab" : ""} ${isDragOver || isKeyboardDragging ? "border-chip-border bg-chip-bg" : "border-border-subtle bg-card"}`}
      data-testid={`todo-item-${todo.id}`}
    >
      <span
        aria-hidden="true"
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${ICON_CLASSES[iconKey]}`}
      >
        {ICON[iconKey]}
      </span>

      <button
        type="button"
        onClick={() => onClick(todo)}
        className="flex min-h-11 flex-1 flex-col gap-1 text-left"
      >
        <span className="font-medium text-text-secondary line-through">
          {todo.title}
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-tertiary sm:text-xs">
          <span>{STATUS_LABEL[todo.status]}</span>
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
      </button>

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

export default CompletedTodoListItem;
