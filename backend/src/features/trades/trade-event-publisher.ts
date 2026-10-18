import { TradeEventType } from '../../constants.ts';
import type { Trade, TradeChangedEvent, TradeEventListener } from '../../types.ts';

export class TradeEventPublisher {
  private readonly listeners = new Set<TradeEventListener>();

  subscribe(listener: TradeEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  publishTradeCreated(trade: Trade): void {
    this.publish(TradeEventType.CREATED, trade);
  }

  publishTradeAmended(trade: Trade): void {
    this.publish(TradeEventType.AMENDED, trade);
  }

  publishTradeCancelled(trade: Trade): void {
    this.publish(TradeEventType.CANCELLED, trade);
  }

  publishTradeReactivated(trade: Trade): void {
    this.publish(TradeEventType.REACTIVATED, trade);
  }

  private publish(type: TradeChangedEvent['type'], trade: Trade): void {
    const event: TradeChangedEvent = { type, trade: { ...trade } };
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error: unknown) {
        console.error('Trade event delivery failed:', error);
      }
    }
  }
}
