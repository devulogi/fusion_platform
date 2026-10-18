import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { parseDocument } from 'yaml';
import { ApiPath } from '../../src/http/constants.ts';
import { createApp } from '../../src/app.ts';
import { HealthController } from '../../src/features/health/controllers/health-controller.ts';
import { TradeController } from '../../src/features/trades/controllers/trade-controller.ts';
import { TradeEventsController } from '../../src/features/trades/controllers/trade-events-controller.ts';
import { TradeCache } from '../../src/features/trades/trade-cache.ts';
import { TradeRepository } from '../../src/features/trades/repositories/trade-repository.ts';
import { TradeEventPublisher } from '../../src/features/trades/trade-event-publisher.ts';
import { TradeService } from '../../src/features/trades/services/trade-service.ts';
import { tradeResponseSchema } from '../../src/features/trades/serializers/trade-serializer.ts';
import { z } from 'zod';

const tradeEventPublisher = new TradeEventPublisher();
const app = createApp({
  healthController: new HealthController(),
  tradeController: new TradeController(
    new TradeService(
      new TradeCache(),
      new TradeRepository({
        trade: {
          findMany: () => Promise.resolve([]),
          create: () => Promise.reject(new Error('Not used in API docs tests')),
          findUnique: () => Promise.resolve(null),
          update: () => Promise.reject(new Error('Not used in API docs tests')),
        },
      }),
      tradeEventPublisher,
    ),
  ),
  tradeEventsController: new TradeEventsController(tradeEventPublisher),
});

