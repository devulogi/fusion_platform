import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import {
  tradeNotAmendableSchema,
  tradeNotFoundErrorSchema,
  validationErrorSchema,
  tradeCollectionResponseSchema,
} from '../../../../src/schemas.ts';
import { DEFAULT_TRADE_PAGE_SIZE, MAX_TRADE_PAGE_SIZE } from '../../../../src/constants.ts';
import { createApp } from '../../../../src/app.ts';
import { ApiPath, TradeEventType } from '../../../../src/constants.ts';
import { HealthController } from '../../../../src/features/health/controllers/health-controller.ts';
import { TradeController } from '../../../../src/features/trades/controllers/trade-controller.ts';
import { TradeCache } from '../../../../src/features/trades/trade-cache.ts';
import type { Trade, TradeRepositoryContract } from '../../../../src/types.ts';
import { TradeEventPublisher } from '../../../../src/features/trades/trade-event-publisher.ts';
import { TradeEventsController } from '../../../../src/features/trades/controllers/trade-events-controller.ts';
import { TradeService } from '../../../../src/features/trades/services/trade-service.ts';
import { TradeNotAmendableError, TradeNotFoundError } from '../../../../src/errors.ts';

class FailingTradeCache extends TradeCache {
  override getAll(): readonly never[] {
    throw new Error('Sensitive persistence detail');
  }
}

function createTestApp(
  tradeCache: TradeCache,
  tradeRepository: TradeRepositoryContract = {
    findAll: () => Promise.resolve([]),
    create: () => Promise.reject(new Error('Unexpected trade creation')),
    amend: () => Promise.reject(new Error('Unexpected trade amendment')),
    cancel: () => Promise.reject(new Error('Unexpected trade cancellation')),
  },
  tradeEventPublisher = new TradeEventPublisher(),
) {
  const tradeService = new TradeService(tradeCache, tradeRepository, tradeEventPublisher);
  return createApp({
    healthController: new HealthController(),
    tradeController: new TradeController(tradeService),
    tradeEventsController: new TradeEventsController(tradeEventPublisher),
  });
}

