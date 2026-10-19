import { useEffect, useRef } from 'react';
import { useConnectionStatus } from '../../contexts/connection-status-context';
import { tradeEventTypes, tradeSchema } from './trade-schema';

const EVENT_STREAM_RETRY_DELAY_MS = 3_000;

type UseTradeEventsOptions = {
  onRefresh: () => void | Promise<void>;
};

export function useTradeEvents({ onRefresh }: UseTradeEventsOptions): void {
  const { setConnectionStatus } = useConnectionStatus();
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    let isMounted = true;
    let eventSource: EventSource | null = null;
    let retryTimer: number | null = null;

    const handleTradeEvent = (event: Event): void => {
      if (!(event instanceof MessageEvent) || typeof event.data !== 'string') return;

      let payload: unknown;
      try {
        payload = JSON.parse(event.data) as unknown;
      } catch {
        return;
      }

      if (!tradeSchema.safeParse(payload).success) return;
      void onRefreshRef.current();
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
        void onRefreshRef.current();
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
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      eventSource?.close();
    };
  }, [setConnectionStatus]);
}
