import { useEffect, useRef } from "react";
import Button from "./ui/button";

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
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md animate-[modal-in_0.2s_ease-out] rounded-[22px] bg-card p-6 shadow-[0_24px_70px_rgba(0,0,0,0.28)]"
      >
        <p className="mb-4 text-sm text-text-primary sm:text-xs">{message}</p>
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            ref={cancelRef}
            onClick={onClose}
            className="px-4 py-2"
          >
            キャンセル
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
            className="font-bold"
          >
            削除する
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmDialog;
