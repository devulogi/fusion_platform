import { describe, expect, it, vi } from 'vitest';
import {
  TradeCache,
  TradeCacheNotHydratedError,
} from '../../../../src/features/trades/trade-cache.ts';
import type {
  AmendTradeInput,
  CreateTradeInput,
  Trade,
} from '../../../../src/features/trades/models/trade.ts';
import type { TradeRepositoryContract } from '../../../../src/features/trades/repositories/trade-repository.ts';
import { TradeEventPublisher } from '../../../../src/features/trades/trade-event-publisher.ts';
import { TradeService } from '../../../../src/features/trades/services/trade-service.ts';

const unusedTradeRepository: TradeRepositoryContract = {
  findAll: () => Promise.resolve([]),
  create: () => Promise.reject(new Error('Trade creation not configured for this test')),
  amend: () => Promise.reject(new Error('Trade amendment not configured for this test')),
  cancel: () => Promise.reject(new Error('Trade cancellation not configured for this test')),
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
      findAll: () => Promise.resolve([]),
      create: (trade: CreateTradeInput) => {
        expect(trade).toEqual(input);
        operationOrder.push('persist');
        return Promise.resolve(savedTrade);
      },
      amend: () => Promise.reject(new Error('Not used in create test')),
      cancel: () => Promise.reject(new Error('Not used in create test')),
    };
    const tradeEventPublisher = {
      publishTradeCreated: (trade: Trade) => {
        expect(trade).toEqual(savedTrade);
        expect(tradeCache.getAll()).toEqual([savedTrade]);
        operationOrder.push('publish');
      },
      publishTradeAmended: () => undefined,
      publishTradeCancelled: () => undefined,
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
      findAll: () => Promise.resolve([]),
      create: () => Promise.reject(persistenceError),
      amend: () => Promise.reject(new Error('Not used in create test')),
      cancel: () => Promise.reject(new Error('Not used in create test')),
    };
    const tradeEventPublisher = {
      publishTradeCreated: () => {
        eventPublished = true;
      },
      publishTradeAmended: () => undefined,
      publishTradeCancelled: () => undefined,
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
      amend: () => Promise.reject(new Error('Not used in create test')),
      cancel: () => Promise.reject(new Error('Not used in create test')),
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

  it('persists an amendment, replaces the cache, then publishes the saved trade', async () => {
    const tradeCache = new TradeCache();
    const existingTrade: Trade = {
      id: 'trade-1',
      symbol: 'AAPL',
      quantity: 100,
      price: 185.25,
      side: 'BUY',
      trader: 'Alex Morgan',
      tradeDate: '2026-10-14T12:00:00.000Z',
      status: 'ACTIVE',
    };
    tradeCache.hydrate([existingTrade]);
    const input: AmendTradeInput = { symbol: 'MSFT', book: null };
    const savedTrade: Trade = { ...existingTrade, symbol: 'MSFT' };
    const operationOrder: string[] = [];
    const tradeRepository: TradeRepositoryContract = {
      findAll: () => Promise.resolve([]),
      create: () => Promise.reject(new Error('Not used in amend test')),
      amend: (tradeId, amendInput) => {
        expect(tradeId).toBe(existingTrade.id);
        expect(amendInput).toEqual(input);
        operationOrder.push('persist');
        return Promise.resolve(savedTrade);
      },
      cancel: () => Promise.reject(new Error('Not used in amend test')),
    };
    const publisher = {
      publishTradeCreated: () => undefined,
      publishTradeAmended: (trade: Trade) => {
        expect(trade).toEqual(savedTrade);
        expect(tradeCache.getAll()).toEqual([savedTrade]);
        operationOrder.push('publish');
      },
      publishTradeCancelled: () => undefined,
    };
    const service = new TradeService(tradeCache, tradeRepository, publisher);

    await expect(service.amendTrade(existingTrade.id, input)).resolves.toEqual(savedTrade);
    expect(operationOrder).toEqual(['persist', 'publish']);
  });

  it('does not replace the cache or publish when amendment persistence fails', async () => {
    const existingTrade: Trade = {
      id: 'trade-1',
      symbol: 'AAPL',
      quantity: 100,
      price: 185.25,
      side: 'BUY',
      trader: 'Alex Morgan',
      tradeDate: '2026-10-14T12:00:00.000Z',
      status: 'ACTIVE',
    };
    const tradeCache = new TradeCache();
    tradeCache.hydrate([existingTrade]);
    const persistenceError = new Error('Database unavailable');
    let eventPublished = false;
    const tradeRepository: TradeRepositoryContract = {
      findAll: () => Promise.resolve([]),
      create: () => Promise.reject(new Error('Not used in amend test')),
      amend: () => Promise.reject(persistenceError),
      cancel: () => Promise.reject(new Error('Not used in amend test')),
    };
    const publisher = {
      publishTradeCreated: () => undefined,
      publishTradeAmended: () => {
        eventPublished = true;
      },
      publishTradeCancelled: () => undefined,
    };
    const service = new TradeService(tradeCache, tradeRepository, publisher);

    await expect(service.amendTrade(existingTrade.id, { symbol: 'MSFT' })).rejects.toBe(
      persistenceError,
    );
    expect(tradeCache.getAll()).toEqual([existingTrade]);
    expect(eventPublished).toBe(false);
  });

  it('persists cancellation, replaces the cache, then publishes the saved trade', async () => {
    const activeTrade: Trade = {
      id: 'trade-1',
      symbol: 'AAPL',
      quantity: 100,
      price: 185.25,
      side: 'BUY',
      trader: 'Alex Morgan',
      tradeDate: '2026-10-14T12:00:00.000Z',
      status: 'ACTIVE',
    };
    const cancelledTrade: Trade = { ...activeTrade, status: 'CANCELLED' };
    const tradeCache = new TradeCache();
    tradeCache.hydrate([activeTrade]);
    const operationOrder: string[] = [];
    const repository: TradeRepositoryContract = {
      findAll: () => Promise.resolve([]),
      create: () => Promise.reject(new Error('Not used in cancellation test')),
      amend: () => Promise.reject(new Error('Not used in cancellation test')),
      cancel: vi.fn<TradeRepositoryContract['cancel']>().mockImplementation(() => {
        operationOrder.push('persist');
        return Promise.resolve({ trade: cancelledTrade, changed: true });
      }),
    };
    const publisher = {
      publishTradeCreated: () => undefined,
      publishTradeAmended: () => undefined,
      publishTradeCancelled: (trade: Trade) => {
        expect(trade).toEqual(cancelledTrade);
        expect(tradeCache.getAll()).toEqual([cancelledTrade]);
        operationOrder.push('publish');
      },
    };
    const service = new TradeService(tradeCache, repository, publisher);

    await expect(service.cancelTrade(activeTrade.id, { status: 'CANCELLED' })).resolves.toEqual(
      cancelledTrade,
    );
    expect(operationOrder).toEqual(['persist', 'publish']);
  });

  it('updates the cache but does not publish when cancellation is repeated', async () => {
    const activeTrade: Trade = {
      id: 'trade-1',
      symbol: 'AAPL',
      quantity: 100,
      price: 185.25,
      side: 'BUY',
      trader: 'Alex Morgan',
      tradeDate: '2026-10-14T12:00:00.000Z',
      status: 'ACTIVE',
    };
    const cancelledTrade: Trade = { ...activeTrade, status: 'CANCELLED' };
    const tradeCache = new TradeCache();
    tradeCache.hydrate([activeTrade]);
    const publishTradeCancelled = vi.fn();
    const repository: TradeRepositoryContract = {
      findAll: () => Promise.resolve([]),
      create: () => Promise.reject(new Error('Not used in cancellation test')),
      amend: () => Promise.reject(new Error('Not used in cancellation test')),
      cancel: () => Promise.resolve({ trade: cancelledTrade, changed: false }),
    };
    const publisher = {
      publishTradeCreated: () => undefined,
      publishTradeAmended: () => undefined,
      publishTradeCancelled,
    };
    const service = new TradeService(tradeCache, repository, publisher);

    await expect(service.cancelTrade(activeTrade.id, { status: 'CANCELLED' })).resolves.toEqual(
      cancelledTrade,
    );
    expect(tradeCache.getAll()).toEqual([cancelledTrade]);
    expect(publishTradeCancelled).not.toHaveBeenCalled();
  });

  it('does not update the cache or publish when cancellation persistence fails', async () => {
    const activeTrade: Trade = {
      id: 'trade-1',
      symbol: 'AAPL',
      quantity: 100,
      price: 185.25,
      side: 'BUY',
      trader: 'Alex Morgan',
      tradeDate: '2026-10-14T12:00:00.000Z',
      status: 'ACTIVE',
    };
    const tradeCache = new TradeCache();
    tradeCache.hydrate([activeTrade]);
    const persistenceError = new Error('Database unavailable');
    const publishTradeCancelled = vi.fn();
    const repository: TradeRepositoryContract = {
      findAll: () => Promise.resolve([]),
      create: () => Promise.reject(new Error('Not used in cancellation test')),
      amend: () => Promise.reject(new Error('Not used in cancellation test')),
      cancel: () => Promise.reject(persistenceError),
    };
    const service = new TradeService(tradeCache, repository, {
      publishTradeCreated: () => undefined,
      publishTradeAmended: () => undefined,
      publishTradeCancelled,
    });

    await expect(service.cancelTrade(activeTrade.id, { status: 'CANCELLED' })).rejects.toBe(
      persistenceError,
    );
    expect(tradeCache.getAll()).toEqual([activeTrade]);
    expect(publishTradeCancelled).not.toHaveBeenCalled();
  });

  it('validates service input before accessing state or dependencies', async () => {
    const create = vi.fn<TradeRepositoryContract['create']>();
    const service = new TradeService(
      new TradeCache(),
      {
        findAll: () => Promise.resolve([]),
        create,
        amend: () => Promise.reject(new Error('Not used in validation test')),
        cancel: () => Promise.reject(new Error('Not used in validation test')),
      },
      new TradeEventPublisher(),
    );

    await expect(
      service.createTrade({
        symbol: 'AAPL',
        quantity: 0,
        price: 185.25,
        side: 'BUY',
        trader: 'Alex Morgan',
        tradeDate: '2026-10-14T12:00:00.000Z',
        status: 'ACTIVE',
      }),
    ).rejects.toMatchObject({ name: 'TradeInputValidationError' });
    expect(create).not.toHaveBeenCalled();
  });

  it('normalizes direct service inputs through the shared validator', async () => {
    const cache = new TradeCache();
    cache.hydrate([]);
    const input: CreateTradeInput = {
      symbol: ' AAPL ',
      quantity: 10,
      price: 12,
      side: 'BUY',
      trader: ' Alex ',
      tradeDate: '2026-10-14T12:00:00.000Z',
      status: 'ACTIVE',
    };
    const savedTrade: Trade = { ...input, id: 'saved', symbol: 'AAPL', trader: 'Alex' };
    const create = vi.fn<TradeRepositoryContract['create']>().mockResolvedValue(savedTrade);
    const service = new TradeService(
      cache,
      {
        findAll: () => Promise.resolve([]),
        create,
        amend: () => Promise.reject(new Error('Not used in create test')),
        cancel: () => Promise.reject(new Error('Not used in create test')),
      },
      new TradeEventPublisher(),
    );

    await expect(service.createTrade(input)).resolves.toEqual(savedTrade);
    expect(create).toHaveBeenCalledWith({ ...input, symbol: 'AAPL', trader: 'Alex' });
  });

  it('does not expose mutable cached records to callers', () => {
    const cache = new TradeCache();
    const original = {
      id: 'trade-1',
      symbol: 'AAPL',
      quantity: 10,
      price: 12,
      side: 'BUY' as const,
      trader: 'Alex',
      tradeDate: '2026-10-14T12:00:00.000Z',
      status: 'ACTIVE' as const,
    };
    cache.hydrate([original]);
    const service = new TradeService(cache, unusedTradeRepository, new TradeEventPublisher());
    original.symbol = 'CHANGED';
    const returned = service.getAllTrades()[0];
    if (returned === undefined) throw new Error('Expected a cached trade');
    Object.assign(returned, { symbol: 'CHANGED' });

    expect(service.getAllTrades()[0]?.symbol).toBe('AAPL');
  });
});
