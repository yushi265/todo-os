/** 説明本文を一覧に展開せず、入力済みであることだけを伝える表示。 */
function TodoDescriptionIndicator() {
  return (
    <span
      role="img"
      aria-label="説明あり"
      title="説明あり"
      data-testid="description-icon"
      className="inline-flex shrink-0 items-center text-text-secondary"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v10a2.5 2.5 0 0 1-2.5 2.5H10l-5 3v-3.5A2.5 2.5 0 0 1 4 15V5.5Z" />
        <path d="M8 8h8M8 12h5" />
      </svg>
    </span>
  );
}

export default TodoDescriptionIndicator;
