export const HttpStatus = {
  BAD_REQUEST: 400,
  CREATED: 201,
  OK: 200,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const ApiPath = {
  health: '/health',
  trades: '/api/v1/trades',
  tradeEvents: '/api/v1/events',
} as const;
