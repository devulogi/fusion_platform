import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useConnectionStatus } from './contexts/connection-status-context';

const tradeSchema = z
  .object({
    id: z.string(),
    symbol: z.string(),
    quantity: z.number(),
    price: z.number(),
    side: z.enum(['BUY', 'SELL']),
    trader: z.string(),
    tradeDate: z.string(),
    status: z.enum(['ACTIVE', 'CANCELLED']),
    book: z.string().nullable(),
    counterparty: z.string().nullable(),
  })
  .strict();

const tradeCollectionSchema = z.object({ items: z.array(tradeSchema) }).strict();
const tradeEventTypes = [
  'trade.created',
  'trade.amended',
  'trade.cancelled',
  'trade.reactivated',
] as const;
const tradeQueryKey = ['trades'] as const;
type Trade = z.infer<typeof tradeSchema>;

async function fetchTradeSnapshot(): Promise<Trade[]> {
  const response = await fetch('/api/v1/trades');
  if (!response.ok) throw new Error('Trade snapshot request failed');

  const payload: unknown = await response.json();
  const result = tradeCollectionSchema.safeParse(payload);
  if (!result.success) throw new Error('Trade snapshot response was invalid');

  return result.data.items;
}

function upsertTrade(trades: Trade[], updatedTrade: Trade): Trade[] {
  const tradeIndex = trades.findIndex((trade) => trade.id === updatedTrade.id);
  if (tradeIndex === -1) return [...trades, updatedTrade];

  const nextTrades = [...trades];
  nextTrades[tradeIndex] = updatedTrade;
  return nextTrades;
}

function App() {
  const queryClient = useQueryClient();
  const {
    data: trades = [],
    isError: snapshotUnavailable,
    refetch: refetchTrades,
  } = useQuery({
    queryKey: tradeQueryKey,
    queryFn: fetchTradeSnapshot,
    enabled: false,
    retry: false,
  });
  const { connectionStatus, setConnectionStatus } = useConnectionStatus();

  useEffect(() => {
    let isMounted = true;
    let hasLoadedSnapshot = queryClient.getQueryData<Trade[]>(tradeQueryKey) !== undefined;
    let snapshotLoading = false;
    let refreshQueued = false;
    let bufferedEvents: Trade[] = [];
    const eventSource = new EventSource('/api/v1/events');

    const refreshSnapshot = async (): Promise<void> => {
      if (snapshotLoading) {
        refreshQueued = true;
        return;
      }

      snapshotLoading = true;
      do {
        refreshQueued = false;
        try {
          const result = await refetchTrades();
          if (result.isError || result.data === undefined) {
            throw result.error ?? new Error('Trade snapshot request failed');
          }

          const eventsDuringSnapshot = bufferedEvents;
          bufferedEvents = [];
          if (isMounted) {
            queryClient.setQueryData(
              tradeQueryKey,
              eventsDuringSnapshot.reduce(upsertTrade, result.data),
            );
            hasLoadedSnapshot = true;
          }
        } catch {
          if (isMounted) {
            if (hasLoadedSnapshot && bufferedEvents.length > 0) {
              const eventsToApply = bufferedEvents;
              bufferedEvents = [];
              queryClient.setQueryData<Trade[]>(tradeQueryKey, (currentTrades) =>
                eventsToApply.reduce(upsertTrade, currentTrades ?? []),
              );
            }
          }
        }
      } while (refreshQueued && isMounted);
      snapshotLoading = false;
    };

    const handleTradeEvent = (event: Event): void => {
      if (!(event instanceof MessageEvent) || typeof event.data !== 'string') return;

      let payload: unknown;
      try {
        payload = JSON.parse(event.data) as unknown;
      } catch {
        return;
      }

      const result = tradeSchema.safeParse(payload);
      if (!result.success) return;

      if (snapshotLoading || !hasLoadedSnapshot) {
        bufferedEvents.push(result.data);
      } else {
        queryClient.setQueryData<Trade[]>(tradeQueryKey, (currentTrades) =>
          upsertTrade(currentTrades ?? [], result.data),
        );
      }
    };

    for (const eventType of tradeEventTypes) {
      eventSource.addEventListener(eventType, handleTradeEvent);
    }

    eventSource.onopen = () => {
      if (!isMounted) return;
      setConnectionStatus('Live');
      void refreshSnapshot();
    };

    eventSource.onerror = () => {
      if (isMounted) setConnectionStatus('Reconnecting');
    };

    return () => {
      isMounted = false;
      eventSource.close();
    };
  }, [queryClient, refetchTrades, setConnectionStatus]);

  return (
    <main className="min-h-screen bg-[#f3f5f2] text-[#19251f]">
      <header className="border-b border-[#d9dfd9] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase text-[#527064]">Fusion Platform</p>
            <p className="mt-1 text-lg font-semibold">Trade blotter</p>
          </div>
          <div className="flex items-center gap-2 text-sm" role="status" aria-live="polite">
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 rounded-full ${
                connectionStatus === 'Live' ? 'bg-[#16805b]' : 'bg-[#d38b2f]'
              }`}
            />
            <span>{connectionStatus}</span>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-[#8a5b35]">Markets / Operations</p>
            <h1 className="mt-2 text-3xl font-semibold">Trades</h1>
          </div>
          <p className="text-sm text-[#58665e]">
            {trades.length.toLocaleString()} {trades.length === 1 ? 'trade' : 'trades'}
          </p>
        </div>

        {snapshotUnavailable && (
          <p className="mb-4 text-sm text-[#9b4d32]" role="alert">
            Trade snapshot unavailable. It will be retried when the stream reconnects.
          </p>
        )}

        <div className="overflow-x-auto border-y border-[#d9dfd9] bg-white">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-[#e9eeea] text-xs uppercase text-[#58665e]">
              <tr>
                <th className="px-4 py-3 font-semibold" scope="col">
                  Symbol
                </th>
                <th className="px-4 py-3 font-semibold" scope="col">
                  Side
                </th>
                <th className="px-4 py-3 text-right font-semibold" scope="col">
                  Quantity
                </th>
                <th className="px-4 py-3 text-right font-semibold" scope="col">
                  Price
                </th>
                <th className="px-4 py-3 font-semibold" scope="col">
                  Trader
                </th>
                <th className="px-4 py-3 font-semibold" scope="col">
                  Trade date
                </th>
                <th className="px-4 py-3 font-semibold" scope="col">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6eae6]">
              {trades.map((trade) => (
                <tr key={trade.id}>
                  <td className="px-4 py-3 font-semibold">{trade.symbol}</td>
                  <td
                    className={
                      trade.side === 'BUY' ? 'px-4 py-3 text-[#137a61]' : 'px-4 py-3 text-[#b25343]'
                    }
                  >
                    {trade.side}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {trade.quantity.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{trade.price.toFixed(2)}</td>
                  <td className="px-4 py-3">{trade.trader}</td>
                  <td className="px-4 py-3 tabular-nums">{trade.tradeDate.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        trade.status === 'ACTIVE'
                          ? 'font-medium text-[#137a61]'
                          : 'font-medium text-[#7a6253]'
                      }
                    >
                      {trade.status === 'ACTIVE' ? 'Active' : 'Cancelled'}
                    </span>
                  </td>
                </tr>
              ))}
              {trades.length === 0 && (
                <tr>
                  <td className="px-4 py-10 text-center text-[#69756e]" colSpan={7}>
                    {snapshotUnavailable
                      ? 'No snapshot available'
                      : 'Waiting for the trade snapshot'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default App;
