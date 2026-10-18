import { useMemo, useState } from 'react';
import { Ban, ArrowDown, ArrowUp, ArrowUpDown, Pencil } from 'lucide-react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';
import type { Trade } from './trade-schema';

type TradeBlotterTableProps = {
  trades: Trade[];
  isLoading: boolean;
  emptyMessage: string;
  actionsDisabled: boolean;
  onAmend: (trade: Trade) => void;
  onCancel: (trade: Trade) => void;
};

const columnHelper = createColumnHelper<Trade>();

const tradeColumns = [
  columnHelper.accessor('id', { header: 'Trade ID' }),
  columnHelper.accessor('symbol', { header: 'Symbol' }),
  columnHelper.accessor('side', {
    header: 'Side',
    cell: ({ getValue }) => {
      const side = getValue();
      return <span className={side === 'BUY' ? 'text-[#137a61]' : 'text-[#b25343]'}>{side}</span>;
    },
  }),
  columnHelper.accessor('quantity', {
    header: 'Quantity',
    cell: ({ getValue }) => getValue().toLocaleString(),
  }),
  columnHelper.accessor('price', {
    header: 'Price',
    cell: ({ getValue }) => getValue().toFixed(2),
  }),
  columnHelper.accessor('trader', { header: 'Trader' }),
  columnHelper.accessor('tradeTimestamp', {
    header: 'Trade date',
    cell: ({ getValue }) => getValue().slice(0, 10),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: ({ getValue }) => {
      const status = getValue();
      return (
        <span className={status === 'ACTIVE' ? 'text-[#137a61]' : 'text-[#7a6253]'}>
          {status === 'ACTIVE' ? 'Active' : 'Cancelled'}
        </span>
      );
    },
  }),
  columnHelper.accessor('book', {
    header: 'Book',
    cell: ({ getValue }) => getValue() ?? 'Not provided',
  }),
  columnHelper.accessor('counterparty', {
    header: 'Counterparty',
    cell: ({ getValue }) => getValue() ?? 'Not provided',
  }),
];

const columnLabels: Record<string, string> = {
  id: 'Trade ID',
  symbol: 'Symbol',
  side: 'Side',
  quantity: 'Quantity',
  price: 'Price',
  trader: 'Trader',
  tradeTimestamp: 'Trade date',
  status: 'Status',
  book: 'Book',
  counterparty: 'Counterparty',
  actions: 'Actions',
};

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
  const columns = useMemo(
    () => [
      ...tradeColumns,
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const trade = row.original;
          if (trade.status !== 'ACTIVE') {
            return <span aria-label="No actions available">—</span>;
          }

          return (
            <div className="flex items-center gap-1">
              <button
                aria-label={`Amend ${trade.id}`}
                className="min-h-11 min-w-11 rounded-md p-2.5 text-[#58665e] transition-colors duration-200 ease-out hover:bg-[#f3f5f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={actionsDisabled}
                onClick={() => onAmend(trade)}
                type="button"
              >
                <Pencil aria-hidden="true" size={16} />
              </button>
              <button
                aria-label={`Cancel ${trade.id}`}
                className="min-h-11 min-w-11 rounded-md p-2.5 text-red-600 transition-colors duration-200 ease-out hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={actionsDisabled}
                onClick={() => onCancel(trade)}
                type="button"
              >
                <Ban aria-hidden="true" size={16} />
              </button>
            </div>
          );
        },
      }),
    ],
    [actionsDisabled, onAmend, onCancel],
  );
  const table = useReactTable({
    data: trades,
    columns,
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
  const hasFilters = columnFilters.length > 0;

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 border-y border-[#d9dfd9] bg-white p-4">
        <label className="flex min-w-40 flex-col gap-1 text-xs font-semibold text-[#58665e]">
          Filter by symbol
          <input
            className="min-h-11 rounded-md border border-[#cdd5ce] px-3 text-sm font-normal text-[#19251f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            onChange={(event) => table.getColumn('symbol')?.setFilterValue(event.target.value)}
            type="search"
            value={getStringFilterValue('symbol')}
          />
        </label>
        <label className="flex min-w-40 flex-col gap-1 text-xs font-semibold text-[#58665e]">
          Filter by trader
          <input
            className="min-h-11 rounded-md border border-[#cdd5ce] px-3 text-sm font-normal text-[#19251f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            onChange={(event) => table.getColumn('trader')?.setFilterValue(event.target.value)}
            type="search"
            value={getStringFilterValue('trader')}
          />
        </label>
        <label className="flex min-w-40 flex-col gap-1 text-xs font-semibold text-[#58665e]">
          Filter by status
          <select
            className="min-h-11 rounded-md border border-[#cdd5ce] bg-white px-3 text-sm font-normal text-[#19251f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            onChange={(event) => table.getColumn('status')?.setFilterValue(event.target.value)}
            value={getStringFilterValue('status')}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </label>
        <button
          className="min-h-11 rounded-md border border-[#cdd5ce] px-4 py-2 text-sm font-semibold transition-colors duration-200 ease-out hover:bg-[#f3f5f2] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          disabled={!hasFilters}
          onClick={() => table.resetColumnFilters()}
          type="button"
        >
          Clear filters
        </button>
      </div>

      <div className="overflow-x-auto border-b border-[#d9dfd9] bg-white">
        <table
          aria-busy={isLoading}
          aria-label="Trade blotter"
          className="w-full min-w-[1120px] border-collapse text-left text-sm"
        >
          <thead className="bg-[#e9eeea] text-xs uppercase text-[#58665e]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sortDirection = header.column.getIsSorted();
                  const label = columnLabels[header.column.id] ?? header.column.id;

                  return (
                    <th
                      aria-sort={
                        sortDirection === 'asc'
                          ? 'ascending'
                          : sortDirection === 'desc'
                            ? 'descending'
                            : 'none'
                      }
                      className={`px-4 py-1 font-semibold ${
                        header.column.id === 'quantity' || header.column.id === 'price'
                          ? 'text-right'
                          : ''
                      }`}
                      key={header.id}
                      scope="col"
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          aria-label={`Sort by ${label}`}
                          className="inline-flex min-h-11 items-center gap-1 text-inherit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                          onClick={header.column.getToggleSortingHandler()}
                          type="button"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sortDirection === 'asc' ? (
                            <ArrowUp aria-hidden="true" size={14} />
                          ) : sortDirection === 'desc' ? (
                            <ArrowDown aria-hidden="true" size={14} />
                          ) : (
                            <ArrowUpDown aria-hidden="true" size={14} />
                          )}
                        </button>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-[#e6eae6]">
            {isLoading ? (
              <>
                <tr className="sr-only">
                  <td colSpan={columns.length}>
                    <span role="status">Loading trades</span>
                  </td>
                </tr>
                {Array.from({ length: 5 }, (_, rowIndex) => (
                  <tr aria-hidden="true" key={`loading-${rowIndex}`}>
                    {columns.map((column, columnIndex) => (
                      <td className="px-4 py-3" key={`${column.id ?? columnIndex}`}>
                        <div className="h-4 animate-pulse rounded bg-slate-200" />
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-[#69756e]" colSpan={columns.length}>
                  <span role="status">
                    {trades.length === 0 ? emptyMessage : 'No trades match these filters'}
                  </span>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td
                      className={`px-4 py-3 ${
                        cell.column.id === 'id' || cell.column.id === 'symbol'
                          ? 'font-semibold'
                          : ''
                      } ${
                        cell.column.id === 'quantity' || cell.column.id === 'price'
                          ? 'text-right tabular-nums'
                          : ''
                      }`}
                      key={cell.id}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
