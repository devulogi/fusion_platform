import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import {
  internalServerErrorSchema,
  tradeCollectionNotReadySchema,
  validationErrorSchema,
} from './api-errors.ts';
import { healthResponseSchema } from './features/health/controllers/health-controller.ts';
import {
  tradeCollectionResponseSchema,
  tradeResponseSchema,
} from './features/trades/serializers/trade-serializer.ts';
import { createTradeRequestSchema } from './features/trades/controllers/trade-controller.ts';
import { z } from './openapi/zod.ts';

export const ApiPath = {
  health: '/health',
  trades: '/api/v1/trades',
  tradeEvents: '/api/v1/events',
} as const;

const registry = new OpenAPIRegistry();

registry.registerPath({
  method: 'post',
  path: ApiPath.trades,
  summary: 'Create a trade',
  request: {
    body: {
      content: {
        'application/json': {
          schema: createTradeRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Trade created',
      content: {
        'application/json': {
          schema: tradeResponseSchema,
        },
      },
    },
    400: {
      description: 'Request validation failed',
      content: {
        'application/json': {
          schema: validationErrorSchema,
        },
      },
    },
    500: {
      description: 'Unexpected server error',
      content: {
        'application/json': {
          schema: internalServerErrorSchema,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: ApiPath.tradeEvents,
  summary: 'Subscribe to trade events',
  responses: {
    200: {
      description: 'Server-sent trade events',
      content: {
        'text/event-stream': {
          schema: z.string().openapi('TradeEventStream'),
        },
      },
    },
  },
});

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
    500: {
      description: 'Unexpected server error',
      content: {
        'application/json': {
          schema: internalServerErrorSchema,
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
    500: {
      description: 'Unexpected server error',
      content: {
        'application/json': {
          schema: internalServerErrorSchema,
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
