import { ChevronLeft, ChevronRight } from 'lucide-react';

type TradePaginationViewProps = {
  rangeStart: number;
  rangeEnd: number;
  totalItems: number;
  itemLabel: string;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
};

export default function TradePaginationView({
  rangeStart,
  rangeEnd,
  totalItems,
  itemLabel,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
}: TradePaginationViewProps) {
  return (
    <nav
      aria-label="Trade pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--trade-border)] px-4 py-2 text-sm text-[var(--trade-muted)]"
    >
      <p aria-atomic="true" aria-live="polite">
        Showing {rangeStart}-{rangeEnd} of {totalItems} {itemLabel}
      </p>
      <div className="flex items-center gap-1">
        <button
          aria-label="Previous page"
          className="inline-flex min-h-11 items-center gap-1 rounded px-2 transition-colors duration-200 ease-out hover:bg-[var(--trade-surface)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canGoPrevious}
          onClick={onPrevious}
          type="button"
        >
          <ChevronLeft aria-hidden="true" size={16} />
          Previous
        </button>
        <button
          aria-label="Next page"
          className="inline-flex min-h-11 items-center gap-1 rounded px-2 transition-colors duration-200 ease-out hover:bg-[var(--trade-surface)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canGoNext}
          onClick={onNext}
          type="button"
        >
          Next
          <ChevronRight aria-hidden="true" size={16} />
        </button>
      </div>
    </nav>
  );
}
