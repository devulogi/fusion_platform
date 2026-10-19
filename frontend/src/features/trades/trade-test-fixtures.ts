import { vi } from 'vitest';
import type { Trade } from './trade-schema';

export class MockEventSource {
  static instances: MockEventSource[] = [];
  static readonly CLOSED = 2;
  readonly listeners = new Map<string, EventListener>();
  readonly close = vi.fn(() => {
    this.readyState = MockEventSource.CLOSED;
  });
  readyState = 0;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(readonly url: string) {
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    this.listeners.set(
      type,
      typeof listener === 'function' ? listener : (event) => listener.handleEvent(event),
    );
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.();
  }

  failPermanently(): void {
    this.readyState = MockEventSource.CLOSED;
    this.onerror?.();
  }

  dispatch(type: string, data: string): void {
    this.listeners.get(type)?.(new MessageEvent(type, { data }));
  }
}

export const activeTrade: Trade = {
  id: 'trade-1',
  symbol: 'AAPL',
  quantity: 100,
  price: 185.25,
  side: 'BUY',
  trader: 'Alex Morgan',
  tradeTimestamp: '2026-10-14T12:00:00.000Z',
  status: 'ACTIVE',
  book: null,
  counterparty: null,
};

export function installMockEventSource(): void {
  MockEventSource.instances = [];
  vi.stubGlobal('EventSource', MockEventSource);
}
