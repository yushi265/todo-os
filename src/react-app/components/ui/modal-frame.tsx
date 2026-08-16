import type { KeyboardEventHandler, ReactNode } from "react";

interface ModalFrameProps {
  ariaLabel: string;
  overlayClassName: string;
  panelClassName: string;
  children: ReactNode;
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
}

/** Modalの共通外枠。個別Modalのレイアウトと内容は呼び出し側が管理する。 */
function ModalFrame({
  ariaLabel,
  overlayClassName,
  panelClassName,
  children,
  onKeyDown,
}: ModalFrameProps) {
  return (
    <div className={overlayClassName}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
        className={panelClassName}
      >
        {children}
      </div>
    </div>
  );
}

export default ModalFrame;
