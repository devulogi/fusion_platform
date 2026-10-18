import type { FormEventHandler, KeyboardEventHandler, RefObject } from 'react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { Trade } from '../../trade-schema';
import type { AmendTradeFormValues } from './types';

type AmendTradeDialogViewProps = {
  trade: Trade;
  isPending: boolean;
  errors: FieldErrors<AmendTradeFormValues>;
  register: UseFormRegister<AmendTradeFormValues>;
  dialogRef: RefObject<HTMLDivElement>;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
};

const fieldClassName =
  'min-h-11 w-full rounded-md border border-[var(--trade-border)] bg-white px-3 text-sm font-normal text-[var(--trade-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trade-accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[var(--trade-surface)] disabled:opacity-70';
const labelClassName =
  'flex min-w-0 flex-col gap-1 text-xs font-semibold text-[var(--trade-muted)]';

export default function AmendTradeDialogView({
  trade,
  isPending,
  errors,
  register,
  dialogRef,
  onClose,
  onSubmit,
  onKeyDown,
}: AmendTradeDialogViewProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#20232b]/30 p-4">
      <div
        aria-labelledby="amend-trade-title"
        aria-modal="true"
        className="my-auto w-full max-w-2xl rounded-md border border-[var(--trade-border)] bg-white p-5 shadow-xl sm:p-6"
        onKeyDown={onKeyDown}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--trade-text)]" id="amend-trade-title">
              Amend trade
            </h2>
            <p className="mt-1 text-sm text-[var(--trade-muted)]">Trade {trade.id}</p>
          </div>
          <button
            className="min-h-11 rounded-md px-3 text-sm font-semibold text-[var(--trade-muted)] transition-colors duration-200 ease-out hover:bg-[var(--trade-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trade-accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isPending}
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <form className="space-y-4" noValidate onSubmit={onSubmit}>
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

          <div className="flex flex-col-reverse justify-end gap-3 border-t border-[var(--trade-border)] pt-4 sm:flex-row">
            <button
              className="min-h-11 rounded-md border border-[var(--trade-border)] px-4 py-2 text-sm font-semibold transition-colors duration-200 ease-out hover:bg-[var(--trade-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trade-accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isPending}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="min-h-11 rounded-md bg-[var(--trade-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#263bb5] active:bg-[#2436a3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trade-accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
