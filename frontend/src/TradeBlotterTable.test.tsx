import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TradeBlotterTable from './features/trades/trade-blotter-table';
import type { Trade } from './features/trades/trade-schema';

afterEach(cleanup);

const sampleTrade = {
  id: 'TRD-100001',
  symbol: 'AAPL',
  quantity: 5000,
  price: 227.45,
  side: 'BUY' as const,
  trader: 'JSMITH',
  tradeTimestamp: '2026-08-18T09:15:23Z',
  status: 'ACTIVE' as const,
  book: 'EQUITIES_UK',
  counterparty: 'Goldman Sachs',
};

function renderTable(trades: Trade[], isLoading: boolean, emptyMessage: string) {
  return render(
    <TradeBlotterTable
      actionsDisabled={false}
      emptyMessage={emptyMessage}
      isLoading={isLoading}
      onAmend={vi.fn()}
      onCancel={vi.fn()}
      trades={trades}
    />,
  );
}

describe('TradeBlotterTable', () => {
  it('displays required trade fields and optional fields in an accessible table', () => {
    renderTable([sampleTrade], false, 'No trades');

    const table = screen.getByRole('table', { name: 'Trade blotter' });
    const row = within(table).getByRole('row', { name: /TRD-100001/ });

    expect(within(row).getByRole('cell', { name: 'TRD-100001' })).toBeInTheDocument();
    expect(within(row).getByRole('cell', { name: 'AAPL' })).toBeInTheDocument();
    expect(within(row).getByRole('cell', { name: 'BUY' })).toBeInTheDocument();
    expect(within(row).getByRole('cell', { name: '5,000' })).toBeInTheDocument();
    expect(within(row).getByRole('cell', { name: '227.45' })).toBeInTheDocument();
    expect(within(row).getByRole('cell', { name: 'JSMITH' })).toBeInTheDocument();
    expect(within(row).getByRole('cell', { name: '2026-08-18' })).toBeInTheDocument();
    expect(within(row).getByRole('cell', { name: 'Active' })).toBeInTheDocument();
    expect(within(row).getByRole('cell', { name: 'EQUITIES_UK' })).toBeInTheDocument();
    expect(within(row).getByRole('cell', { name: 'Goldman Sachs' })).toBeInTheDocument();
  });

  it('keeps nullable optional fields present in the row', () => {
    renderTable([{ ...sampleTrade, book: null, counterparty: null }], false, 'No trades');

    const row = within(screen.getByRole('table', { name: 'Trade blotter' })).getByRole('row', {
      name: /TRD-100001/,
    });
    expect(within(row).getAllByRole('cell', { name: 'Not provided' })).toHaveLength(2);
  });

  it('does not expose actions for a cancelled trade', () => {
    renderTable([{ ...sampleTrade, status: 'CANCELLED' }], false, 'No trades');

    const row = within(screen.getByRole('table', { name: 'Trade blotter' })).getByRole('row', {
      name: /TRD-100001/,
    });

    expect(within(row).getByRole('cell', { name: 'No actions available' })).toBeInTheDocument();
    expect(within(row).queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows a loading state while the first snapshot is pending', () => {
    renderTable([], true, 'No trades');

    expect(screen.getByRole('status')).toHaveTextContent('Loading trades');
    expect(screen.getByRole('table', { name: 'Trade blotter' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });

  it('shows an empty state after a successful empty snapshot', () => {
    renderTable([], false, 'No trades yet');

    expect(screen.getByRole('status')).toHaveTextContent('No trades yet');
  });

  it('sorts trades by symbol and exposes the current sort direction', () => {
    renderTable(
      [{ ...sampleTrade, id: 'trade-msft', symbol: 'MSFT' }, sampleTrade],
      false,
      'No trades',
    );

    const table = screen.getByRole('table', { name: 'Trade blotter' });
    const symbolHeader = screen.getByRole('columnheader', { name: /Symbol/ });
    fireEvent.click(within(symbolHeader).getByRole('button', { name: 'Sort by Symbol' }));

    const rows = within(table).getAllByRole('row').slice(1);
    expect(within(rows[0]).getByRole('cell', { name: 'AAPL' })).toBeInTheDocument();
    expect(symbolHeader).toHaveAttribute('aria-sort', 'ascending');
  });

  it('filters by symbol, trader, and status and clears filters', () => {
    const secondTrade = {
      ...sampleTrade,
      id: 'TRD-100002',
      symbol: 'MSFT',
      trader: 'ABROWN',
      status: 'CANCELLED' as const,
    };
    renderTable([sampleTrade, secondTrade], false, 'No trades');

    fireEvent.change(screen.getByRole('searchbox', { name: 'Filter by symbol' }), {
      target: { value: 'AAPL' },
    });
    fireEvent.change(screen.getByRole('searchbox', { name: 'Filter by trader' }), {
      target: { value: 'JSMITH' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by status' }), {
      target: { value: 'ACTIVE' },
    });

    expect(screen.getByRole('row', { name: /TRD-100001/ })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /TRD-100002/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(screen.getByRole('row', { name: /TRD-100001/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /TRD-100002/ })).toBeInTheDocument();
  });

  it('filters rows by trader without relying on another active filter', () => {
    const secondTrade = {
      ...sampleTrade,
      id: 'TRD-100002',
      trader: 'ABROWN',
    };
    renderTable([sampleTrade, secondTrade], false, 'No trades');

    fireEvent.change(screen.getByRole('searchbox', { name: 'Filter by trader' }), {
      target: { value: 'JSMITH' },
    });

    expect(screen.getByRole('row', { name: /TRD-100001/ })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /TRD-100002/ })).not.toBeInTheDocument();
  });
});
