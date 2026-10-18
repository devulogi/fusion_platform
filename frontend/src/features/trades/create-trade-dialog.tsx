import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { KeyboardEvent } from 'react';
import { z } from 'zod';

const createTradeFormSchema = z
  .object({
    symbol: z.string().trim().min(1, 'Enter a symbol').max(16, 'Use 16 characters or fewer'),
    quantity: z
      .number({ invalid_type_error: 'Enter a quantity above zero' })
      .int('Enter a whole number')
      .positive('Enter a quantity above zero'),
    price: z
      .number({ invalid_type_error: 'Enter a price above zero' })
      .finite('Enter a valid price')
      .positive('Enter a price above zero'),
    side: z.enum(['BUY', 'SELL'], {
      errorMap: () => ({ message: 'Select a side' }),
    }),
    trader: z.string().trim().min(1, 'Enter a trader').max(32, 'Use 32 characters or fewer'),
    tradeDate: z
      .string()
      .min(1, 'Enter a trade date and time')
      .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid trade date and time')
      .transform((value) => new Date(value).toISOString()),
    status: z.enum(['ACTIVE', 'CANCELLED'], {
      errorMap: () => ({ message: 'Select a status' }),
    }),
    book: z
      .string()
      .max(64, 'Use 64 characters or fewer')
      .optional()
      .transform((value) => value?.trim() || undefined),
    counterparty: z
      .string()
      .max(120, 'Use 120 characters or fewer')
      .optional()
      .transform((value) => value?.trim() || undefined),
  })
  .strict();

export type CreateTradeInput = z.output<typeof createTradeFormSchema>;

type CreateTradeDialogProps = {
  open: boolean;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (input: CreateTradeInput) => void | Promise<unknown>;
};

type FieldName = keyof CreateTradeInput;

