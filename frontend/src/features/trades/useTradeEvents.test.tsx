import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectionStatusProvider } from '../../contexts/connection-status-provider';
import { useConnectionStatus } from '../../contexts/connection-status-context';
import { tradeEventTypes } from './trade-schema';
import { activeTrade, installMockEventSource, MockEventSource } from './trade-test-fixtures';
import { useTradeEvents } from './useTradeEvents';

function createWrapper() {
  function Wrapper({ children }: { children: ReactNode }) {
    return <ConnectionStatusProvider>{children}</ConnectionStatusProvider>;
  }
  return Wrapper;
}

beforeEach(() => {
  installMockEventSource();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useTradeEvents', () => {
  it('connects to the event stream and refreshes when it opens', () => {
    const onRefresh = vi.fn();
    const { result } = renderHook(
      () => {
        const { connectionStatus } = useConnectionStatus();
        useTradeEvents({ onRefresh });
        return connectionStatus;
      },
      { wrapper: createWrapper() },
    );
    const eventSource = MockEventSource.instances[0];

    expect(eventSource?.url).toBe('/api/v1/events');
    expect(Array.from(eventSource?.listeners.keys() ?? [])).toEqual(tradeEventTypes);
    act(() => eventSource?.open());

    expect(result.current).toBe('Live');
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it('refreshes for a valid supported trade event and ignores invalid payloads', () => {
    const onRefresh = vi.fn();
    renderHook(() => useTradeEvents({ onRefresh }), { wrapper: createWrapper() });
    const eventSource = MockEventSource.instances[0];

    act(() => eventSource?.dispatch('trade.amended', JSON.stringify(activeTrade)));
    expect(onRefresh).toHaveBeenCalledOnce();

    act(() => eventSource?.dispatch('trade.amended', JSON.stringify({ id: activeTrade.id })));
    act(() => eventSource?.dispatch('trade.amended', '{invalid json'));

    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it('reconnects after a terminal error and reports the reopened stream as live', async () => {
    vi.useFakeTimers();
    const onRefresh = vi.fn();
    const { result } = renderHook(
      () => {
        const { connectionStatus } = useConnectionStatus();
        useTradeEvents({ onRefresh });
        return connectionStatus;
      },
      { wrapper: createWrapper() },
    );
    const failedSource = MockEventSource.instances[0];

    act(() => failedSource?.failPermanently());
    expect(result.current).toBe('Reconnecting');
    expect(MockEventSource.instances).toHaveLength(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });
    const replacementSource = MockEventSource.instances[1];
    expect(replacementSource?.url).toBe('/api/v1/events');

    act(() => replacementSource?.open());

    expect(result.current).toBe('Live');
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it('closes the stream and cancels a pending retry when unmounted', async () => {
    vi.useFakeTimers();
    const { unmount } = renderHook(() => useTradeEvents({ onRefresh: vi.fn() }), {
      wrapper: createWrapper(),
    });
    const eventSource = MockEventSource.instances[0];

    act(() => eventSource?.failPermanently());
    unmount();

    expect(eventSource?.close).toHaveBeenCalledOnce();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });
    expect(MockEventSource.instances).toHaveLength(1);
  });
});
