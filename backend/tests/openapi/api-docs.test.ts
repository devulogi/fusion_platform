import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { parseDocument } from 'yaml';
import { ApiPath } from '../../src/constants.ts';
import { createApp } from '../../src/app.ts';
import { HealthController } from '../../src/features/health/controllers/health-controller.ts';
import { TradeController } from '../../src/features/trades/controllers/trade-controller.ts';
import { TradeEventsController } from '../../src/features/trades/controllers/trade-events-controller.ts';
import { TradeCache } from '../../src/features/trades/trade-cache.ts';
import { TradeRepository } from '../../src/features/trades/repositories/trade-repository.ts';
import { TradeEventPublisher } from '../../src/features/trades/trade-event-publisher.ts';
import { TradeService } from '../../src/features/trades/services/trade-service.ts';

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
        },
      }),
      tradeEventPublisher,
    ),
  ),
  tradeEventsController: new TradeEventsController(tradeEventPublisher),
});

describe('API documentation', () => {
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
    expect(document.getIn(['paths', ApiPath.trades, 'get', 'responses', '200'])).toBeDefined();
    expect(document.getIn(['paths', ApiPath.trades, 'get', 'responses', '503'])).toBeDefined();
    expect(document.getIn(['paths', ApiPath.trades, 'get', 'responses', '500'])).toBeDefined();
    expect(document.getIn(['paths', ApiPath.trades, 'post', 'requestBody'])).toBeDefined();
    expect(document.getIn(['paths', ApiPath.trades, 'post', 'responses', '201'])).toBeDefined();
    expect(document.getIn(['paths', ApiPath.trades, 'post', 'requestBody'])).toBeDefined();
    expect(document.getIn(['paths', ApiPath.trades, 'post', 'responses', '201'])).toBeDefined();
    expect(document.getIn(['paths', ApiPath.trades, 'post', 'responses', '400'])).toBeDefined();
    expect(document.getIn(['paths', ApiPath.trades, 'post', 'responses', '503'])).toBeDefined();
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