describe('GET /api/trades', () => {
  it('does not serve a collection before cache hydration', async () => {
    const response = await request(createTestApp(new TradeCache())).get(ApiPath.trades);

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: {
        code: 'TRADE_COLLECTION_NOT_READY',
        reason: 'Trade collection is not ready',
        requestId: response.headers['x-request-id'],
      },
    });
  });

  it('returns the complete hydrated collection from memory', async () => {
    const tradeCache = new TradeCache();
    tradeCache.hydrate([
      {
        id: 'trade-1',
        symbol: 'AAPL',
        quantity: 100,
        price: 185.25,
        side: 'BUY',
        trader: 'Alex Morgan',
        tradeTimestamp: '2026-10-14T12:00:00.000Z',
        status: 'ACTIVE',
      },
      {
        id: 'trade-2',
        symbol: 'MSFT',
        quantity: 50,
        price: 420.5,
        side: 'SELL',
        trader: 'Jamie Lee',
        tradeTimestamp: '2026-10-14T13:00:00.000Z',
        status: 'CANCELLED',
      },
    ]);

    const response = await request(createTestApp(tradeCache)).get(ApiPath.trades);

    expect(response.status).toBe(200);
    expect(tradeCollectionResponseSchema.parse(response.body)).toEqual({
      items: [
        {
          id: 'trade-2',
          symbol: 'MSFT',
          quantity: 50,
          price: 420.5,
          side: 'SELL',
          trader: 'Jamie Lee',
          tradeTimestamp: '2026-10-14T13:00:00.000Z',
          status: 'CANCELLED',
          book: null,
          counterparty: null,
        },
        {
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
        },
      ],
      pagination: {
        page: 1,
        pageSize: DEFAULT_TRADE_PAGE_SIZE,
        totalItems: 2,
        pageCount: 1,
      },
    });
  });

  it('applies combined filters, sort, and numbered pagination to the complete result set', async () => {
    const tradeCache = new TradeCache();
    const firstTrade: Trade = {
      id: 'trade-1',
      symbol: 'AAPL',
      quantity: 100,
      price: 185.25,
      side: 'BUY',
      trader: 'Alex Morgan',
      tradeTimestamp: '2026-10-14T12:00:00.000Z',
      status: 'ACTIVE',
    };
    const secondTrade: Trade = {
      ...firstTrade,
      id: 'trade-2',
      quantity: 200,
      side: 'SELL',
      tradeTimestamp: '2026-10-14T13:00:00.000Z',
    };
    tradeCache.hydrate([
      firstTrade,
      secondTrade,
      { ...firstTrade, id: 'trade-3', symbol: 'MSFT' },
      { ...firstTrade, id: 'trade-4', trader: 'Sam Lee' },
      { ...firstTrade, id: 'trade-5', status: 'CANCELLED' },
    ]);
    const response = await request(createTestApp(tradeCache))
      .get(ApiPath.trades)
      .query({
        page: 2,
        pageSize: 1,
        sortBy: 'symbol',
        sortDirection: 'asc',
        symbol: 'AAP',
        trader: 'Alex',
        side: ['BUY', 'SELL'],
        status: ['ACTIVE'],
        startDate: '2026-10-14T00:00:00.000Z',
        endDate: '2026-10-15T00:00:00.000Z',
      });

    expect(response.status).toBe(200);
    expect(tradeCollectionResponseSchema.parse(response.body)).toEqual({
      items: [
        {
          ...secondTrade,
          book: null,
          counterparty: null,
        },
      ],
      pagination: { page: 2, pageSize: 1, totalItems: 2, pageCount: 2 },
    });
  });

  it('returns an empty page with exact metadata when the requested page is beyond the result', async () => {
    const tradeCache = new TradeCache();
    tradeCache.hydrate([
      {
        id: 'trade-1',
        symbol: 'AAPL',
        quantity: 100,
        price: 185.25,
        side: 'BUY',
        trader: 'Alex Morgan',
        tradeTimestamp: '2026-10-14T12:00:00.000Z',
        status: 'ACTIVE',
      },
    ]);

    const response = await request(createTestApp(tradeCache))
      .get(ApiPath.trades)
      .query({ page: 3, pageSize: 1 });

    expect(response.status).toBe(200);
    expect(tradeCollectionResponseSchema.parse(response.body)).toEqual({
      items: [],
      pagination: { page: 3, pageSize: 1, totalItems: 1, pageCount: 1 },
    });
  });

  it.each([
    { query: { page: -1 }, field: 'page' },
    { query: { page: 0 }, field: 'page' },
    { query: { pageSize: MAX_TRADE_PAGE_SIZE + 1 }, field: 'pageSize' },
    { query: { sortBy: 'symbol; DROP TABLE Trade' }, field: 'sortBy' },
    { query: { sortDirection: 'sideways' }, field: 'sortDirection' },
    {
      query: { startDate: '2026-10-15T00:00:00.000Z', endDate: '2026-10-14T00:00:00.000Z' },
      field: 'endDate',
    },
  ])(
    'rejects invalid query values with a structured validation error',
    async ({ query, field }) => {
      const tradeCache = new TradeCache();
      tradeCache.hydrate([]);
      const getAll = vi.spyOn(tradeCache, 'getAll');

      const response = await request(createTestApp(tradeCache)).get(ApiPath.trades).query(query);

      expect(response.status).toBe(400);
      expect(validationErrorSchema.parse(response.body).error.details[0]?.field).toBe(field);
      expect(getAll).not.toHaveBeenCalled();
    },
  );

  it('returns an empty collection when an empty database has been hydrated', async () => {
    const tradeCache = new TradeCache();
    tradeCache.hydrate([]);

    const response = await request(createTestApp(tradeCache)).get(ApiPath.trades);

    expect(response.status).toBe(200);
    expect(tradeCollectionResponseSchema.parse(response.body)).toEqual({
      items: [],
      pagination: {
        page: 1,
        pageSize: DEFAULT_TRADE_PAGE_SIZE,
        totalItems: 0,
        pageCount: 0,
      },
    });
  });

  it('compresses large collection responses when the client accepts gzip', async () => {
    const tradeCache = new TradeCache();
    tradeCache.hydrate(
      Array.from({ length: 30 }, (_, index) => ({
        id: `trade-${index}`,
        symbol: 'AAPL',
        quantity: 100,
        price: 185.25,
        side: 'BUY' as const,
        trader: `Trader ${index}`,
        tradeTimestamp: '2026-10-14T12:00:00.000Z',
        status: 'ACTIVE' as const,
      })),
    );

    const response = await request(createTestApp(tradeCache))
      .get(ApiPath.trades)
      .set('Accept-Encoding', 'gzip');

    expect(response.status).toBe(200);
    expect(response.headers['content-encoding']).toBe('gzip');
    expect(tradeCollectionResponseSchema.parse(response.body).items).toHaveLength(30);
  });

  it('returns a generic error response for unexpected failures', async () => {
    const tradeCache = new FailingTradeCache();
    tradeCache.hydrate([]);
    const response = await request(createTestApp(tradeCache)).get(ApiPath.trades);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        reason: 'Internal server error',
        requestId: response.headers['x-request-id'],
      },
    });
    expect(response.text).not.toContain('Sensitive persistence detail');
  });

  it('creates a trade, updates the cache, and publishes the canonical created event', async () => {
    const tradeCache = new TradeCache();
    tradeCache.hydrate([]);
    const tradeEventPublisher = new TradeEventPublisher();
    const receivedEvents: Array<{ type: string; trade: Trade }> = [];
    tradeEventPublisher.subscribe((event) => receivedEvents.push(event));
    const createdTrade: Trade = {
      id: 'generated-id',
      symbol: 'AAPL',
      quantity: 100,
      price: 185.25,
      side: 'BUY',
      trader: 'Alex Morgan',
      tradeTimestamp: '2026-10-14T12:00:00.000Z',
      status: 'ACTIVE',
    };
    const createTrade = vi.fn<TradeRepositoryContract['create']>().mockResolvedValue(createdTrade);
    const tradeRepository: TradeRepositoryContract = {
      findAll: () => Promise.resolve([]),
      create: createTrade,
      amend: () => Promise.reject(new Error('Not used in create test')),
      cancel: () => Promise.reject(new Error('Not used in create test')),
    };

    const response = await request(createTestApp(tradeCache, tradeRepository, tradeEventPublisher))
      .post(ApiPath.trades)
      .send({
        symbol: ' AAPL ',
        quantity: 100,
        price: 185.25,
        side: 'BUY',
        trader: ' Alex Morgan ',
        tradeTimestamp: '2026-10-14T12:00:00.000Z',
        status: 'ACTIVE',
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: 'generated-id',
      symbol: 'AAPL',
      quantity: 100,
      price: 185.25,
      side: 'BUY',
      trader: 'Alex Morgan',
      tradeTimestamp: '2026-10-14T12:00:00.000Z',
      status: 'ACTIVE',
      book: null,
      counterparty: null,
    });
    expect(createTrade).toHaveBeenCalledWith({
      symbol: 'AAPL',
      quantity: 100,
      price: 185.25,
      side: 'BUY',
      trader: 'Alex Morgan',
      tradeTimestamp: '2026-10-14T12:00:00.000Z',
      status: 'ACTIVE',
    });
    expect(tradeCache.getAll()).toEqual([createdTrade]);
    expect(receivedEvents).toEqual([{ type: TradeEventType.CREATED, trade: createdTrade }]);
  });

  it('keeps a successful response when an event subscriber throws', async () => {
    const tradeCache = new TradeCache();
    tradeCache.hydrate([]);
    const tradeEventPublisher = new TradeEventPublisher();
    tradeEventPublisher.subscribe(() => {
      throw new Error('Disconnected event subscriber');
    });
    const createdTrade: Trade = {
      id: 'generated-id',
      symbol: 'AAPL',
      quantity: 100,
      price: 185.25,
      side: 'BUY',
      trader: 'Alex Morgan',
      tradeTimestamp: '2026-10-14T12:00:00.000Z',
      status: 'ACTIVE',
    };
    const tradeRepository: TradeRepositoryContract = {
      findAll: () => Promise.resolve([]),
      create: vi.fn<TradeRepositoryContract['create']>().mockResolvedValue(createdTrade),
      amend: () => Promise.reject(new Error('Not used in event failure test')),
      cancel: () => Promise.reject(new Error('Not used in event failure test')),
    };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      const response = await request(
        createTestApp(tradeCache, tradeRepository, tradeEventPublisher),
      )
        .post(ApiPath.trades)
        .send({
          symbol: 'AAPL',
          quantity: 100,
          price: 185.25,
          side: 'BUY',
          trader: 'Alex Morgan',
          tradeTimestamp: '2026-10-14T12:00:00.000Z',
          status: 'ACTIVE',
        });

      expect(response.status).toBe(201);
      expect(tradeCache.getAll()).toEqual([createdTrade]);
      expect(consoleError).toHaveBeenCalledOnce();
    } finally {
      consoleError.mockRestore();
    }
  });

  it('returns structured validation errors without persisting or publishing', async () => {
    const tradeCache = new TradeCache();
    tradeCache.hydrate([]);
    const tradeEventPublisher = new TradeEventPublisher();
    const receivedEvents: Array<{ type: string; trade: Trade }> = [];
    tradeEventPublisher.subscribe((event) => receivedEvents.push(event));
    const createTrade = vi.fn<TradeRepositoryContract['create']>();
    const tradeRepository: TradeRepositoryContract = {
      findAll: () => Promise.resolve([]),
      create: createTrade,
      amend: () => Promise.reject(new Error('Not used in validation test')),
      cancel: () => Promise.reject(new Error('Not used in validation test')),
    };

    const response = await request(createTestApp(tradeCache, tradeRepository, tradeEventPublisher))
      .post(ApiPath.trades)
      .send({ symbol: 'AAPL', quantity: 0 });
    const errorResponse = validationErrorSchema.parse(response.body);

    expect(response.status).toBe(400);
    expect(errorResponse.error).toMatchObject({
      code: 'VALIDATION_FAILED',
      reason: 'The provided payload failed data validation rules.',
    });
    expect(errorResponse.error.details.length).toBeGreaterThan(0);
    expect(createTrade).not.toHaveBeenCalled();
    expect(tradeCache.getAll()).toEqual([]);
    expect(receivedEvents).toEqual([]);
  });
});

