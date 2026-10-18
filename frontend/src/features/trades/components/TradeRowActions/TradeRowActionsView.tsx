import { Ban, EllipsisVertical, Pencil } from 'lucide-react';
import type { KeyboardEventHandler, MouseEventHandler, RefObject } from 'react';

type TradeRowActionsViewProps = {
  tradeId: string;
  disabled: boolean;
  isOpen: boolean;
  menuId: string;
  rootRef: RefObject<HTMLDivElement>;
  triggerRef: RefObject<HTMLButtonElement>;
  firstActionRef: RefObject<HTMLButtonElement>;
  lastActionRef: RefObject<HTMLButtonElement>;
  onToggle: () => void;
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
  onAmend: MouseEventHandler<HTMLButtonElement>;
  onCancel: MouseEventHandler<HTMLButtonElement>;
};

export default function TradeRowActionsView({
  tradeId,
  disabled,
  isOpen,
  menuId,
  rootRef,
  triggerRef,
  firstActionRef,
  lastActionRef,
  onToggle,
  onKeyDown,
  onAmend,
  onCancel,
}: TradeRowActionsViewProps) {
  return (
    <div className="relative flex justify-center" onKeyDown={onKeyDown} ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Trade actions for ${tradeId}`}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[var(--trade-muted)] transition-colors duration-200 ease-out hover:bg-[#e7e9f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trade-accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        onClick={onToggle}
        ref={triggerRef}
        type="button"
      >
        <EllipsisVertical aria-hidden="true" size={18} />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full z-30 mt-1 grid w-56 gap-1 rounded-md border border-[var(--trade-border)] bg-white p-2 shadow-lg"
          id={menuId}
          role="menu"
        >
          <button
            className="inline-flex min-h-11 items-center gap-3 rounded-md bg-[#e7e9f6] px-3 text-left text-sm font-medium text-[var(--trade-text)] hover:bg-[#dce0f4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trade-accent)]"
            onClick={onAmend}
            ref={firstActionRef}
            role="menuitem"
            type="button"
          >
            <Pencil aria-hidden="true" size={17} />
            Amend
          </button>
          <button
            className="inline-flex min-h-11 items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-[var(--trade-cancelled-text)] hover:bg-[var(--trade-cancelled-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trade-accent)]"
            onClick={onCancel}
            ref={lastActionRef}
            role="menuitem"
            type="button"
          >
            <Ban aria-hidden="true" size={17} />
            Cancel trade
          </button>
        </div>
      )}
    </div>
  );
}
