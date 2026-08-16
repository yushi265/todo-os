import { useEffect, useRef } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import CompletedToggle from "./CompletedToggle";
import Button from "./ui/button";

interface TodoMenuProps {
  showCompleted: boolean;
  onShowCompletedChange: (checked: boolean) => void;
  isFilterBarOpen: boolean;
  onFilterBarOpenChange: (open: boolean) => void;
  onSettingsClick: () => void;
  onTagManagementClick: () => void;
  onClose: () => void;
}

function TodoMenu({
  showCompleted,
  onShowCompletedChange,
  isFilterBarOpen,
  onFilterBarOpenChange,
  onSettingsClick,
  onTagManagementClick,
  onClose,
}: TodoMenuProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") onClose();
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-20 flex justify-end bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <aside
        id="todo-menu"
        role="dialog"
        aria-modal="true"
        aria-label="メニュー"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="flex h-full w-full max-w-sm flex-col bg-card p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] animate-[menu-slide-in_0.2s_ease-out] sm:m-4 sm:h-[calc(100%-2rem)] sm:rounded-[22px]"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">メニュー</h2>
          <Button
            variant="ghost"
            size="icon"
            ref={closeButtonRef}
            aria-label="メニューを閉じる"
            onClick={onClose}
            className="flex items-center justify-center rounded-full bg-surface text-text-tertiary hover:text-text-primary"
          >
            ×
          </Button>
        </div>

        <nav aria-label="メニュー項目" className="grid gap-3">
          <div className="rounded-xl border border-border bg-surface px-4">
            <label
              htmlFor="show-filter-toggle"
              className="flex min-h-11 items-center gap-2 text-sm text-text-secondary sm:text-xs"
            >
              <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center">
                <span className="relative inline-flex h-[22px] w-[38px] items-center focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
                  <input
                    id="show-filter-toggle"
                    type="checkbox"
                    aria-label="検索・フィルターを表示"
                    aria-controls="todo-filter-panel"
                    aria-expanded={isFilterBarOpen}
                    checked={isFilterBarOpen}
                    onChange={(event) =>
                      onFilterBarOpenChange(event.target.checked)
                    }
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full bg-border-dashed transition-colors peer-checked:bg-primary"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute left-0.5 h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform peer-checked:translate-x-4"
                  />
                </span>
              </span>
              <span>検索・フィルターを表示</span>
            </label>
          </div>

          <Button
            variant="outline"
            onClick={onSettingsClick}
            className="min-h-11 justify-start px-4 py-2 text-left text-sm font-normal"
          >
            設定
          </Button>

          <div className="rounded-xl border border-border bg-surface px-4">
            <CompletedToggle
              checked={showCompleted}
              onChange={onShowCompletedChange}
            />
          </div>

          <Button
            variant="outline"
            aria-label="タグ管理"
            onClick={onTagManagementClick}
            className="min-h-11 justify-start px-4 py-2 text-left text-sm font-normal"
          >
            タグ管理
          </Button>
        </nav>
      </aside>
    </div>
  );
}

export default TodoMenu;
