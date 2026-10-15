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
import { ApiPath, HttpStatus } from './constants.ts';

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
    [HttpStatus.CREATED]: {
      description: 'Trade created',
      content: {
        'application/json': {
          schema: tradeResponseSchema,
        },
      },
    },
    [HttpStatus.BAD_REQUEST]: {
      description: 'Request validation failed',
      content: {
        'application/json': {
          schema: validationErrorSchema,
        },
      },
    },
    [HttpStatus.INTERNAL_SERVER_ERROR]: {
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
    [HttpStatus.OK]: {
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
    [HttpStatus.OK]: {
      description: 'Backend process is running',
      content: {
        'application/json': {
          schema: healthResponseSchema,
        },
      },
    },
    [HttpStatus.INTERNAL_SERVER_ERROR]: {
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
    [HttpStatus.OK]: {
      description: 'Complete trade collection',
      content: {
        'application/json': {
          schema: tradeCollectionResponseSchema,
        },
      },
    },
    [HttpStatus.SERVICE_UNAVAILABLE]: {
      description: 'Trade collection is not ready',
      content: {
        'application/json': {
          schema: tradeCollectionNotReadySchema,
        },
      },
    },
    [HttpStatus.INTERNAL_SERVER_ERROR]: {
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
