import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AppErrorBoundary } from './components/app-error-boundary';
import { ConnectionStatusProvider } from './contexts/connection-status-provider';
import './index.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ConnectionStatusProvider>
          <App />
        </ConnectionStatusProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  </React.StrictMode>,
);
