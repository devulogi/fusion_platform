import type { ErrorRequestHandler, RequestHandler } from 'express';
import { TradeInputValidationError } from '../features/trades/trade-input.ts';
import { TradeCacheNotHydratedError } from '../features/trades/trade-cache.ts';
import {
  internalServerErrorMessage,
  internalServerErrorSchema,
  serviceNotReadyMessage,
  serviceNotReadySchema,
  tradeCollectionNotReadyMessage,
  tradeCollectionNotReadySchema,
  tradeNotAmendableMessage,
  tradeNotAmendableSchema,
  tradeNotFoundMessage,
  tradeNotFoundSchema,
  validationErrorSchema,
  validationFailedMessage,
  RouteNotFoundError,
  ServiceNotReadyError,
  routeNotFoundSchema,
} from './api-errors.ts';
import { HttpStatus } from './constants.ts';
import { defaultRequestLogger, getRequestId, type RequestLogger } from './request-context.ts';
import { TradeNotAmendableError, TradeNotFoundError } from '../features/trades/trade-errors.ts';

export const notFoundHandler: RequestHandler = (_request, _response, next) => {
  next(new RouteNotFoundError());
};

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
    } else if (error instanceof ServiceNotReadyError) {
      response.status(HttpStatus.SERVICE_UNAVAILABLE).json(
        serviceNotReadySchema.parse({
          error: {
            code: 'SERVICE_NOT_READY',
            reason: serviceNotReadyMessage,
            requestId,
          },
        }),
      );
    } else if (error instanceof TradeNotFoundError) {
      response.status(HttpStatus.NOT_FOUND).json(
        tradeNotFoundSchema.parse({
          error: {
            code: 'TRADE_NOT_FOUND',
            reason: tradeNotFoundMessage,
            requestId,
          },
        }),
      );
    } else if (error instanceof TradeNotAmendableError) {
      response.status(HttpStatus.CONFLICT).json(
        tradeNotAmendableSchema.parse({
          error: {
            code: 'TRADE_NOT_AMENDABLE',
            reason: tradeNotAmendableMessage,
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
