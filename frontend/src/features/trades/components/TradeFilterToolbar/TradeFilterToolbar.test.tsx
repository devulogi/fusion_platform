import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TradeFilterToolbar from './index';
import { emptyAdvancedTradeFilters } from './types';
import type { AdvancedTradeFilters } from './types';

afterEach(cleanup);

function renderToolbar({
  symbol = '',
  filters = emptyAdvancedTradeFilters,
  activeFilterCount = 0,
  defaultOpen = false,
}: {
  symbol?: string;
  filters?: AdvancedTradeFilters;
  activeFilterCount?: number;
  defaultOpen?: boolean;
} = {}) {
  const onSymbolChange = vi.fn();
  const onApply = vi.fn();
  render(
    <TradeFilterToolbar
      symbol={symbol}
      filters={filters}
      activeFilterCount={activeFilterCount}
      defaultOpen={defaultOpen}
      onSymbolChange={onSymbolChange}
      onApply={onApply}
    />,
  );
  return { onSymbolChange, onApply };
}

describe('TradeFilterToolbar', () => {
  it('keeps symbol search visible while the filter dialog is closed', () => {
    renderToolbar();

    expect(screen.getByRole('searchbox', { name: 'Filter by symbol' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filters' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the filter dialog with the assessment fields', () => {
    renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));

    expect(screen.getByRole('dialog', { name: 'Filter Trades' })).toBeInTheDocument();
    expect(screen.getByLabelText('Start date')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('End date')).toHaveAttribute('type', 'date');
    expect(screen.getByRole('checkbox', { name: 'Buy' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Sell' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Active' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Cancelled' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Trader' })).toBeInTheDocument();
  });

  it('applies draft filters only when Apply Filters is chosen', () => {
    const { onApply } = renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    fireEvent.change(screen.getByLabelText('Start date'), {
      target: { value: '2026-10-01' },
    });
    fireEvent.change(screen.getByLabelText('End date'), {
      target: { value: '2026-10-18' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Buy' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Active' }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Trader' }), {
      target: { value: 'JSMITH' },
    });

    expect(onApply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));

    expect(onApply).toHaveBeenCalledWith({
      trader: 'JSMITH',
      startDate: '2026-10-01',
      endDate: '2026-10-18',
      sides: ['BUY'],
      statuses: ['ACTIVE'],
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('discards draft changes when cancelled', () => {
    const { onApply } = renderToolbar();
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sell' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onApply).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('resets all draft values and the symbol search', () => {
    const { onSymbolChange, onApply } = renderToolbar({
      symbol: 'AAPL',
      filters: {
        trader: 'JSMITH',
        startDate: '2026-10-01',
        endDate: '2026-10-18',
        sides: ['BUY'],
        statuses: ['ACTIVE'],
      },
      activeFilterCount: 5,
      defaultOpen: true,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reset all' }));
    expect(onSymbolChange).toHaveBeenCalledWith('');
    fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));

    expect(onApply).toHaveBeenCalledWith(emptyAdvancedTradeFilters);
  });

  it('restores the original symbol search when a reset is cancelled', () => {
    const { onSymbolChange, onApply } = renderToolbar({ symbol: 'AAPL' });

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset all' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onSymbolChange).toHaveBeenNthCalledWith(1, '');
    expect(onSymbolChange).toHaveBeenNthCalledWith(2, 'AAPL');
    expect(onApply).not.toHaveBeenCalled();
  });
});
