import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { useConnectionStatus } from './contexts/connection-status-context';
import AmendTradeDialog from './features/trades/amend-trade-dialog';
import type { AmendTradeInput } from './features/trades/amend-trade-dialog';
import CancelTradeDialog from './features/trades/cancel-trade-dialog';
import CreateTradeDialog from './features/trades/create-trade-dialog';
import type { CreateTradeInput } from './features/trades/create-trade-dialog';
import TradeBlotterTable from './features/trades/trade-blotter-table';
import {
  tradeCollectionSchema,
  tradeEventTypes,
  tradeSchema,
} from './features/trades/trade-schema';
import type { Trade } from './features/trades/trade-schema';

const tradeQueryKey = ['trades'] as const;
const EVENT_STREAM_RETRY_DELAY_MS = 3_000;

async function submitTradeCommand(
  path: string,
  method: 'POST' | 'PATCH',
  body: object,
): Promise<Trade> {
  const response = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error('Trade command failed');

  const payload: unknown = await response.json();
  const result = tradeSchema.safeParse(payload);
  if (!result.success) throw new Error('Trade command response was invalid');

  return result.data;
}

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
    data: cachedTrades,
    isError,
    isFetched,
    isFetching,
    refetch: refetchTrades,
  } = useQuery({
    queryKey: tradeQueryKey,
    queryFn: fetchTradeSnapshot,
    enabled: false,
    retry: false,
  });
  const trades = cachedTrades ?? [];
  const snapshotUnavailable = isError && cachedTrades === undefined;
  const { connectionStatus, setConnectionStatus } = useConnectionStatus();
  const [refreshFailed, setRefreshFailed] = useState(false);
  const refreshSnapshotRef = useRef<(() => Promise<void>) | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [tradeToAmend, setTradeToAmend] = useState<Trade | null>(null);
  const [tradeToCancel, setTradeToCancel] = useState<Trade | null>(null);

  const updateTradeCache = (savedTrade: Trade): void => {
    queryClient.setQueryData<Trade[]>(tradeQueryKey, (currentTrades) =>
      upsertTrade(currentTrades ?? [], savedTrade),
    );
  };

  const createTradeMutation = useMutation({
    mutationFn: (input: CreateTradeInput) => submitTradeCommand('/api/v1/trades', 'POST', input),
    onSuccess: updateTradeCache,
  });
  const amendTradeMutation = useMutation({
    mutationFn: ({ tradeId, input }: { tradeId: string; input: AmendTradeInput }) =>
      submitTradeCommand(`/api/v1/trades/${encodeURIComponent(tradeId)}`, 'PATCH', input),
    onSuccess: updateTradeCache,
  });
  const cancelTradeMutation = useMutation({
    mutationFn: (tradeId: string) =>
      submitTradeCommand(`/api/v1/trades/${encodeURIComponent(tradeId)}`, 'PATCH', {
        status: 'CANCELLED',
      }),
    onSuccess: updateTradeCache,
  });

  const openAmendDialog = useCallback((trade: Trade) => setTradeToAmend(trade), []);
  const closeAmendDialog = useCallback(() => setTradeToAmend(null), []);
  const openCancelDialog = useCallback((trade: Trade) => setTradeToCancel(trade), []);
  const closeCancelDialog = useCallback(() => setTradeToCancel(null), []);

  useEffect(() => {
    let isMounted = true;
    let hasLoadedSnapshot = queryClient.getQueryData<Trade[]>(tradeQueryKey) !== undefined;
    let snapshotLoading = false;
    let refreshQueued = false;
    let bufferedEvents: Trade[] = [];
    let eventSource: EventSource | null = null;
    let retryTimer: number | null = null;

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
            setRefreshFailed(false);
            hasLoadedSnapshot = true;
          }
        } catch {
          if (isMounted) {
            if (hasLoadedSnapshot) setRefreshFailed(true);
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
    refreshSnapshotRef.current = refreshSnapshot;

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

    const connectEventStream = (): void => {
      if (!isMounted) return;

      const source = new EventSource('/api/v1/events');
      eventSource = source;
      for (const eventType of tradeEventTypes) {
        source.addEventListener(eventType, handleTradeEvent);
      }

      source.onopen = () => {
        if (!isMounted || eventSource !== source) return;
        if (retryTimer !== null) {
          window.clearTimeout(retryTimer);
          retryTimer = null;
        }
        setConnectionStatus('Live');
        void refreshSnapshot();
      };

      source.onerror = () => {
        if (!isMounted || eventSource !== source) return;
        setConnectionStatus('Reconnecting');
        if (source.readyState !== EventSource.CLOSED || retryTimer !== null) return;

        retryTimer = window.setTimeout(() => {
          retryTimer = null;
          if (!isMounted || eventSource !== source || source.readyState !== EventSource.CLOSED) {
            return;
          }
          connectEventStream();
        }, EVENT_STREAM_RETRY_DELAY_MS);
      };
    };

    connectEventStream();

    return () => {
      isMounted = false;
      refreshSnapshotRef.current = null;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      eventSource?.close();
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
          <div className="flex items-center gap-3">
            <p className="text-sm text-[#58665e]">
              {trades.length.toLocaleString()} {trades.length === 1 ? 'trade' : 'trades'}
            </p>
            <button
              className="min-h-11 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-150 ease-out hover:scale-[1.01] hover:bg-blue-500 active:scale-[0.98] active:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              onClick={() => setIsCreateDialogOpen(true)}
              type="button"
            >
              New trade
            </button>
            <button
              aria-label="Refresh trades"
              aria-busy={isFetching}
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-150 ease-out hover:scale-[1.01] hover:bg-blue-500 active:scale-[0.98] active:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              disabled={!isFetched || isFetching}
              onClick={() => {
                void refreshSnapshotRef.current?.();
              }}
              type="button"
            >
              <RefreshCw
                aria-hidden="true"
                className={isFetching ? 'animate-spin' : ''}
                size={16}
              />
              {isFetching ? 'Refreshing' : 'Refresh'}
            </button>
          </div>
        </div>

        {snapshotUnavailable && (
          <p className="mb-4 text-sm text-[#9b4d32]" role="alert">
            Trade snapshot unavailable. It will be retried when the stream reconnects.
          </p>
        )}
        {refreshFailed && (
          <p className="mb-4 text-sm text-[#9b4d32]" role="alert">
            Refresh failed. Showing the last successful snapshot.
          </p>
        )}

        <TradeBlotterTable
          trades={trades}
          isLoading={!isFetched && !snapshotUnavailable}
          emptyMessage={snapshotUnavailable ? 'No snapshot available' : 'No trades yet'}
          actionsDisabled={
            createTradeMutation.isPending ||
            amendTradeMutation.isPending ||
            cancelTradeMutation.isPending
          }
          onAmend={openAmendDialog}
          onCancel={openCancelDialog}
        />
      </section>
      <CreateTradeDialog
        open={isCreateDialogOpen}
        isPending={createTradeMutation.isPending}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={(input) => createTradeMutation.mutateAsync(input)}
      />
      {tradeToAmend !== null && (
        <AmendTradeDialog
          open
          trade={tradeToAmend}
          isPending={amendTradeMutation.isPending}
          onClose={closeAmendDialog}
          onSubmit={(tradeId, input) => amendTradeMutation.mutateAsync({ tradeId, input })}
        />
      )}
      {tradeToCancel !== null && (
        <CancelTradeDialog
          open
          trade={tradeToCancel}
          isPending={cancelTradeMutation.isPending}
          onClose={closeCancelDialog}
          onConfirm={(tradeId) => cancelTradeMutation.mutateAsync(tradeId)}
        />
      )}
    </main>
  );
}

export default App;