export default function CreateTradeDialog({
  open,
  isPending,
  onClose,
  onSubmit,
}: CreateTradeDialogProps) {
  const [submitError, setSubmitError] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof createTradeFormSchema>, unknown, CreateTradeInput>({
    resolver: zodResolver(createTradeFormSchema),
    defaultValues: {
      symbol: '',
      side: undefined,
      trader: '',
      tradeDate: '',
      status: undefined,
      book: '',
      counterparty: '',
    },
  });
  const pending = isPending || isSubmitting;

  useEffect(() => {
    if (open) {
      setFocus('symbol');
    } else {
      reset();
      setSubmitError(false);
    }
  }, [open, reset, setFocus]);

  if (!open) return null;

  const closeDialog = () => {
    if (!pending) onClose();
  };

  const submitTrade = handleSubmit(async (input) => {
    setSubmitError(false);
    try {
      await onSubmit(input);
      reset();
      onClose();
    } catch {
      setSubmitError(true);
    }
  });

  const fieldAttributes = (name: FieldName) => {
    const hasError = Boolean(errors[name]);
    return {
      'aria-describedby': hasError ? `${name}-error` : undefined,
      'aria-invalid': hasError ? true : undefined,
    };
  };

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDialog();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusable = event.currentTarget.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled])',
    );
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

  const inputClassName =
    'min-h-11 w-full rounded-md border border-[#cdd5ce] bg-white px-3 text-sm text-[#19251f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#f3f5f2]';
  const labelClassName = 'flex min-w-0 flex-col gap-1 text-xs font-semibold text-[#58665e]';
  const renderError = (name: FieldName) => {
    const error = errors[name];
    return error ? (
      <span className="text-xs font-medium text-red-700" id={`${name}-error`}>
        {error.message}
      </span>
    ) : null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
      <div
        aria-labelledby="create-trade-title"
        aria-modal="true"
        className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-md border border-[#d9dfd9] bg-white shadow-xl"
        onKeyDown={handleDialogKeyDown}
        role="dialog"
      >
        <form noValidate onSubmit={(event) => void submitTrade(event)}>
          <header className="flex items-center justify-between border-b border-[#e6eae6] px-5 py-4">
            <h2 className="text-lg font-semibold text-[#19251f]" id="create-trade-title">
              Create trade
            </h2>
            <button
              aria-label="Close create trade dialog"
              className="min-h-11 min-w-11 rounded-md text-xl text-[#58665e] hover:bg-[#f3f5f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={pending}
              onClick={closeDialog}
              type="button"
            >
              <span aria-hidden="true">×</span>
            </button>
          </header>

          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            {submitError && (
              <p className="sm:col-span-2" role="alert">
                Trade could not be created. Check the details and try again.
              </p>
            )}

            <div className={labelClassName}>
              <label htmlFor="symbol">Symbol</label>
              <input
                {...register('symbol')}
                {...fieldAttributes('symbol')}
                className={inputClassName}
                autoComplete="off"
                id="symbol"
                maxLength={16}
              />
              {renderError('symbol')}
            </div>

            <div className={labelClassName}>
              <label htmlFor="quantity">Quantity</label>
              <input
                {...register('quantity', { valueAsNumber: true })}
                {...fieldAttributes('quantity')}
                className={inputClassName}
                id="quantity"
                inputMode="numeric"
                min="1"
                step="1"
                type="number"
              />
              {renderError('quantity')}
            </div>

            <div className={labelClassName}>
              <label htmlFor="price">Price</label>
              <input
                {...register('price', { valueAsNumber: true })}
                {...fieldAttributes('price')}
                className={inputClassName}
                id="price"
                inputMode="decimal"
                min="0.01"
                step="any"
                type="number"
              />
              {renderError('price')}
            </div>

            <div className={labelClassName}>
              <label htmlFor="side">Side</label>
              <select
                {...register('side')}
                {...fieldAttributes('side')}
                className={inputClassName}
                id="side"
              >
                <option value="">Select side</option>
                <option value="BUY">Buy</option>
                <option value="SELL">Sell</option>
              </select>
              {renderError('side')}
            </div>

            <div className={labelClassName}>
              <label htmlFor="trader">Trader</label>
              <input
                {...register('trader')}
                {...fieldAttributes('trader')}
                className={inputClassName}
                autoComplete="off"
                id="trader"
                maxLength={32}
              />
              {renderError('trader')}
            </div>

            <div className={labelClassName}>
              <label htmlFor="tradeDate">Trade date and time</label>
              <input
                {...register('tradeDate')}
                {...fieldAttributes('tradeDate')}
                className={inputClassName}
                id="tradeDate"
                type="datetime-local"
              />
              {renderError('tradeDate')}
            </div>

            <div className={labelClassName}>
              <label htmlFor="status">Status</label>
              <select
                {...register('status')}
                {...fieldAttributes('status')}
                className={inputClassName}
                id="status"
              >
                <option value="">Select status</option>
                <option value="ACTIVE">Active</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              {renderError('status')}
            </div>

            <div className={labelClassName}>
              <label htmlFor="book">Book (optional)</label>
              <input
                {...register('book')}
                {...fieldAttributes('book')}
                className={inputClassName}
                id="book"
                maxLength={64}
              />
              {renderError('book')}
            </div>

            <div className={labelClassName}>
              <label htmlFor="counterparty">Counterparty (optional)</label>
              <input
                {...register('counterparty')}
                {...fieldAttributes('counterparty')}
                className={inputClassName}
                id="counterparty"
                maxLength={120}
              />
              {renderError('counterparty')}
            </div>
          </div>

          <footer className="flex flex-wrap justify-end gap-3 border-t border-[#e6eae6] px-5 py-4">
            <button
              className="min-h-11 rounded-md border border-[#cdd5ce] px-4 py-2 text-sm font-semibold text-[#19251f] transition-colors duration-200 ease-out hover:bg-[#f3f5f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={pending}
              onClick={closeDialog}
              type="button"
            >
              Cancel
            </button>
            <button
              className="min-h-11 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 ease-out hover:bg-blue-500 active:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={pending}
              type="submit"
            >
              {pending ? 'Creating…' : 'Create trade'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
