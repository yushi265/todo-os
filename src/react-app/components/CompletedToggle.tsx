interface CompletedToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** 完了・キャンセル済み（DONE/CANCELED）TODO の表示トグル（AC-7）。 */
function CompletedToggle({ checked, onChange }: CompletedToggleProps) {
  return (
    <label
      htmlFor="show-completed-toggle"
      className="flex min-h-11 items-center gap-2 text-sm text-text-secondary"
    >
      <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center">
        <span className="relative inline-flex h-[22px] w-[38px] items-center">
          <input
            id="show-completed-toggle"
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
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
      完了・キャンセル済みを表示
    </label>
  );
}

export default CompletedToggle;
