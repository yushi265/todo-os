interface CompletedToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** 終了済み（DONE/CANCELED）TODO の表示トグル（AC-7）。iOS 風スイッチ UI（AC-6）。 */
function CompletedToggle({ checked, onChange }: CompletedToggleProps) {
  return (
    <label
      htmlFor="show-completed-toggle"
      className="flex min-h-11 items-center gap-2 text-sm text-text-secondary"
    >
      終了済みを表示
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input
          id="show-completed-toggle"
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-border transition-colors peer-checked:bg-primary"
        />
        <span
          aria-hidden="true"
          className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-transform peer-checked:translate-x-5"
        />
      </span>
    </label>
  );
}

export default CompletedToggle;
