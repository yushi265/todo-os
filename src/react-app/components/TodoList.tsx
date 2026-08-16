import { useEffect, useRef, useState } from "react";
import type { DragEvent, KeyboardEvent, TouchEvent } from "react";
import type { TodoResponse } from "../../shared/types";
import { buildReorderedIds } from "../lib/reorder";
import CompletedTodoListItem from "./CompletedTodoListItem";
import TodoListItem from "./TodoListItem";

const COMPLETED_STATUSES: readonly TodoResponse["status"][] = [
  "DONE",
  "CANCELED",
];
const LONG_PRESS_MS = 500;
const CANCEL_THRESHOLD_PX = 10;
const CLICK_SUPPRESSION_MS = 500;

interface TodoListProps {
  todos: TodoResponse[];
  showCompleted: boolean;
  onItemClick: (todo: TodoResponse) => void;
  onDeleteClick: (todo: TodoResponse) => void;
  /** ステータスアイコンクリックによる進行ショートカット（AC-2）。未完了行にのみ配線する。 */
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
  const [keyboardDragId, setKeyboardDragId] = useState<number | null>(null);
  const [dragAnnouncement, setDragAnnouncement] = useState("");
  const suppressClickRef = useRef(false);
  const suppressClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const touchStateRef = useRef<{
    todoId: number;
    startX: number;
    startY: number;
    timerId: ReturnType<typeof setTimeout> | null;
  } | null>(null);
  const visibleTodos = showCompleted
    ? todos
    : todos.filter((todo) => !isCompleted(todo));

  const openTodos = visibleTodos.filter((todo) => !isCompleted(todo));
  const completedTodos = visibleTodos.filter(isCompleted);
  const orderedVisibleTodos = [...openTodos, ...completedTodos];
  const draggableTodos = openTodos;
  const draggableTodoIds = new Set(draggableTodos.map((todo) => todo.id));

  useEffect(() => {
    // Reactのtouchmoveはpassiveリスナーになる環境があるため、ドラッグ成立後の
    // スクロール抑止だけは、明示的にnon-passiveなネイティブリスナーで行う。
    const preventScrollWhileDragging = (event: Event) => {
      if (touchStateRef.current?.timerId === null) {
        event.preventDefault();
      }
    };

    document.addEventListener("touchmove", preventScrollWhileDragging, {
      capture: true,
      passive: false,
    });

    return () => {
      document.removeEventListener(
        "touchmove",
        preventScrollWhileDragging,
        true,
      );
      const timerId = touchStateRef.current?.timerId;
      if (timerId !== null && timerId !== undefined) {
        clearTimeout(timerId);
      }
      const suppressClickTimerId = suppressClickTimerRef.current;
      if (suppressClickTimerId !== null) {
        clearTimeout(suppressClickTimerId);
      }
    };
  }, []);

  function suppressNextClick() {
    suppressClickRef.current = true;
    const previousTimerId = suppressClickTimerRef.current;
    if (previousTimerId !== null) clearTimeout(previousTimerId);
    suppressClickTimerRef.current = setTimeout(() => {
      suppressClickRef.current = false;
      suppressClickTimerRef.current = null;
    }, CLICK_SUPPRESSION_MS);
  }

  function resetTouchState() {
    const state = touchStateRef.current;
    if (state?.timerId !== null && state?.timerId !== undefined) {
      clearTimeout(state.timerId);
    }
    touchStateRef.current = null;
    setDragId(null);
    setDragOverId(null);
    setKeyboardDragId(null);
  }

  function commitReorder(sourceId: number, targetId: number) {
    const ids = buildReorderedIds(
      draggableTodos.map((todo) => todo.id),
      sourceId,
      targetId,
    );
    if (!ids) return;
    onReorder(ids);
  }

  function handleDragStart(todoId: number) {
    return (event: DragEvent<HTMLElement>) => {
      if (!dragEnabled) return;
      setDragId(todoId);
      setKeyboardDragId(null);
      setDragAnnouncement(
        "並び替え中です。移動先の TODO でドロップしてください。",
      );
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

      commitReorder(dragId, todoId);
      setDragId(null);
      setDragOverId(null);
      setDragAnnouncement("");
    };
  }

  function handleTouchStart(todoId: number) {
    return (event: TouchEvent<HTMLElement>) => {
      if (!dragEnabled) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-drag-exclude], a, input, select, textarea")) {
        return;
      }
      const touch = event.touches[0];
      if (!touch) return;

      const previousTimerId = touchStateRef.current?.timerId;
      if (previousTimerId !== null && previousTimerId !== undefined) {
        clearTimeout(previousTimerId);
      }
      touchStateRef.current = null;
      setDragId(null);
      setDragOverId(null);

