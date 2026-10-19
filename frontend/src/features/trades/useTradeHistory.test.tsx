import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectionStatusProvider } from '../../contexts/connection-status-provider';
import { activeTrade, installMockEventSource, MockEventSource } from './trade-test-fixtures';
import { useTradeHistory } from './useTradeHistory';

function tradePage(
  items: (typeof activeTrade)[],
  page = 1,
  pageCount = items.length > 0 ? 1 : 0,
  totalItems = items.length,
) {
  return { items, pagination: { page, pageSize: 100, totalItems, pageCount } };
}

function jsonResponse(body: unknown): Response {
  return { ok: true, json: () => Promise.resolve(body) } as Response;
}

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ConnectionStatusProvider>{children}</ConnectionStatusProvider>
      </QueryClientProvider>
    );
  }
  return { queryClient, Wrapper };
}

beforeEach(() => {
  installMockEventSource();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useTradeHistory', () => {
  it('keeps cached trades and reports a manual refresh failure', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(tradePage([activeTrade])))
      .mockRejectedValueOnce(new Error('Network unavailable'));
    vi.stubGlobal('fetch', fetchMock);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTradeHistory(), { wrapper: Wrapper });
    const eventSource = MockEventSource.instances[0];

    act(() => eventSource?.open());
    await waitFor(() => expect(result.current.trades).toHaveLength(1));
    await act(async () => result.current.refreshTrades());

    expect(result.current.refreshFailed).toBe(true);
    expect(result.current.trades).toEqual([activeTrade]);
  });

  it('refetches the current numbered page after events and successful mutations', async () => {
    const createdTrade = { ...activeTrade, id: 'trade-created', symbol: 'MSFT' };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(tradePage([activeTrade], 1, 2, 101)))
      .mockResolvedValueOnce(
        jsonResponse(tradePage([{ ...activeTrade, id: 'trade-2' }], 2, 2, 101)),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          tradePage([{ ...activeTrade, id: 'trade-2', status: 'CANCELLED' }], 2, 2, 101),
        ),
      )
      .mockResolvedValueOnce(jsonResponse(createdTrade))
      .mockResolvedValueOnce(
        jsonResponse(
          tradePage([{ ...activeTrade, id: 'trade-2', status: 'CANCELLED' }], 2, 2, 101),
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTradeHistory(), { wrapper: Wrapper });
    const eventSource = MockEventSource.instances[0];

    act(() => eventSource?.open());
    await waitFor(() => expect(result.current.trades).toHaveLength(1));
    act(() => result.current.goToPage(2));
    await waitFor(() => expect(result.current.trades[0]?.id).toBe('trade-2'));
    eventSource?.dispatch(
      'trade.amended',
      JSON.stringify({ ...activeTrade, id: 'trade-2', symbol: 'NVDA' }),
    );
    await waitFor(() => expect(result.current.trades[0]?.status).toBe('CANCELLED'));
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/v1/trades?page=2&pageSize=100&sortBy=tradeTimestamp&sortDirection=desc',
    );

    await act(async () => {
      await result.current.createTrade({
        symbol: 'MSFT',
        quantity: 100,
        price: 185.25,
        side: 'BUY',
        trader: 'Alex Morgan',
        tradeTimestamp: activeTrade.tradeTimestamp,
        status: 'ACTIVE',
      });
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      '/api/v1/trades?page=2&pageSize=100&sortBy=tradeTimestamp&sortDirection=desc',
    );
    expect(result.current.trades.map((trade) => trade.id)).toEqual(['trade-2']);
  });
});
