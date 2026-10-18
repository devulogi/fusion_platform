import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CreateTradeDialog from './create-trade-dialog';
import type { CreateTradeInput } from './create-trade-dialog';

afterEach(cleanup);

function renderDialog(props?: Partial<React.ComponentProps<typeof CreateTradeDialog>>) {
  return render(
    <CreateTradeDialog open isPending={false} onClose={vi.fn()} onSubmit={vi.fn()} {...props} />,
  );
}

function fillRequiredFields() {
  fireEvent.change(screen.getByRole('textbox', { name: 'Symbol' }), {
    target: { value: 'AAPL' },
  });
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Quantity' }), {
    target: { value: '100' },
  });
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Price' }), {
    target: { value: '185.25' },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'Side' }), {
    target: { value: 'BUY' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Trader' }), {
    target: { value: 'Alex Morgan' },
  });
  fireEvent.change(screen.getByLabelText('Trade date and time'), {
    target: { value: '2026-10-14T12:00' },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), {
    target: { value: 'ACTIVE' },
  });
}

describe('CreateTradeDialog', () => {
  it('renders a labelled dialog with all required and optional fields', () => {
    renderDialog();

    const dialog = screen.getByRole('dialog', { name: 'Create trade' });
    for (const label of [
      'Symbol',
      'Quantity',
      'Price',
      'Side',
      'Trader',
      'Trade date and time',
      'Status',
      'Book (optional)',
      'Counterparty (optional)',
    ]) {
      expect(within(dialog).getByLabelText(label)).toBeInTheDocument();
    }
    expect(within(dialog).getByRole('combobox', { name: 'Status' })).toHaveValue('');
  });

  it('shows accessible validation errors for missing required fields', async () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Create trade' }));

    expect(await screen.findByText('Enter a symbol')).toBeInTheDocument();
    expect(screen.getByText('Enter a quantity above zero')).toBeInTheDocument();
    expect(screen.getByText('Enter a price above zero')).toBeInTheDocument();
    expect(screen.getByText('Select a side')).toBeInTheDocument();
    expect(screen.getByText('Enter a trader')).toBeInTheDocument();
    expect(screen.getByText('Enter a trade date and time')).toBeInTheDocument();
    expect(screen.getByText('Select a status')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Symbol' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('submits contract-shaped input, then closes and resets on success', async () => {
    const onSubmit = vi.fn<(input: CreateTradeInput) => void>();
    const onClose = vi.fn();
    renderDialog({ onSubmit, onClose });
    fillRequiredFields();
    fireEvent.change(screen.getByRole('textbox', { name: 'Book (optional)' }), {
      target: { value: '  EQUITIES  ' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create trade' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    const submittedInput = onSubmit.mock.calls[0]?.[0];
    expect(submittedInput).toMatchObject({
      symbol: 'AAPL',
      quantity: 100,
      price: 185.25,
      side: 'BUY',
      trader: 'Alex Morgan',
      status: 'ACTIVE',
      book: 'EQUITIES',
      counterparty: undefined,
    });
    expect(submittedInput?.tradeTimestamp).toMatch(/^2026-10-14T/);
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.getByRole('textbox', { name: 'Symbol' })).toHaveValue('');
  });

  it('disables duplicate submission and close actions while pending', () => {
    renderDialog({ isPending: true });

    expect(screen.getByRole('button', { name: 'Creating…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Close create trade dialog' })).toBeDisabled();
  });

  it('shows a safe error and retains the draft after a rejected submission', async () => {
    const onSubmit = vi.fn<(input: CreateTradeInput) => Promise<void>>();
    onSubmit.mockRejectedValueOnce(new Error('Sensitive database details'));
    onSubmit.mockResolvedValueOnce(undefined);
    const onClose = vi.fn();
    renderDialog({ onSubmit, onClose });
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: 'Create trade' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Trade could not be created. Check the details and try again.',
    );
    expect(screen.getByRole('alert')).not.toHaveTextContent('Sensitive database details');
    expect(screen.getByRole('textbox', { name: 'Symbol' })).toHaveValue('AAPL');
    expect(screen.getByRole('spinbutton', { name: 'Quantity' })).toHaveValue(100);
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue('ACTIVE');

    fireEvent.click(screen.getByRole('button', { name: 'Create trade' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Symbol' })).toHaveValue('');
  });
});