describe('API documentation', () => {
  it('redirects the documented entry point to Swagger UI and serves its assets', async () => {
    const redirect = await request(app).get('/api-docs');
    expect(redirect.status).toBe(301);
    expect(redirect.headers.location).toBe('/api-docs/');

    const script = await request(app).get('/api-docs/swagger-ui-init.js');
    expect(script.status).toBe(200);
    expect(script.text).toContain('/api-docs/openapi.yaml');
    const stylesheet = await request(app).get('/api-docs/swagger-ui.css');
    expect(stylesheet.status).toBe(200);
    expect(stylesheet.type).toBe('text/css');
  });

  it('documents only implemented routes and explains the live event contract', async () => {
    const response = await request(app).get('/api-docs/openapi.yaml');
    const document = parseDocument(response.text);
    const { paths } = z.object({ paths: z.record(z.unknown()) }).parse(document.toJS());
    expect(Object.keys(paths).sort()).toEqual(
      [
        ApiPath.health,
        ApiPath.readiness,
        ApiPath.trades,
        ApiPath.tradeEvents,
        `${ApiPath.trades}/{tradeId}`,
      ].sort(),
    );
    expect(document.toJS()).toMatchObject({
      servers: [{ url: '/' }],
      paths: {
        [ApiPath.trades]: {
          get: { operationId: 'listTrades' },
          post: { operationId: 'createTrade' },
        },
        [`${ApiPath.trades}/{tradeId}`]: {
          get: { operationId: 'getTradeById' },
          patch: { operationId: 'amendCancelOrReactivateTrade' },
        },
        [ApiPath.health]: { get: { operationId: 'checkLiveness' } },
        [ApiPath.readiness]: { get: { operationId: 'checkReadiness' } },
        [ApiPath.tradeEvents]: { get: { operationId: 'subscribeTradeEvents' } },
      },
    });

    const description = z
      .string()
      .parse(document.getIn(['paths', ApiPath.tradeEvents, 'get', 'description']));
    expect(description).toContain('trade.created');
    expect(description).toContain('trade.amended');
    expect(description).toContain('trade.cancelled');
    expect(description).toContain('trade.reactivated');
    expect(description).toContain('Last-Event-ID');
    expect(description).toContain('buffers events during each fetch');
    expect(description).toContain('after each reconnection');
    expect(description).toContain('3000');
    expect(description).toContain('GET /api/v1/trades');
    const example = z
      .string()
      .parse(
        document.getIn([
          'paths',
          ApiPath.tradeEvents,
          'get',
          'responses',
          '200',
          'content',
          'text/event-stream',
          'examples',
          'created',
          'value',
        ]),
      );
    expect(example).toMatch(/^retry: 3000\n\nevent: trade.created\ndata: /);
    const data = example.split('\n').find((line) => line.startsWith('data: '));
    if (data === undefined) throw new Error('Missing event data example');
    const payload: unknown = JSON.parse(data.slice('data: '.length));
    expect(tradeResponseSchema.parse(payload)).toMatchObject({ book: null, counterparty: null });
    const cancelledExample = z
      .string()
      .parse(
        document.getIn([
          'paths',
          ApiPath.tradeEvents,
          'get',
          'responses',
          '200',
          'content',
          'text/event-stream',
          'examples',
          'cancelled',
          'value',
        ]),
      );
    expect(cancelledExample).toMatch(/^retry: 3000\n\nevent: trade.cancelled\ndata: /);
    const openApiDocument = z
      .object({ components: z.object({ schemas: z.record(z.unknown()) }) })
      .parse(document.toJS());
    const cancelRequestSchema = z
      .object({
        properties: z.object({
          status: z.object({ enum: z.array(z.string()) }),
        }),
      })
      .parse(openApiDocument.components.schemas.CancelTradeRequest);
    expect(cancelRequestSchema.properties.status.enum).toContain('CANCELLED');
    const reactivateRequestSchema = z
      .object({
        properties: z.object({
          status: z.object({ enum: z.array(z.string()) }),
        }),
      })
      .parse(openApiDocument.components.schemas.ReactivateTradeRequest);
    expect(reactivateRequestSchema.properties.status.enum).toContain('ACTIVE');
    const reactivatedExample = z
      .string()
      .parse(
        document.getIn([
          'paths',
          ApiPath.tradeEvents,
          'get',
          'responses',
          '200',
          'content',
          'text/event-stream',
          'examples',
          'reactivated',
          'value',
        ]),
      );
    expect(reactivatedExample).toMatch(/^retry: 3000\n\nevent: trade.reactivated\ndata: /);
  });

  it('serves Swagger UI from the backend', async () => {
    const response = await request(app).get('/api-docs/');

    expect(response.status).toBe(200);
    expect(response.type).toBe('text/html');
    expect(response.text).toContain('Swagger UI');
  });

  it('serves an OpenAPI document for each available API endpoint', async () => {
    const response = await request(app).get('/api-docs/openapi.yaml');
    const document = parseDocument(response.text);

    expect(response.status).toBe(200);
    expect(response.type).toBe('application/yaml');
    expect(document.errors).toEqual([]);
    expect(document.getIn(['openapi'])).toBe('3.1.0');
    expect(document.getIn(['paths', '/health', 'get', 'responses', '200'])).toBeDefined();
    expect(document.getIn(['paths', '/health', 'get', 'responses', '500'])).toBeDefined();
    expect(document.getIn(['paths', ApiPath.readiness, 'get', 'responses', '200'])).toBeDefined();
    expect(document.getIn(['paths', ApiPath.readiness, 'get', 'responses', '503'])).toBeDefined();
    expect(document.getIn(['paths', ApiPath.readiness, 'get', 'responses', '500'])).toBeDefined();
    expect(document.getIn(['paths', ApiPath.trades, 'get', 'responses', '200'])).toBeDefined();
    expect(document.getIn(['paths', ApiPath.trades, 'get', 'responses', '503'])).toBeDefined();
    expect(document.getIn(['paths', ApiPath.trades, 'get', 'responses', '500'])).toBeDefined();
    expect(
      document.getIn(['paths', `${ApiPath.trades}/{tradeId}`, 'get', 'parameters']),
    ).toBeDefined();
    expect(
      document.getIn(['paths', `${ApiPath.trades}/{tradeId}`, 'get', 'responses', '200']),
    ).toBeDefined();
    expect(
      document.getIn(['paths', `${ApiPath.trades}/{tradeId}`, 'get', 'responses', '400']),
    ).toBeDefined();
    expect(
      document.getIn(['paths', `${ApiPath.trades}/{tradeId}`, 'get', 'responses', '404']),
    ).toBeDefined();
    expect(document.getIn(['paths', ApiPath.trades, 'post', 'requestBody'])).toBeDefined();
    expect(document.getIn(['paths', ApiPath.trades, 'post', 'responses', '201'])).toBeDefined();
    expect(document.getIn(['paths', ApiPath.trades, 'post', 'requestBody'])).toBeDefined();
    expect(document.getIn(['paths', ApiPath.trades, 'post', 'responses', '201'])).toBeDefined();
    expect(document.getIn(['paths', ApiPath.trades, 'post', 'responses', '400'])).toBeDefined();
    expect(document.getIn(['paths', ApiPath.trades, 'post', 'responses', '503'])).toBeDefined();
    expect(document.getIn(['paths', ApiPath.trades, 'post', 'responses', '500'])).toBeDefined();
    expect(
      document.getIn(['paths', `${ApiPath.trades}/{tradeId}`, 'patch', 'requestBody']),
    ).toBeDefined();
    expect(
      document.getIn(['paths', `${ApiPath.trades}/{tradeId}`, 'patch', 'responses', '200']),
    ).toBeDefined();
    expect(
      document.getIn(['paths', `${ApiPath.trades}/{tradeId}`, 'patch', 'responses', '400']),
    ).toBeDefined();
    expect(
      document.getIn(['paths', `${ApiPath.trades}/{tradeId}`, 'patch', 'responses', '404']),
    ).toBeDefined();
    expect(
      document.getIn(['paths', `${ApiPath.trades}/{tradeId}`, 'patch', 'responses', '409']),
    ).toBeDefined();
    expect(
      document.getIn([
        'paths',
        ApiPath.tradeEvents,
        'get',
        'responses',
        '200',
        'content',
        'text/event-stream',
      ]),
    ).toBeDefined();
    expect(document.getIn(['paths', ApiPath.trades, 'post', 'responses', '400'])).toBeDefined();
    expect(document.getIn(['paths', ApiPath.trades, 'post', 'responses', '500'])).toBeDefined();
    expect(
      document.getIn([
        'paths',
        ApiPath.tradeEvents,
        'get',
        'responses',
        '200',
        'content',
        'text/event-stream',
      ]),
    ).toBeDefined();
    expect(document.getIn(['components', 'schemas', 'Trade'])).toBeDefined();
    expect(document.toJS()).toMatchObject({
      components: {
        schemas: {
          TradeCollectionResponse: { required: ['items'] },
        },
      },
    });
    expect(
      document.getIn([
        'components',
        'schemas',
        'TradeCollectionResponse',
        'properties',
        'pagination',
      ]),
    ).toBeUndefined();
    expect(
      document.getIn([
        'components',
        'schemas',
        'ValidationError',
        'properties',
        'error',
        'properties',
        'reason',
      ]),
    ).toBeDefined();
    expect(
      document.getIn([
        'components',
        'schemas',
        'ValidationError',
        'properties',
        'error',
        'properties',
        'message',
      ]),
    ).toBeUndefined();
    expect(
      document.getIn([
        'paths',
        ApiPath.trades,
        'post',
        'responses',
        '201',
        'headers',
        'X-Request-Id',
      ]),
    ).toBeDefined();
  });
});
