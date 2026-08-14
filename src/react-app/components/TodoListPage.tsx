import { useState } from "react";
import type { TodoResponse } from "../../shared/types";
import { useShowCompleted } from "../hooks/useShowCompleted";
import { ApiError, useDeleteTodo, useTodos } from "../hooks/useTodos";
import CompletedToggle from "./CompletedToggle";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import TagManagementModal from "./TagManagementModal";
import TodoFormModal from "./TodoFormModal";
import TodoList from "./TodoList";

type ModalState =
  { type: "create" } | { type: "edit"; todo: TodoResponse } | null;

/** TODO 一覧画面。データ取得・状態の出し分け（読み込み中/エラー/空/成功）を統括する。 */
function TodoListPage() {
  const { data, isLoading, isError, refetch } = useTodos();
  const [showCompleted, setShowCompleted] = useShowCompleted();
  const [modalState, setModalState] = useState<ModalState>(null);
  const [deleteTarget, setDeleteTarget] = useState<TodoResponse | null>(null);
  const [isTagManagementOpen, setIsTagManagementOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const deleteMutation = useDeleteTodo();

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

  return (
    <div className="mx-auto max-w-3xl p-4">
      <header className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900">todo-os</h1>
        <div className="flex items-center gap-4">
          <CompletedToggle
            checked={showCompleted}
            onChange={setShowCompleted}
          />
          <button
            type="button"
            onClick={() => setIsTagManagementOpen(true)}
            className="min-h-11 rounded border border-gray-300 px-4 py-2 hover:bg-gray-50"
          >
            タグ管理
          </button>
          <button
            type="button"
            onClick={() => setModalState({ type: "create" })}
            className="min-h-11 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            + 追加
          </button>
        </div>
      </header>

      {isLoading && (
        <p role="status" className="py-10 text-center text-gray-500">
          読み込み中...
        </p>
      )}

      {isError && (
        <div className="py-10 text-center">
          <p className="mb-4 text-red-600">TODO の取得に失敗しました</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="min-h-11 rounded border border-gray-300 px-4 py-2 hover:bg-gray-50"
          >
            再試行
          </button>
        </div>
      )}

      {!isLoading && !isError && data && data.length === 0 && (
        <div className="py-10 text-center">
          <p className="mb-4 text-gray-500">TODO はまだありません</p>
          <button
            type="button"
            onClick={() => setModalState({ type: "create" })}
            className="min-h-11 rounded bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            + 最初の TODO を追加
          </button>
        </div>
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <TodoList
          todos={data}
          showCompleted={showCompleted}
          onItemClick={(todo) => setModalState({ type: "edit", todo })}
          onDeleteClick={setDeleteTarget}
        />
      )}

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
          className="fixed inset-x-0 bottom-4 mx-auto flex w-fit items-center gap-3 rounded bg-gray-900 px-4 py-3 text-white shadow-lg"
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
