import type { TagResponse } from "../../shared/types";

interface TagBadgeProps {
  tag: TagResponse;
}

/** 個別タグの表示用バッジ（表示専用・クリック不可）。TodoListItem のタグ一覧表示に使う（AC-6）。 */
function TagBadge({ tag }: TagBadgeProps) {
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
      {tag.name}
    </span>
  );
}

export default TagBadge;
