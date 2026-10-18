import { useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { Trade } from './trade-schema';

export type AmendTradeInput = Omit<Trade, 'id' | 'status'>;

type AmendTradeDialogProps = {
  open: boolean;
  trade: Trade;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (tradeId: string, input: AmendTradeInput) => void | Promise<unknown>;
};

const amendTradeFormSchema = z
  .object({
    symbol: z
      .string()
      .trim()
      .min(1, 'Enter a symbol')
      .max(16, 'Symbol must be 16 characters or fewer'),
    quantity: z
      .number()
      .int('Quantity must be a whole number')
      .positive('Quantity must be greater than zero'),
    price: z.number().finite().positive('Price must be greater than zero'),
    side: z.enum(['BUY', 'SELL']),
    trader: z
      .string()
      .trim()
      .min(1, 'Enter a trader')
      .max(32, 'Trader must be 32 characters or fewer'),
    tradeTimestamp: z
      .string()
      .min(1, 'Enter a trade date')
      .refine((value) => Number.isFinite(Date.parse(value)), 'Enter a valid trade date'),
    book: z.string().max(64, 'Book must be 64 characters or fewer'),
    counterparty: z.string().max(120, 'Counterparty must be 120 characters or fewer'),
  })
  .strict();

type AmendTradeFormValues = z.infer<typeof amendTradeFormSchema>;

const emptyFormValues: AmendTradeFormValues = {
  symbol: '',
  quantity: 0,
  price: 0,
  side: 'BUY',
  trader: '',
  tradeTimestamp: '',
  book: '',
  counterparty: '',
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
    defaultValues: emptyFormValues,
  });

  useEffect(() => {
    if (!open) {
      reset(emptyFormValues);
      return;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    reset(toFormValues(trade));
    dialogRef.current?.querySelector<HTMLElement>('input, select, button')?.focus();

    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isPending) {
        event.preventDefault();
        reset(emptyFormValues);
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
    reset(emptyFormValues);
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
      reset(emptyFormValues);
      onClose();
    } catch {
      setError('root.server', {
        type: 'server',
        message: 'Unable to amend this trade. Check the details and try again.',
      });
    }
  });

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
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

  const fieldClassName =
    'min-h-11 w-full rounded-md border border-[#cdd5ce] bg-white px-3 text-sm font-normal text-[#19251f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#f3f5f2] disabled:opacity-70';
  const labelClassName = 'flex min-w-0 flex-col gap-1 text-xs font-semibold text-[#58665e]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
      <div
        aria-labelledby="amend-trade-title"
        aria-modal="true"
        className="my-auto w-full max-w-2xl rounded-md border border-[#d9dfd9] bg-white p-5 shadow-xl sm:p-6"
        onKeyDown={handleDialogKeyDown}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#19251f]" id="amend-trade-title">
              Amend trade
            </h2>
            <p className="mt-1 text-sm text-[#58665e]">Trade {trade.id}</p>
          </div>
          <button
            className="min-h-11 rounded-md px-3 text-sm font-semibold text-[#58665e] transition-colors duration-200 ease-out hover:bg-[#f3f5f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isPending}
            onClick={closeDialog}
            type="button"
          >
            Close
          </button>
        </div>

        <form
          className="space-y-4"
          noValidate
          onSubmit={(event) => {
            void submitForm(event);
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={labelClassName}>
              Symbol
              <input
                aria-describedby={errors.symbol ? 'amend-symbol-error' : undefined}
                aria-invalid={Boolean(errors.symbol)}
                className={fieldClassName}
                disabled={isPending}
                maxLength={16}
                {...register('symbol')}
              />
              {errors.symbol && (
                <span className="text-xs font-normal text-red-600" id="amend-symbol-error">
                  {errors.symbol.message}
                </span>
              )}
            </label>

            <label className={labelClassName}>
              Side
              <select className={fieldClassName} disabled={isPending} {...register('side')}>
                <option value="BUY">Buy</option>
                <option value="SELL">Sell</option>
              </select>
            </label>

            <label className={labelClassName}>
              Quantity
              <input
                aria-describedby={errors.quantity ? 'amend-quantity-error' : undefined}
                aria-invalid={Boolean(errors.quantity)}
                className={fieldClassName}
                disabled={isPending}
                min="1"
                step="1"
                type="number"
                {...register('quantity', { valueAsNumber: true })}
              />
              {errors.quantity && (
                <span className="text-xs font-normal text-red-600" id="amend-quantity-error">
                  {errors.quantity.message}
                </span>
              )}
            </label>

            <label className={labelClassName}>
              Price
              <input
                aria-describedby={errors.price ? 'amend-price-error' : undefined}
                aria-invalid={Boolean(errors.price)}
                className={fieldClassName}
                disabled={isPending}
                min="0.01"
                step="any"
                type="number"
                {...register('price', { valueAsNumber: true })}
              />
              {errors.price && (
                <span className="text-xs font-normal text-red-600" id="amend-price-error">
                  {errors.price.message}
                </span>
              )}
            </label>

            <label className={labelClassName}>
              Trader
              <input
                aria-describedby={errors.trader ? 'amend-trader-error' : undefined}
                aria-invalid={Boolean(errors.trader)}
                className={fieldClassName}
                disabled={isPending}
                maxLength={32}
                {...register('trader')}
              />
              {errors.trader && (
                <span className="text-xs font-normal text-red-600" id="amend-trader-error">
                  {errors.trader.message}
                </span>
              )}
            </label>

            <label className={labelClassName}>
              Trade date
              <input
                aria-describedby={errors.tradeTimestamp ? 'amend-trade-date-error' : undefined}
                aria-invalid={Boolean(errors.tradeTimestamp)}
                className={fieldClassName}
                disabled={isPending}
                type="datetime-local"
                {...register('tradeTimestamp')}
              />
              {errors.tradeTimestamp && (
                <span className="text-xs font-normal text-red-600" id="amend-trade-date-error">
                  {errors.tradeTimestamp.message}
                </span>
              )}
            </label>

            <label className={labelClassName}>
              Book
              <input
                aria-describedby={errors.book ? 'amend-book-error' : undefined}
                aria-invalid={Boolean(errors.book)}
                className={fieldClassName}
                disabled={isPending}
                maxLength={64}
                {...register('book')}
              />
              {errors.book && (
                <span className="text-xs font-normal text-red-600" id="amend-book-error">
                  {errors.book.message}
                </span>
              )}
            </label>

            <label className={labelClassName}>
              Counterparty
              <input
                aria-describedby={errors.counterparty ? 'amend-counterparty-error' : undefined}
                aria-invalid={Boolean(errors.counterparty)}
                className={fieldClassName}
                disabled={isPending}
                maxLength={120}
                {...register('counterparty')}
              />
              {errors.counterparty && (
                <span className="text-xs font-normal text-red-600" id="amend-counterparty-error">
                  {errors.counterparty.message}
                </span>
              )}
            </label>
          </div>

          {errors.root?.server && (
            <p className="text-sm text-red-700" role="alert">
              {errors.root.server.message}
            </p>
          )}

          <div className="flex flex-col-reverse justify-end gap-3 border-t border-[#e6eae6] pt-4 sm:flex-row">
            <button
              className="min-h-11 rounded-md border border-[#cdd5ce] px-4 py-2 text-sm font-semibold transition-colors duration-200 ease-out hover:bg-[#f3f5f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isPending}
              onClick={closeDialog}
              type="button"
            >
              Cancel
            </button>
            <button
              className="min-h-11 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 ease-out hover:bg-blue-500 active:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isPending}
              type="submit"
            >
              {isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
