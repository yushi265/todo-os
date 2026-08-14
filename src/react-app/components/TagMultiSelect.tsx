import { useState } from "react";
import { createTagSchema } from "../../shared/schemas";
import {
  tagMutationErrorMessage,
  useCreateTag,
  useTags,
} from "../hooks/useTags";

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
      <span className="text-sm font-medium text-gray-700">タグ</span>

      {isLoading && (
        <p role="status" className="text-sm text-gray-500">
          タグを読み込み中...
        </p>
      )}

      {isError && (
        <div className="flex items-center gap-2">
          <p className="text-sm text-red-600">タグの取得に失敗しました</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="min-h-11 rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
          >
            再試行
          </button>
        </div>
      )}

      {!isLoading && !isError && tags && (
        <div className="flex flex-wrap gap-2">
          {tags.length === 0 && (
            <p className="text-sm text-gray-500">タグはまだありません</p>
          )}
          {tags.map((tag) => {
            const selected = selectedTagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleTag(tag.id)}
                className={
                  selected
                    ? "min-h-11 rounded-full bg-blue-600 px-3 py-1 text-sm text-white"
                    : "min-h-11 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
                }
              >
                {tag.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label
          htmlFor="new-tag-name-in-select"
          className="text-xs text-gray-500"
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
            className="min-h-11 flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="min-h-11 rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            追加
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default TagMultiSelect;
