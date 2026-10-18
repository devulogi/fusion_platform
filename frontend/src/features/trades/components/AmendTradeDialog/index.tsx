import { useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import AmendTradeDialogView from './AmendTradeDialogView';
import { amendTradeFormSchema, emptyAmendTradeFormValues } from './types';
import type { AmendTradeFormValues, AmendTradeInput } from './types';
import type { Trade } from '../../trade-schema';

export type { AmendTradeInput } from './types';

type AmendTradeDialogProps = {
  open: boolean;
  trade: Trade;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (tradeId: string, input: AmendTradeInput) => void | Promise<unknown>;
};

function toLocalDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function toFormValues(trade: Trade): AmendTradeFormValues {
  return {
    symbol: trade.symbol,
    quantity: trade.quantity,
    price: trade.price,
    side: trade.side,
    trader: trade.trader,
    tradeTimestamp: toLocalDateTime(trade.tradeTimestamp),
    book: trade.book ?? '',
    counterparty: trade.counterparty ?? '',
  };
}

export default function AmendTradeDialog({
  open,
  trade,
  isPending,
  onClose,
  onSubmit,
}: AmendTradeDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<AmendTradeFormValues>({
    resolver: zodResolver(amendTradeFormSchema),
    defaultValues: emptyAmendTradeFormValues,
  });

  useEffect(() => {
    if (!open) {
      reset(emptyAmendTradeFormValues);
      return;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    reset(toFormValues(trade));
    dialogRef.current?.querySelector<HTMLElement>('input, select, button')?.focus();

    const handleDocumentKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && !isPending) {
        event.preventDefault();
        reset(emptyAmendTradeFormValues);
        onClose();
      }
    };
    document.addEventListener('keydown', handleDocumentKeyDown);

    return () => {
      document.removeEventListener('keydown', handleDocumentKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isPending, onClose, open, reset, trade]);

  if (!open) return null;

  const closeDialog = () => {
    if (isPending) return;
    reset(emptyAmendTradeFormValues);
    onClose();
  };

  const submitForm = handleSubmit(async (values) => {
    clearErrors('root.server');
    const input: AmendTradeInput = {
      symbol: values.symbol,
      quantity: values.quantity,
      price: values.price,
      side: values.side,
      trader: values.trader,
      tradeTimestamp: new Date(values.tradeTimestamp).toISOString(),
      book: values.book.trim() || null,
      counterparty: values.counterparty.trim() || null,
    };

    try {
      await onSubmit(trade.id, input);
      reset(emptyAmendTradeFormValues);
      onClose();
    } catch {
      setError('root.server', {
        type: 'server',
        message: 'Unable to amend this trade. Check the details and try again.',
      });
    }
  });

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  return (
    <AmendTradeDialogView
      trade={trade}
      isPending={isPending}
      errors={errors}
      register={register}
      dialogRef={dialogRef}
      onClose={closeDialog}
      onSubmit={(event) => void submitForm(event)}
      onKeyDown={handleDialogKeyDown}
    />
  );
}
