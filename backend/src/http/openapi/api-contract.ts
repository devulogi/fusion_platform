import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import {
  internalServerErrorSchema,
  tradeCollectionNotReadySchema,
  tradeNotAmendableSchema,
  tradeNotFoundSchema,
  validationErrorSchema,
} from '../api-errors.ts';
import { healthResponseSchema } from '../../features/health/controllers/health-controller.ts';
import {
  tradeCollectionResponseSchema,
  tradeResponseSchema,
} from '../../features/trades/serializers/trade-serializer.ts';
import {
  amendTradeInputSchema,
  cancelTradeInputSchema,
  createTradeInputSchema,
} from '../../features/trades/trade-input.ts';
import { requestIdHeader, requestIdResponseHeader } from '../request-context.ts';
import { z } from './zod.ts';
import { ApiPath, HttpStatus } from '../constants.ts';
import { TradeEventType } from '../../features/trades/trade-event-publisher.ts';

const registry = new OpenAPIRegistry();

const tradeExample = tradeResponseSchema.parse({
  id: 'trade-example',
  symbol: 'AAPL',
  quantity: 100,
  price: 185.25,
  side: 'BUY',
  trader: 'Alex Morgan',
  tradeDate: '2026-10-14T12:00:00.000Z',
  status: 'ACTIVE',
  book: null,
  counterparty: null,
});
const createdEventExample = `retry: 3000\n\nevent: ${TradeEventType.CREATED}\ndata: ${JSON.stringify(tradeExample)}\n\n`;
const amendedEventExample = `retry: 3000\n\nevent: ${TradeEventType.AMENDED}\ndata: ${JSON.stringify(tradeExample)}\n\n`;
const cancelledTradeExample = tradeResponseSchema.parse({ ...tradeExample, status: 'CANCELLED' });
const cancelledEventExample = `retry: 3000\n\nevent: ${TradeEventType.CANCELLED}\ndata: ${JSON.stringify(cancelledTradeExample)}\n\n`;
registry.register('TradeCreatedEventData', tradeResponseSchema);
registry.register('TradeAmendedEventData', tradeResponseSchema);
registry.register('TradeCancelledEventData', tradeResponseSchema);

