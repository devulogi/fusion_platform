import type { KeyboardEventHandler, RefObject } from 'react';
import type { Trade } from '../../trade-schema';

type CancelTradeDialogViewProps = {
  trade: Trade;
  isBusy: boolean;
  error: boolean;
  cancelButtonRef: RefObject<HTMLButtonElement>;
  confirmButtonRef: RefObject<HTMLButtonElement>;
  onClose: () => void;
  onConfirm: () => void;
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
};

export default function CancelTradeDialogView({
  trade,
  isBusy,
  error,
  cancelButtonRef,
  confirmButtonRef,
  onClose,
  onConfirm,
  onKeyDown,
}: CancelTradeDialogViewProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#20232b]/30 p-4">
      <div
        aria-labelledby="cancel-trade-title"
        aria-modal="true"
        className="w-full max-w-md rounded-md border border-[var(--trade-border)] bg-white p-6 text-[var(--trade-text)] shadow-xl"
        onKeyDown={onKeyDown}
        role="dialog"
      >
        <h2 className="text-lg font-semibold" id="cancel-trade-title">
          Cancel trade?
        </h2>
        <p className="mt-3 text-sm text-[var(--trade-muted)]">
          Trade <span className="font-semibold text-[var(--trade-text)]">{trade.id}</span> (
          {trade.symbol}) will be marked cancelled. It will not be deleted.
        </p>

        {error && (
          <p className="mt-4 text-sm text-red-700" role="alert">
            The trade could not be cancelled. Please try again.
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            className="min-h-11 rounded-md border border-[var(--trade-border)] px-4 py-2 text-sm font-semibold transition-colors duration-200 ease-out hover:bg-[var(--trade-surface)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trade-accent)] focus-visible:ring-offset-2"
            disabled={isBusy}
            onClick={onClose}
            ref={cancelButtonRef}
            type="button"
          >
            Back
          </button>
          <button
            className="min-h-11 rounded-md bg-[var(--trade-cancelled-text)] px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#96313e] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trade-accent)] focus-visible:ring-offset-2"
            disabled={isBusy}
            onClick={onConfirm}
            ref={confirmButtonRef}
            type="button"
          >
            {isBusy ? 'Cancelling...' : 'Confirm cancellation'}
          </button>
        </div>
      </div>
    </div>
  );
}
