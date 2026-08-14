import { useEffect, useRef, useState } from "react";
import type { TodoResponse } from "../../shared/types";
import { ApiError, useDeleteTodo } from "../hooks/useTodos";

interface DeleteConfirmDialogProps {
  todo: TodoResponse;
  onClose: () => void;
  onNotFound: () => void;
}

/** TODO 削除確認ダイアログ（AC-6）。確認で物理削除、キャンセルでは削除しない。 */
function DeleteConfirmDialog({
  todo,
  onClose,
  onNotFound,
}: DeleteConfirmDialogProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  // ダイアログを開いた時にフォーカスする先頭要素（a11y方針）。破壊的操作のため、
  // 安全側の「キャンセル」（DOM 順で先頭のボタン）に合わせる。
  const cancelRef = useRef<HTMLButtonElement>(null);
  const deleteMutation = useDeleteTodo();

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  function handleConfirm() {
    setSubmitError(null);
    deleteMutation.mutate(todo.id, {
      onSuccess: onClose,
      onError: (error) => {
        if (error instanceof ApiError && error.status === 404) {
          onNotFound();
          onClose();
          return;
        }
        setSubmitError("時間をおいて再度お試しください");
      },
    });
  }

  return (
    <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="TODOを削除"
        className="w-full max-w-md bg-white p-4 shadow-lg sm:rounded-lg sm:p-6"
      >
        <p className="mb-4 text-gray-900">
          「{todo.title}」を削除しますか？この操作は取り消せません。
        </p>
        {submitError && (
          <p role="alert" className="mb-4 text-sm text-red-600">
            {submitError}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            ref={cancelRef}
            onClick={onClose}
            className="min-h-11 rounded px-4 py-2 text-gray-600 hover:bg-gray-100"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleteMutation.isPending}
            className="min-h-11 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
          >
            削除する
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmDialog;
