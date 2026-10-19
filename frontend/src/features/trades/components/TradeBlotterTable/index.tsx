import { useMemo } from 'react';
import { createColumnHelper, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import type { SortingState, Updater } from '@tanstack/react-table';
import TradeFilterToolbar from '../TradeFilterToolbar';
import type { AdvancedTradeFilters } from '../TradeFilterToolbar/types';
import TradeRowActions from '../TradeRowActions';
import TradeStatusBadge from '../TradeStatusBadge';
import TradeBlotterTableView from './TradeBlotterTableView';
import type { Trade } from '../../trade-schema';
import type { TradeSortBy, TradeSortDirection } from '../../trade-schema';
import TradePagination from '../TradePagination';
import type { TradePaginationProps } from '../TradePagination';

type TradeBlotterTableProps = {
  trades: Trade[];
  isLoading: boolean;
  emptyMessage: string;
  actionsDisabled: boolean;
  symbol: string;
  filters: AdvancedTradeFilters;
  activeFilterCount: number;
  sortBy: TradeSortBy;
  sortDirection: TradeSortDirection;
  pagination: Omit<TradePaginationProps, 'onPageChange'>;
  onPageChange: TradePaginationProps['onPageChange'];
  onSymbolChange: (value: string) => void;
  onFiltersApply: (filters: AdvancedTradeFilters) => void;
  onSortChange: (sortBy: TradeSortBy, sortDirection: TradeSortDirection) => void;
  onAmend: (trade: Trade) => void;
  onCancel: (trade: Trade) => void;
};

const columnHelper = createColumnHelper<Trade>();

function createTradeColumns(
  actionsDisabled: boolean,
  onAmend: (trade: Trade) => void,
  onCancel: (trade: Trade) => void,
) {
  return [
    columnHelper.accessor('symbol', {
      header: 'Trade',
      cell: ({ row }) => {
        const trade = row.original;
        return (
          <div className="group flex min-w-0 items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-[var(--trade-text)]">
                {trade.symbol}{' '}
                <span
                  className={
                    trade.side === 'BUY'
                      ? 'text-[var(--trade-active-text)]'
                      : 'text-[var(--trade-cancelled-text)]'
                  }
                >
                  · {trade.side}
                </span>
              </p>
              <p className="truncate text-xs text-[var(--trade-muted)]">{trade.trader}</p>
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor('tradeTimestamp', {
      id: 'dateTime',
      header: 'Date & Time',
      cell: ({ getValue }) => formatTradeTimestamp(getValue()),
    }),
    columnHelper.accessor('trader', {
      id: 'trader',
      header: 'Trader filter',
    }),
    columnHelper.accessor('side', {
      id: 'side',
      header: 'Side filter',
    }),
    columnHelper.accessor('quantity', {
      header: 'Quantity',
      cell: ({ getValue }) => getValue().toLocaleString(),
    }),
    columnHelper.accessor('price', {
      header: 'Price',
      cell: ({ getValue }) => `$${getValue().toFixed(2)}`,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: ({ getValue }) => <TradeStatusBadge status={getValue()} />,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => {
        const trade = row.original;
        if (trade.status !== 'ACTIVE') {
          return <span className="text-xs text-[var(--trade-muted)]">No actions</span>;
        }
        return (
          <TradeRowActions
            tradeId={trade.id}
            disabled={actionsDisabled}
            onAmend={() => onAmend(trade)}
            onCancel={() => onCancel(trade)}
          />
        );
      },
    }),
  ];
}

function formatTradeTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  const dateText = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
  const timeText = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
  return `${dateText} · ${timeText}`;
}

export default function TradeBlotterTable({
  trades,
  isLoading,
  emptyMessage,
  actionsDisabled,
  symbol,
  filters,
  activeFilterCount,
  sortBy,
  sortDirection,
  pagination,
  onPageChange,
  onSymbolChange,
  onFiltersApply,
  onSortChange,
  onAmend,
  onCancel,
}: TradeBlotterTableProps) {
  const sorting: SortingState = [
    { id: sortBy === 'tradeTimestamp' ? 'dateTime' : sortBy, desc: sortDirection === 'desc' },
  ];
  const columns = useMemo(
    () => createTradeColumns(actionsDisabled, onAmend, onCancel),
    [actionsDisabled, onAmend, onCancel],
  );
  const table = useReactTable({
    data: trades,
    columns,
    getRowId: (trade) => trade.id,
    state: { sorting },
    initialState: { columnVisibility: { trader: false, side: false } },
    onSortingChange: (updater: Updater<SortingState>) => {
      const nextSorting = typeof updater === 'function' ? updater(sorting) : updater;
      const selected = nextSorting[0];
      const selectedSortBy = selected?.id === 'dateTime' ? 'tradeTimestamp' : selected?.id;
      const allowedSorts: TradeSortBy[] = [
        'symbol',
        'tradeTimestamp',
        'quantity',
        'price',
        'trader',
        'side',
        'status',
      ];
      onSortChange(
        allowedSorts.includes(selectedSortBy as TradeSortBy)
          ? (selectedSortBy as TradeSortBy)
          : 'tradeTimestamp',
        selected ? (selected.desc ? 'desc' : 'asc') : 'desc',
      );
    },
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    enableMultiSort: false,
    sortDescFirst: false,
  });
  return (
    <div>
      <TradeFilterToolbar
        symbol={symbol}
        filters={filters}
        activeFilterCount={activeFilterCount}
        onSymbolChange={onSymbolChange}
        onApply={onFiltersApply}
      />

      <TradeBlotterTableView table={table} isLoading={isLoading} emptyMessage={emptyMessage} />
      <TradePagination {...pagination} onPageChange={onPageChange} />
    </div>
  );
}
