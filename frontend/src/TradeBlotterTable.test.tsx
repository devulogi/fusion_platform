import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import TradeBlotterTable from './features/trades/trade-blotter-table';

afterEach(cleanup);

const sampleTrade = {
  id: 'TRD-100001',
  symbol: 'AAPL',
  quantity: 5000,
  price: 227.45,
  side: 'BUY' as const,
  trader: 'JSMITH',
  tradeDate: '2026-08-18T09:15:23Z',
  status: 'ACTIVE' as const,
  book: 'EQUITIES_UK',
  counterparty: 'Goldman Sachs',
};

describe('TradeBlotterTable', () => {
  it('displays required trade fields and optional fields in an accessible table', () => {
    render(<TradeBlotterTable trades={[sampleTrade]} isLoading={false} emptyMessage="No trades" />);

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
    render(
      <TradeBlotterTable
        trades={[{ ...sampleTrade, book: null, counterparty: null }]}
        isLoading={false}
        emptyMessage="No trades"
      />,
    );

    const row = within(screen.getByRole('table', { name: 'Trade blotter' })).getByRole('row', {
      name: /TRD-100001/,
    });
    expect(within(row).getAllByRole('cell', { name: 'Not provided' })).toHaveLength(2);
  });

  it('shows a loading state while the first snapshot is pending', () => {
    render(<TradeBlotterTable trades={[]} isLoading emptyMessage="No trades" />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading trades');
    expect(screen.getByRole('table', { name: 'Trade blotter' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });

  it('shows an empty state after a successful empty snapshot', () => {
    render(<TradeBlotterTable trades={[]} isLoading={false} emptyMessage="No trades yet" />);

    expect(screen.getByRole('status')).toHaveTextContent('No trades yet');
  });
});
