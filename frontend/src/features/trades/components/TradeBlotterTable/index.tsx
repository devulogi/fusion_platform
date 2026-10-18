import { useMemo, useState } from 'react';
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';
import TradeFilterToolbar from '../TradeFilterToolbar';
import { emptyAdvancedTradeFilters } from '../TradeFilterToolbar/types';
import type { AdvancedTradeFilters } from '../TradeFilterToolbar/types';
import TradePagination from '../TradePagination';
import TradeRowActions from '../TradeRowActions';
import TradeStatusBadge from '../TradeStatusBadge';
import TradeBlotterTableView from './TradeBlotterTableView';
import type { Trade } from '../../trade-schema';

type TradeBlotterTableProps = {
  trades: Trade[];
  isLoading: boolean;
  emptyMessage: string;
  actionsDisabled: boolean;
  onAmend: (trade: Trade) => void;
  onCancel: (trade: Trade) => void;
};

const columnHelper = createColumnHelper<Trade>();
const PAGE_SIZE = 100;

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
                {trade.symbol} <span className="text-[var(--trade-accent)]">· {trade.side}</span>
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

function toLocalDateValue(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function TradeBlotterTable({
  trades,
  isLoading,
  emptyMessage,
  actionsDisabled,
  onAmend,
  onCancel,
}: TradeBlotterTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedTradeFilters>({
    ...emptyAdvancedTradeFilters,
    sides: [],
    statuses: [],
  });
  const columns = useMemo(
    () => createTradeColumns(actionsDisabled, onAmend, onCancel),
    [actionsDisabled, onAmend, onCancel],
  );
  const table = useReactTable({
    data: trades,
    columns,
    getRowId: (trade) => trade.id,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  const getStringFilterValue = (columnId: string): string => {
    const value = table.getColumn(columnId)?.getFilterValue();
    return typeof value === 'string' ? value : '';
  };
  const filteredRows = table.getRowModel().rows.filter(({ original: trade }) => {
    const traderMatches = trade.trader
      .toLocaleLowerCase()
      .includes(advancedFilters.trader.trim().toLocaleLowerCase());
    const sideMatches =
      advancedFilters.sides.length === 0 || advancedFilters.sides.includes(trade.side);
    const statusMatches =
      advancedFilters.statuses.length === 0 || advancedFilters.statuses.includes(trade.status);
    const tradeDate = toLocalDateValue(trade.tradeTimestamp);
    const startDateMatches = !advancedFilters.startDate || tradeDate >= advancedFilters.startDate;
    const endDateMatches = !advancedFilters.endDate || tradeDate <= advancedFilters.endDate;
    return traderMatches && sideMatches && statusMatches && startDateMatches && endDateMatches;
  });
  const activeFilterCount =
    Number(getStringFilterValue('symbol') !== '') +
    Number(advancedFilters.trader.trim() !== '') +
    Number(advancedFilters.startDate !== '' || advancedFilters.endDate !== '') +
    Number(advancedFilters.sides.length > 0) +
    Number(advancedFilters.statuses.length > 0);
  const pageCount = Math.ceil(filteredRows.length / PAGE_SIZE);
  const currentPageIndex = Math.min(pageIndex, Math.max(pageCount - 1, 0));
  const pageRows = filteredRows.slice(
    currentPageIndex * PAGE_SIZE,
    (currentPageIndex + 1) * PAGE_SIZE,
  );

  return (
    <div>
      <TradeFilterToolbar
        symbol={getStringFilterValue('symbol')}
        filters={advancedFilters}
        activeFilterCount={activeFilterCount}
        onSymbolChange={(value) => {
          setPageIndex(0);
          table.getColumn('symbol')?.setFilterValue(value);
        }}
        onApply={(filters) => {
          setPageIndex(0);
          setAdvancedFilters(filters);
        }}
      />

      <TradeBlotterTableView
        table={table}
        rows={pageRows}
        hasTrades={trades.length > 0}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        pagination={
          <TradePagination
            pageIndex={currentPageIndex}
            pageSize={PAGE_SIZE}
            totalItems={filteredRows.length}
            onPageChange={setPageIndex}
          />
        }
      />
    </div>
  );
}
