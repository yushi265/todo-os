import type { TagResponse } from "../../shared/types";
import Button from "./ui/button";

interface TagSwitcherProps {
  tags: TagResponse[];
  selectedTagId: number | null;
  onTagChange: (tagId: number | null) => void;
}

/**
 * 一覧上部のタグ別クイック切替。既存のフィルターメニューより常時アクセスしやすい
 * 導線として提供し、選択値は同じ `filters.tagId` と共有する。
 */
function TagSwitcher({ tags, selectedTagId, onTagChange }: TagSwitcherProps) {
  if (tags.length === 0) return null;

  return (
    <nav aria-label="タグで切り替え" className="mb-3 flex items-center gap-2">
      <span className="shrink-0 text-sm text-text-quaternary sm:text-xs">
        タグ
      </span>
      <div className="flex min-w-0 gap-1.5 overflow-x-auto pb-1">
        <Button
          variant={selectedTagId === null ? "secondary" : "ghost"}
          size="sm"
          type="button"
          aria-pressed={selectedTagId === null}
          onClick={() => onTagChange(null)}
          className="shrink-0 rounded-full px-3 sm:px-2.5"
        >
          すべて
        </Button>
        {tags.map((tag) => (
          <Button
            variant={selectedTagId === tag.id ? "secondary" : "ghost"}
            size="sm"
            type="button"
            key={tag.id}
            aria-pressed={selectedTagId === tag.id}
            onClick={() => onTagChange(tag.id)}
            className="shrink-0 rounded-full px-3 sm:px-2.5"
          >
            #{tag.name}
          </Button>
        ))}
      </div>
    </nav>
  );
}

export default TagSwitcher;
