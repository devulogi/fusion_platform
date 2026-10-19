import { ChevronLeft, ChevronRight } from 'lucide-react';

type TradePaginationViewProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  pageCount: number;
  onPageChange: (page: number) => void;
};

export default function TradePaginationView({
  page,
  pageSize,
  totalItems,
  pageCount,
  onPageChange,
}: TradePaginationViewProps) {
  const normalizedPageSize = Number.isSafeInteger(pageSize) && pageSize > 0 ? pageSize : 1;
  const normalizedTotalItems = Number.isSafeInteger(totalItems) && totalItems >= 0 ? totalItems : 0;
  const derivedPageCount = Math.ceil(normalizedTotalItems / normalizedPageSize);
  const normalizedPageCount =
    Number.isSafeInteger(pageCount) && pageCount === derivedPageCount
      ? pageCount
      : derivedPageCount;
  const requestedPage = Number.isSafeInteger(page) && page > 0 ? page : 1;
  const currentPage = normalizedPageCount === 0 ? 0 : Math.min(requestedPage, normalizedPageCount);
  const firstItem = currentPage === 0 ? 0 : (currentPage - 1) * normalizedPageSize + 1;
  const lastItem =
    currentPage === 0 ? 0 : Math.min(currentPage * normalizedPageSize, normalizedTotalItems);
  const windowSize = 5;
  const firstPage = Math.max(1, Math.min(currentPage - 2, normalizedPageCount - windowSize + 1));
  const lastPage = Math.min(normalizedPageCount, firstPage + windowSize - 1);

  return (
    <nav
      aria-label="Trade pages"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--trade-border)] px-4 py-2 text-sm text-[var(--trade-muted)]"
    >
      <p aria-live="polite" className="tabular-nums">
        Showing {firstItem}-{lastItem} of {normalizedTotalItems} trades
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <button
          aria-label="Previous page"
          className="inline-flex min-h-11 items-center gap-1 rounded px-2 transition-colors duration-200 ease-out hover:bg-[var(--trade-surface)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          type="button"
        >
          <ChevronLeft aria-hidden="true" size={16} />
          Previous
        </button>
        {Array.from({ length: lastPage - firstPage + 1 }, (_, index) => firstPage + index).map(
          (pageNumber) => (
            <button
              aria-current={pageNumber === currentPage ? 'page' : undefined}
              aria-label={`Page ${pageNumber}`}
              className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded px-3 tabular-nums transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trade-accent)] focus-visible:ring-offset-2 ${
                pageNumber === currentPage
                  ? 'bg-[var(--trade-accent)] font-semibold text-white'
                  : 'hover:bg-[var(--trade-surface)]'
              }`}
              key={pageNumber}
              onClick={() => onPageChange(pageNumber)}
              type="button"
            >
              {pageNumber}
            </button>
          ),
        )}
        <span className="px-2 tabular-nums">
          {currentPage === 0 ? 'No pages' : `Page ${currentPage} of ${normalizedPageCount}`}
        </span>
        <button
          aria-label="Next page"
          className="inline-flex min-h-11 items-center gap-1 rounded px-2 transition-colors duration-200 ease-out hover:bg-[var(--trade-surface)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={currentPage === 0 || currentPage >= normalizedPageCount}
          onClick={() => onPageChange(currentPage + 1)}
          type="button"
        >
          Next
          <ChevronRight aria-hidden="true" size={16} />
        </button>
      </div>
    </nav>
  );
}
