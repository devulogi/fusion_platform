import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppErrorBoundary } from './app-error-boundary';
import { ConnectionStatusProvider } from './contexts/connection-status-provider';
import TradeHistoryPage from './features/trades/TradeHistoryPage';

const queryClient = new QueryClient();

export default function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ConnectionStatusProvider>
          <TradeHistoryPage />
        </ConnectionStatusProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
