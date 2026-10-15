import { describe, expect, it } from 'vitest';
import {
  TradeCache,
  TradeCacheNotHydratedError,
} from '../../../../src/features/trades/trade-cache.ts';
import type { CreateTradeInput, Trade } from '../../../../src/features/trades/models/trade.ts';
import type { TradeRepositoryContract } from '../../../../src/features/trades/repositories/trade-repository.ts';
import { TradeEventPublisher } from '../../../../src/features/trades/trade-event-publisher.ts';
import { TradeService } from '../../../../src/features/trades/services/trade-service.ts';

const unusedTradeRepository: TradeRepositoryContract = {
  findAll: () => Promise.resolve([]),
  create: () => Promise.reject(new Error('Trade creation not configured for this test')),
};

describe('TradeService', () => {
  it('throws when the cache has not been hydrated', () => {
    const service = new TradeService(
      new TradeCache(),
      unusedTradeRepository,
      new TradeEventPublisher(),
    );

    expect(() => service.getAllTrades()).toThrow(TradeCacheNotHydratedError);
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
    const service = new TradeService(tradeCache, unusedTradeRepository, new TradeEventPublisher());

    expect(service.getAllTrades()).toEqual([trade]);
  });

  it('persists, updates the cache, then publishes the saved trade', async () => {
    const tradeCache = new TradeCache();
    tradeCache.hydrate([]);
    const input: CreateTradeInput = {
      symbol: 'AAPL',
      quantity: 100,
      price: 185.25,
      side: 'BUY',
      trader: 'Alex Morgan',
      tradeDate: '2026-10-14T12:00:00.000Z',
      status: 'ACTIVE',
    };
    const savedTrade: Trade = { id: 'generated-id', ...input };
    const operationOrder: string[] = [];
    const tradeRepository = {
      create: (trade: CreateTradeInput) => {
        expect(trade).toEqual(input);
        operationOrder.push('persist');
        return Promise.resolve(savedTrade);
      },
    };
    const tradeEventPublisher = {
      publishTradeCreated: (trade: Trade) => {
        expect(trade).toEqual(savedTrade);
        expect(tradeCache.getAll()).toEqual([savedTrade]);
        operationOrder.push('publish');
      },
    };
    const service = new TradeService(tradeCache, tradeRepository, tradeEventPublisher);

    await expect(service.createTrade(input)).resolves.toEqual(savedTrade);
    expect(operationOrder).toEqual(['persist', 'publish']);
  });

  it('does not update the cache or publish when persistence fails', async () => {
    const tradeCache = new TradeCache();
    tradeCache.hydrate([]);
    const persistenceError = new Error('Database unavailable');
    let eventPublished = false;
    const tradeRepository = {
      create: () => Promise.reject(persistenceError),
    };
    const tradeEventPublisher = {
      publishTradeCreated: () => {
        eventPublished = true;
      },
    };
    const service = new TradeService(tradeCache, tradeRepository, tradeEventPublisher);

    await expect(
      service.createTrade({
        symbol: 'AAPL',
        quantity: 100,
        price: 185.25,
        side: 'BUY',
        trader: 'Alex Morgan',
        tradeDate: '2026-10-14T12:00:00.000Z',
        status: 'ACTIVE',
      }),
    ).rejects.toBe(persistenceError);
    expect(tradeCache.getAll()).toEqual([]);
    expect(eventPublished).toBe(false);
  });

  it('does not persist a trade before the cache has been hydrated', async () => {
    let repositoryCallCount = 0;
    const tradeRepository: TradeRepositoryContract = {
      findAll: () => Promise.resolve([]),
      create: () => {
        repositoryCallCount += 1;
        return Promise.reject(new Error('Should not persist before hydration'));
      },
    };
    const service = new TradeService(new TradeCache(), tradeRepository, new TradeEventPublisher());

    await expect(
      service.createTrade({
        symbol: 'AAPL',
        quantity: 100,
        price: 185.25,
        side: 'BUY',
        trader: 'Alex Morgan',
        tradeDate: '2026-10-14T12:00:00.000Z',
        status: 'ACTIVE',
      }),
    ).rejects.toThrow(TradeCacheNotHydratedError);
    expect(repositoryCallCount).toBe(0);
  });
});
