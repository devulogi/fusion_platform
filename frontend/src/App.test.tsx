import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AppErrorBoundary } from './components/app-error-boundary';
import { ConnectionStatusProvider } from './contexts/connection-status-provider';

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

function renderApp() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConnectionStatusProvider>
        <App />
      </ConnectionStatusProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  MockEventSource.instances = [];
  vi.stubGlobal('EventSource', MockEventSource);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('App', () => {
  it('opens SSE before fetching and reconciles events received during the initial snapshot', async () => {
    const fetchMock = installFetchMock();
    const snapshot = deferred<Response>();
    fetchMock.mockReturnValueOnce(snapshot.promise);
    renderApp();
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
    renderApp();
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

  it('returns to Live when the event stream reconnects without a page reload', async () => {
    const fetchMock = installFetchMock();
    fetchMock.mockResolvedValue(jsonResponse({ items: [activeTrade] }));
    renderApp();
    const eventSource = MockEventSource.instances[0];
    if (eventSource === undefined) throw new Error('Expected an EventSource connection');

    act(() => eventSource.open());
    expect(await screen.findByRole('cell', { name: 'AAPL' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Live');

    act(() => eventSource.onerror?.());
    expect(screen.getByRole('status')).toHaveTextContent('Reconnecting');

    act(() => eventSource.open());

    expect(screen.getByRole('status')).toHaveTextContent('Live');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('refreshes the snapshot on demand and shows the latest trades', async () => {
    const fetchMock = installFetchMock();
    const refreshedSnapshot = deferred<Response>();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ items: [activeTrade] }))
      .mockReturnValueOnce(refreshedSnapshot.promise);
    renderApp();
    const eventSource = MockEventSource.instances[0];
    if (eventSource === undefined) throw new Error('Expected an EventSource connection');

    eventSource.open();
    expect(await screen.findByRole('cell', { name: 'AAPL' })).toBeInTheDocument();
    eventSource.onerror?.();
    expect(screen.getByRole('button', { name: 'Refresh trades' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh trades' }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    refreshedSnapshot.resolve(jsonResponse({ items: [{ ...activeTrade, symbol: 'MSFT' }] }));

    expect(await screen.findByRole('cell', { name: 'MSFT' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'AAPL' })).not.toBeInTheDocument();
  });

  it('keeps the last successful snapshot visible when manual refresh fails', async () => {
    const fetchMock = installFetchMock();
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ items: [activeTrade] }))
      .mockRejectedValueOnce(new Error('Network unavailable'));
    renderApp();
    const eventSource = MockEventSource.instances[0];
    if (eventSource === undefined) throw new Error('Expected an EventSource connection');

    eventSource.open();
    expect(await screen.findByRole('cell', { name: 'AAPL' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh trades' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Refresh failed. Showing the last successful snapshot.',
    );
    expect(screen.getByRole('cell', { name: 'AAPL' })).toBeInTheDocument();
  });

  it('closes the event stream when unmounted', () => {
    installFetchMock();
    const { unmount } = renderApp();
    const eventSource = MockEventSource.instances[0];
    if (eventSource === undefined) throw new Error('Expected an EventSource connection');

    unmount();

    expect(eventSource.close).toHaveBeenCalledOnce();
  });

  it('contains render failures and retries without exposing error details', async () => {
    let shouldThrow = true;
    const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    function FlakyView() {
      if (shouldThrow) throw new Error('Sensitive render detail');
      return <p>Recovered view</p>;
    }

    render(
      <AppErrorBoundary>
        <FlakyView />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('This view could not be displayed');
    expect(screen.queryByText('Sensitive render detail')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload application' })).toBeInTheDocument();
    expect(logError).toHaveBeenCalled();

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Recovered view')).toBeInTheDocument();
  });

  it('creates a trade through REST and displays the canonical response', async () => {
    const fetchMock = installFetchMock();
    const createdTrade = { ...activeTrade, id: 'trade-created', symbol: 'MSFT' };
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ items: [activeTrade] }))
      .mockResolvedValueOnce(jsonResponse(createdTrade));
    renderApp();
    const eventSource = MockEventSource.instances[0];
    if (eventSource === undefined) throw new Error('Expected an EventSource connection');
    eventSource.open();
    expect(await screen.findByRole('cell', { name: 'AAPL' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'New trade' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Symbol' }), {
      target: { value: 'MSFT' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Quantity' }), {
      target: { value: '10' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Price' }), {
      target: { value: '100' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Side' }), {
      target: { value: 'BUY' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Trader' }), {
      target: { value: 'Alex' },
    });
    fireEvent.change(screen.getByLabelText('Trade date and time'), {
      target: { value: '2026-10-18T12:00' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), {
      target: { value: 'ACTIVE' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create trade' }));

    expect(await screen.findByRole('cell', { name: 'trade-created' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/trades',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('amends a selected trade and displays the canonical response', async () => {
    const fetchMock = installFetchMock();
    const amendedTrade = { ...activeTrade, symbol: 'MSFT' };
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ items: [activeTrade] }))
      .mockResolvedValueOnce(jsonResponse(amendedTrade));
    renderApp();
    const eventSource = MockEventSource.instances[0];
    if (eventSource === undefined) throw new Error('Expected an EventSource connection');
    eventSource.open();
    const row = await screen.findByRole('row', { name: /trade-1/ });

    fireEvent.click(within(row).getByRole('button', { name: 'Amend trade-1' }));
    fireEvent.change(screen.getByLabelText('Symbol'), { target: { value: 'MSFT' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('cell', { name: 'MSFT' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/trades/trade-1',
      expect.objectContaining({ method: 'PATCH' }),
    );
    const amendmentRequest = fetchMock.mock.calls[1]?.[1];
    const amendmentRequestBody = amendmentRequest?.body;
    if (typeof amendmentRequestBody !== 'string') throw new Error('Missing amendment request body');
    const amendmentBody: unknown = JSON.parse(amendmentRequestBody);
    expect(amendmentBody).not.toHaveProperty('id');
    expect(amendmentBody).not.toHaveProperty('status');
  });

  it('cancels a selected trade and retains it with cancelled status', async () => {
    const fetchMock = installFetchMock();
    const cancelledTrade = { ...activeTrade, status: 'CANCELLED' as const };
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ items: [activeTrade] }))
      .mockResolvedValueOnce(jsonResponse(cancelledTrade));
    renderApp();
    const eventSource = MockEventSource.instances[0];
    if (eventSource === undefined) throw new Error('Expected an EventSource connection');
    eventSource.open();
    const row = await screen.findByRole('row', { name: /trade-1/ });

    fireEvent.click(within(row).getByRole('button', { name: 'Cancel trade-1' }));
    expect(screen.getByRole('dialog', { name: 'Cancel trade?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));

    expect(await screen.findByText('Cancelled')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /trade-1/ })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/trades/trade-1',
      expect.objectContaining({ method: 'PATCH' }),
    );
    const cancellationRequest = fetchMock.mock.calls[1]?.[1];
    const cancellationRequestBody = cancellationRequest?.body;
    if (typeof cancellationRequestBody !== 'string') {
      throw new Error('Missing cancellation request body');
    }
    const cancellationBody: unknown = JSON.parse(cancellationRequestBody);
    expect(cancellationBody).toEqual({ status: 'CANCELLED' });
  });
});
