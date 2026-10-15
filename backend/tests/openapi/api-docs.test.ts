import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { parseDocument } from 'yaml';
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
    const document = parseDocument(response.text);

    expect(response.status).toBe(200);
    expect(response.type).toBe('application/yaml');
    expect(document.errors).toEqual([]);
    expect(document.getIn(['openapi'])).toBe('3.1.0');
    expect(document.getIn(['paths', '/health', 'get', 'responses', '200'])).toBeDefined();
    expect(document.getIn(['paths', '/api/trades', 'get', 'responses', '200'])).toBeDefined();
    expect(document.getIn(['paths', '/api/trades', 'get', 'responses', '503'])).toBeDefined();
    expect(document.getIn(['components', 'schemas', 'Trade'])).toBeDefined();
  });
});
