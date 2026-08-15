import type {
  DragEventHandler,
  KeyboardEventHandler,
  ReactNode,
  TouchEventHandler,
} from "react";
import type { TodoResponse } from "../../shared/types";
import Button from "./ui/button";

interface TodoCardShellProps {
  todo: TodoResponse;
  statusIcon: ReactNode;
  children: ReactNode;
  onCardClick: (todo: TodoResponse) => void;
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

/** 未完了・完了済みカードで共通する外枠とカード操作を管理する。 */
function TodoCardShell({
  todo,
  statusIcon,
  children,
  onCardClick,
  onDeleteClick,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onKeyDown,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onTouchCancel,
  isDragOver = false,
  isKeyboardDragging,
  dragEnabled = false,
}: TodoCardShellProps) {
  return (
    <li
      role="button"
      tabIndex={0}
      onClick={() => onCardClick(todo)}
      onKeyDown={(event) => {
        if ((event.target as HTMLElement).closest("[data-drag-exclude]")) {
          return;
        }
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (event.key === "Enter" || (event.key === " " && !dragEnabled)) {
          event.preventDefault();
          onCardClick(todo);
        }
      }}
      onDragOver={onDragOver}
      onDrop={onDrop}
      draggable={dragEnabled}
      aria-label={`「${todo.title}」`}
      aria-grabbed={isKeyboardDragging}
      aria-describedby={dragEnabled ? "todo-reorder-help" : undefined}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      className={`flex animate-[todo-item-in_0.24s_ease-out] items-center gap-2 rounded-2xl border border-border-subtle bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)] ${dragEnabled ? "cursor-grab" : "cursor-pointer"} ${isDragOver || isKeyboardDragging ? "border-chip-border bg-chip-bg" : ""} sm:gap-1.5 sm:p-3`}
      data-testid={`todo-item-${todo.id}`}
    >
      {statusIcon}
      {children}
      <Button
        variant="ghost"
        size="icon"
        type="button"
        aria-label={`「${todo.title}」を削除`}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onDeleteClick(todo);
        }}
        data-drag-exclude="true"
        className="min-h-11 min-w-11 shrink-0 rounded-xl text-text-tertiary hover:bg-danger-bg hover:text-danger"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v5M14 11v5" />
        </svg>
      </Button>
    </li>
  );
}

export default TodoCardShell;
