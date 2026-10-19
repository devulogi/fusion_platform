import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TradeBlotterTable from './index';
import type { Trade } from '../../trade-schema';
import type { ComponentProps } from 'react';

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

function renderTable(
  trades: Trade[],
  isLoading: boolean,
  emptyMessage: string,
  overrides: Partial<ComponentProps<typeof TradeBlotterTable>> = {},
) {
  return render(
    <TradeBlotterTable
      actionsDisabled={false}
      emptyMessage={emptyMessage}
      isLoading={isLoading}
      symbol=""
      filters={{ trader: '', startDate: '', endDate: '', sides: [], statuses: [] }}
      activeFilterCount={0}
      sortBy="tradeTimestamp"
      sortDirection="desc"
      pagination={{
        page: 1,
        pageSize: 100,
        totalItems: trades.length,
        pageCount: trades.length ? 1 : 0,
      }}
      onPageChange={vi.fn()}
      onSymbolChange={vi.fn()}
      onFiltersApply={vi.fn()}
      onSortChange={vi.fn()}
      onAmend={vi.fn()}
      onCancel={vi.fn()}
      trades={trades}
      {...overrides}
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

  it('distinguishes BUY and SELL with side colors while keeping trader secondary', () => {
    renderTable(
      [sampleTrade, { ...sampleTrade, id: 'TRD-100002', symbol: 'MSFT', side: 'SELL' }],
      false,
      'No trades',
    );

    const table = screen.getByRole('table', { name: 'Trade blotter' });
    const buyRow = within(table).getByRole('row', { name: /AAPL/ });
    const sellRow = within(table).getByRole('row', { name: /MSFT/ });

    expect(within(buyRow).getByText('· BUY')).toHaveClass('text-[var(--trade-active-text)]');
    expect(within(sellRow).getByText('· SELL')).toHaveClass('text-[var(--trade-cancelled-text)]');
    expect(within(buyRow).getByText('JSMITH')).toHaveClass('text-[var(--trade-muted)]');
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

  it('renders the supplied page and cursor navigation controls', () => {
    const trades = Array.from({ length: 5 }, (_, index) => ({
      ...sampleTrade,
      id: `TRD-${index}`,
      symbol: `SYM${String(index).padStart(3, '0')}`,
    }));
    render(
      <TradeBlotterTable
        actionsDisabled={false}
        emptyMessage="No trades"
        isLoading={false}
        symbol=""
        filters={{ trader: '', startDate: '', endDate: '', sides: [], statuses: [] }}
        activeFilterCount={0}
        sortBy="tradeTimestamp"
        sortDirection="desc"
        pagination={{ page: 1, pageSize: 100, totalItems: 245, pageCount: 3 }}
        onPageChange={vi.fn()}
        onSymbolChange={vi.fn()}
        onFiltersApply={vi.fn()}
        onSortChange={vi.fn()}
        onAmend={vi.fn()}
        onCancel={vi.fn()}
        trades={trades}
      />,
    );

    const table = screen.getByRole('table', { name: 'Trade blotter' });
    expect(within(table).getAllByRole('row')).toHaveLength(6);
    expect(within(table).getByRole('row', { name: /SYM000/ })).toBeInTheDocument();
    expect(within(table).getByRole('row', { name: /SYM004/ })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Trade pages' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  });

  it('requests a server sort when a column header is selected', () => {
    const onSortChange = vi.fn();
    renderTable(
      [{ ...sampleTrade, id: 'trade-msft', symbol: 'MSFT' }, sampleTrade],
      false,
      'No trades',
      { onSortChange },
    );

    const tradeHeader = screen.getByRole('columnheader', { name: /Trade/ });
    fireEvent.click(within(tradeHeader).getByRole('button', { name: 'Sort by Trade' }));

    expect(onSortChange).toHaveBeenCalledWith('symbol', 'asc');
  });

  it('sends symbol changes and applied advanced filters to the server owner', () => {
    const onSymbolChange = vi.fn();
    const onFiltersApply = vi.fn();
    renderTable([sampleTrade], false, 'No trades', { onSymbolChange, onFiltersApply });

    fireEvent.change(screen.getByRole('searchbox', { name: 'Filter by symbol' }), {
      target: { value: 'AAPL' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Trader' }), {
      target: { value: 'JSMITH' },
    });
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-09-30' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sell' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Active' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));

    expect(onSymbolChange).toHaveBeenCalledWith('AAPL');
    expect(onFiltersApply).toHaveBeenCalledWith({
      trader: 'JSMITH',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      sides: ['SELL'],
      statuses: ['ACTIVE'],
    });
  });
});
