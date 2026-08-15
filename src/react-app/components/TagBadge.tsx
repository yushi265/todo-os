import type { TagResponse } from "../../shared/types";

interface TagBadgeProps {
  tag: TagResponse;
  muted?: boolean;
}

/** 個別タグの表示用バッジ（表示専用・クリック不可）。TodoListItem のタグ一覧表示に使う（AC-6）。 */
function TagBadge({ tag, muted = false }: TagBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-tag-bg px-2 py-1 text-xs font-medium ${muted ? "text-tag-fg-muted" : "text-tag-fg"}`}
    >
      #{tag.name}
    </span>
  );
}

export default TagBadge;
