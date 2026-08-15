import { useEffect, useRef, useState } from "react";
import { createTagSchema, updateTagSchema } from "../../shared/schemas";
import type { TagResponse } from "../../shared/types";
import {
  TagApiError,
  tagMutationErrorMessage,
  useCreateTag,
  useDeleteTag,
  useTags,
  useUpdateTag,
} from "../hooks/useTags";
import DeleteConfirmDialog from "./DeleteConfirmDialog";

interface TagManagementModalProps {
  onClose: () => void;
}

/** タグ管理モーダル（AC-1, AC-2, AC-3, AC-8）。全タグの一覧・インライン編集・削除・新規作成を担う。 */
function TagManagementModal({ onClose }: TagManagementModalProps) {
  const { data: tags, isLoading, isError, refetch } = useTags();
  const createMutation = useCreateTag();
  const updateMutation = useUpdateTag();
  const deleteMutation = useDeleteTag();

  const [newTagName, setNewTagName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TagResponse | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // ダイアログを開いた時にフォーカスする先頭要素（a11y方針）。データ入力モーダルのため
  // TodoFormModal と同様、主要な入力欄（新規タグ名）に合わせる。
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  function startEdit(tag: TagResponse) {
    setEditingId(tag.id);
    setEditValue(tag.name);
    setEditError(null);
  }

  function commitEdit(tag: TagResponse) {
    if (updateMutation.isPending) return;
    const trimmed = editValue.trim();
    const result = updateTagSchema.safeParse({ name: trimmed });
    if (!result.success) {
      setEditError("タグ名は1〜50文字で入力してください");
      return;
    }
    setEditError(null);
    if (trimmed === tag.name) {
      setEditingId(null);
      return;
    }
    updateMutation.mutate(
      { id: tag.id, input: { name: trimmed } },
      {
        onSuccess: () => setEditingId(null),
        onError: (error) => {
          if (error instanceof TagApiError && error.status === 404) {
            setToast("対象のタグが見つかりませんでした");
            setEditingId(null);
            void refetch();
            return;
          }
          setEditError(tagMutationErrorMessage(error));
        },
      },
    );
  }

  function handleCreateSubmit() {
    const trimmed = newTagName.trim();
    const result = createTagSchema.safeParse({ name: trimmed });
    if (!result.success) {
      setCreateError("タグ名は1〜50文字で入力してください");
      return;
    }
    setCreateError(null);
    createMutation.mutate(
      { name: trimmed },
      {
        onSuccess: () => setNewTagName(""),
        onError: (error) => setCreateError(tagMutationErrorMessage(error)),
      },
    );
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
      onError: (error) => {
        if (error instanceof TagApiError && error.status === 404) {
          setToast("対象のタグが見つかりませんでした");
          setDeleteTarget(null);
          void refetch();
          return;
        }
        setToast("時間をおいて再度お試しください");
      },
    });
  }

  return (
    <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="タグ管理"
        className="flex max-h-[90vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-t-[22px] rounded-b-none bg-card p-4 shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:rounded-[22px] sm:p-6"
      >
        <div
          aria-hidden="true"
          className="mx-auto h-1 w-10 shrink-0 rounded-full bg-border sm:hidden"
        />
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">タグ管理</h2>
          <button
            type="button"
            aria-label="閉じる"
            onClick={onClose}
            className="min-h-11 min-w-11 text-text-tertiary hover:text-text-primary"
          >
            ×
          </button>
        </div>

        {isLoading && (
          <p role="status" className="py-6 text-center text-text-tertiary">
            読み込み中...
          </p>
        )}

        {isError && (
          <div className="py-6 text-center">
            <p className="mb-4 text-danger">タグの取得に失敗しました</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="min-h-11 rounded-xl border border-border bg-card px-4 py-2 text-text-secondary hover:bg-surface"
            >
              再試行
            </button>
          </div>
        )}

        {!isLoading && !isError && tags && (
          <>
            {tags.length === 0 ? (
              <p className="py-4 text-center text-sm text-text-tertiary">
                タグはまだありません
              </p>
            ) : (
              <ul className="divide-y divide-border-subtle rounded-xl border border-border-subtle">
                {tags.map((tag) => (
                  <li
                    key={tag.id}
                    className="flex min-h-11 items-center gap-2 px-3 py-2"
                  >
                    {editingId === tag.id ? (
                      <input
                        aria-label={`「${tag.name}」の名前を編集`}
                        value={editValue}
                        autoFocus
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            commitEdit(tag);
                          } else if (e.key === "Escape") {
                            setEditingId(null);
                            setEditError(null);
                          }
                        }}
                        onBlur={() => commitEdit(tag)}
                        className="min-h-11 flex-1 rounded-xl border border-border px-2 py-1 text-text-primary"
                      />
                    ) : (
                      <>
                        <span className="flex-1 text-text-primary">
                          {tag.name}
                        </span>
                        <button
                          type="button"
                          aria-label={`「${tag.name}」を編集`}
                          onClick={() => startEdit(tag)}
                          className="min-h-11 min-w-11 rounded-xl px-2 text-text-tertiary hover:bg-surface"
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          aria-label={`「${tag.name}」を削除`}
                          onClick={() => setDeleteTarget(tag)}
                          className="min-h-11 min-w-11 rounded-xl px-2 text-text-tertiary hover:bg-danger-bg hover:text-danger"
                        >
                          削除
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {editingId !== null && editError && (
              <p role="alert" className="text-sm text-danger">
                {editError}
              </p>
            )}
          </>
        )}

        <div className="flex flex-col gap-1 border-t border-border-subtle pt-4">
          <label
            htmlFor="new-tag-name"
            className="text-sm font-medium text-text-secondary"
          >
            新規タグ名
          </label>
          <div className="flex gap-2">
            <input
              id="new-tag-name"
              ref={firstFieldRef}
              type="text"
              maxLength={50}
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="min-h-11 flex-1 rounded-xl border border-border px-3 py-2 text-text-primary"
            />
            <button
              type="button"
              onClick={handleCreateSubmit}
              disabled={createMutation.isPending}
              className="min-h-11 rounded-xl bg-primary px-4 py-2 text-white shadow-[0_4px_14px_rgba(79,70,229,0.3)] hover:bg-primary-hover disabled:opacity-50"
            >
              追加
            </button>
          </div>
          {createError && (
            <p role="alert" className="text-sm text-danger">
              {createError}
            </p>
          )}
        </div>
      </div>

      {deleteTarget && (
        <DeleteConfirmDialog
          title="タグを削除"
          message={`「${deleteTarget.name}」を削除しますか？このタグは全ての TODO から解除されます。`}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
          isPending={deleteMutation.isPending}
        />
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 bottom-4 mx-auto flex w-fit items-center gap-3 rounded-xl bg-text-primary px-4 py-3 text-white shadow-[0_4px_16px_rgba(0,0,0,0.07)]"
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

export default TagManagementModal;
