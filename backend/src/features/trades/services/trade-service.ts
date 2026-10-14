import { TradeCache } from '../trade-cache.ts';
import type { Trade } from '../models/trade.ts';

export class TradeService {
  constructor(private readonly tradeCache: TradeCache) {}

  getAllTrades(): readonly Trade[] | undefined {
    return this.tradeCache.getAll();
  }
}