registry.registerPath({
  method: 'post',
  path: ApiPath.trades,
  operationId: 'createTrade',
  summary: 'Create a trade',
  description:
    'Validates and persists a trade, updates the process-local cache, then publishes trade.created. Returns the canonical saved trade. Validation failures do not persist or emit events.',
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: createTradeInputSchema,
          example: {
            symbol: tradeExample.symbol,
            quantity: tradeExample.quantity,
            price: tradeExample.price,
            side: tradeExample.side,
            trader: tradeExample.trader,
            tradeDate: tradeExample.tradeDate,
            status: tradeExample.status,
          },
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
          example: tradeExample,
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
  method: 'patch',
  path: `${ApiPath.trades}/{tradeId}`,
  operationId: 'amendTrade',
  summary: 'Amend or cancel a trade',
  description:
    'Accepts either editable amendment fields (excluding id and status) or the cancellation command { status: CANCELLED }. Amendments and cancellations are persisted before the cache is replaced and their typed event is published. Cancelled trades cannot be amended. Repeated cancellation returns the canonical cancelled trade without publishing a duplicate event.',
  request: {
    params: z.object({ tradeId: z.string().min(1).max(32) }),
    body: {
      required: true,
      content: {
        'application/json': {
          schema: z.union([amendTradeInputSchema, cancelTradeInputSchema]),
        },
      },
    },
  },
  responses: {
    [HttpStatus.OK]: {
      headers: { [requestIdHeader]: requestIdResponseHeader },
      description: 'Canonical amended trade',
      content: {
        'application/json': {
          schema: tradeResponseSchema,
          example: tradeExample,
        },
      },
    },
    [HttpStatus.BAD_REQUEST]: {
      headers: { [requestIdHeader]: requestIdResponseHeader },
      description: 'Request validation failed',
      content: { 'application/json': { schema: validationErrorSchema } },
    },
    [HttpStatus.NOT_FOUND]: {
      headers: { [requestIdHeader]: requestIdResponseHeader },
      description: 'Trade not found',
      content: { 'application/json': { schema: tradeNotFoundSchema } },
    },
    [HttpStatus.CONFLICT]: {
      headers: { [requestIdHeader]: requestIdResponseHeader },
      description: 'Trade cannot be amended',
      content: { 'application/json': { schema: tradeNotAmendableSchema } },
    },
    [HttpStatus.SERVICE_UNAVAILABLE]: {
      headers: { [requestIdHeader]: requestIdResponseHeader },
      description: 'Trade collection is not ready',
      content: { 'application/json': { schema: tradeCollectionNotReadySchema } },
    },
    [HttpStatus.INTERNAL_SERVER_ERROR]: {
      headers: { [requestIdHeader]: requestIdResponseHeader },
      description: 'Unexpected server error',
      content: { 'application/json': { schema: internalServerErrorSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: ApiPath.tradeEvents,
  operationId: 'subscribeTradeEvents',
  summary: 'Subscribe to trade events',
  description: [
    'Long-lived text/event-stream connection. The implemented named events are trade.created, trade.amended, and trade.cancelled.',
    'Each data field contains one JSON Trade object (the TradeCreatedEventData, TradeAmendedEventData, or TradeCancelledEventData schema), not an event envelope or collection.',
    'The payload is the canonical saved trade after database persistence and cache update; nullable book and counterparty fields remain present.',
    'The server sends retry: 3000 on connection to suggest a 3000 millisecond EventSource reconnect delay.',
    'Events are process-local and not durable. No event IDs are sent; Last-Event-ID replay is not supported.',
    'After reconnect, clients must reload GET /api/v1/trades to recover missed changes.',
    'For a gap-free snapshot, clients should establish the stream first and reconcile events buffered during the collection fetch.',
    'Automatic client recovery and snapshot reconciliation are not implemented in the current frontend.',
    'Disconnecting removes the subscriber. Once streaming starts, failures cannot be returned as JSON error bodies.',
    'Swagger UI documents the stream but is not a live SSE event viewer; use EventSource or curl -N /api/v1/events on the backend origin.',
  ].join('\n\n'),
  responses: {
    [HttpStatus.OK]: {
      headers: { [requestIdHeader]: requestIdResponseHeader },
      description: 'Server-sent trade events',
      content: {
        'text/event-stream': {
          schema: z.string().openapi('TradeEventStream'),
          examples: {
            created: { value: createdEventExample },
            amended: { value: amendedEventExample },
            cancelled: { value: cancelledEventExample },
          },
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: ApiPath.health,
  operationId: 'checkLiveness',
  summary: 'Check backend liveness',
  description:
    'Basic process liveness only. This endpoint does not probe database connectivity or implement the proposed readiness check.',
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
  operationId: 'listTrades',
  summary: 'List all trades',
  description:
    'Returns the complete hydrated process-local collection as { items }, without pagination, counts, or per-request database reads. Sorting and filtering are client-side.',
  responses: {
    [HttpStatus.OK]: {
      headers: { [requestIdHeader]: requestIdResponseHeader },
      description: 'Complete trade collection',
      content: {
        'application/json': {
          schema: tradeCollectionResponseSchema,
          example: { items: [tradeExample] },
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
    description:
      'Implemented backend routes only. Create trades with POST /api/v1/trades, amend or cancel trades with PATCH /api/v1/trades/{tradeId}, retrieve the full snapshot with GET /api/v1/trades, and subscribe to trade.created, trade.amended, and trade.cancelled through GET /api/v1/events. Readiness remains proposed. X-Request-Id correlates each response with server logs.',
  },
  servers: [{ url: '/', description: 'The backend origin serving this document and Swagger UI' }],
});
