import { useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import type { ThemeName } from "../hooks/useTheme";
import { THEME_OPTIONS } from "../hooks/useTheme";
import Button from "./ui/button";

interface ThemeSettingsModalProps {
  theme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
  onClose: () => void;
}

function ThemeSettingsModal({
  theme,
  onThemeChange,
  onClose,
}: ThemeSettingsModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") onClose();
  }

  return (
    <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="テーマ設定"
        onKeyDown={handleKeyDown}
        className="w-full max-w-lg animate-[modal-in_0.2s_ease-out] rounded-[22px] bg-card p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">
            テーマ設定
          </h2>
          <Button
            variant="ghost"
            size="icon"
            ref={closeButtonRef}
            aria-label="閉じる"
            onClick={onClose}
            className="flex items-center justify-center rounded-full bg-surface text-text-tertiary hover:text-text-primary"
          >
            ×
          </Button>
        </div>

        <fieldset>
          <legend className="mb-3 text-sm font-medium text-text-secondary">
            配色
          </legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {THEME_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex min-h-11 cursor-pointer flex-col gap-1 rounded-xl border p-3 transition-colors ${theme === option.value ? "border-primary bg-chip-bg" : "border-border bg-card hover:bg-surface"}`}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-text-primary">
                  <input
                    type="radio"
                    aria-label={option.label}
                    name="todo-os-theme"
                    value={option.value}
                    checked={theme === option.value}
                    onChange={() => onThemeChange(option.value)}
                    className="accent-primary"
                  />
                  {option.label}
                </span>
                <span className="pl-6 text-xs text-text-tertiary">
                  {option.description}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  );
}

export default ThemeSettingsModal;
