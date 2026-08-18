import type {
  DragEventHandler,
  KeyboardEventHandler,
  TouchEventHandler,
} from "react";
import type { TodoResponse } from "../../shared/types";
import { dueDateStatus, type DueDateStatus } from "../lib/dueDateStatus";
import { containsHttpUrl } from "../lib/linkify";
import LinkifiedText from "./LinkifiedText";
import {
  nextStatus,
  PRIORITY_ICON,
  PRIORITY_LABEL_CLASSES,
  STATUS_ICON,
  STATUS_ICON_CLASSES,
  STATUS_LABEL,
} from "../lib/statusStyles";
import TagBadge from "./TagBadge";
import TodoCardShell from "./TodoCardShell";
import TodoDescriptionIndicator from "./TodoDescriptionIndicator";
import TodoSubtaskProgress from "./TodoSubtaskProgress";
import Button from "./ui/button";

const DUE_DATE_STATUS_CLASSES: Record<Exclude<DueDateStatus, null>, string> = {
  overdue: "font-semibold text-danger",
  today: "font-semibold text-primary",
  soon: "font-medium text-priority-medium",
};

const DUE_DATE_STATUS_ARIA_LABELS: Record<
  Exclude<DueDateStatus, null>,
  string
> = {
  overdue: "期限切れ",
  today: "本日期限",
  soon: "近日",
};

const DUE_DATE_STATUS_MARKERS: Record<Exclude<DueDateStatus, null>, string> = {
  overdue: "⚠️",
  today: "📅",
  soon: "⏰",
};

interface TodoListItemProps {
  todo: TodoResponse;
  onClick: (todo: TodoResponse) => void;
  onDeleteClick: (todo: TodoResponse) => void;
  /** ステータスアイコンクリックによる進行ショートカット（AC-2）。呼び出し元が PATCH 送信を担う。 */
  onAdvanceStatus: (todo: TodoResponse) => void;
  dragEnabled?: boolean;
  isDragging?: boolean;
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
  onKeyDown,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onTouchCancel,
  isDragging = false,
  isDragOver = false,
  isKeyboardDragging = false,
  dragEnabled = false,
}: TodoListItemProps) {
  const dueStatus = dueDateStatus(todo.dueDate, todo.status);
  const next = nextStatus(todo.status);
  const description = todo.description?.trim() ?? "";
  const descriptionHasUrl = containsHttpUrl(description);

  return (
    <TodoCardShell
      todo={todo}
      statusIcon={
        <Button
          variant="ghost"
          size="icon"
          type="button"
          aria-label={`「${todo.title}」を「${STATUS_LABEL[next]}」に変更`}
          title={`「${todo.title}」を「${STATUS_LABEL[next]}」に変更`}
          onClick={(e) => {
            e.stopPropagation();
            onAdvanceStatus(todo);
          }}
          data-drag-exclude="true"
          data-testid={`status-icon-${todo.status}`}
          className={`shrink-0 !rounded-full text-sm font-bold transition-transform active:scale-[0.98] ${STATUS_ICON_CLASSES[todo.status]}`}
        >
          {STATUS_ICON[todo.status]}
        </Button>
      }
      onCardClick={onClick}
      onDeleteClick={onDeleteClick}
      dragEnabled={dragEnabled}
      isDragging={isDragging}
      isDragOver={isDragOver}
      isKeyboardDragging={isKeyboardDragging}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1 px-3 sm:px-2.5">
        <LinkifiedText
          text={todo.title}
          className="text-sm font-medium text-text-primary"
        />
        {descriptionHasUrl && (
          <LinkifiedText
            text={description}
            className="line-clamp-2 break-words text-xs text-text-secondary"
          />
        )}
        {(description ||
          todo.priority ||
          todo.dueDate ||
          todo.tags.length > 0 ||
          todo.subtasks.length > 0) && (
          <span className="flex w-full min-w-0 flex-nowrap items-center gap-x-2 overflow-x-auto text-sm text-text-secondary sm:gap-x-1.5 sm:text-xs">
            {description && !descriptionHasUrl && <TodoDescriptionIndicator />}
            {todo.priority && (
              <span
                role="img"
                aria-label={PRIORITY_LABEL_CLASSES[todo.priority].label}
                title={PRIORITY_LABEL_CLASSES[todo.priority].label}
                data-testid={`priority-icon-${todo.priority}`}
                className={`shrink-0 ${PRIORITY_LABEL_CLASSES[todo.priority].className}`}
              >
                {PRIORITY_ICON[todo.priority]}
              </span>
            )}
            {todo.dueDate && (
              <span
                data-testid={dueStatus ? `due-status-${dueStatus}` : undefined}
                className={`shrink-0 ${dueStatus ? DUE_DATE_STATUS_CLASSES[dueStatus] : ""}`}
              >
                {dueStatus && (
                  <span
                    role="img"
                    aria-label={DUE_DATE_STATUS_ARIA_LABELS[dueStatus]}
                    data-testid={`due-status-marker-${dueStatus}`}
                    className="mr-1"
                  >
                    {DUE_DATE_STATUS_MARKERS[dueStatus]}
                  </span>
                )}
                {todo.dueDate}
              </span>
            )}
            {todo.tags.length > 0 && (
              <span
                data-testid={`todo-tags-${todo.id}`}
                className="flex shrink-0 flex-nowrap gap-1"
              >
                {todo.tags.map((tag) => (
                  <TagBadge key={tag.id} tag={tag} />
                ))}
              </span>
            )}
            <TodoSubtaskProgress subtasks={todo.subtasks} />
          </span>
        )}
      </div>
    </TodoCardShell>
  );
}

export default TodoListItem;
