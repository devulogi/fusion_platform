import type { FormEventHandler, KeyboardEventHandler } from 'react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { CreateTradeFieldName, CreateTradeFormValues } from './types';

type CreateTradeDialogViewProps = {
  pending: boolean;
  submitError: boolean;
  errors: FieldErrors<CreateTradeFormValues>;
  register: UseFormRegister<CreateTradeFormValues>;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
};

const inputClassName =
  'min-h-11 w-full rounded-md border border-[var(--trade-border)] bg-white px-3 text-sm text-[var(--trade-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trade-accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[var(--trade-surface)]';
const labelClassName =
  'flex min-w-0 flex-col gap-1 text-xs font-semibold text-[var(--trade-muted)]';

export default function CreateTradeDialogView({
  pending,
  submitError,
  errors,
  register,
  onClose,
  onSubmit,
  onKeyDown,
}: CreateTradeDialogViewProps) {
  const fieldAttributes = (name: CreateTradeFieldName) => {
    const hasError = Boolean(errors[name]);
    return {
      'aria-describedby': hasError ? `${name}-error` : undefined,
      'aria-invalid': hasError ? true : undefined,
    };
  };
  const renderError = (name: CreateTradeFieldName) => {
    const message = errors[name]?.message;
    return typeof message === 'string' ? (
      <span className="text-xs font-medium text-red-700" id={`${name}-error`}>
        {message}
      </span>
    ) : null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#20232b]/30 p-4">
      <div
        aria-labelledby="create-trade-title"
        aria-modal="true"
        className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-md border border-[var(--trade-border)] bg-white shadow-xl"
        onKeyDown={onKeyDown}
        role="dialog"
      >
        <form noValidate onSubmit={onSubmit}>
          <header className="flex items-center justify-between border-b border-[var(--trade-border)] px-5 py-4">
            <h2 className="text-lg font-semibold text-[var(--trade-text)]" id="create-trade-title">
              Create trade
            </h2>
            <button
              aria-label="Close create trade dialog"
              className="min-h-11 min-w-11 rounded-md text-xl text-[var(--trade-muted)] hover:bg-[var(--trade-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trade-accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={pending}
              onClick={onClose}
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
              <label htmlFor="tradeTimestamp">Trade date and time</label>
              <input
                {...register('tradeTimestamp')}
                {...fieldAttributes('tradeTimestamp')}
                className={inputClassName}
                id="tradeTimestamp"
                type="datetime-local"
              />
              {renderError('tradeTimestamp')}
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

          <footer className="flex flex-wrap justify-end gap-3 border-t border-[var(--trade-border)] px-5 py-4">
            <button
              className="min-h-11 rounded-md border border-[var(--trade-border)] px-4 py-2 text-sm font-semibold text-[var(--trade-text)] transition-colors duration-200 ease-out hover:bg-[var(--trade-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trade-accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={pending}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="min-h-11 rounded-md bg-[var(--trade-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#263bb5] active:bg-[#2436a3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trade-accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
