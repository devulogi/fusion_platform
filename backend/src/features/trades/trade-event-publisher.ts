import type { Trade } from './models/trade.ts';

export const TradeEventType = {
  CREATED: 'trade.created',
} as const;

export interface TradeCreatedEvent {
  readonly type: typeof TradeEventType.CREATED;
  readonly trade: Trade;
}

export type TradeEventListener = (event: TradeCreatedEvent) => void;

export class TradeEventPublisher {
  private readonly listeners = new Set<TradeEventListener>();

  subscribe(listener: TradeEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  publishTradeCreated(trade: Trade): void {
    const event: TradeCreatedEvent = {
      type: TradeEventType.CREATED,
      trade: { ...trade },
    };

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error: unknown) {
        console.error('Trade event delivery failed:', error);
      }
    }
  }
}
