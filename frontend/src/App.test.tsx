import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

type TestTrade = {
  id: string;
  symbol: string;
  quantity: number;
  price: number;
  side: 'BUY' | 'SELL';
  trader: string;
  tradeDate: string;
  status: 'ACTIVE' | 'CANCELLED';
  book: string | null;
  counterparty: string | null;
};

class MockEventSource {
  static instances: MockEventSource[] = [];

  readonly listeners = new Map<string, EventListener>();
  readonly close = vi.fn();
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(readonly url: string) {
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const callback =
      typeof listener === 'function' ? listener : (event: Event) => listener.handleEvent(event);
    this.listeners.set(type, callback);
  }

  open(): void {
    this.onopen?.();
  }

  dispatchTrade(type: string, trade: TestTrade): void {
    this.listeners.get(type)?.(new MessageEvent(type, { data: JSON.stringify(trade) }));
  }
}

function deferred<T>() {
  let resolvePromise: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve(value: T) {
      if (resolvePromise === undefined) throw new Error('Deferred promise is not initialized');
      resolvePromise(value);
    },
  };
}

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    json: () => Promise.resolve(body),
  } as Response;
}

const activeTrade: TestTrade = {
  id: 'trade-1',
  symbol: 'AAPL',
  quantity: 100,
  price: 185.25,
  side: 'BUY',
  trader: 'Alex Morgan',
  tradeDate: '2026-10-14T12:00:00.000Z',
  status: 'ACTIVE',
  book: null,
  counterparty: null,
};

function installFetchMock() {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  MockEventSource.instances = [];
  vi.stubGlobal('EventSource', MockEventSource);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('opens SSE before fetching and reconciles events received during the initial snapshot', async () => {
    const fetchMock = installFetchMock();
    const snapshot = deferred<Response>();
    fetchMock.mockReturnValueOnce(snapshot.promise);
    render(<App />);
    const eventSource = MockEventSource.instances[0];
    if (eventSource === undefined) throw new Error('Expected an EventSource connection');

    expect(eventSource.url).toBe('/api/v1/events');
    expect(fetchMock).not.toHaveBeenCalled();
    eventSource.open();
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/trades');

    eventSource.dispatchTrade('trade.amended', { ...activeTrade, symbol: 'MSFT' });
    snapshot.resolve(jsonResponse({ items: [activeTrade] }));

    expect(await screen.findByRole('cell', { name: 'MSFT' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'AAPL' })).not.toBeInTheDocument();
  });

  it('reloads the snapshot after reconnect and reconciles events during that fetch', async () => {
    const fetchMock = installFetchMock();
    const reconnectSnapshot = deferred<Response>();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ items: [activeTrade] }))
      .mockReturnValueOnce(reconnectSnapshot.promise);
    render(<App />);
    const eventSource = MockEventSource.instances[0];
    if (eventSource === undefined) throw new Error('Expected an EventSource connection');

    eventSource.open();
    expect(await screen.findByRole('cell', { name: 'AAPL' })).toBeInTheDocument();

    eventSource.open();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    eventSource.dispatchTrade('trade.cancelled', { ...activeTrade, status: 'CANCELLED' });
    reconnectSnapshot.resolve(jsonResponse({ items: [activeTrade] }));

    expect(await screen.findByText('Cancelled')).toBeInTheDocument();
    eventSource.dispatchTrade('trade.reactivated', activeTrade);
    expect(await screen.findByText('Active')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Live');
  });

  it('closes the event stream when unmounted', () => {
    installFetchMock();
    const { unmount } = render(<App />);
    const eventSource = MockEventSource.instances[0];
    if (eventSource === undefined) throw new Error('Expected an EventSource connection');

    unmount();

    expect(eventSource.close).toHaveBeenCalledOnce();
  });
});
