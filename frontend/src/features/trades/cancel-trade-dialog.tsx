import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { Trade } from './trade-schema';

type CancelTradeDialogProps = {
  open: boolean;
  trade: Trade;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (tradeId: string) => void | Promise<unknown>;
};

export default function CancelTradeDialog({
  open,
  trade,
  isPending,
  onClose,
  onConfirm,
}: CancelTradeDialogProps) {
  const [error, setError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const isBusy = isPending || isSubmitting;

  useEffect(() => {
    if (!open) return;

    setError(false);
    setIsSubmitting(false);
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelButtonRef.current?.focus();

    return () => {
      previousFocusRef.current?.focus();
      setError(false);
      previousFocusRef.current = null;
    };
  }, [open]);

  if (!open) return null;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (!isBusy) onClose();
      return;
    }

    if (event.key !== 'Tab') return;

    const firstButton = cancelButtonRef.current;
    const lastButton = confirmButtonRef.current;
    if (firstButton === null || lastButton === null) return;

    if (event.shiftKey && document.activeElement === firstButton) {
      event.preventDefault();
      lastButton.focus();
    } else if (!event.shiftKey && document.activeElement === lastButton) {
      event.preventDefault();
      firstButton.focus();
    }
  };

  const handleConfirm = async () => {
    if (isBusy) return;

    setError(false);
    setIsSubmitting(true);
    try {
      await onConfirm(trade.id);
      setIsSubmitting(false);
      onClose();
    } catch {
      setError(true);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        aria-labelledby="cancel-trade-title"
        aria-modal="true"
        className="w-full max-w-md rounded-md border border-[#d9dfd9] bg-white p-6 text-[#19251f] shadow-xl"
        onKeyDown={handleKeyDown}
        role="dialog"
      >
        <h2 className="text-lg font-semibold" id="cancel-trade-title">
          Cancel trade?
        </h2>
        <p className="mt-3 text-sm text-[#58665e]">
          Trade <span className="font-semibold text-[#19251f]">{trade.id}</span> ({trade.symbol})
          will be marked cancelled. It will not be deleted.
        </p>

        {error && (
          <p className="mt-4 text-sm text-red-700" role="alert">
            The trade could not be cancelled. Please try again.
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            className="min-h-11 rounded-md border border-[#cdd5ce] px-4 py-2 text-sm font-semibold transition-colors duration-200 ease-out hover:bg-[#f3f5f2] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            disabled={isBusy}
            onClick={onClose}
            ref={cancelButtonRef}
            type="button"
          >
            Back
          </button>
          <button
            className="min-h-11 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 ease-out hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            disabled={isBusy}
            onClick={() => void handleConfirm()}
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
