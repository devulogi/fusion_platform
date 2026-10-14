import { describe, expect, it } from 'vitest';
import { TradeCache } from '../../../../src/features/trades/trade-cache.ts';
import { TradeService } from '../../../../src/features/trades/services/trade-service.ts';

describe('TradeService', () => {
  it('does not report a collection before cache hydration', () => {
    const service = new TradeService(new TradeCache());

    expect(service.getAllTrades()).toBeUndefined();
  });

  it('returns the cached collection after hydration', () => {
    const tradeCache = new TradeCache();
    const trade = {
      id: 'trade-1',
      symbol: 'AAPL',
      quantity: 100,
      price: 185.25,
      side: 'BUY' as const,
      trader: 'Alex Morgan',
      tradeDate: '2026-10-14T12:00:00.000Z',
      status: 'ACTIVE' as const,
    };
    tradeCache.hydrate([trade]);
    const service = new TradeService(tradeCache);

    expect(service.getAllTrades()).toEqual([trade]);
  });
});
