import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TradeBlotterTable from './index';
import type { Trade } from '../../trade-schema';

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
  it('displays the reference columns without a visible trade ID', () => {
    renderTable([sampleTrade], false, 'No trades');

    const table = screen.getByRole('table', { name: 'Trade blotter' });
    const row = within(table).getByRole('row', { name: /AAPL/ });

    expect(within(row).getByText('AAPL')).toBeInTheDocument();
    expect(row).toHaveTextContent('BUY');
    expect(within(row).getByText('JSMITH')).toBeInTheDocument();
    expect(within(row).getByRole('cell', { name: '5,000' })).toBeInTheDocument();
    expect(within(row).getByRole('cell', { name: '$227.45' })).toBeInTheDocument();
    expect(within(row).getByText(/Aug 18, 2026/)).toBeInTheDocument();
    expect(within(row).getByRole('cell', { name: 'Active' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Quantity' })).toHaveClass('text-right');
    expect(within(row).getByRole('cell', { name: '5,000' })).toHaveClass(
      'text-right',
      'tabular-nums',
    );
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toHaveClass('text-center');
    const actionsButton = within(row).getByRole('button', { name: 'Trade actions for TRD-100001' });
    expect(actionsButton.closest('td')).toHaveClass('text-center');
    expect(
      within(table).queryByRole('columnheader', { name: /Trade ID|Trader|Book|Counterparty/ }),
    ).not.toBeInTheDocument();
    expect(within(row).queryByText('TRD-100001')).not.toBeInTheDocument();
  });

  it('does not show selection controls without a bulk action', () => {
    renderTable([sampleTrade], false, 'No trades');

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('puts row actions in a dedicated column and opens the action menu', () => {
    renderTable([sampleTrade], false, 'No trades');

    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Trade actions for TRD-100001' }));

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Amend' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Cancel trade' })).toBeInTheDocument();
  });

  it('does not expose actions for a cancelled trade', () => {
    renderTable([{ ...sampleTrade, status: 'CANCELLED' }], false, 'No trades');

    const row = within(screen.getByRole('table', { name: 'Trade blotter' })).getByRole('row', {
      name: /AAPL/,
    });

    expect(row).toHaveClass('bg-[#f3f4f6]');
    expect(within(row).getByText('No actions')).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: /Amend|Cancel/ })).not.toBeInTheDocument();
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

  it('shows at most 100 trades per page and navigates through filtered rows', () => {
    const trades = Array.from({ length: 205 }, (_, index) => ({
      ...sampleTrade,
      id: `TRD-${index}`,
      symbol: `SYM${String(index).padStart(3, '0')}`,
    }));
    renderTable(trades, false, 'No trades');

    const table = screen.getByRole('table', { name: 'Trade blotter' });
    expect(within(table).getAllByRole('row')).toHaveLength(101);
    expect(screen.getByText('Showing 1-100 of 205 trades')).toBeInTheDocument();
    expect(within(table).getByRole('row', { name: /SYM000/ })).toBeInTheDocument();
    expect(within(table).queryByRole('row', { name: /SYM100/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Showing 101-200 of 205 trades')).toBeInTheDocument();
    expect(within(table).getByRole('row', { name: /SYM100/ })).toBeInTheDocument();
    expect(within(table).queryByRole('row', { name: /SYM000/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Showing 201-205 of 205 trades')).toBeInTheDocument();
    expect(within(table).getByRole('row', { name: /SYM204/ })).toBeInTheDocument();
  });

  it('returns to the first page when a filter is changed', () => {
    const trades = Array.from({ length: 205 }, (_, index) => ({
      ...sampleTrade,
      id: `TRD-${index}`,
      symbol: `SYM${String(index).padStart(3, '0')}`,
    }));
    renderTable(trades, false, 'No trades');

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Filter by symbol' }), {
      target: { value: 'SYM204' },
    });

    expect(screen.getByText('Showing 1-1 of 1 trade')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /SYM204/ })).toBeInTheDocument();
  });

  it('sorts trades by the composite Trade column', () => {
    renderTable(
      [{ ...sampleTrade, id: 'trade-msft', symbol: 'MSFT' }, sampleTrade],
      false,
      'No trades',
    );

    const table = screen.getByRole('table', { name: 'Trade blotter' });
    const tradeHeader = screen.getByRole('columnheader', { name: /Trade/ });
    fireEvent.click(within(tradeHeader).getByRole('button', { name: 'Sort by Trade' }));

    const rows = within(table).getAllByRole('row').slice(1);
    expect(within(rows[0]).getByText('AAPL')).toBeInTheDocument();
    expect(tradeHeader).toHaveAttribute('aria-sort', 'ascending');
  });

  it('filters by symbol, trader, and status and resets filters', () => {
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
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Trader' }), {
      target: { value: 'JSMITH' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Active' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));

    expect(screen.getByRole('row', { name: /AAPL/ })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /MSFT/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset all' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));

    expect(screen.getByRole('row', { name: /AAPL/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /MSFT/ })).toBeInTheDocument();
  });

  it('filters rows by trader without relying on another active filter', () => {
    const secondTrade = {
      ...sampleTrade,
      id: 'TRD-100002',
      trader: 'ABROWN',
    };
    renderTable([sampleTrade, secondTrade], false, 'No trades');

    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Trader' }), {
      target: { value: 'JSMITH' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));

    expect(screen.getByRole('row', { name: /AAPL/ })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /MSFT/ })).not.toBeInTheDocument();
  });

  it('filters by side and inclusive date range', () => {
    const secondTrade = {
      ...sampleTrade,
      id: 'TRD-100002',
      symbol: 'MSFT',
      side: 'SELL' as const,
      tradeTimestamp: '2026-09-20T12:00:00Z',
    };
    renderTable([sampleTrade, secondTrade], false, 'No trades');

    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    fireEvent.change(screen.getByLabelText('Start date'), {
      target: { value: '2026-09-01' },
    });
    fireEvent.change(screen.getByLabelText('End date'), {
      target: { value: '2026-09-30' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sell' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));

    expect(screen.getByRole('row', { name: /MSFT/ })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /AAPL/ })).not.toBeInTheDocument();
  });
});
