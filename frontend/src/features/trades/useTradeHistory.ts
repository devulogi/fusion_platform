import { useCallback, useEffect, useRef, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AmendTradeInput } from './components/AmendTradeDialog';
import type { CreateTradeInput } from './components/CreateTradeDialog';
import { amendTrade, cancelTrade, createTrade, fetchTradePage } from './trade-api';
import type { TradeQuery, TradeSortBy, TradeSortDirection } from './trade-schema';
import { useTradeEvents } from './useTradeEvents';

const DEFAULT_PAGE_SIZE = 100;
const initialQuery: TradeQuery = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  sortBy: 'tradeTimestamp',
  sortDirection: 'desc',
  symbol: '',
  trader: '',
  sides: [],
  statuses: [],
  startDate: '',
  endDate: '',
};
const tradeQueryKey = (query: TradeQuery) => ['trades', query] as const;

export function useTradeHistory() {
  const queryClient = useQueryClient();
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [query, setQuery] = useState<TradeQuery>(initialQuery);
  const queryRef = useRef(query);
  queryRef.current = query;
  const refreshPromiseRef = useRef<Promise<void> | null>(null);
  const refreshQueuedRef = useRef(false);
  const {
    data: page,
    isError,
    isFetched,
    isFetching,
  } = useQuery({
    queryKey: tradeQueryKey(query),
    queryFn: () => fetchTradePage(query),
    enabled: false,
    placeholderData: keepPreviousData,
    retry: false,
  });

  const refreshCurrentPage = useCallback((): Promise<void> => {
    if (refreshPromiseRef.current !== null) {
      refreshQueuedRef.current = true;
      return refreshPromiseRef.current;
    }

    const refresh = async (): Promise<void> => {
      do {
        refreshQueuedRef.current = false;
        const currentQuery = queryRef.current;
        try {
          await queryClient.fetchQuery({
            queryKey: tradeQueryKey(currentQuery),
            queryFn: () => fetchTradePage(currentQuery),
            retry: false,
          });
          setRefreshFailed(false);
        } catch {
          setRefreshFailed(true);
        }
      } while (refreshQueuedRef.current);
    };

    const promise = refresh().finally(() => {
      refreshPromiseRef.current = null;
    });
    refreshPromiseRef.current = promise;
    return promise;
  }, [queryClient]);
  const refreshCurrentPageRef = useRef(refreshCurrentPage);
  refreshCurrentPageRef.current = refreshCurrentPage;

  const loadQuery = useCallback(
    (nextQuery: TradeQuery) =>
      queryClient.fetchQuery({
        queryKey: tradeQueryKey(nextQuery),
        queryFn: () => fetchTradePage(nextQuery),
        retry: false,
      }),
    [queryClient],
  );
  const updateQuery = useCallback(
    (changes: Partial<Omit<TradeQuery, 'page'>>) => {
      const nextQuery = { ...queryRef.current, ...changes, page: 1 };
      queryRef.current = nextQuery;
      setQuery(nextQuery);
      setRefreshFailed(false);
      void loadQuery(nextQuery).catch(() => setRefreshFailed(true));
    },
    [loadQuery],
  );
  const goToPage = useCallback(
    (pageNumber: number) => {
      const pageCount = page?.pagination.pageCount ?? 0;
      if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pageCount) return;
      const nextQuery = { ...queryRef.current, page: pageNumber };
      queryRef.current = nextQuery;
      setQuery(nextQuery);
      setRefreshFailed(false);
      void loadQuery(nextQuery).catch(() => setRefreshFailed(true));
    },
    [loadQuery, page],
  );

  useEffect(() => {
    if (page === undefined) return;
    const pageCount = page.pagination.pageCount;
    const clampedPage = pageCount === 0 ? 1 : Math.min(query.page, pageCount);
    if (clampedPage === query.page) return;

    const nextQuery = { ...queryRef.current, page: clampedPage };
    queryRef.current = nextQuery;
    setQuery(nextQuery);
    void loadQuery(nextQuery).catch(() => setRefreshFailed(true));
  }, [loadQuery, page, query.page]);

  const setSorting = useCallback(
    (sortBy: TradeSortBy, sortDirection: TradeSortDirection) =>
      updateQuery({ sortBy, sortDirection }),
    [updateQuery],
  );
  const setSymbol = useCallback((symbol: string) => updateQuery({ symbol }), [updateQuery]);
  const setFilters = useCallback(
    (filters: Pick<TradeQuery, 'trader' | 'sides' | 'statuses' | 'startDate' | 'endDate'>) =>
      updateQuery(filters),
    [updateQuery],
  );

  const refreshAfterMutation = useCallback(async () => {
    await refreshCurrentPageRef.current();
  }, []);
  const createTradeMutation = useMutation({
    mutationFn: (input: CreateTradeInput) => createTrade(input),
    onSuccess: refreshAfterMutation,
  });
  const amendTradeMutation = useMutation({
    mutationFn: ({ tradeId, input }: { tradeId: string; input: AmendTradeInput }) =>
      amendTrade(tradeId, input),
    onSuccess: refreshAfterMutation,
  });
  const cancelTradeMutation = useMutation({
    mutationFn: (tradeId: string) => cancelTrade(tradeId),
    onSuccess: refreshAfterMutation,
  });

  useTradeEvents({ onRefresh: refreshCurrentPage });

  const refreshTrades = useCallback(() => refreshCurrentPage(), [refreshCurrentPage]);

  return {
    trades: page?.items ?? [],
    pagination: page?.pagination ?? {
      page: query.page,
      pageSize: query.pageSize,
      totalItems: 0,
      pageCount: 0,
    },
    query,
    setSymbol,
    setFilters,
    setSorting,
    goToPage,
    snapshotUnavailable: isError && page === undefined,
    isFetched,
    isFetching,
    refreshFailed,
    refreshTrades,
    createTrade: createTradeMutation.mutateAsync,
    amendTrade: amendTradeMutation.mutateAsync,
    cancelTrade: cancelTradeMutation.mutateAsync,
    isCreating: createTradeMutation.isPending,
    isAmending: amendTradeMutation.isPending,
    isCancelling: cancelTradeMutation.isPending,
  };
}
