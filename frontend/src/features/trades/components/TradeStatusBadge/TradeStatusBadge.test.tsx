import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import TradeStatusBadge from './index';

afterEach(cleanup);

describe('TradeStatusBadge', () => {
  it('renders Active with its positive semantic color', () => {
    render(<TradeStatusBadge status="ACTIVE" />);

    expect(screen.getByText('Active')).toHaveClass('bg-[var(--trade-active-bg)]');
  });

  it('renders Cancelled with its destructive semantic color', () => {
    render(<TradeStatusBadge status="CANCELLED" />);

    expect(screen.getByText('Cancelled')).toHaveClass('bg-[var(--trade-cancelled-bg)]');
  });
});