describe('PATCH /api/v1/trades/:tradeId', () => {
  const activeTrade: Trade = {
    id: 'trade-1',
    symbol: 'AAPL',
    quantity: 100,
    price: 185.25,
    side: 'BUY',
    trader: 'Alex Morgan',
    tradeTimestamp: '2026-10-14T12:00:00.000Z',
    status: 'ACTIVE',
  };

  it('persists the amendment, updates cache, and publishes the saved trade', async () => {
    const tradeCache = new TradeCache();
    tradeCache.hydrate([activeTrade]);
    const tradeEventPublisher = new TradeEventPublisher();
    const receivedEvents: Array<{ type: string; trade: Trade }> = [];
    tradeEventPublisher.subscribe((event) => receivedEvents.push(event));
    const amendedTrade: Trade = { ...activeTrade, symbol: 'MSFT' };
    const amendTrade = vi.fn<TradeRepositoryContract['amend']>().mockResolvedValue(amendedTrade);
    const tradeRepository: TradeRepositoryContract = {
      findAll: () => Promise.resolve([]),
      create: () => Promise.reject(new Error('Not used in amend test')),
      amend: amendTrade,
      cancel: () => Promise.reject(new Error('Not used in amend test')),
    };

    const response = await request(createTestApp(tradeCache, tradeRepository, tradeEventPublisher))
      .patch(`${ApiPath.trades}/${activeTrade.id}`)
      .send({ symbol: 'MSFT' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ...amendedTrade, book: null, counterparty: null });
    expect(amendTrade).toHaveBeenCalledWith(activeTrade.id, { symbol: 'MSFT' });
    expect(tradeCache.getAll()).toEqual([amendedTrade]);
    expect(receivedEvents).toEqual([{ type: 'trade.amended', trade: amendedTrade }]);
  });

  it('cancels an active trade and publishes the canonical cancelled trade', async () => {
    const tradeCache = new TradeCache();
    tradeCache.hydrate([activeTrade]);
    const tradeEventPublisher = new TradeEventPublisher();
    const receivedEvents: Array<{ type: string; trade: Trade }> = [];
    tradeEventPublisher.subscribe((event) => receivedEvents.push(event));
    const cancelledTrade: Trade = { ...activeTrade, status: 'CANCELLED' };
    const cancelTrade = vi
      .fn<TradeRepositoryContract['cancel']>()
      .mockResolvedValueOnce({ trade: cancelledTrade, changed: true })
      .mockResolvedValueOnce({ trade: cancelledTrade, changed: false });
    const tradeRepository: TradeRepositoryContract = {
      findAll: () => Promise.resolve([]),
      create: () => Promise.reject(new Error('Not used in cancellation test')),
      amend: () => Promise.reject(new Error('Not used in cancellation test')),
      cancel: cancelTrade,
    };

    const response = await request(createTestApp(tradeCache, tradeRepository, tradeEventPublisher))
      .patch(`${ApiPath.trades}/${activeTrade.id}`)
      .send({ status: 'CANCELLED' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ...cancelledTrade, book: null, counterparty: null });
    const repeatedResponse = await request(
      createTestApp(tradeCache, tradeRepository, tradeEventPublisher),
    )
      .patch(`${ApiPath.trades}/${activeTrade.id}`)
      .send({ status: 'CANCELLED' });

    expect(repeatedResponse.status).toBe(200);
    expect(repeatedResponse.body).toMatchObject({
      ...cancelledTrade,
      book: null,
      counterparty: null,
    });
    expect(cancelTrade).toHaveBeenCalledTimes(2);
    expect(cancelTrade).toHaveBeenCalledWith(activeTrade.id);
    expect(tradeCache.getAll()).toEqual([cancelledTrade]);
    expect(receivedEvents).toEqual([{ type: 'trade.cancelled', trade: cancelledTrade }]);
  });

  it('rejects direct reactivation of a cancelled trade', async () => {
    const cancelledTrade: Trade = { ...activeTrade, status: 'CANCELLED' };
    const tradeCache = new TradeCache();
    tradeCache.hydrate([cancelledTrade]);
    const tradeEventPublisher = new TradeEventPublisher();
    const receivedEvents: Array<{ type: string; trade: Trade }> = [];
    tradeEventPublisher.subscribe((event) => receivedEvents.push(event));
    const amendTrade = vi.fn<TradeRepositoryContract['amend']>();
    const cancelTrade = vi.fn<TradeRepositoryContract['cancel']>();
    const tradeRepository: TradeRepositoryContract = {
      findAll: () => Promise.resolve([]),
      create: () => Promise.reject(new Error('Not used in direct reactivation test')),
      amend: amendTrade,
      cancel: cancelTrade,
    };

    const response = await request(createTestApp(tradeCache, tradeRepository, tradeEventPublisher))
      .patch(`${ApiPath.trades}/${cancelledTrade.id}`)
      .send({ status: 'ACTIVE' });

    expect(response.status).toBe(400);
    expect(amendTrade).not.toHaveBeenCalled();
    expect(cancelTrade).not.toHaveBeenCalled();
    expect(tradeCache.getAll()).toEqual([cancelledTrade]);
    expect(receivedEvents).toEqual([]);
  });

  it('returns validation errors without persisting or publishing', async () => {
    const tradeCache = new TradeCache();
    tradeCache.hydrate([activeTrade]);
    const tradeEventPublisher = new TradeEventPublisher();
    const receivedEvents: Array<{ type: string; trade: Trade }> = [];
    tradeEventPublisher.subscribe((event) => receivedEvents.push(event));
    const amendTrade = vi.fn<TradeRepositoryContract['amend']>();
    const tradeRepository: TradeRepositoryContract = {
      findAll: () => Promise.resolve([]),
      create: () => Promise.reject(new Error('Not used in amend test')),
      amend: amendTrade,
      cancel: () => Promise.reject(new Error('Not used in validation test')),
    };

    const response = await request(createTestApp(tradeCache, tradeRepository, tradeEventPublisher))
      .patch(`${ApiPath.trades}/${activeTrade.id}`)
      .send({ status: 'PENDING' });

    expect(response.status).toBe(400);
    expect(validationErrorSchema.parse(response.body).error.code).toBe('VALIDATION_FAILED');
    expect(amendTrade).not.toHaveBeenCalled();
    expect(receivedEvents).toEqual([]);
  });

  it('returns 404 when cancelling an unknown trade', async () => {
    const tradeCache = new TradeCache();
    tradeCache.hydrate([activeTrade]);
    const cancelTrade = vi
      .fn<TradeRepositoryContract['cancel']>()
      .mockRejectedValue(new TradeNotFoundError('missing-trade'));
    const tradeRepository: TradeRepositoryContract = {
      findAll: () => Promise.resolve([]),
      create: () => Promise.reject(new Error('Not used in cancellation test')),
      amend: () => Promise.reject(new Error('Not used in cancellation test')),
      cancel: cancelTrade,
    };

    const response = await request(createTestApp(tradeCache, tradeRepository))
      .patch(`${ApiPath.trades}/missing-trade`)
      .send({ status: 'CANCELLED' });

    expect(response.status).toBe(404);
    expect(tradeNotFoundErrorSchema.parse(response.body).error.code).toBe('TRADE_NOT_FOUND');
    expect(tradeCache.getAll()).toEqual([activeTrade]);
  });

  it.each([
    {
      error: new TradeNotFoundError('missing-trade'),
      status: 404,
      code: 'TRADE_NOT_FOUND',
    },
    {
      error: new TradeNotAmendableError('cancelled-trade'),
      status: 409,
      code: 'TRADE_NOT_AMENDABLE',
    },
  ])('maps $code repository failures to HTTP $status', async ({ error, status, code }) => {
    const tradeCache = new TradeCache();
    tradeCache.hydrate([activeTrade]);
    const amendTrade = vi.fn<TradeRepositoryContract['amend']>().mockRejectedValue(error);
    const tradeRepository: TradeRepositoryContract = {
      findAll: () => Promise.resolve([]),
      create: () => Promise.reject(new Error('Not used in amend test')),
      amend: amendTrade,
      cancel: () => Promise.reject(new Error('Not used in amend test')),
    };

    const response = await request(createTestApp(tradeCache, tradeRepository))
      .patch(`${ApiPath.trades}/${activeTrade.id}`)
      .send({ symbol: 'MSFT' });

    expect(response.status).toBe(status);
    const responseSchema =
      code === 'TRADE_NOT_FOUND' ? tradeNotFoundErrorSchema : tradeNotAmendableSchema;
    expect(responseSchema.parse(response.body).error.code).toBe(code);
    expect(tradeCache.getAll()).toEqual([activeTrade]);
  });
});
