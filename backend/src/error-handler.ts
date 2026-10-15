import type { ErrorRequestHandler } from 'express';
import { TradeInputValidationError } from './features/trades/trade-input.ts';
import { TradeCacheNotHydratedError } from './features/trades/trade-cache.ts';
import {
  internalServerErrorMessage,
  internalServerErrorSchema,
  tradeCollectionNotReadyMessage,
  tradeCollectionNotReadySchema,
  validationErrorSchema,
  validationFailedMessage,
  RouteNotFoundError,
  routeNotFoundSchema,
} from './api-errors.ts';
import { HttpStatus } from './constants.ts';
import { defaultRequestLogger, getRequestId, type RequestLogger } from './request-context.ts';

export function createErrorHandler(
  logger: RequestLogger = defaultRequestLogger,
): ErrorRequestHandler {
  return (error: unknown, _request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    const requestId = getRequestId(response);
    if (error instanceof TradeCacheNotHydratedError) {
      const errorResponse = tradeCollectionNotReadySchema.parse({
        error: {
          code: 'TRADE_COLLECTION_NOT_READY',
          reason: tradeCollectionNotReadyMessage,
          requestId,
        },
      });
      response.status(HttpStatus.SERVICE_UNAVAILABLE).json(errorResponse);
    } else if (error instanceof TradeInputValidationError) {
      const errorResponse = validationErrorSchema.parse({
        error: {
          code: 'VALIDATION_FAILED',
          reason: validationFailedMessage,
          requestId,
          details: error.cause.issues.map((issue) => ({
            field: issue.path.map(String).join('.') || 'body',
            reason: issue.message,
          })),
        },
      });
      response.status(HttpStatus.BAD_REQUEST).json(errorResponse);
    } else if (
      error instanceof SyntaxError &&
      'type' in error &&
      error.type === 'entity.parse.failed'
    ) {
      response.status(HttpStatus.BAD_REQUEST).json(
        validationErrorSchema.parse({
          error: {
            code: 'VALIDATION_FAILED',
            reason: validationFailedMessage,
            requestId,
            details: [{ field: 'body', reason: 'Request body must be valid JSON.' }],
          },
        }),
      );
    } else if (error instanceof RouteNotFoundError) {
      response.status(HttpStatus.NOT_FOUND).json(
        routeNotFoundSchema.parse({
          error: {
            code: 'ROUTE_NOT_FOUND',
            reason: 'Endpoint not found',
            requestId,
          },
        }),
      );
    } else {
      logger.error({ requestId, error });
      const errorResponse = internalServerErrorSchema.parse({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          reason: internalServerErrorMessage,
          requestId,
        },
      });
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse);
    }
  };
}
