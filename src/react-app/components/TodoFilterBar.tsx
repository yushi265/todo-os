import { useEffect, useState } from "react";
import type { TagResponse, TodoPriority, TodoStatus } from "../../shared/types";
import { PRIORITY_LABEL_CLASSES, STATUS_LABEL } from "../lib/statusStyles";
import type { SortBy, TodoFilters } from "../hooks/useTodos";

type FilterAttribute = keyof TodoFilters;

interface FilterOption {
  value: string;
  label: string;
}

export interface TodoFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filters: TodoFilters;
  onFiltersChange: (filters: TodoFilters) => void;
  sortBy: SortBy;
  sortOrder: "asc" | "desc";
  onSortChange: (sortBy: SortBy, sortOrder: "asc" | "desc") => void;
  tags: TagResponse[];
}

const FILTER_ATTRIBUTES: FilterAttribute[] = [
  "status",
  "priority",
  "tagId",
  "due",
];

const FILTER_ATTRIBUTE_LABELS: Record<FilterAttribute, string> = {
  status: "ステータス",
  priority: "優先度",
  tagId: "タグ",
  due: "期限",
};

const STATUS_OPTIONS: FilterOption[] = (
  Object.keys(STATUS_LABEL) as TodoStatus[]
).map((value) => ({ value, label: STATUS_LABEL[value] }));

const PRIORITY_OPTIONS: FilterOption[] = (
  Object.keys(PRIORITY_LABEL_CLASSES) as TodoPriority[]
).map((value) => ({
  value,
  label: PRIORITY_LABEL_CLASSES[value].label.replace("優先度: ", ""),
}));

const DUE_OPTIONS: FilterOption[] = [
  { value: "TODAY", label: "今日" },
  { value: "OVERDUE", label: "期限切れ" },
  { value: "NONE", label: "期限なし" },
];

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "manual", label: "手動" },
  { value: "dueDate", label: "期限" },
  { value: "priority", label: "優先度" },
  { value: "createdAt", label: "作成日" },
  { value: "updatedAt", label: "更新日" },
];

function getFilterOptions(
  attribute: FilterAttribute,
  tags: TagResponse[],
): FilterOption[] {
  switch (attribute) {
    case "status":
      return STATUS_OPTIONS;
    case "priority":
      return PRIORITY_OPTIONS;
    case "tagId":
      return tags.map((tag) => ({ value: String(tag.id), label: tag.name }));
    case "due":
      return DUE_OPTIONS;
  }
}

function filterValueLabel(
  attribute: FilterAttribute,
  value: TodoFilters[FilterAttribute],
  tags: TagResponse[],
): string {
  if (attribute === "tagId") {
    return "#" + (tags.find((tag) => tag.id === value)?.name ?? String(value));
  }

  const option = getFilterOptions(attribute, tags).find(
    (candidate) => candidate.value === value,
  );
  return option?.label ?? String(value);
}

function isFilterSelected(
  filters: TodoFilters,
  attribute: FilterAttribute,
): boolean {
  return filters[attribute] !== null;
}

