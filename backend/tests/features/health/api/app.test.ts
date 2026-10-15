import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../../../src/app.ts';
import { HealthController } from '../../../../src/features/health/controllers/health-controller.ts';
import { TradeController } from '../../../../src/features/trades/controllers/trade-controller.ts';
import { TradeCache } from '../../../../src/features/trades/trade-cache.ts';
import { healthResponseSchema } from '../../../../src/features/health/controllers/health-controller.ts';
import { TradeService } from '../../../../src/features/trades/services/trade-service.ts';

const app = createApp({
  healthController: new HealthController(),
  tradeController: new TradeController(new TradeService(new TradeCache())),
});

describe('GET /health', () => {
  it('returns an ok status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(healthResponseSchema.parse(response.body)).toEqual({ status: 'ok' });
  });
});
