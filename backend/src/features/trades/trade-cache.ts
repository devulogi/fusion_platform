import type { Trade, TradeId } from '../../types.ts';
import { TradeCacheNotHydratedError } from '../../errors.ts';

export class TradeCache {
  private tradesById = new Map<TradeId, Trade>();
  private hydrated = false;

  hydrate(trades: readonly Trade[]): void {
    const hydratedTradesById = new Map<TradeId, Trade>();

    for (const trade of trades) {
      hydratedTradesById.set(trade.id, { ...trade });
    }

    this.tradesById = hydratedTradesById;
    this.hydrated = true;
  }

  add(trade: Trade): void {
    this.assertHydrated();
    this.tradesById.set(trade.id, { ...trade });
  }

  replace(trade: Trade): void {
    this.assertHydrated();
    this.tradesById.set(trade.id, { ...trade });
  }

  getAll(): readonly Trade[] {
    this.assertHydrated();
    return Array.from(this.tradesById.values(), (trade) => ({ ...trade }));
  }

  getById(id: TradeId): Trade | undefined {
    this.assertHydrated();
    const trade = this.tradesById.get(id);
    return trade ? { ...trade } : undefined;
  }

  isHydrated(): boolean {
    return this.hydrated;
  }

  assertHydrated(): void {
    if (!this.hydrated) {
      throw new TradeCacheNotHydratedError();
    }
  }
}
