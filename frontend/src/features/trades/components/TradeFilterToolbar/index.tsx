import { useEffect, useRef, useState } from 'react';
import { ListFilter } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { emptyAdvancedTradeFilters } from './types';
import type { AdvancedTradeFilters } from './types';
import TradeFilterDialog from './TradeFilterDialog';
import SymbolSearch from './SymbolSearch';

type TradeFilterToolbarProps = {
  symbol: string;
  filters: AdvancedTradeFilters;
  activeFilterCount: number;
  defaultOpen?: boolean;
  onSymbolChange: (value: string) => void;
  onApply: (filters: AdvancedTradeFilters) => void;
};

export default function TradeFilterToolbar({
  symbol,
  filters,
  activeFilterCount,
  defaultOpen = false,
  onSymbolChange,
  onApply,
}: TradeFilterToolbarProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [draftFilters, setDraftFilters] = useState<AdvancedTradeFilters>(filters);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const symbolBeforeOpenRef = useRef(symbol);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    return () => {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [isOpen]);

  const openFilters = () => {
    symbolBeforeOpenRef.current = symbol;
    setDraftFilters({ ...filters, sides: [...filters.sides], statuses: [...filters.statuses] });
    setIsOpen(true);
  };

  const applyFilters = () => {
    onApply(draftFilters);
    setIsOpen(false);
  };

  const cancelFilters = () => {
    onSymbolChange(symbolBeforeOpenRef.current);
    setIsOpen(false);
  };

  const resetFilters = () => {
    onSymbolChange('');
    setDraftFilters(emptyAdvancedTradeFilters);
  };

  const toggleFilterValue = <Value extends string>(values: Value[], value: Value): Value[] =>
    values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

  const handleFilterDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelFilters();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = event.currentTarget.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled])',
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

  return (
    <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border border-[var(--trade-border)] bg-white p-3">
      <SymbolSearch value={symbol} onChange={onSymbolChange} />
      <button
        aria-controls="trade-filter-panel"
        aria-expanded={isOpen}
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[var(--trade-border)] px-3 py-2 text-sm font-semibold text-[var(--trade-text)] transition-colors duration-200 ease-out hover:bg-[var(--trade-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trade-accent)] focus-visible:ring-offset-2"
        onClick={openFilters}
        ref={filterButtonRef}
        type="button"
      >
        <ListFilter aria-hidden="true" size={16} />
        Filters
        {activeFilterCount > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--trade-accent)] px-1 text-xs text-white">
            {activeFilterCount}
          </span>
        )}
      </button>

      {isOpen && (
        <TradeFilterDialog
          filters={draftFilters}
          closeButtonRef={closeButtonRef}
          onStartDateChange={(startDate) =>
            setDraftFilters((current) => ({ ...current, startDate }))
          }
          onEndDateChange={(endDate) => setDraftFilters((current) => ({ ...current, endDate }))}
          onToggleSide={(side) =>
            setDraftFilters((current) => ({
              ...current,
              sides: toggleFilterValue(current.sides, side),
            }))
          }
          onToggleStatus={(status) =>
            setDraftFilters((current) => ({
              ...current,
              statuses: toggleFilterValue(current.statuses, status),
            }))
          }
          onTraderChange={(trader) => setDraftFilters((current) => ({ ...current, trader }))}
          onResetRange={() =>
            setDraftFilters((current) => ({ ...current, startDate: '', endDate: '' }))
          }
          onResetAll={resetFilters}
          onCancel={cancelFilters}
          onApply={applyFilters}
          onKeyDown={handleFilterDialogKeyDown}
        />
      )}
    </div>
  );
}
