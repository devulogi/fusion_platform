import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../../../../src/app.ts';
import { healthResponseSchema } from '../../../../src/features/health/controllers/health-controller.ts';

describe('GET /health', () => {
  it('returns an ok status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(healthResponseSchema.parse(response.body)).toEqual({ status: 'ok' });
  });
});
