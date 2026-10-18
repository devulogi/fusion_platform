import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AmendTradeDialog from './index';
import type { AmendTradeInput } from './index';
import type { Trade } from '../../trade-schema';

afterEach(cleanup);

const sampleTrade: Trade = {
  id: 'TRD-100001',
  symbol: 'AAPL',
  quantity: 5000,
  price: 227.45,
  side: 'BUY',
  trader: 'JSMITH',
  tradeTimestamp: '2026-08-18T09:15:23.000Z',
  status: 'ACTIVE',
  book: 'EQUITIES_UK',
  counterparty: 'Goldman Sachs',
};

function renderDialog(props: Partial<React.ComponentProps<typeof AmendTradeDialog>> = {}) {
  const onClose = vi.fn();
  const onSubmit = vi.fn<(_tradeId: string, _input: AmendTradeInput) => void>();
  render(
    <AmendTradeDialog
      open
      trade={sampleTrade}
      isPending={false}
      onClose={onClose}
      onSubmit={onSubmit}
      {...props}
    />,
  );
  return { onClose, onSubmit };
}

describe('AmendTradeDialog', () => {
  it('prepopulates all editable fields and does not render id or status as editable fields', () => {
    renderDialog();

    const dialog = screen.getByRole('dialog', { name: 'Amend trade' });
    expect(within(dialog).getByLabelText('Symbol')).toHaveValue('AAPL');
    expect(within(dialog).getByLabelText('Quantity')).toHaveValue(5000);
    expect(within(dialog).getByLabelText('Price')).toHaveValue(227.45);
    expect(within(dialog).getByLabelText('Side')).toHaveValue('BUY');
    expect(within(dialog).getByLabelText('Trader')).toHaveValue('JSMITH');
    expect(within(dialog).getByLabelText('Trade date')).toHaveValue('2026-08-18T09:15');
    expect(within(dialog).getByLabelText('Book')).toHaveValue('EQUITIES_UK');
    expect(within(dialog).getByLabelText('Counterparty')).toHaveValue('Goldman Sachs');
    expect(within(dialog).queryByLabelText('Trade ID')).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Status')).not.toBeInTheDocument();
  });

  it('validates field values before invoking the amendment callback', async () => {
    const { onSubmit } = renderDialog();
    fireEvent.change(screen.getByLabelText('Symbol'), { target: { value: '   ' } });
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Enter a symbol')).toBeInTheDocument();
    expect(screen.getByText('Quantity must be greater than zero')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the amendment fields without trade id or status, then closes on success', async () => {
    const { onClose, onSubmit } = renderDialog();
    fireEvent.change(screen.getByLabelText('Symbol'), { target: { value: 'MSFT' } });
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '250' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit).toHaveBeenCalledWith('TRD-100001', {
      symbol: 'MSFT',
      quantity: 250,
      price: 227.45,
      side: 'BUY',
      trader: 'JSMITH',
      tradeTimestamp: '2026-08-18T09:15:00.000Z',
      book: 'EQUITIES_UK',
      counterparty: 'Goldman Sachs',
    });
    expect(onClose).toHaveBeenCalledOnce();
    const submittedInput = onSubmit.mock.calls[0]?.[1];
    expect(submittedInput).not.toHaveProperty('id');
    expect(submittedInput).not.toHaveProperty('status');
  });

  it('disables duplicate submission and editing while pending', () => {
    renderDialog({ isPending: true });

    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByLabelText('Symbol')).toBeDisabled();
  });

  it('shows a safe error and retains the draft when submission fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Database secret detail'));
    const onClose = vi.fn();
    renderDialog({ onSubmit, onClose });
    fireEvent.change(screen.getByLabelText('Symbol'), { target: { value: 'MSFT' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to amend this trade. Check the details and try again.',
    );
    expect(screen.queryByText('Database secret detail')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Symbol')).toHaveValue('MSFT');
    expect(onClose).not.toHaveBeenCalled();
  });
});
