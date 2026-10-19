import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TradeHistoryPage from './TradeHistoryPage';
import { ConnectionStatusProvider } from '../../contexts/connection-status-provider';
import { activeTrade, installMockEventSource, MockEventSource } from './trade-test-fixtures';

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

function tradePage(
  items: (typeof activeTrade)[],
  page = 1,
  pageCount = items.length > 0 ? 1 : 0,
  totalItems = items.length,
) {
  return { items, pagination: { page, pageSize: 100, totalItems, pageCount } };
}

const firstPageUrl = '/api/v1/trades?page=1&pageSize=100&sortBy=tradeTimestamp&sortDirection=desc';

function installFetchMock() {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function requestUrl(input: RequestInfo | URL | undefined): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input?.url ?? '';
}

function renderApp() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConnectionStatusProvider>
        <TradeHistoryPage />
      </ConnectionStatusProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  installMockEventSource();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('TradeHistoryPage', () => {
  it('opens SSE before fetching and refetches events received during the initial snapshot', async () => {
    const fetchMock = installFetchMock();
    const snapshot = deferred<Response>();
    fetchMock.mockReturnValueOnce(snapshot.promise);
    renderApp();
    const eventSource = MockEventSource.instances[0];
    if (eventSource === undefined) throw new Error('Expected an EventSource connection');

    expect(eventSource.url).toBe('/api/v1/events');
    expect(fetchMock).not.toHaveBeenCalled();
    eventSource.open();
    expect(fetchMock).toHaveBeenCalledWith(firstPageUrl);

    eventSource.dispatch('trade.amended', JSON.stringify({ ...activeTrade, symbol: 'MSFT' }));
    fetchMock.mockResolvedValueOnce(jsonResponse(tradePage([{ ...activeTrade, symbol: 'MSFT' }])));
    snapshot.resolve(jsonResponse(tradePage([activeTrade])));

    expect(await screen.findByText('MSFT', { exact: true })).toBeInTheDocument();
    expect(screen.queryByText('AAPL', { exact: true })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reloads the current page after reconnect and refetches events received during that fetch', async () => {
    const fetchMock = installFetchMock();
    const reconnectSnapshot = deferred<Response>();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(tradePage([activeTrade])))
      .mockReturnValueOnce(reconnectSnapshot.promise)
      .mockResolvedValueOnce(jsonResponse(tradePage([{ ...activeTrade, status: 'CANCELLED' }])));
    renderApp();
    const eventSource = MockEventSource.instances[0];
    if (eventSource === undefined) throw new Error('Expected an EventSource connection');

    eventSource.open();
    expect(await screen.findByText('AAPL', { exact: true })).toBeInTheDocument();

    eventSource.open();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    eventSource.dispatch(
      'trade.cancelled',
      JSON.stringify({ ...activeTrade, status: 'CANCELLED' }),
    );
    reconnectSnapshot.resolve(jsonResponse(tradePage([activeTrade])));

    expect(await screen.findByText('Cancelled')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Live');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('refreshes the snapshot on demand and shows the latest trades', async () => {
    const fetchMock = installFetchMock();
    const refreshedSnapshot = deferred<Response>();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(tradePage([activeTrade])))
      .mockReturnValueOnce(refreshedSnapshot.promise);
    renderApp();
    const eventSource = MockEventSource.instances[0];
    if (eventSource === undefined) throw new Error('Expected an EventSource connection');

    eventSource.open();
    expect(await screen.findByText('AAPL', { exact: true })).toBeInTheDocument();
    eventSource.onerror?.();
    expect(screen.getByRole('button', { name: 'Refresh trades' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh trades' }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    refreshedSnapshot.resolve(jsonResponse(tradePage([{ ...activeTrade, symbol: 'MSFT' }])));

    expect(await screen.findByText('MSFT', { exact: true })).toBeInTheDocument();
    expect(screen.queryByText('AAPL', { exact: true })).not.toBeInTheDocument();
  });

  it('keeps the last successful snapshot visible when manual refresh fails', async () => {
    const fetchMock = installFetchMock();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(tradePage([activeTrade])))
      .mockRejectedValueOnce(new Error('Network unavailable'));
    renderApp();
    const eventSource = MockEventSource.instances[0];
    if (eventSource === undefined) throw new Error('Expected an EventSource connection');

    eventSource.open();
    expect(await screen.findByText('AAPL', { exact: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh trades' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Refresh failed. Showing the last successful snapshot.',
    );
    expect(screen.getByText('AAPL', { exact: true })).toBeInTheDocument();
  });

  it('creates a trade through REST and displays the canonical response', async () => {
    const fetchMock = installFetchMock();
    const createdTrade = { ...activeTrade, id: 'trade-created', symbol: 'MSFT' };
    fetchMock
      .mockResolvedValueOnce(jsonResponse(tradePage([activeTrade])))
      .mockResolvedValueOnce(jsonResponse(createdTrade))
      .mockResolvedValueOnce(jsonResponse(tradePage([createdTrade])));
    renderApp();
    const eventSource = MockEventSource.instances[0];
    if (eventSource === undefined) throw new Error('Expected an EventSource connection');
    eventSource.open();
    expect(await screen.findByText('AAPL', { exact: true })).toBeInTheDocument();

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

    expect(await screen.findByText('MSFT', { exact: true })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/trades',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(3, firstPageUrl);
  });

  it('amends a selected trade and displays the canonical response', async () => {
    const fetchMock = installFetchMock();
    const amendedTrade = { ...activeTrade, symbol: 'MSFT' };
    fetchMock
      .mockResolvedValueOnce(jsonResponse(tradePage([activeTrade])))
      .mockResolvedValueOnce(jsonResponse(amendedTrade))
      .mockResolvedValueOnce(jsonResponse(tradePage([amendedTrade])));
    renderApp();
    const eventSource = MockEventSource.instances[0];
    if (eventSource === undefined) throw new Error('Expected an EventSource connection');
    eventSource.open();
    const row = await screen.findByRole('row', { name: /AAPL/ });

    fireEvent.click(within(row).getByRole('button', { name: 'Trade actions for trade-1' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Amend' }));
    fireEvent.change(screen.getByLabelText('Symbol'), { target: { value: 'MSFT' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('MSFT', { exact: true })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/trades/trade-1',
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(3, firstPageUrl);
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
      .mockResolvedValueOnce(jsonResponse(tradePage([activeTrade])))
      .mockResolvedValueOnce(jsonResponse(cancelledTrade))
      .mockResolvedValueOnce(jsonResponse(tradePage([cancelledTrade])));
    renderApp();
    const eventSource = MockEventSource.instances[0];
    if (eventSource === undefined) throw new Error('Expected an EventSource connection');
    eventSource.open();
    const row = await screen.findByRole('row', { name: /AAPL/ });

    fireEvent.click(within(row).getByRole('button', { name: 'Trade actions for trade-1' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Cancel trade' }));
    expect(screen.getByRole('dialog', { name: 'Cancel trade?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));

    expect(await screen.findByText('Cancelled')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /AAPL/ })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/trades/trade-1',
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(3, firstPageUrl);
    const cancellationRequest = fetchMock.mock.calls[1]?.[1];
    const cancellationRequestBody = cancellationRequest?.body;
    if (typeof cancellationRequestBody !== 'string') {
      throw new Error('Missing cancellation request body');
    }
    const cancellationBody: unknown = JSON.parse(cancellationRequestBody);
    expect(cancellationBody).toEqual({ status: 'CANCELLED' });
  });

  it('filters, sorts, and navigates using numbered server queries', async () => {
    const fetchMock = installFetchMock();
    fetchMock.mockImplementation((input) => {
      const requestedPage = Number(
        new URL(requestUrl(input), 'http://localhost').searchParams.get('page'),
      );
      return Promise.resolve(jsonResponse(tradePage([activeTrade], requestedPage, 3, 245)));
    });
    renderApp();
    const eventSource = MockEventSource.instances[0];
    if (eventSource === undefined) throw new Error('Expected an EventSource connection');
    eventSource.open();
    expect(await screen.findByText('AAPL', { exact: true })).toBeInTheDocument();

    expect(screen.getByText('Showing 1-100 of 245 trades')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    const secondPageButton = await screen.findByRole('button', { name: 'Page 2' });
    fireEvent.click(secondPageButton);
    expect(await screen.findByText('Page 2 of 3')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Filter by symbol' }), {
      target: { value: 'MS' },
    });
    expect(await screen.findByText('Page 1 of 3')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(`${firstPageUrl}&symbol=MS`);

    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Trader' }), {
      target: { value: 'Alex Morgan' },
    });
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-10-31' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Buy' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sell' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Active' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Cancelled' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply Filters' }));

    const filteredUrl = new URL(requestUrl(fetchMock.mock.lastCall?.[0]), 'http://localhost');
    expect(filteredUrl.searchParams.get('page')).toBe('1');
    expect(filteredUrl.searchParams.get('symbol')).toBe('MS');
    expect(filteredUrl.searchParams.get('trader')).toBe('Alex Morgan');
    expect(filteredUrl.searchParams.getAll('side')).toEqual(['BUY', 'SELL']);
    expect(filteredUrl.searchParams.getAll('status')).toEqual(['ACTIVE', 'CANCELLED']);
    expect(filteredUrl.searchParams.get('startDate')).toBe(
      new Date('2026-10-01T00:00:00').toISOString(),
    );
    expect(filteredUrl.searchParams.get('endDate')).toBe(
      new Date('2026-10-31T23:59:59.999').toISOString(),
    );

    const tradeHeader = screen.getByRole('columnheader', { name: /Trade/ });
    const secondFilteredPageButton = await screen.findByRole('button', { name: 'Page 2' });
    fireEvent.click(secondFilteredPageButton);
    expect(await screen.findByText('Page 2 of 3')).toBeInTheDocument();
    fireEvent.click(within(tradeHeader).getByRole('button', { name: 'Sort by Trade' }));
    const sortedUrl = new URL(requestUrl(fetchMock.mock.lastCall?.[0]), 'http://localhost');
    expect(sortedUrl.searchParams.get('page')).toBe('1');
    expect(sortedUrl.searchParams.get('sortBy')).toBe('symbol');
    expect(sortedUrl.searchParams.get('sortDirection')).toBe('asc');
  });

  it('keeps the current page rendered while the next page request is pending', async () => {
    const fetchMock = installFetchMock();
    const secondPage = deferred<Response>();
    fetchMock.mockImplementation((input) => {
      const requestedPage = Number(
        new URL(requestUrl(input), 'http://localhost').searchParams.get('page'),
      );
      if (requestedPage === 2) return secondPage.promise;
      return Promise.resolve(jsonResponse(tradePage([activeTrade], 1, 2, 101)));
    });
    renderApp();
    const eventSource = MockEventSource.instances[0];
    if (eventSource === undefined) throw new Error('Expected an EventSource connection');
    eventSource.open();
    expect(await screen.findByText('AAPL', { exact: true })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));

    expect(screen.getByRole('heading', { name: 'Trade History' })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /AAPL/ })).toBeInTheDocument();
    expect(screen.queryByText('Loading trades')).not.toBeInTheDocument();

    secondPage.resolve(
      jsonResponse(tradePage([{ ...activeTrade, id: 'trade-2', symbol: 'MSFT' }], 2, 2, 101)),
    );
    expect(await screen.findByText('MSFT', { exact: true })).toBeInTheDocument();
    expect(screen.queryByText('AAPL', { exact: true })).not.toBeInTheDocument();
  });

  it('shows a zero-result range and no numbered page buttons', async () => {
    const fetchMock = installFetchMock();
    fetchMock.mockResolvedValue(jsonResponse(tradePage([], 1, 0, 0)));
    renderApp();
    const eventSource = MockEventSource.instances[0];
    if (eventSource === undefined) throw new Error('Expected an EventSource connection');

    eventSource.open();

    expect(await screen.findByText('Showing 0-0 of 0 trades')).toBeInTheDocument();
    expect(screen.getByText('No pages')).toBeInTheDocument();
    expect(screen.getByText('No trades yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Page \d+$/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('clamps a stale requested page to the last valid page', async () => {
    const fetchMock = installFetchMock();
    let initialRequest = true;
    fetchMock.mockImplementation((input) => {
      const requestedPage = Number(
        new URL(requestUrl(input), 'http://localhost').searchParams.get('page'),
      );
      if (initialRequest) {
        initialRequest = false;
        return Promise.resolve(jsonResponse(tradePage([activeTrade], 1, 2, 101)));
      }
      return Promise.resolve(jsonResponse(tradePage([activeTrade], requestedPage, 1, 1)));
    });
    renderApp();
    const eventSource = MockEventSource.instances[0];
    if (eventSource === undefined) throw new Error('Expected an EventSource connection');
    eventSource.open();
    expect(await screen.findByText('AAPL', { exact: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));

    expect(await screen.findByText('Page 1 of 1')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(firstPageUrl);
  });
});