function TodoFilterBar({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  sortBy,
  sortOrder,
  onSortChange,
  tags,
}: TodoFilterBarProps) {
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [selectedAttribute, setSelectedAttribute] =
    useState<FilterAttribute | null>(null);

  useEffect(() => {
    if (!isFilterMenuOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsFilterMenuOpen(false);
        setSelectedAttribute(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFilterMenuOpen]);

  const availableAttributes = FILTER_ATTRIBUTES.filter(
    (attribute) => !isFilterSelected(filters, attribute),
  );

  function openAttributeMenu() {
    setSelectedAttribute(null);
    setIsFilterMenuOpen(true);
  }

  function openValueMenu(attribute: FilterAttribute) {
    setSelectedAttribute(attribute);
    setIsFilterMenuOpen(true);
  }

  function closeFilterMenu() {
    setIsFilterMenuOpen(false);
    setSelectedAttribute(null);
  }

  function handleValueSelect(value: string) {
    if (!selectedAttribute) return;

    const nextFilters = { ...filters };
    switch (selectedAttribute) {
      case "status":
        nextFilters.status = value as TodoStatus;
        break;
      case "priority":
        nextFilters.priority = value as TodoPriority;
        break;
      case "tagId":
        nextFilters.tagId = Number(value);
        break;
      case "due":
        nextFilters.due = value as TodoFilters["due"];
        break;
    }
    onFiltersChange(nextFilters);
    closeFilterMenu();
  }

  function handleFilterRemove(attribute: FilterAttribute) {
    onFiltersChange({ ...filters, [attribute]: null });
  }

  const selectedChips = FILTER_ATTRIBUTES.filter((attribute) =>
    isFilterSelected(filters, attribute),
  );

  return (
    <section
      aria-label="TODOの検索・フィルター・ソート"
      className="mb-4 flex flex-wrap items-center gap-2 sm:gap-1.5"
    >
      <div className="relative min-w-0 flex-1">
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-quaternary"
        >
          <circle
            cx="6.5"
            cy="6.5"
            r="5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <line
            x1="10.3"
            y1="10.3"
            x2="14.5"
            y2="14.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        <input
          type="search"
          aria-label="TODOを検索"
          placeholder="タイトル・説明を検索"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="min-h-11 w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none sm:py-1.5 sm:text-xs sm:min-w-52"
        />
      </div>

      <div className="relative flex flex-wrap items-center gap-2">
        {selectedChips.map((attribute) => {
          const value = filters[attribute];
          return (
            <div
              key={attribute}
              className="inline-flex min-h-11 items-center rounded-full border border-chip-border bg-chip-bg text-sm font-medium text-chip-fg sm:text-xs"
            >
              <button
                type="button"
                onClick={() => openValueMenu(attribute)}
                className="min-h-11 rounded-l-full px-3 py-1 sm:px-2.5 hover:bg-chip-border"
              >
                {FILTER_ATTRIBUTE_LABELS[attribute]}:{" "}
                {filterValueLabel(attribute, value, tags)}
              </button>
              <button
                type="button"
                aria-label="フィルターを削除"
                onClick={() => handleFilterRemove(attribute)}
                className="min-h-11 min-w-11 rounded-r-full px-2 text-chip-fg hover:bg-chip-border"
              >
                ×
              </button>
            </div>
          );
        })}

        <button
          type="button"
          aria-label="フィルターを追加"
          aria-haspopup="menu"
          aria-controls="todo-filter-menu"
          aria-expanded={isFilterMenuOpen}
          onClick={openAttributeMenu}
          disabled={availableAttributes.length === 0}
          className="min-h-11 rounded-full border border-dashed border-border bg-card px-3 py-2 text-sm text-text-secondary hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50 sm:px-2.5 sm:py-1.5 sm:text-xs"
        >
          + フィルター
        </button>

        {isFilterMenuOpen && (
          <div
            id="todo-filter-menu"
            role="menu"
            aria-label="フィルターメニュー"
            className="absolute left-0 top-full z-10 mt-2 min-w-48 rounded-xl border border-border bg-card p-2 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
          >
            {selectedAttribute === null ? (
              availableAttributes.map((attribute) => (
                <button
                  key={attribute}
                  type="button"
                  role="menuitem"
                  onClick={() => setSelectedAttribute(attribute)}
                  className="min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm text-text-secondary hover:bg-surface sm:text-xs"
                >
                  {FILTER_ATTRIBUTE_LABELS[attribute]}
                </button>
              ))
            ) : (
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={openAttributeMenu}
                  className="min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm text-text-tertiary hover:bg-surface sm:text-xs"
                >
                  ← 属性を選び直す
                </button>
                {getFilterOptions(selectedAttribute, tags).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="menuitem"
                    onClick={() => handleValueSelect(option.value)}
                    className="min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm text-text-secondary hover:bg-surface sm:text-xs"
                  >
                    {option.label}
                  </button>
                ))}
                {selectedAttribute === "tagId" && tags.length === 0 && (
                  <p className="px-3 py-2 text-sm text-text-tertiary sm:text-xs">
                    タグはありません
                  </p>
                )}
              </>
            )}
            <button
              type="button"
              onClick={closeFilterMenu}
              className="mt-1 min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm text-text-tertiary hover:bg-surface sm:text-xs"
            >
              閉じる
            </button>
          </div>
        )}
      </div>

      <div className="flex min-h-11 items-center gap-2 sm:ml-auto">
        <label
          htmlFor="todo-sort"
          className="text-sm text-text-quaternary sm:text-xs"
        >
          並び順
        </label>
        <select
          id="todo-sort"
          value={sortBy}
          onChange={(event) => {
            const nextSortBy = event.target.value as SortBy;
            onSortChange(
              nextSortBy,
              nextSortBy === "manual" ? "asc" : sortOrder,
            );
          }}
          className="min-h-11 rounded-full border border-border bg-card px-3 py-2 text-sm text-text-primary sm:px-2.5 sm:py-1.5 sm:text-xs"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {sortBy !== "manual" && (
          <button
            type="button"
            aria-label={
              sortOrder === "asc" ? "降順に切り替え" : "昇順に切り替え"
            }
            onClick={() =>
              onSortChange(sortBy, sortOrder === "asc" ? "desc" : "asc")
            }
            className="min-h-11 min-w-11 rounded-full border border-border bg-card px-3 py-2 text-lg text-text-secondary hover:bg-surface sm:px-2.5 sm:py-1.5 sm:text-base"
          >
            {sortOrder === "asc" ? "↑" : "↓"}
          </button>
        )}
      </div>
    </section>
  );
}

export default TodoFilterBar;
