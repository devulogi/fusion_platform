import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../../src/app.ts';
import { HealthController } from '../../../../src/features/health/controllers/health-controller.ts';
import { TradeController } from '../../../../src/features/trades/controllers/trade-controller.ts';
import { TradeEventsController } from '../../../../src/features/trades/controllers/trade-events-controller.ts';
import { TradeCache } from '../../../../src/features/trades/trade-cache.ts';
import { healthResponseSchema } from '../../../../src/features/health/controllers/health-controller.ts';
import { TradeRepository } from '../../../../src/features/trades/repositories/trade-repository.ts';
import { TradeEventPublisher } from '../../../../src/features/trades/trade-event-publisher.ts';
import { TradeService } from '../../../../src/features/trades/services/trade-service.ts';

const tradeEventPublisher = new TradeEventPublisher();
const app = createApp({
  healthController: new HealthController(),
  tradeController: new TradeController(
    new TradeService(
      new TradeCache(),
      new TradeRepository({
        trade: {
          findMany: () => Promise.resolve([]),
          create: () => Promise.reject(new Error('Not used in health tests')),
          findUnique: () => Promise.resolve(null),
          update: () => Promise.reject(new Error('Not used in health tests')),
        },
      }),
      tradeEventPublisher,
    ),
  ),
  tradeEventsController: new TradeEventsController(tradeEventPublisher),
});

describe('GET /health', () => {
  it('returns an ok status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(healthResponseSchema.parse(response.body)).toEqual({ status: 'ok' });
  });
});
