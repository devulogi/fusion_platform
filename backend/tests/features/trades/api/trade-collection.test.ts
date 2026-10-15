import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { validationErrorSchema } from '../../../../src/api-errors.ts';
import { createApp } from '../../../../src/app.ts';
import { ApiPath } from '../../../../src/api-contract.ts';
import { HealthController } from '../../../../src/features/health/controllers/health-controller.ts';
import { TradeController } from '../../../../src/features/trades/controllers/trade-controller.ts';
import { TradeCache } from '../../../../src/features/trades/trade-cache.ts';
import { tradeCollectionResponseSchema } from '../../../../src/features/trades/serializers/trade-serializer.ts';
import type { Trade } from '../../../../src/features/trades/models/trade.ts';
import {
  TradeEventPublisher,
  TradeEventType,
} from '../../../../src/features/trades/trade-event-publisher.ts';
import type { TradeRepositoryContract } from '../../../../src/features/trades/repositories/trade-repository.ts';
import { TradeEventsController } from '../../../../src/features/trades/controllers/trade-events-controller.ts';
import { TradeService } from '../../../../src/features/trades/services/trade-service.ts';

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
        message: 'Trade collection is not ready',
        details: [],
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
        tradeDate: '2026-10-14T12:00:00.000Z',
        status: 'ACTIVE',
      },
      {
        id: 'trade-2',
        symbol: 'MSFT',
        quantity: 50,
        price: 420.5,
        side: 'SELL',
        trader: 'Jamie Lee',
        tradeDate: '2026-10-14T13:00:00.000Z',
        status: 'CANCELLED',
      },
    ]);

    const response = await request(createTestApp(tradeCache)).get(ApiPath.trades);

    expect(response.status).toBe(200);
    expect(tradeCollectionResponseSchema.parse(response.body)).toEqual({
      items: [
        {
          id: 'trade-1',
          symbol: 'AAPL',
          quantity: 100,
          price: 185.25,
          side: 'BUY',
          trader: 'Alex Morgan',
          tradeDate: '2026-10-14T12:00:00.000Z',
          status: 'ACTIVE',
          book: null,
          counterparty: null,
        },
        {
          id: 'trade-2',
          symbol: 'MSFT',
          quantity: 50,
          price: 420.5,
          side: 'SELL',
          trader: 'Jamie Lee',
          tradeDate: '2026-10-14T13:00:00.000Z',
          status: 'CANCELLED',
          book: null,
          counterparty: null,
        },
      ],
      pagination: {
        totalItems: 2,
        currentPage: 1,
        totalPages: 1,
      },
    });
  });

  it('returns an empty collection when an empty database has been hydrated', async () => {
    const tradeCache = new TradeCache();
    tradeCache.hydrate([]);

    const response = await request(createTestApp(tradeCache)).get(ApiPath.trades);

    expect(response.status).toBe(200);
    expect(tradeCollectionResponseSchema.parse(response.body)).toEqual({
      items: [],
      pagination: {
        totalItems: 0,
        currentPage: 1,
        totalPages: 0,
      },
    });
  });

  it('returns a generic error response for unexpected failures', async () => {
    const response = await request(createTestApp(new FailingTradeCache())).get(ApiPath.trades);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
        details: [],
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
      tradeDate: '2026-10-14T12:00:00.000Z',
      status: 'ACTIVE',
    };
    const createTrade = vi.fn<TradeRepositoryContract['create']>().mockResolvedValue(createdTrade);
    const tradeRepository: TradeRepositoryContract = {
      findAll: () => Promise.resolve([]),
      create: createTrade,
    };

    const response = await request(createTestApp(tradeCache, tradeRepository, tradeEventPublisher))
      .post(ApiPath.trades)
      .send({
        symbol: ' AAPL ',
        quantity: 100,
        price: 185.25,
        side: 'BUY',
        trader: ' Alex Morgan ',
        tradeDate: '2026-10-14T12:00:00.000Z',
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
      tradeDate: '2026-10-14T12:00:00.000Z',
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
      tradeDate: '2026-10-14T12:00:00.000Z',
      status: 'ACTIVE',
    });
    expect(tradeCache.getAll()).toEqual([createdTrade]);
    expect(receivedEvents).toEqual([{ type: TradeEventType.CREATED, trade: createdTrade }]);
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
    };

    const response = await request(createTestApp(tradeCache, tradeRepository, tradeEventPublisher))
      .post(ApiPath.trades)
      .send({ symbol: 'AAPL', quantity: 0 });
    const errorResponse = validationErrorSchema.parse(response.body);

    expect(response.status).toBe(400);
    expect(errorResponse.error).toMatchObject({
      code: 'VALIDATION_FAILED',
      message: 'The provided payload failed data validation rules.',
    });
    expect(errorResponse.error.details.length).toBeGreaterThan(0);
    expect(createTrade).not.toHaveBeenCalled();
    expect(tradeCache.getAll()).toEqual([]);
    expect(receivedEvents).toEqual([]);
  });
});
