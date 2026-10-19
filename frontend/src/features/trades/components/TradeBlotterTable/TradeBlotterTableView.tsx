import { flexRender } from '@tanstack/react-table';
import type { Table } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { Trade } from '../../trade-schema';

type TradeBlotterTableViewProps = {
  table: Table<Trade>;
  isLoading: boolean;
  emptyMessage: string;
};

const columnLabels: Record<string, string> = {
  symbol: 'Trade',
  dateTime: 'Date & Time',
  quantity: 'Quantity',
  price: 'Price',
  status: 'Status',
  actions: 'Actions',
};

const columnWidths: Record<string, string> = {
  symbol: 'w-[21%]',
  dateTime: 'w-[25%]',
  quantity: 'w-[13.5%]',
  price: 'w-[13.5%]',
  status: 'w-[13.5%]',
  actions: 'w-[13.5%]',
};

export default function TradeBlotterTableView({
  table,
  isLoading,
  emptyMessage,
}: TradeBlotterTableViewProps) {
  const columns = table.getVisibleLeafColumns();
  const rows = table.getRowModel().rows;

  return (
    <div className="border-x border-b border-[var(--trade-border)] bg-white">
      <div className="overflow-x-auto">
        <table
          aria-busy={isLoading}
          aria-label="Trade blotter"
          className="w-full min-w-[860px] table-fixed border-collapse text-left text-sm"
        >
          <colgroup>
            {columns.map((column) => (
              <col className={columnWidths[column.id]} key={column.id} />
            ))}
          </colgroup>
          <thead className="bg-[var(--trade-surface)] text-xs uppercase text-[var(--trade-muted)]">
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
                      className={`border-b border-[var(--trade-border)] px-3 py-1 font-semibold ${
                        header.column.id === 'quantity' || header.column.id === 'price'
                          ? 'text-right'
                          : header.column.id === 'actions'
                            ? 'text-center'
                            : ''
                      }`}
                      key={header.id}
                      scope="col"
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button
                          aria-label={`Sort by ${label}`}
                          className="inline-flex min-h-11 items-center gap-1 text-inherit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trade-accent)] focus-visible:ring-offset-2"
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
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-[var(--trade-border)]">
            {isLoading ? (
              <>
                <tr className="sr-only">
                  <td colSpan={columns.length}>
                    <span role="status">Loading trades</span>
                  </td>
                </tr>
                {Array.from({ length: 5 }, (_, rowIndex) => (
                  <tr aria-hidden="true" key={`loading-${rowIndex}`}>
                    {columns.map((column) => (
                      <td className="px-4 py-3" key={column.id}>
                        <div className="h-4 animate-pulse rounded bg-[#e7e9f6]" />
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-10 text-center text-[var(--trade-muted)]"
                  colSpan={columns.length}
                >
                  <span role="status">{emptyMessage}</span>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  className={row.original.status === 'CANCELLED' ? 'bg-[#f3f4f6]' : ''}
                  key={row.id}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      className={`px-3 py-3 ${
                        cell.column.id === 'quantity' || cell.column.id === 'price'
                          ? 'text-right tabular-nums'
                          : cell.column.id === 'actions'
                            ? 'text-center'
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
