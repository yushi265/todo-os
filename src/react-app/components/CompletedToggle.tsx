interface CompletedToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** 終了済み（DONE/CANCELED）TODO の表示トグル（AC-7）。 */
function CompletedToggle({ checked, onChange }: CompletedToggleProps) {
  return (
    <label
      htmlFor="show-completed-toggle"
      className="flex min-h-11 items-center gap-2 text-sm text-gray-700"
    >
      <input
        id="show-completed-toggle"
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4"
      />
      終了済みを表示
    </label>
  );
}

export default CompletedToggle;
