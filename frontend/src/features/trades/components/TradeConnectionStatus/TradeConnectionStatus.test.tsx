import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import TradeConnectionStatus from './index';

afterEach(cleanup);

describe('TradeConnectionStatus', () => {
  it.each([
    ['Connecting', 'bg-[var(--trade-connection-pending)]'],
    ['Live', 'bg-[var(--trade-connection-live)]'],
    ['Reconnecting', 'bg-[var(--trade-connection-pending)]'],
  ] as const)('renders %s with its connection indicator', (status, dotClassName) => {
    render(<TradeConnectionStatus status={status} />);

    const statusElement = screen.getByRole('status');
    expect(statusElement).toHaveTextContent(status);
    expect(statusElement.querySelector('[aria-hidden="true"]')).toHaveClass(dotClassName);
  });
});