      const timerId = setTimeout(() => {
        const state = touchStateRef.current;
        if (!state || state.todoId !== todoId || state.timerId !== timerId) {
          return;
        }
        setDragId(todoId);
        state.timerId = null;
      }, LONG_PRESS_MS);
      touchStateRef.current = {
        todoId,
        startX: touch.clientX,
        startY: touch.clientY,
        timerId,
      };
    };
  }

  function handleTouchMove(event: TouchEvent<HTMLElement>) {
    const state = touchStateRef.current;
    if (!state) return;
    const touch = event.touches[0];
    if (!touch) return;
    const dx = Math.abs(touch.clientX - state.startX);
    const dy = Math.abs(touch.clientY - state.startY);

    if (state.timerId !== null) {
      if (dx > CANCEL_THRESHOLD_PX || dy > CANCEL_THRESHOLD_PX) {
        clearTimeout(state.timerId);
        touchStateRef.current = null;
      }
      return;
    }

    event.preventDefault();
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const li = target?.closest('li[data-testid^="todo-item-"]');
    const idAttr = li?.getAttribute("data-testid");
    const todoId = idAttr ? Number(idAttr.replace("todo-item-", "")) : NaN;
    if (!Number.isNaN(todoId) && draggableTodoIds.has(todoId)) {
      setDragOverId(todoId);
    } else {
      setDragOverId(null);
    }
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    const state = touchStateRef.current;
    if (!state) return;
    if (state.timerId !== null) {
      clearTimeout(state.timerId);
    } else if (dragOverId !== null) {
      event.preventDefault();
      suppressNextClick();
      commitReorder(state.todoId, dragOverId);
    } else {
      event.preventDefault();
      suppressNextClick();
    }
    resetTouchState();
  }

  function handleCardClick(todo: TodoResponse) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      const timerId = suppressClickTimerRef.current;
      if (timerId !== null) clearTimeout(timerId);
      suppressClickTimerRef.current = null;
      return;
    }
    onItemClick(todo);
  }

  function handleTouchCancel() {
    resetTouchState();
  }

  function handleDragEnd() {
    setDragId(null);
    setDragOverId(null);
    setDragAnnouncement("");
  }

  function handleKeyDown(todoId: number) {
    return (event: KeyboardEvent<HTMLLIElement>) => {
      if (!dragEnabled) return;

      if (event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        if (keyboardDragId === todoId) {
          setKeyboardDragId(null);
          setDragOverId(null);
          setDragAnnouncement("");
        } else {
          setKeyboardDragId(todoId);
          setDragOverId(todoId);
          setDragAnnouncement(
            `「${visibleTodos.find((todo) => todo.id === todoId)?.title ?? "TODO"}」を選択しました。上下矢印で移動し、スペースで確定します。`,
          );
        }
        return;
      }

      if (event.key === "Escape" && keyboardDragId === todoId) {
        event.preventDefault();
        setKeyboardDragId(null);
        setDragOverId(null);
        setDragAnnouncement("");
        return;
      }

      if (
        keyboardDragId !== todoId ||
        (event.key !== "ArrowUp" && event.key !== "ArrowDown")
      ) {
        return;
      }

      event.preventDefault();
      const currentIndex = draggableTodos.findIndex(
        (todo) => todo.id === todoId,
      );
      const targetIndex = currentIndex + (event.key === "ArrowUp" ? -1 : 1);
      const target = draggableTodos[targetIndex];
      if (!target) return;
      commitReorder(todoId, target.id);
      setDragOverId(target.id);
      setDragAnnouncement(
        `「${visibleTodos.find((todo) => todo.id === todoId)?.title ?? "TODO"}」を${targetIndex + 1}番目へ移動しました。`,
      );
    };
  }

  if (visibleTodos.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border-dashed px-4 py-6 text-center text-sm text-text-tertiary">
        表示する TODO がありません
      </p>
    );
  }

  return (
    <>
      {dragEnabled && (
        <p
          id="todo-reorder-help"
          className="sr-only"
          role={dragAnnouncement ? "status" : undefined}
          aria-live="polite"
        >
          未完了TODOカードはドラッグ、またはカードにフォーカスしてスペースと上下矢印で並び替えできます。
          スペースで確定、Escapeでキャンセルします。
          {dragAnnouncement}
        </p>
      )}
      <ul aria-label="TODO一覧" className="flex flex-col gap-3 sm:gap-2">
        {orderedVisibleTodos.map((todo) =>
          isCompleted(todo) ? (
            <CompletedTodoListItem
              key={todo.id}
              todo={todo}
              onClick={handleCardClick}
              onDeleteClick={onDeleteClick}
            />
          ) : (
            <TodoListItem
              key={todo.id}
              todo={todo}
              onClick={handleCardClick}
              onDeleteClick={onDeleteClick}
              onAdvanceStatus={onAdvanceStatus}
              dragEnabled={dragEnabled}
              onDragStart={handleDragStart(todo.id)}
              onDragOver={handleDragOver(todo.id)}
              onDrop={handleDrop(todo.id)}
              onDragEnd={handleDragEnd}
              onKeyDown={handleKeyDown(todo.id)}
              onTouchStart={handleTouchStart(todo.id)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchCancel}
              isDragging={dragId === todo.id}
              isKeyboardDragging={keyboardDragId === todo.id}
              isDragOver={dragOverId === todo.id}
            />
          ),
        )}
      </ul>
    </>
  );
}

export default TodoList;
