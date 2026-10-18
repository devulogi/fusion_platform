import { X } from 'lucide-react';
import type { KeyboardEvent, RefObject } from 'react';
import type { AdvancedTradeFilters } from './types';

type TradeFilterDialogProps = {
  filters: AdvancedTradeFilters;
  closeButtonRef: RefObject<HTMLButtonElement>;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onToggleSide: (side: 'BUY' | 'SELL') => void;
  onToggleStatus: (status: 'ACTIVE' | 'CANCELLED') => void;
  onTraderChange: (value: string) => void;
  onResetRange: () => void;
  onResetAll: () => void;
  onCancel: () => void;
  onApply: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
};

const fieldClassName =
  'min-h-11 rounded-md border border-[var(--trade-border)] bg-white px-3 text-sm font-normal text-[var(--trade-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trade-accent)] focus-visible:ring-offset-2';

export default function TradeFilterDialog({
  filters,
  closeButtonRef,
  onStartDateChange,
  onEndDateChange,
  onToggleSide,
  onToggleStatus,
  onTraderChange,
  onResetRange,
  onResetAll,
  onCancel,
  onApply,
  onKeyDown,
}: TradeFilterDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#20232b]/20 p-4 backdrop-blur-[1px]">
      <section
        aria-labelledby="trade-filter-title"
        aria-modal="true"
        className="w-full max-w-md rounded-md border border-[var(--trade-border)] bg-white shadow-xl"
        id="trade-filter-panel"
        onKeyDown={onKeyDown}
        role="dialog"
      >
        <header className="flex items-center justify-between border-b border-[var(--trade-border)] px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--trade-text)]" id="trade-filter-title">
            Filter Trades
          </h2>
          <button
            aria-label="Close filters"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-[var(--trade-muted)] hover:bg-[var(--trade-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trade-accent)] focus-visible:ring-offset-2"
            onClick={onCancel}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </header>

        <div className="grid gap-5 p-5">
          <section aria-labelledby="trade-date-range-title">
            <div className="mb-2 flex items-center justify-between">
              <h3
                className="text-sm font-semibold text-[var(--trade-text)]"
                id="trade-date-range-title"
              >
                Date Range
              </h3>
              <button
                className="min-h-9 px-2 text-sm text-[var(--trade-muted)] hover:text-[var(--trade-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trade-accent)]"
                onClick={onResetRange}
                type="button"
              >
                Reset range
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-[var(--trade-muted)]">
                From
                <input
                  aria-label="Start date"
                  className={fieldClassName}
                  max={filters.endDate || undefined}
                  onChange={(event) => onStartDateChange(event.target.value)}
                  type="date"
                  value={filters.startDate}
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-[var(--trade-muted)]">
                To
                <input
                  aria-label="End date"
                  className={fieldClassName}
                  min={filters.startDate || undefined}
                  onChange={(event) => onEndDateChange(event.target.value)}
                  type="date"
                  value={filters.endDate}
                />
              </label>
            </div>
          </section>

          <section aria-labelledby="trade-side-filter-title">
            <h3
              className="mb-2 text-sm font-semibold text-[var(--trade-text)]"
              id="trade-side-filter-title"
            >
              Side
            </h3>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {(['BUY', 'SELL'] as const).map((side) => (
                <label
                  className="inline-flex min-h-9 items-center gap-2 text-sm text-[var(--trade-text)]"
                  key={side}
                >
                  <input
                    checked={filters.sides.includes(side)}
                    className="h-4 w-4 accent-[var(--trade-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trade-accent)] focus-visible:ring-offset-2"
                    onChange={() => onToggleSide(side)}
                    type="checkbox"
                  />
                  {side === 'BUY' ? 'Buy' : 'Sell'}
                </label>
              ))}
            </div>
          </section>

          <section aria-labelledby="trade-status-filter-title">
            <h3
              className="mb-2 text-sm font-semibold text-[var(--trade-text)]"
              id="trade-status-filter-title"
            >
              Status
            </h3>
            <div className="flex flex-wrap gap-2">
              {(['ACTIVE', 'CANCELLED'] as const).map((status) => {
                const isSelected = filters.statuses.includes(status);
                return (
                  <label
                    className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-sm ${
                      isSelected
                        ? status === 'ACTIVE'
                          ? 'border-[#31966a] bg-[var(--trade-active-bg)] text-[var(--trade-active-text)]'
                          : 'border-[#d25360] bg-[var(--trade-cancelled-bg)] text-[var(--trade-cancelled-text)]'
                        : 'border-[var(--trade-border)] text-[var(--trade-muted)]'
                    }`}
                    key={status}
                  >
                    <input
                      checked={isSelected}
                      className="h-4 w-4 accent-[var(--trade-accent)]"
                      onChange={() => onToggleStatus(status)}
                      type="checkbox"
                    />
                    {status === 'ACTIVE' ? 'Active' : 'Cancelled'}
                  </label>
                );
              })}
            </div>
          </section>

          <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-[var(--trade-muted)]">
            Trader
            <input
              className={fieldClassName}
              onChange={(event) => onTraderChange(event.target.value)}
              type="search"
              value={filters.trader}
            />
          </label>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--trade-border)] px-5 py-4">
          <button
            className="min-h-10 text-sm font-medium text-[var(--trade-muted)] underline-offset-4 hover:text-[var(--trade-accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trade-accent)]"
            onClick={onResetAll}
            type="button"
          >
            Reset all
          </button>
          <div className="flex gap-2">
            <button
              className="min-h-11 rounded-md border border-[var(--trade-border)] px-4 py-2 text-sm font-semibold text-[var(--trade-text)] hover:bg-[var(--trade-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trade-accent)] focus-visible:ring-offset-2"
              onClick={onCancel}
              type="button"
            >
              Cancel
            </button>
            <button
              className="min-h-11 rounded-md bg-[var(--trade-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[#263bb5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trade-accent)] focus-visible:ring-offset-2"
              onClick={onApply}
              type="button"
            >
              Apply Filters
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
