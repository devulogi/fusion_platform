import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { healthResponseSchema } from './features/health/controllers/health-controller.ts';
import { tradeCollectionNotReadySchema } from './features/trades/controllers/trade-controller.ts';
import { tradeCollectionResponseSchema } from './features/trades/serializers/trade-serializer.ts';

export const ApiPath = {
  health: '/health',
  trades: '/api/trades',
} as const;

const registry = new OpenAPIRegistry();

registry.registerPath({
  method: 'get',
  path: ApiPath.health,
  summary: 'Check backend liveness',
  responses: {
    200: {
      description: 'Backend process is running',
      content: {
        'application/json': {
          schema: healthResponseSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: ApiPath.trades,
  summary: 'List all trades',
  responses: {
    200: {
      description: 'Complete trade collection',
      content: {
        'application/json': {
          schema: tradeCollectionResponseSchema,
        },
      },
    },
    503: {
      description: 'Trade collection is not ready',
      content: {
        'application/json': {
          schema: tradeCollectionNotReadySchema,
        },
      },
    },
  },
});

export const openApiDocument = new OpenApiGeneratorV31(registry.definitions).generateDocument({
  openapi: '3.1.0',
  info: {
    title: 'Fusion Platform Backend API',
    version: '1.0.0',
  },
});
