import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createApp } from '../../../../src/app.ts';
import {
  internalServerErrorSchema,
  routeNotFoundSchema,
  validationErrorSchema,
} from '../../../../src/api-errors.ts';
import { ApiPath } from '../../../../src/constants.ts';
import type { RequestLogger } from '../../../../src/request-context.ts';
import { HealthController } from '../../../../src/features/health/controllers/health-controller.ts';
import { TradeController } from '../../../../src/features/trades/controllers/trade-controller.ts';
import { TradeEventsController } from '../../../../src/features/trades/controllers/trade-events-controller.ts';
import type { TradeRepositoryContract } from '../../../../src/features/trades/repositories/trade-repository.ts';
import { TradeService } from '../../../../src/features/trades/services/trade-service.ts';
import { TradeCache } from '../../../../src/features/trades/trade-cache.ts';
import { TradeEventPublisher } from '../../../../src/features/trades/trade-event-publisher.ts';

function setup() {
  const cache = new TradeCache();
  cache.hydrate([]);
  const create = vi.fn<TradeRepositoryContract['create']>();
  const events = new TradeEventPublisher();
  const listener = vi.fn<Parameters<TradeEventPublisher['subscribe']>[0]>();
  events.subscribe(listener);
  const info = vi.fn<RequestLogger['info']>();
  const error = vi.fn<RequestLogger['error']>();
  const app = createApp({
    healthController: new HealthController(),
    tradeController: new TradeController(
      new TradeService(cache, { findAll: () => Promise.resolve([]), create }, events),
    ),
    tradeEventsController: new TradeEventsController(events),
    logger: { info, error },
  });
  return { app, cache, create, listener, info, error };
}

describe('Request errors and traceability', () => {
  it('generates distinct request IDs rather than trusting caller IDs', async () => {
    const { app, info } = setup();
    const first = await request(app).get(ApiPath.trades).set('X-Request-Id', 'untrusted');
    const second = await request(app).get(ApiPath.trades);
    const requestId = z.string().uuid().parse(first.headers['x-request-id']);

    expect(first.body).toEqual({ items: [] });
    expect(second.headers['x-request-id']).not.toBe(requestId);
    expect(info.mock.calls[0]?.[0]).toMatchObject({
      requestId,
      method: 'GET',
      route: ApiPath.trades,
      status: 200,
    });
    expect(info.mock.calls[0]?.[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it('returns field-level reasons with the same ID as the header and request log', async () => {
    const { app, create, listener, info, error } = setup();
    const response = await request(app).post(ApiPath.trades).send({ quantity: 0 });
    const body = validationErrorSchema.parse(response.body);

    expect(response.status).toBe(400);
    expect(body.error.requestId).toBe(response.headers['x-request-id']);
    expect(body.error.details).toContainEqual({
      field: 'quantity',
      reason: 'Number must be greater than 0',
    });
    expect(Object.keys(body.error)).toEqual(['code', 'reason', 'requestId', 'details']);
    expect(create).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(info.mock.calls[0]?.[0].requestId).toBe(body.error.requestId);
  });

  it('handles malformed JSON before controller execution without exposing the payload', async () => {
    const { app, create, info, error } = setup();
    const response = await request(app)
      .post(`${ApiPath.trades}?token=private`)
      .set('Content-Type', 'application/json')
      .send('{"secret":');
    const body = validationErrorSchema.parse(response.body);

    expect(response.status).toBe(400);
    expect(body.error.details).toEqual([
      { field: 'body', reason: 'Request body must be valid JSON.' },
    ]);
    expect(body.error.requestId).toBe(response.headers['x-request-id']);
    expect(info.mock.calls[0]?.[0].route).toBe(ApiPath.trades);
    expect(JSON.stringify(info.mock.calls)).not.toContain('private');
    expect(response.text).not.toContain('secret');
    expect(create).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('forwards asynchronous persistence failures once and stops cache/event updates', async () => {
    const { app, cache, create, listener, info, error } = setup();
    const cause = new Error('Sensitive database failure');
    create.mockRejectedValue(cause);
    const response = await request(app).post(ApiPath.trades).send({
      symbol: 'AAPL',
      quantity: 10,
      price: 12,
      side: 'BUY',
      trader: 'Alex',
      tradeDate: '2026-10-14T12:00:00.000Z',
      status: 'ACTIVE',
    });
    const body = internalServerErrorSchema.parse(response.body);

    expect(response.status).toBe(500);
    expect(body.error.requestId).toBe(response.headers['x-request-id']);
    expect(response.text).not.toContain(cause.message);
    expect(cache.getAll()).toEqual([]);
    expect(listener).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith({ requestId: body.error.requestId, error: cause });
    expect(info).toHaveBeenCalledTimes(1);
  });

  it('returns a traced JSON error for unknown routes without logging raw URLs', async () => {
    const { app, info } = setup();
    const response = await request(app).get('/unknown/private-id?token=secret');
    const body = routeNotFoundSchema.parse(response.body);

    expect(response.status).toBe(404);
    expect(body.error.requestId).toBe(response.headers['x-request-id']);
    expect(info.mock.calls[0]?.[0].route).toBe('[unmatched]');
    expect(JSON.stringify(info.mock.calls)).not.toContain('private-id');
    expect(JSON.stringify(info.mock.calls)).not.toContain('secret');
  });

  it('does not misclassify invalid server output as a client validation failure', async () => {
    const { app, cache, error } = setup();
    cache.hydrate([
      {
        id: 'bad-record',
        symbol: 'AAPL',
        quantity: -1,
        price: 12,
        side: 'BUY',
        trader: 'Alex',
        tradeDate: '2026-10-14T12:00:00.000Z',
        status: 'ACTIVE',
      },
    ]);
    const response = await request(app).get(ApiPath.trades);
    const body = internalServerErrorSchema.parse(response.body);

    expect(response.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(error).toHaveBeenCalledTimes(1);
    expect(response.text).not.toContain('quantity');
  });
});
