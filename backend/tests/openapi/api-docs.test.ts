import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../../src/app.ts';

describe('API documentation', () => {
  it('serves Swagger UI from the backend', async () => {
    const response = await request(app).get('/api-docs/');

    expect(response.status).toBe(200);
    expect(response.type).toBe('text/html');
    expect(response.text).toContain('Swagger UI');
  });

  it('serves an OpenAPI document for each available API endpoint', async () => {
    const response = await request(app).get('/api-docs/openapi.yaml');

    expect(response.status).toBe(200);
    expect(response.type).toBe('application/yaml');
    expect(response.text).toContain('/health:');
    expect(response.text).toContain('/api/trades:');
  });
});
