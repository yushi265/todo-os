import { useState } from "react";
import type { TodoResponse } from "../../shared/types";
import { useShowCompleted } from "../hooks/useShowCompleted";
import {
  ApiError,
  useDeleteTodo,
  useReorderTodos,
  useTodos,
  useUpdateTodo,
} from "../hooks/useTodos";
import type { SortBy, TodoFilters } from "../hooks/useTodos";
import { useTags } from "../hooks/useTags";
import { nextStatus } from "../lib/statusStyles";
import { buildFullReorderedIds } from "../lib/reorder";
import CompletedToggle from "./CompletedToggle";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import TagManagementModal from "./TagManagementModal";
import TodoFilterBar from "./TodoFilterBar";
import TodoFormModal from "./TodoFormModal";
import TodoList from "./TodoList";

type ModalState =
  { type: "create" } | { type: "edit"; todo: TodoResponse } | null;

function orderTodosByIds(
  todos: TodoResponse[],
  orderedIds: number[],
): TodoResponse[] {
  const positions = new Map(orderedIds.map((id, index) => [id, index]));
  return [...todos].sort(
    (left, right) =>
      (positions.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (positions.get(right.id) ?? Number.MAX_SAFE_INTEGER),
  );
}

function isDataInOptimisticOrder(
  data: TodoResponse[],
  optimisticOrderIds: number[],
): boolean {
  const dataIds = data.map((todo) => todo.id);
  const expectedIds = optimisticOrderIds.filter((id) => dataIds.includes(id));
  return (
    expectedIds.length === dataIds.length &&
    expectedIds.every((id, index) => id === dataIds[index])
  );
}

/** TODO 一覧画面。データ取得・状態の出し分け（読み込み中/エラー/空/成功）を統括する。 */
function TodoListPage() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<TodoFilters>({
    status: null,
    priority: null,
    tagId: null,
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
  const [modalState, setModalState] = useState<ModalState>(null);
  const [deleteTarget, setDeleteTarget] = useState<TodoResponse | null>(null);
  const [isTagManagementOpen, setIsTagManagementOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const deleteMutation = useDeleteTodo();
  const advanceStatusMutation = useUpdateTodo();
  const reorderMutation = useReorderTodos();
  const [optimisticOrderIds, setOptimisticOrderIds] = useState<number[] | null>(
    null,
  );

  const displayedTodos =
    data && optimisticOrderIds
      ? isDataInOptimisticOrder(data, optimisticOrderIds)
        ? data
        : orderTodosByIds(data, optimisticOrderIds)
      : data;
  const activeCount =
    displayedTodos?.filter(
      (todo) => todo.status === "TODO" || todo.status === "IN_PROGRESS",
    ).length ?? 0;

  function handleNotFound() {
    setToast("対象の TODO が見つかりませんでした");
    setModalState(null);
    setDeleteTarget(null);
    void refetch();
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
      onError: (error) => {
        if (error instanceof ApiError && error.status === 404) {
          handleNotFound();
          return;
        }
        setToast("時間をおいて再度お試しください");
      },
    });
  }

  /**
   * ステータス進行ショートカット（AC-2）。`nextStatus` のみを PATCH で送信し、
   * `DONE` 到達時のみ完了トーストを表示する（AC-3）。404 は既存の削除時パターンに準拠する
   * （ui.md 異常系挙動）。
   */
  function handleAdvanceStatus(todo: TodoResponse) {
    const next = nextStatus(todo.status);
    if (next === todo.status) return;
    advanceStatusMutation.mutate(
      { id: todo.id, input: { status: next } },
      {
        onSuccess: () => {
          if (next === "DONE") {
            setToast(`「${todo.title}」を完了にしました`);
          }
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 404) {
            handleNotFound();
            return;
          }
          setToast("時間をおいて再度お試しください");
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
          setToast("時間をおいて再度お試しください");
        },
      },
    );
  }

  const hasListConditions =
    search.length > 0 || Object.values(filters).some((value) => value !== null);

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-3xl p-4">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-3 w-3 shrink-0 rounded bg-primary"
            />
            <h1 className="text-xl font-bold text-text-primary sm:text-2xl">
              todo-os
            </h1>
            <span className="text-xs font-medium text-text-tertiary">
              残り{activeCount}件
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <CompletedToggle
              checked={showCompleted}
              onChange={setShowCompleted}
            />
            <button
              type="button"
              onClick={() => setIsTagManagementOpen(true)}
              className="min-h-11 rounded-xl border border-border bg-card px-4 py-2 text-sm text-text-secondary hover:bg-surface"
            >
              タグ管理
            </button>
            <button
              type="button"
              onClick={() => setModalState({ type: "create" })}
              className="hidden min-h-11 rounded-xl bg-primary px-4 py-2 font-bold text-white shadow-[0_4px_14px_rgba(79,70,229,0.3)] hover:bg-primary-hover sm:inline-block"
            >
              + 追加
            </button>
          </div>
        </header>

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

        {isLoading && (
          <p role="status" className="py-10 text-center text-text-tertiary">
            読み込み中...
          </p>
        )}

        {isError && (
          <div className="py-10 text-center">
            <p className="mb-4 text-danger">TODO の取得に失敗しました</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="min-h-11 rounded-xl border border-border bg-card px-4 py-2 text-text-secondary hover:bg-surface"
            >
              再試行
            </button>
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
                <button
                  type="button"
                  onClick={() => setModalState({ type: "create" })}
                  className="hidden min-h-11 rounded-xl bg-primary px-6 py-3 font-bold text-white shadow-[0_4px_14px_rgba(79,70,229,0.3)] hover:bg-primary-hover sm:inline-block"
                >
                  + 最初の TODO を追加
                </button>
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
      </div>

      <button
        type="button"
        aria-label="TODOを追加"
        onClick={() => setModalState({ type: "create" })}
        className="fixed bottom-6 right-6 z-10 flex h-14 w-14 min-h-11 min-w-11 items-center justify-center rounded-full bg-primary font-bold text-2xl text-white shadow-[0_4px_14px_rgba(79,70,229,0.3)] hover:bg-primary-hover sm:hidden"
      >
        <span aria-hidden="true">+</span>
      </button>

      {modalState && (
        <TodoFormModal
          isEdit={modalState.type === "edit"}
          todo={modalState.type === "edit" ? modalState.todo : null}
          onClose={() => setModalState(null)}
          onNotFound={handleNotFound}
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

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 bottom-24 sm:bottom-4 mx-auto flex w-fit items-center gap-3 rounded-xl bg-text-primary px-4 py-3 text-white shadow-[0_12px_36px_rgba(0,0,0,0.32)] animate-[toast-in_0.18s_ease-out]"
        >
          <span>{toast}</span>
          <button
            type="button"
            aria-label="閉じる"
            onClick={() => setToast(null)}
            className="min-h-11 min-w-11 text-white/80 hover:text-white"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default TodoListPage;
