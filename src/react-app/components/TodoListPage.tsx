import { useEffect, useState } from "react";
import type { CreateTodoInput, UpdateTodoInput } from "../../shared/schemas";
import type { TodoResponse } from "../../shared/types";
import { useShowCompleted } from "../hooks/useShowCompleted";
import { useTheme } from "../hooks/useTheme";
import {
  ApiError,
  useCreateTodo,
  useDeleteTodo,
  useReorderTodos,
  useTodos,
  useUpdateTodo,
} from "../hooks/useTodos";
import type { SortBy, TodoFilters } from "../hooks/useTodos";
import { useTags } from "../hooks/useTags";
import { nextStatus } from "../lib/statusStyles";
import { buildFullReorderedIds } from "../lib/reorder";
import {
  isDataInOptimisticOrder,
  orderTodosByIds,
  todoToCreateInput,
  todoToUpdateInput,
} from "../lib/todoTransforms";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import TagManagementModal from "./TagManagementModal";
import TagSwitcher from "./TagSwitcher";
import ThemeSettingsModal from "./ThemeSettingsModal";
import QuickTodoInput from "./QuickTodoInput";
import TodoFilterBar from "./TodoFilterBar";
import TodoFormModal from "./TodoFormModal";
import TodoList from "./TodoList";
import TodoMenu from "./TodoMenu";
import Button from "./ui/button";

type ModalState =
  { type: "create" } | { type: "edit"; todo: TodoResponse } | null;

interface UpdateUndoAction {
  type: "update";
  todoId: number;
  title: string;
  input: UpdateTodoInput;
}

interface RestoreUndoAction {
  type: "restore-delete";
  title: string;
  status: TodoResponse["status"];
  input: CreateTodoInput;
}

type UndoAction = UpdateUndoAction | RestoreUndoAction;

interface ToastState {
  message: string;
  undo?: UndoAction;
}

const TOAST_DURATION_MS = 5000;
export const TAG_FILTER_STORAGE_KEY = "todo-os-tag-filter";

function readStoredTagFilter(): number | null {
  try {
    const stored = window.localStorage.getItem(TAG_FILTER_STORAGE_KEY);
    if (stored === null) return null;

    const tagId = Number(stored);
    return Number.isInteger(tagId) && tagId > 0 ? tagId : null;
  } catch {
    return null;
  }
}

