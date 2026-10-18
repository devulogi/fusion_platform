import TradePaginationView from './TradePaginationView';

export type TradePaginationProps = {
  pageIndex: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (pageIndex: number) => void;
};

export default function TradePagination({
  pageIndex,
  pageSize,
  totalItems,
  onPageChange,
}: TradePaginationProps) {
  const pageCount = Math.ceil(totalItems / pageSize);
  const rangeStart = totalItems === 0 ? 0 : pageIndex * pageSize + 1;
  const rangeEnd = Math.min((pageIndex + 1) * pageSize, totalItems);

  return (
    <TradePaginationView
      rangeStart={rangeStart}
      rangeEnd={rangeEnd}
      totalItems={totalItems}
      itemLabel={totalItems === 1 ? 'trade' : 'trades'}
      canGoPrevious={pageIndex > 0}
      canGoNext={pageIndex + 1 < pageCount}
      onPrevious={() => onPageChange(Math.max(0, pageIndex - 1))}
      onNext={() => onPageChange(Math.min(pageIndex + 1, pageCount - 1))}
    />
  );
}
