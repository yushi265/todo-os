import { useEffect, useRef } from "react";

interface DeleteConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  /** 削除処理が進行中かどうか。true の間は確認ボタンを無効化し、連打による多重送信を防ぐ。 */
  isPending?: boolean;
}

/**
 * 汎用の削除確認ダイアログ（AC-3, todo-crud-basic AC-6）。
 * 表示専用: 実際の削除実行（mutation の呼び出し・エラー処理）は呼び出し側が owns する。
 * TODO 削除（TodoListPage）とタグ削除（TagManagementModal）の両方から呼ばれる。
 */
function DeleteConfirmDialog({
  title,
  message,
  onConfirm,
  onClose,
  isPending = false,
}: DeleteConfirmDialogProps) {
  // ダイアログを開いた時にフォーカスする先頭要素（a11y方針）。破壊的操作のため、
  // 安全側の「キャンセル」（DOM 順で先頭のボタン）に合わせる。
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md bg-card p-4 shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:rounded-[22px] sm:p-6"
      >
        <p className="mb-4 text-text-primary">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            ref={cancelRef}
            onClick={onClose}
            className="min-h-11 rounded-xl px-4 py-2 text-text-secondary hover:bg-surface"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="min-h-11 rounded-xl bg-danger px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
          >
            削除する
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmDialog;
