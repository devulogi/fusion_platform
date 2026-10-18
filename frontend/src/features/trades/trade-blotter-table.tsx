import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { Trade } from './trade-schema';

type TradeBlotterTableProps = {
  trades: Trade[];
  isLoading: boolean;
  emptyMessage: string;
};

const columnHelper = createColumnHelper<Trade>();

const columns = [
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
  columnHelper.accessor('tradeDate', {
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

export default function TradeBlotterTable({
  trades,
  isLoading,
  emptyMessage,
}: TradeBlotterTableProps) {
  const table = useReactTable({ data: trades, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className="overflow-x-auto border-y border-[#d9dfd9] bg-white">
      <table
        aria-busy={isLoading}
        aria-label="Trade blotter"
        className="w-full min-w-[1120px] border-collapse text-left text-sm"
      >
        <thead className="bg-[#e9eeea] text-xs uppercase text-[#58665e]">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  className={`px-4 py-3 font-semibold ${
                    header.column.id === 'quantity' || header.column.id === 'price'
                      ? 'text-right'
                      : ''
                  }`}
                  key={header.id}
                  scope="col"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
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
          ) : trades.length === 0 ? (
            <tr>
              <td className="px-4 py-10 text-center text-[#69756e]" colSpan={columns.length}>
                <span role="status">{emptyMessage}</span>
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td
                    className={`px-4 py-3 ${
                      cell.column.id === 'id' || cell.column.id === 'symbol' ? 'font-semibold' : ''
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
  );
}