/** TODO 一覧画面。データ取得・状態の出し分け（読み込み中/エラー/空/成功）を統括する。 */
function TodoListPage() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<TodoFilters>({
    status: null,
    priority: null,
    tagId: readStoredTagFilter(),
    due: null,
  });
  const [sortBy, setSortBy] = useState<SortBy>("manual");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const { data, isLoading, isError, refetch } = useTodos({
    search,
    filters,
    sortBy,
    sortOrder,
  });
  const { data: allTodosForReorder = [] } = useTodos(
    {},
    { enabled: sortBy === "manual" },
  );
  const { data: tags = [] } = useTags();
  const [showCompleted, setShowCompleted] = useShowCompleted();
  const { theme, setTheme } = useTheme();
  const [modalState, setModalState] = useState<ModalState>(null);
  const [deleteTarget, setDeleteTarget] = useState<TodoResponse | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
  const [isTagManagementOpen, setIsTagManagementOpen] = useState(false);
  const [isThemeSettingsOpen, setIsThemeSettingsOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timerId = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => window.clearTimeout(timerId);
  }, [toast]);

  useEffect(() => {
    try {
      if (filters.tagId === null) {
        window.localStorage.removeItem(TAG_FILTER_STORAGE_KEY);
      } else {
        window.localStorage.setItem(
          TAG_FILTER_STORAGE_KEY,
          String(filters.tagId),
        );
      }
    } catch {
      // private browsingなどで保存できなくても、現在の画面上の選択は維持する。
    }
  }, [filters.tagId]);

  const deleteMutation = useDeleteTodo();
  const advanceStatusMutation = useUpdateTodo();
  const undoMutation = useUpdateTodo();
  const restoreMutation = useCreateTodo();
  const reorderMutation = useReorderTodos();
  const isUndoPending = undoMutation.isPending || restoreMutation.isPending;
  const [optimisticOrderIds, setOptimisticOrderIds] = useState<number[] | null>(
    null,
  );

  const displayedTodos =
    data && optimisticOrderIds
      ? isDataInOptimisticOrder(data, optimisticOrderIds)
        ? data
        : orderTodosByIds(data, optimisticOrderIds)
      : data;
  function handleNotFound() {
    setToast({ message: "対象の TODO が見つかりませんでした" });
    setModalState(null);
    setDeleteTarget(null);
    void refetch();
  }

  function handleTodoUpdated(previous: TodoResponse, updated: TodoResponse) {
    setToast({
      message: `「${updated.title}」を更新しました`,
      undo: {
        type: "update",
        todoId: updated.id,
        title: updated.title,
        input: todoToUpdateInput(previous),
      },
    });
  }

  function handleUndo() {
    const undo = toast?.undo;
    if (!undo || isUndoPending) return;

    setToast({ message: "元に戻しています…" });
    if (undo.type === "restore-delete") {
      restoreMutation.mutate(undo.input, {
        onSuccess: (restored) => {
          if (undo.status === "TODO") {
            setToast({ message: `「${undo.title}」を元に戻しました` });
            return;
          }

          undoMutation.mutate(
            { id: restored.id, input: { status: undo.status } },
            {
              onSuccess: () =>
                setToast({ message: `「${undo.title}」を元に戻しました` }),
              onError: (error) => {
                if (error instanceof ApiError && error.status === 404) {
                  handleNotFound();
                  return;
                }
                setToast({
                  message:
                    "元に戻せませんでした。時間をおいて再度お試しください",
                });
              },
            },
          );
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 404) {
            handleNotFound();
            return;
          }
          setToast({
            message: "元に戻せませんでした。時間をおいて再度お試しください",
          });
        },
      });
      return;
    }

    undoMutation.mutate(
      { id: undo.todoId, input: undo.input },
      {
        onSuccess: () =>
          setToast({ message: `「${undo.title}」を元に戻しました` }),
        onError: (error) => {
          if (error instanceof ApiError && error.status === 404) {
            handleNotFound();
            return;
          }
          setToast({
            message: "元に戻せませんでした。時間をおいて再度お試しください",
          });
        },
      },
    );
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    deleteMutation.mutate(target.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        setToast({
          message: `「${target.title}」を削除しました`,
          undo: {
            type: "restore-delete",
            title: target.title,
            status: target.status,
            input: todoToCreateInput(target),
          },
        });
      },
      onError: (error) => {
        if (error instanceof ApiError && error.status === 404) {
          handleNotFound();
          return;
        }
        setToast({ message: "時間をおいて再度お試しください" });
      },
    });
  }

  /**
   * ステータス進行ショートカット（AC-2）。`nextStatus` のみを PATCH で送信し、
   * 成功時は変更前の値を復元できるトーストを表示する。404 は既存の削除時パターンに
   * 準拠する（ui.md 異常系挙動）。
   */
  function handleAdvanceStatus(todo: TodoResponse) {
    const next = nextStatus(todo.status);
    if (next === todo.status) return;
    advanceStatusMutation.mutate(
      { id: todo.id, input: { status: next } },
      {
        onSuccess: () => {
          setToast({
            message:
              next === "DONE"
                ? `「${todo.title}」を完了にしました`
                : `「${todo.title}」のステータスを変更しました`,
            undo: {
              type: "update",
              todoId: todo.id,
              title: todo.title,
              input: todoToUpdateInput(todo),
            },
          });
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 404) {
            handleNotFound();
            return;
          }
          setToast({ message: "時間をおいて再度お試しください" });
        },
      },
    );
  }

  function handleReorder(visibleIdsInNewOrder: number[]) {
    if (sortBy !== "manual") return;

    // 全件取得がまだ完了していない初期タイミングでは、フィルターなしの
    // 一覧データを使える場合だけフォールバックする（通常は追加取得側が使われる）。
    const allTodos = allTodosForReorder.length > 0 ? allTodosForReorder : data;
    if (!allTodos || allTodos.length === 0) return;

    const previousOrder = optimisticOrderIds ?? allTodos.map((todo) => todo.id);
    const todoIds = buildFullReorderedIds(allTodos, visibleIdsInNewOrder);
    setOptimisticOrderIds(todoIds);
    reorderMutation.mutate(
      { todoIds },
      {
        onError: () => {
          setOptimisticOrderIds(previousOrder);
          setToast({ message: "時間をおいて再度お試しください" });
        },
      },
    );
  }

  const hasListConditions =
    search.length > 0 || Object.values(filters).some((value) => value !== null);

  return (
    <div className="min-h-screen bg-surface">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-text-primary focus:shadow-lg"
      >
        メインコンテンツへ移動
      </a>
      <div className="mx-auto max-w-3xl p-4">
        <main id="main-content" tabIndex={-1} aria-label="TODO一覧">
          <div className="mb-3 flex min-w-0 items-center gap-3 sm:mb-4">
            <div className="min-w-0 flex-1">
              <TagSwitcher
                tags={tags}
                selectedTagId={filters.tagId}
                onTagChange={(tagId) =>
                  setFilters((current) => ({ ...current, tagId }))
                }
              />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setModalState({ type: "create" })}
                className="hidden font-bold sm:inline-block sm:text-xs"
              >
                + 追加
              </Button>
              <Button
                variant="outline"
                aria-label="メニュー"
                title="メニュー"
                aria-haspopup="dialog"
                aria-expanded={isMenuOpen}
                aria-controls="todo-menu"
                onClick={() => setIsMenuOpen(true)}
                className="min-h-11 min-w-11 shrink-0 p-0 text-lg leading-none"
              >
                <span aria-hidden="true">☰</span>
              </Button>
            </div>
          </div>

          <div className="mb-5 space-y-3 sm:mb-6 sm:space-y-4">
            <QuickTodoInput tags={tags} />

            {isFilterBarOpen && (
              <div id="todo-filter-panel" className="pt-2 sm:pt-3">
                <TodoFilterBar
                  search={search}
                  onSearchChange={setSearch}
                  filters={filters}
                  onFiltersChange={setFilters}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSortChange={(nextSortBy, nextSortOrder) => {
                    setSortBy(nextSortBy);
                    setSortOrder(nextSortOrder);
                  }}
                  tags={tags}
                />
              </div>
            )}
          </div>

          {isLoading && (
            <p role="status" className="py-10 text-center text-text-tertiary">
              読み込み中...
            </p>
          )}

          {isError && (
            <div className="py-10 text-center" role="alert">
              <p className="mb-4 text-danger">TODO の取得に失敗しました</p>
              <Button
                variant="outline"
                onClick={() => refetch()}
                className="font-normal sm:text-xs"
              >
                再試行
              </Button>
            </div>
          )}

          {!isLoading &&
            !isError &&
            displayedTodos &&
            displayedTodos.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border-dashed px-5 py-10 text-center">
                <p className="mb-4 text-text-tertiary">
                  {hasListConditions
                    ? "条件に一致する TODO がありません"
                    : "TODO はまだありません"}
                </p>
                {!hasListConditions && (
                  <Button
                    size="lg"
                    onClick={() => setModalState({ type: "create" })}
                    className="hidden font-bold sm:text-xs sm:inline-block"
                  >
                    + 最初の TODO を追加
                  </Button>
                )}
              </div>
            )}

          {!isLoading &&
            !isError &&
            displayedTodos &&
            displayedTodos.length > 0 && (
              <TodoList
                todos={displayedTodos}
                showCompleted={showCompleted}
                onItemClick={(todo) => setModalState({ type: "edit", todo })}
                onDeleteClick={setDeleteTarget}
                onAdvanceStatus={handleAdvanceStatus}
                dragEnabled={sortBy === "manual"}
                onReorder={handleReorder}
              />
            )}
        </main>
      </div>

      {isMenuOpen && (
        <TodoMenu
          showCompleted={showCompleted}
          onShowCompletedChange={setShowCompleted}
          isFilterBarOpen={isFilterBarOpen}
          onFilterBarOpenChange={setIsFilterBarOpen}
          onSettingsClick={() => {
            setIsMenuOpen(false);
            setIsThemeSettingsOpen(true);
          }}
          onTagManagementClick={() => {
            setIsMenuOpen(false);
            setIsTagManagementOpen(true);
          }}
          onClose={() => setIsMenuOpen(false)}
        />
      )}

      <Button
        size="icon"
        aria-label="TODOを追加"
        onClick={() => setModalState({ type: "create" })}
        className="fixed bottom-6 right-6 z-10 flex h-14 w-14 items-center justify-center rounded-full p-0 text-2xl font-bold sm:hidden"
      >
        <span aria-hidden="true">+</span>
      </Button>

      {modalState && (
        <TodoFormModal
          isEdit={modalState.type === "edit"}
          todo={modalState.type === "edit" ? modalState.todo : null}
          onClose={() => setModalState(null)}
          onNotFound={handleNotFound}
          onUpdated={handleTodoUpdated}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmDialog
          title="TODOを削除"
          message={`「${deleteTarget.title}」を削除しますか？この操作は取り消せません。`}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
          isPending={deleteMutation.isPending}
        />
      )}

      {isTagManagementOpen && (
        <TagManagementModal onClose={() => setIsTagManagementOpen(false)} />
      )}

      {isThemeSettingsOpen && (
        <ThemeSettingsModal
          theme={theme}
          onThemeChange={setTheme}
          onClose={() => setIsThemeSettingsOpen(false)}
        />
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 bottom-24 sm:bottom-4 mx-auto flex w-fit items-center gap-3 rounded-xl bg-text-primary px-4 py-3 sm:px-3 sm:py-2 text-white shadow-[0_12px_36px_rgba(0,0,0,0.32)] animate-[toast-in_0.18s_ease-out]"
        >
          <span className="text-sm sm:text-xs">{toast.message}</span>
          {toast.undo && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={handleUndo}
              disabled={isUndoPending}
              className="min-h-11 rounded-lg px-2 text-sm font-bold text-white hover:bg-white/10 hover:text-white sm:min-h-9 sm:text-xs"
            >
              元に戻す
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            type="button"
            aria-label="閉じる"
            onClick={() => setToast(null)}
            className="min-h-11 min-w-11 rounded-lg bg-transparent p-0 text-white/80 hover:bg-white/10 hover:text-white"
          >
            ×
          </Button>
        </div>
      )}
    </div>
  );
}

export default TodoListPage;
