import { useState } from "react";
import { createTagSchema } from "../../shared/schemas";
import {
  tagMutationErrorMessage,
  useCreateTag,
  useTags,
} from "../hooks/useTags";
import Button from "./ui/button";

interface TagMultiSelectProps {
  selectedTagIds: number[];
  onChange: (tagIds: number[]) => void;
}

/**
 * TODO作成/編集モーダル内のタグ選択+新規作成コンポーネント（AC-4, AC-5）。
 * 既存タグはバッジクリックで選択/解除、新規タグ名は入力→作成後ただちに選択状態に加える。
 */
function TagMultiSelect({ selectedTagIds, onChange }: TagMultiSelectProps) {
  const { data: tags, isLoading, isError, refetch } = useTags();
  const createMutation = useCreateTag();
  const [newTagName, setNewTagName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function toggleTag(id: number) {
    if (selectedTagIds.includes(id)) {
      onChange(selectedTagIds.filter((tagId) => tagId !== id));
    } else {
      onChange([...selectedTagIds, id]);
    }
  }

  function handleCreate() {
    const trimmed = newTagName.trim();
    const result = createTagSchema.safeParse({ name: trimmed });
    if (!result.success) {
      setError("タグ名は1〜50文字で入力してください");
      return;
    }
    setError(null);
    createMutation.mutate(
      { name: trimmed },
      {
        onSuccess: (tag) => {
          onChange([...selectedTagIds, tag.id]);
          setNewTagName("");
        },
        onError: (err) => setError(tagMutationErrorMessage(err)),
      },
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-text-secondary sm:text-xs">
        タグ
      </span>

      {isLoading && (
        <p role="status" className="text-sm text-text-tertiary sm:text-xs">
          タグを読み込み中...
        </p>
      )}

      {isError && (
        <div className="flex items-center gap-2">
          <p className="text-sm text-danger sm:text-xs">
            タグの取得に失敗しました
          </p>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => refetch()}
            className="min-h-11 rounded-xl border border-border bg-card px-3 py-1 text-sm text-text-secondary hover:bg-surface sm:px-2.5 sm:py-1.5 sm:text-xs"
          >
            再試行
          </Button>
        </div>
      )}

      {!isLoading && !isError && tags && (
        <div className="flex flex-wrap gap-2">
          {tags.length === 0 && (
            <p className="text-sm text-text-tertiary sm:text-xs">
              タグはまだありません
            </p>
          )}
          {tags.map((tag) => {
            const selected = selectedTagIds.includes(tag.id);
            return (
              <Button
                variant="secondary"
                size="sm"
                key={tag.id}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleTag(tag.id)}
                className={
                  selected
                    ? "min-h-11 rounded-full border border-primary bg-primary px-3 py-1 text-sm font-medium text-white sm:px-2.5 sm:text-xs"
                    : "min-h-11 rounded-full border border-transparent bg-tag-bg px-3 py-1 text-sm text-tag-fg hover:bg-border-subtle sm:px-2.5 sm:text-xs"
                }
              >
                #{tag.name}
              </Button>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label
          htmlFor="new-tag-name-in-select"
          className="text-xs text-text-tertiary"
        >
          新規タグ名
        </label>
        <div className="flex gap-2">
          <input
            id="new-tag-name-in-select"
            type="text"
            maxLength={50}
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            className="min-h-11 flex-1 rounded-xl border border-border px-3 py-2 text-sm text-text-primary sm:px-2.5 sm:py-1.5 sm:text-xs"
          />
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="min-h-11 rounded-xl border border-border bg-card px-3 py-1 text-sm text-text-secondary hover:bg-surface disabled:opacity-50 sm:px-2.5 sm:py-1.5 sm:text-xs"
          >
            追加
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger sm:text-xs">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default TagMultiSelect;
