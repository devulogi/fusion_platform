import type { Trade, TradeId } from './models/trade.ts';

export class TradeCache {
  private tradesById = new Map<TradeId, Trade>();
  private hydrated = false;

  hydrate(trades: readonly Trade[]): void {
    const nextTradesById = new Map<TradeId, Trade>();

    for (const trade of trades) {
      nextTradesById.set(trade.id, { ...trade });
    }

    this.tradesById = nextTradesById;
    this.hydrated = true;
  }

  getAll(): readonly Trade[] | undefined {
    if (!this.hydrated) {
      return undefined;
    }

    return Array.from(this.tradesById.values());
  }
}
