import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import {
  internalServerErrorSchema,
  tradeCollectionNotReadySchema,
  validationErrorSchema,
} from '../api-errors.ts';
import { healthResponseSchema } from '../../features/health/controllers/health-controller.ts';
import {
  tradeCollectionResponseSchema,
  tradeResponseSchema,
} from '../../features/trades/serializers/trade-serializer.ts';
import { createTradeInputSchema } from '../../features/trades/trade-input.ts';
import { requestIdHeader, requestIdResponseHeader } from '../request-context.ts';
import { z } from './zod.ts';
import { ApiPath, HttpStatus } from '../constants.ts';

const registry = new OpenAPIRegistry();

registry.registerPath({
  method: 'post',
  path: ApiPath.trades,
  summary: 'Create a trade',
  request: {
    body: {
      content: {
        'application/json': {
          schema: createTradeInputSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatus.CREATED]: {
      headers: { [requestIdHeader]: requestIdResponseHeader },
      description: 'Trade created',
      content: {
        'application/json': {
          schema: tradeResponseSchema,
        },
      },
    },
    [HttpStatus.BAD_REQUEST]: {
      headers: { [requestIdHeader]: requestIdResponseHeader },
      description: 'Request validation failed',
      content: {
        'application/json': {
          schema: validationErrorSchema,
        },
      },
    },
    [HttpStatus.SERVICE_UNAVAILABLE]: {
      headers: { [requestIdHeader]: requestIdResponseHeader },
      description: 'Trade collection is not ready',
      content: {
        'application/json': {
          schema: tradeCollectionNotReadySchema,
        },
      },
    },
    [HttpStatus.INTERNAL_SERVER_ERROR]: {
      headers: { [requestIdHeader]: requestIdResponseHeader },
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
      headers: { [requestIdHeader]: requestIdResponseHeader },
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
      headers: { [requestIdHeader]: requestIdResponseHeader },
      description: 'Backend process is running',
      content: {
        'application/json': {
          schema: healthResponseSchema,
        },
      },
    },
    [HttpStatus.INTERNAL_SERVER_ERROR]: {
      headers: { [requestIdHeader]: requestIdResponseHeader },
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
      headers: { [requestIdHeader]: requestIdResponseHeader },
      description: 'Complete trade collection',
      content: {
        'application/json': {
          schema: tradeCollectionResponseSchema,
        },
      },
    },
    [HttpStatus.SERVICE_UNAVAILABLE]: {
      headers: { [requestIdHeader]: requestIdResponseHeader },
      description: 'Trade collection is not ready',
      content: {
        'application/json': {
          schema: tradeCollectionNotReadySchema,
        },
      },
    },
    [HttpStatus.INTERNAL_SERVER_ERROR]: {
      headers: { [requestIdHeader]: requestIdResponseHeader },
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
