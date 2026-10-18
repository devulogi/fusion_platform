import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { Trade } from '../../trade-schema';
import CancelTradeDialogView from './CancelTradeDialogView';

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
    <CancelTradeDialogView
      trade={trade}
      isBusy={isBusy}
      error={error}
      cancelButtonRef={cancelButtonRef}
      confirmButtonRef={confirmButtonRef}
      onClose={onClose}
      onConfirm={() => void handleConfirm()}
      onKeyDown={handleKeyDown}
    />
  );
}
