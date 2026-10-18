import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TradePagination from './index';

afterEach(cleanup);

describe('TradePagination', () => {
  it('shows the first range and advances one page', () => {
    const onPageChange = vi.fn();
    render(
      <TradePagination pageIndex={0} pageSize={100} totalItems={140} onPageChange={onPageChange} />,
    );

    expect(screen.getByText('Showing 1-100 of 140 trades')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('shows the final partial range and disables Next', () => {
    const onPageChange = vi.fn();
    render(
      <TradePagination pageIndex={1} pageSize={100} totalItems={140} onPageChange={onPageChange} />,
    );

    expect(screen.getByText('Showing 101-140 of 140 trades')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(onPageChange).toHaveBeenCalledWith(0);
  });

  it('shows an empty range and disables both page controls', () => {
    render(
      <TradePagination
        pageIndex={0}
        pageSize={100}
        totalItems={0}
        onPageChange={() => undefined}
      />,
    );

    expect(screen.getByText('Showing 0-0 of 0 trades')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });
});
