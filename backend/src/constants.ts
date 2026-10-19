export const HttpStatus = {
  BAD_REQUEST: 400,
  CREATED: 201,
  OK: 200,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const DEFAULT_TRADE_PAGE_SIZE = 100;
export const MAX_TRADE_PAGE_SIZE = 500;
export const DEFAULT_TRADE_SORT_BY = 'tradeTimestamp';
export const DEFAULT_TRADE_SORT_DIRECTION = 'desc';
export const TRADE_SORT_FIELDS = [
  'tradeTimestamp',
  'symbol',
  'quantity',
  'price',
  'side',
  'trader',
  'status',
] as const;

export const ApiPath = {
  health: '/health',
  readiness: '/ready',
  trades: '/api/v1/trades',
  tradeEvents: '/api/v1/events',
  apiDocs: '/api-docs',
} as const;

export const TRADE_SIDE = {
  BUY: 'BUY',
  SELL: 'SELL',
} as const;

export const TRADE_STATUS = {
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
} as const;

export const TradeEventType = {
  CREATED: 'trade.created',
  AMENDED: 'trade.amended',
  CANCELLED: 'trade.cancelled',
} as const;

export const ApiErrorCode = {
  TRADE_COLLECTION_NOT_READY: 'TRADE_COLLECTION_NOT_READY',
  SERVICE_NOT_READY: 'SERVICE_NOT_READY',
  TRADE_NOT_FOUND: 'TRADE_NOT_FOUND',
  TRADE_NOT_AMENDABLE: 'TRADE_NOT_AMENDABLE',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
} as const;

export const ApiErrorMessage = {
  TRADE_COLLECTION_NOT_READY: 'Trade collection is not ready',
  TRADE_NOT_FOUND: 'Trade not found',
  TRADE_NOT_AMENDABLE: 'Only active trades can be amended',
  SERVICE_NOT_READY: 'Backend dependencies are not ready',
  VALIDATION_FAILED: 'The provided payload failed data validation rules.',
  INTERNAL_SERVER_ERROR: 'Internal server error',
  ROUTE_NOT_FOUND: 'Endpoint not found',
} as const;

export const requestIdHeader = 'X-Request-Id';
export const requestIdResponseHeader = {
  description: 'Server-generated identifier for correlating this request with server logs.',
  schema: { type: 'string' as const, format: 'uuid' },
};
