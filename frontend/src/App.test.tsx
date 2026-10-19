import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { AppErrorBoundary } from './app-error-boundary';
import { installMockEventSource } from './features/trades/trade-test-fixtures';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('App', () => {
  it('mounts the trade page inside its application providers', () => {
    installMockEventSource();
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Trade History' })).toBeInTheDocument();
    expect(screen.getByText('Connecting', { exact: true })).toBeInTheDocument();
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
});
