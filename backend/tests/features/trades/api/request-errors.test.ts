import { Writable } from 'node:stream';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import pino from 'pino';
import { z } from 'zod';
import { createApp } from '../../../../src/app.ts';
import {
  internalServerErrorSchema,
  routeNotFoundSchema,
  validationErrorSchema,
} from '../../../../src/schemas.ts';
import { ApiPath } from '../../../../src/constants.ts';
import { HealthController } from '../../../../src/features/health/controllers/health-controller.ts';
import { TradeController } from '../../../../src/features/trades/controllers/trade-controller.ts';
import { TradeEventsController } from '../../../../src/features/trades/controllers/trade-events-controller.ts';
import type { TradeRepositoryContract } from '../../../../src/types.ts';
import { TradeService } from '../../../../src/features/trades/services/trade-service.ts';
import { TradeCache } from '../../../../src/features/trades/trade-cache.ts';
import { TradeEventPublisher } from '../../../../src/features/trades/trade-event-publisher.ts';

const requestLogSchema = z
  .object({
    requestId: z.string().uuid(),
    method: z.string(),
    route: z.string(),
    status: z.number(),
    durationMs: z.number().nonnegative(),
  })
  .passthrough();

const errorLogSchema = z
  .object({
    level: z.number(),
    requestId: z.string().uuid(),
    err: z.object({ message: z.string() }).passthrough(),
  })
  .passthrough();

function createLogCapture() {
  const records: unknown[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
      records.push(z.unknown().parse(JSON.parse(chunk.toString())));
      callback();
    },
  });

  return { logger: pino({ level: 'info' }, stream), records };
}

function getRequestLogs(records: readonly unknown[]) {
  return records.flatMap((record) => {
    const parsed = requestLogSchema.safeParse(record);
    return parsed.success ? [parsed.data] : [];
  });
}

function getErrorLogs(records: readonly unknown[]) {
  return records.flatMap((record) => {
    const parsed = errorLogSchema.safeParse(record);
    return parsed.success ? [parsed.data] : [];
  });
}

function getRequestLogAt(records: readonly unknown[], index = 0) {
  const log = getRequestLogs(records)[index];
  if (!log) throw new Error(`Missing request log at index ${index}`);
  return log;
}

function setup() {
  const cache = new TradeCache();
  cache.hydrate([]);
  const create = vi.fn<TradeRepositoryContract['create']>();
  const events = new TradeEventPublisher();
  const listener = vi.fn<Parameters<TradeEventPublisher['subscribe']>[0]>();
  events.subscribe(listener);
  const { logger, records } = createLogCapture();
  const app = createApp({
    healthController: new HealthController(),
    tradeController: new TradeController(
      new TradeService(
        cache,
        {
          findAll: () => Promise.resolve([]),
          create,
          amend: () => Promise.reject(new Error('Not used in request error tests')),
          cancel: () => Promise.reject(new Error('Not used in request error tests')),
        },
        events,
      ),
    ),
    tradeEventsController: new TradeEventsController(events),
    logger,
  });
  return { app, cache, create, listener, records };
}

describe('Request errors and traceability', () => {
  it('adds Helmet security headers to the app routes', async () => {
    const { app } = setup();
    const response = await request(app).get(ApiPath.health);

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['content-security-policy']).toContain(
      "script-src 'self' 'unsafe-inline'",
    );
    expect(response.headers['content-security-policy']).not.toContain('upgrade-insecure-requests');
  });

  it('traces the direct health route without exposing query values', async () => {
    const { app, records } = setup();
    const response = await request(app).get(`${ApiPath.health}?token=private`);

    expect(response.status).toBe(200);
    expect(getRequestLogAt(records)).toMatchObject({
      requestId: response.headers['x-request-id'],
      route: ApiPath.health,
      status: 200,
    });
    expect(JSON.stringify(records)).not.toContain('private');
  });

  it('generates distinct request IDs rather than trusting caller IDs', async () => {
    const { app, records } = setup();
    const first = await request(app).get(ApiPath.trades).set('X-Request-Id', 'untrusted');
    const second = await request(app).get(ApiPath.trades);
    const requestId = z.string().uuid().parse(first.headers['x-request-id']);

    expect(first.body).toEqual({ items: [] });
    expect(second.headers['x-request-id']).not.toBe(requestId);
    expect(getRequestLogAt(records)).toMatchObject({
      requestId,
      method: 'GET',
      route: ApiPath.trades,
      status: 200,
    });
    expect(getRequestLogAt(records).durationMs).toBeGreaterThanOrEqual(0);
  });

  it('returns field-level reasons with the same ID as the header and request log', async () => {
    const { app, create, listener, records } = setup();
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
    expect(getErrorLogs(records)).toHaveLength(0);
    expect(getRequestLogAt(records).requestId).toBe(body.error.requestId);
  });

  it('handles malformed JSON before controller execution without exposing the payload', async () => {
    const { app, create, records } = setup();
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
    expect(getRequestLogAt(records).route).toBe(ApiPath.trades);
    expect(JSON.stringify(records)).not.toContain('private');
    expect(response.text).not.toContain('secret');
    expect(create).not.toHaveBeenCalled();
    expect(getErrorLogs(records)).toHaveLength(0);
  });

  it('forwards asynchronous persistence failures once and stops cache/event updates', async () => {
    const { app, cache, create, listener, records } = setup();
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
    const errorLogs = getErrorLogs(records);
    expect(errorLogs).toHaveLength(1);
    expect(errorLogs[0]).toMatchObject({
      requestId: body.error.requestId,
      err: { message: cause.message },
    });
    expect(getRequestLogs(records)).toHaveLength(1);
  });

  it('returns a traced JSON error for unknown routes without logging raw URLs', async () => {
    const { app, records } = setup();
    const response = await request(app).get('/unknown/private-id?token=secret');
    const body = routeNotFoundSchema.parse(response.body);

    expect(response.status).toBe(404);
    expect(body.error.requestId).toBe(response.headers['x-request-id']);
    expect(getRequestLogAt(records).route).toBe('[unmatched]');
    expect(JSON.stringify(records)).not.toContain('private-id');
    expect(JSON.stringify(records)).not.toContain('secret');
  });

  it('does not misclassify invalid server output as a client validation failure', async () => {
    const { app, cache, records } = setup();
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
    expect(getErrorLogs(records)).toHaveLength(1);
    expect(response.text).not.toContain('quantity');
  });
});
