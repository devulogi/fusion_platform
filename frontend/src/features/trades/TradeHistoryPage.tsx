import { useCallback, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useConnectionStatus } from '../../contexts/connection-status-context';
import AmendTradeDialog from './components/AmendTradeDialog';
import CancelTradeDialog from './components/CancelTradeDialog';
import CreateTradeDialog from './components/CreateTradeDialog';
import TradeConnectionStatus from './components/TradeConnectionStatus';
import TradeBlotterTable from './components/TradeBlotterTable';
import type { AdvancedTradeFilters } from './components/TradeFilterToolbar/types';
import { useTradeHistory } from './useTradeHistory';
import type { Trade } from './trade-schema';

function TradeHistoryPage() {
  const history = useTradeHistory();
  const { connectionStatus } = useConnectionStatus();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [tradeToAmend, setTradeToAmend] = useState<Trade | null>(null);
  const [tradeToCancel, setTradeToCancel] = useState<Trade | null>(null);

  const openAmendDialog = useCallback((trade: Trade) => setTradeToAmend(trade), []);
  const closeAmendDialog = useCallback(() => setTradeToAmend(null), []);
  const openCancelDialog = useCallback((trade: Trade) => setTradeToCancel(trade), []);
  const closeCancelDialog = useCallback(() => setTradeToCancel(null), []);
  const filters: AdvancedTradeFilters = {
    trader: history.query.trader,
    sides: history.query.sides,
    statuses: history.query.statuses,
    startDate: history.query.startDate,
    endDate: history.query.endDate,
  };
  const activeFilterCount =
    Number(history.query.symbol.trim() !== '') +
    Number(filters.trader.trim() !== '') +
    Number(filters.startDate !== '' || filters.endDate !== '') +
    Number(filters.sides.length > 0) +
    Number(filters.statuses.length > 0);

  return (
    <main className="min-h-screen bg-[var(--trade-canvas)] text-[var(--trade-text)]">
      <header className="border-b border-[var(--trade-border)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase text-[var(--trade-muted)]">
              Fusion Platform
            </p>
          </div>
          <TradeConnectionStatus status={connectionStatus} />
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Trade History</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="min-h-11 rounded-md bg-[var(--trade-accent)] px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#263bb5] active:bg-[#2436a3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trade-accent)] focus-visible:ring-offset-2"
              onClick={() => setIsCreateDialogOpen(true)}
              type="button"
            >
              New trade
            </button>
            <button
              aria-label="Refresh trades"
              aria-busy={history.isFetching}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[var(--trade-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--trade-text)] transition-colors duration-200 ease-out hover:bg-[var(--trade-surface)] active:bg-[#eceef5] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trade-accent)] focus-visible:ring-offset-2"
              disabled={!history.isFetched || history.isFetching}
              onClick={() => void history.refreshTrades()}
              type="button"
            >
              <RefreshCw
                aria-hidden="true"
                className={history.isFetching ? 'animate-spin' : ''}
                size={16}
              />
              {history.isFetching ? 'Refreshing' : 'Refresh'}
            </button>
          </div>
        </div>

        {history.snapshotUnavailable && (
          <p className="mb-4 text-sm text-[#9b4d32]" role="alert">
            Trade snapshot unavailable. It will be retried when the stream reconnects.
          </p>
        )}
        {history.refreshFailed && (
          <p className="mb-4 text-sm text-[#9b4d32]" role="alert">
            Refresh failed. Showing the last successful snapshot.
          </p>
        )}

        <TradeBlotterTable
          trades={history.trades}
          isLoading={
            !history.isFetched && history.trades.length === 0 && !history.snapshotUnavailable
          }
          emptyMessage={
            history.snapshotUnavailable
              ? 'No snapshot available'
              : activeFilterCount > 0
                ? 'No trades match these filters'
                : 'No trades yet'
          }
          actionsDisabled={history.isCreating || history.isAmending || history.isCancelling}
          symbol={history.query.symbol}
          filters={filters}
          activeFilterCount={activeFilterCount}
          sortBy={history.query.sortBy}
          sortDirection={history.query.sortDirection}
          pagination={history.pagination}
          onPageChange={history.goToPage}
          onSymbolChange={history.setSymbol}
          onFiltersApply={history.setFilters}
          onSortChange={history.setSorting}
          onAmend={openAmendDialog}
          onCancel={openCancelDialog}
        />
      </section>
      <CreateTradeDialog
        open={isCreateDialogOpen}
        isPending={history.isCreating}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={history.createTrade}
      />
      {tradeToAmend !== null && (
        <AmendTradeDialog
          open
          trade={tradeToAmend}
          isPending={history.isAmending}
          onClose={closeAmendDialog}
          onSubmit={(tradeId, input) => history.amendTrade({ tradeId, input })}
        />
      )}
      {tradeToCancel !== null && (
        <CancelTradeDialog
          open
          trade={tradeToCancel}
          isPending={history.isCancelling}
          onClose={closeCancelDialog}
          onConfirm={history.cancelTrade}
        />
      )}
    </main>
  );
}

export default TradeHistoryPage;
