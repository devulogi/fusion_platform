import TradePaginationView from './TradePaginationView';

export type TradePaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  pageCount: number;
  onPageChange: (page: number) => void;
};

export default function TradePagination({
  page,
  pageSize,
  totalItems,
  pageCount,
  onPageChange,
}: TradePaginationProps) {
  return (
    <TradePaginationView
      page={page}
      pageSize={pageSize}
      totalItems={totalItems}
      pageCount={pageCount}
      onPageChange={onPageChange}
    />
  );
}
