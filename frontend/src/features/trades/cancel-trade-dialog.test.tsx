import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CancelTradeDialog from './cancel-trade-dialog';
import type { Trade } from './trade-schema';

afterEach(cleanup);

const sampleTrade: Trade = {
  id: 'TRD-100001',
  symbol: 'AAPL',
  quantity: 5000,
  price: 227.45,
  side: 'BUY',
  trader: 'JSMITH',
  tradeTimestamp: '2026-08-18T09:15:23Z',
  status: 'ACTIVE',
  book: 'EQUITIES_UK',
  counterparty: 'Goldman Sachs',
};

describe('CancelTradeDialog', () => {
  it('identifies the trade and explains that cancellation does not delete it', () => {
    render(
      <CancelTradeDialog
        open
        trade={sampleTrade}
        isPending={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Cancel trade?' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent(/TRD-100001 \(AAPL\)/);
    expect(screen.getByRole('dialog')).toHaveTextContent(
      /marked cancelled\. It will not be deleted\./,
    );
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm cancellation' })).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <CancelTradeDialog
        open={false}
        trade={sampleTrade}
        isPending={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes when the user chooses Back', () => {
    const onClose = vi.fn();
    render(
      <CancelTradeDialog
        open
        trade={sampleTrade}
        isPending={false}
        onClose={onClose}
        onConfirm={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('confirms the identified trade id and closes on success', async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <CancelTradeDialog
        open
        trade={sampleTrade}
        isPending={false}
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenCalledWith('TRD-100001');
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it('disables both actions while cancellation is pending', () => {
    render(
      <CancelTradeDialog
        open
        trade={sampleTrade}
        isPending
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelling...' })).toBeDisabled();
  });

  it('prevents a duplicate confirmation while the callback is in flight', () => {
    const onConfirm = vi.fn(() => new Promise<void>(() => undefined));
    render(
      <CancelTradeDialog
        open
        trade={sampleTrade}
        isPending={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelling...' }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Cancelling...' })).toBeDisabled();
  });

  it('shows a safe error after rejection and allows a successful retry', async () => {
    const onConfirm = vi.fn<() => Promise<void>>();
    onConfirm.mockRejectedValueOnce(new Error('Sensitive server response'));
    onConfirm.mockResolvedValueOnce(undefined);
    render(
      <CancelTradeDialog
        open
        trade={sampleTrade}
        isPending={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The trade could not be cancelled. Please try again.',
    );
    expect(screen.queryByText('Sensitive server response')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));

    expect(onConfirm).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('clears a prior cancellation error when opened for another trade', async () => {
    const onConfirm = vi.fn<() => Promise<void>>();
    onConfirm.mockRejectedValueOnce(new Error('Persistence failure'));
    const { rerender } = render(
      <CancelTradeDialog
        open
        trade={sampleTrade}
        isPending={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    rerender(
      <CancelTradeDialog
        open={false}
        trade={sampleTrade}
        isPending={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );
    rerender(
      <CancelTradeDialog
        open
        trade={{ ...sampleTrade, id: 'TRD-100002' }}
        isPending={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent('TRD-100002');
  });
});
