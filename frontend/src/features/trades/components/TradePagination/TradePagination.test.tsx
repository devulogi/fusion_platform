import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TradePagination from './index';

afterEach(cleanup);

describe('TradePagination', () => {
  it('shows the truthful range and navigates to a numbered page', () => {
    const onPageChange = vi.fn();
    render(
      <TradePagination
        page={1}
        pageSize={100}
        totalItems={245}
        pageCount={3}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByText('Showing 1-100 of 245 trades')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Page 3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('enables Previous and disables Next on the final page', () => {
    const onPageChange = vi.fn();
    render(
      <TradePagination
        page={3}
        pageSize={100}
        totalItems={245}
        pageCount={3}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByRole('button', { name: 'Previous page' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('renders a stable empty summary without page number buttons', () => {
    render(
      <TradePagination
        page={1}
        pageSize={100}
        totalItems={0}
        pageCount={0}
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Showing 0-0 of 0 trades')).toBeInTheDocument();
    expect(screen.getByText('No pages')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Page \d+$/ })).not.toBeInTheDocument();
  });

  it('normalizes negative and inconsistent pagination metadata', () => {
    render(
      <TradePagination
        page={-1}
        pageSize={-100}
        totalItems={-245}
        pageCount={-3}
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Showing 0-0 of 0 trades')).toBeInTheDocument();
    expect(screen.getByText('No pages')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).not.toHaveTextContent(/Page\s+-\d|of\s+-\d/);
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });
});
