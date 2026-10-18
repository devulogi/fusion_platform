import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TradeRowActions from './index';

afterEach(cleanup);

describe('TradeRowActions', () => {
  it('opens the menu and exposes amend and cancel actions', () => {
    render(<TradeRowActions tradeId="TRD-100024" onAmend={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Trade actions for TRD-100024' }));

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Amend' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Cancel trade' })).toBeInTheDocument();
  });

  it('calls the selected action and closes the menu', () => {
    const onAmend = vi.fn();
    const onCancel = vi.fn();
    render(<TradeRowActions tradeId="TRD-100024" onAmend={onAmend} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: 'Trade actions for TRD-100024' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Amend' }));

    expect(onAmend).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on Escape and restores focus to the trigger', () => {
    render(<TradeRowActions tradeId="TRD-100024" onAmend={vi.fn()} onCancel={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: 'Trade actions for TRD-100024' });

    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('does not open when disabled', () => {
    render(<TradeRowActions tradeId="TRD-100024" disabled onAmend={vi.fn()} onCancel={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: 'Trade actions for TRD-100024' });
    expect(trigger).toBeDisabled();
    fireEvent.click(trigger);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
