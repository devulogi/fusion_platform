import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../../src/app.ts';
import { TradeCache } from '../../../../src/features/trades/trade-cache.ts';
import { tradeCollectionResponseSchema } from '../../../../src/features/trades/serializers/trade-serializer.ts';

describe('GET /api/trades', () => {
  it('does not serve a collection before cache hydration', async () => {
    const response = await request(createApp(new TradeCache())).get('/api/trades');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: 'Trade collection is not ready',
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

    const response = await request(createApp(tradeCache)).get('/api/trades');

    expect(response.status).toBe(200);
    expect(tradeCollectionResponseSchema.parse(response.body)).toEqual([
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
  });

  it('returns an empty collection when an empty database has been hydrated', async () => {
    const tradeCache = new TradeCache();
    tradeCache.hydrate([]);

    const response = await request(createApp(tradeCache)).get('/api/trades');

    expect(response.status).toBe(200);
    expect(tradeCollectionResponseSchema.parse(response.body)).toEqual([]);
  });
});
