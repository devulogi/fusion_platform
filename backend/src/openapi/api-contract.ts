import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import {
  healthResponseSchema,
  internalServerErrorSchema,
  readinessResponseSchema,
  serviceNotReadySchema,
  tradeCollectionNotReadySchema,
  tradeCollectionQuerySchema,
  tradeCollectionResponseSchema,
  tradeEventStreamSchema,
  tradeIdParamsSchema,
  tradeMutationInputSchema,
  tradeNotAmendableSchema,
  tradeNotFoundErrorSchema,
  tradeResponseSchema,
  validationErrorSchema,
  createTradeInputSchema,
} from '../schemas.ts';
import {
  ApiPath,
  HttpStatus,
  requestIdHeader,
  requestIdResponseHeader,
  TRADE_STATUS,
  TradeEventType,
} from '../constants.ts';

const registry = new OpenAPIRegistry();

const tradeExample = tradeResponseSchema.parse({
  id: 'trade-example',
  symbol: 'AAPL',
  quantity: 100,
  price: 185.25,
  side: 'BUY',
  trader: 'Alex Morgan',
  tradeTimestamp: '2026-10-14T12:00:00.000Z',
  status: 'ACTIVE',
  book: null,
  counterparty: null,
});
const createdEventExample = `retry: 3000\n\nevent: ${TradeEventType.CREATED}\ndata: ${JSON.stringify(tradeExample)}\n\n`;
const amendedEventExample = `retry: 3000\n\nevent: ${TradeEventType.AMENDED}\ndata: ${JSON.stringify(tradeExample)}\n\n`;
const cancelledTradeExample = tradeResponseSchema.parse({
  ...tradeExample,
  status: TRADE_STATUS.CANCELLED,
});
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
            tradeTimestamp: tradeExample.tradeTimestamp,
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
  method: 'get',
  path: ApiPath.trades,
  operationId: 'listTrades',
  summary: 'List a page of trades',
  description:
    'Filters and sorts a defensive snapshot of the hydrated in-process trade cache before applying 1-based offset pagination. Symbol and trader use case-insensitive substring matching; side and status may be repeated; startDate and endDate are inclusive ISO instant bounds. The filtered total and page count are computed from the same cache snapshot. Sort fields are allow-listed and ID is always the deterministic tie-breaker. The cache is updated after writes made through this backend process; changes from external writers appear after cache rehydration.',
  request: {
    query: tradeCollectionQuerySchema,
  },
  responses: {
    [HttpStatus.OK]: {
      headers: { [requestIdHeader]: requestIdResponseHeader },
      description: 'Numbered page of filtered trades',
      content: {
        'application/json': {
          schema: tradeCollectionResponseSchema,
          example: {
            items: [tradeExample],
            pagination: { page: 1, pageSize: 100, totalItems: 1, pageCount: 1 },
          },
        },
      },
    },
    [HttpStatus.BAD_REQUEST]: {
      headers: { [requestIdHeader]: requestIdResponseHeader },
      description: 'Query validation failed',
      content: { 'application/json': { schema: validationErrorSchema } },
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
  operationId: 'amendOrCancelTrade',
  summary: 'Amend or cancel a trade',
  description:
    'Accepts editable amendment fields (excluding id and status) or the cancellation command { status: CANCELLED }. Each change is persisted before the cache is replaced and its typed event is published. Repeating cancellation returns the canonical trade without publishing a duplicate event. A cancelled trade cannot be returned to ACTIVE.',
  request: {
    params: tradeIdParamsSchema,
    body: {
      required: true,
      content: {
        'application/json': {
          schema: tradeMutationInputSchema,
        },
      },
    },
  },
  responses: {
    [HttpStatus.OK]: {
      headers: { [requestIdHeader]: requestIdResponseHeader },
      description: 'Canonical trade after amendment or cancellation',
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
      content: { 'application/json': { schema: tradeNotFoundErrorSchema } },
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
    'The frontend establishes the stream before fetching the initial collection, buffers events during each fetch, and applies them over the returned snapshot.',
    'EventSource reconnects automatically; after each reconnection, the frontend reloads GET /api/v1/trades to recover missed changes.',
    'Disconnecting removes the subscriber. Once streaming starts, failures cannot be returned as JSON error bodies.',
    'Swagger UI documents the stream but is not a live SSE event viewer; use EventSource or curl -N /api/v1/events on the backend origin.',
  ].join('\n\n'),
  responses: {
    [HttpStatus.OK]: {
      headers: { [requestIdHeader]: requestIdResponseHeader },
      description: 'Server-sent trade events',
      content: {
        'text/event-stream': {
          schema: tradeEventStreamSchema,
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
    'Basic process liveness only. Use GET /ready to verify database connectivity and initial cache hydration.',
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
  path: ApiPath.readiness,
  operationId: 'checkReadiness',
  summary: 'Check backend readiness',
  description:
    'Reports ready only when PostgreSQL is reachable and the initial trade cache hydration has completed. A 503 response means the backend should not receive dependent traffic yet.',
  responses: {
    [HttpStatus.OK]: {
      headers: { [requestIdHeader]: requestIdResponseHeader },
      description: 'Backend and trade cache are ready',
      content: {
        'application/json': {
          schema: readinessResponseSchema,
        },
      },
    },
    [HttpStatus.SERVICE_UNAVAILABLE]: {
      headers: { [requestIdHeader]: requestIdResponseHeader },
      description: 'Backend dependencies are not ready',
      content: {
        'application/json': {
          schema: serviceNotReadySchema,
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
      'Implemented backend routes only. Check readiness with GET /ready; create trades with POST /api/v1/trades; amend or cancel trades with PATCH /api/v1/trades/{tradeId}; retrieve the full snapshot with GET /api/v1/trades; and subscribe to trade.created, trade.amended, and trade.cancelled through GET /api/v1/events. X-Request-Id correlates each response with server logs.',
  },
  servers: [{ url: '/', description: 'The backend origin serving this document and Swagger UI' }],
});
