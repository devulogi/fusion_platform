import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { TradeCacheNotHydratedError } from './features/trades/trade-cache.ts';
import {
  internalServerErrorMessage,
  internalServerErrorSchema,
  tradeCollectionNotReadyMessage,
  tradeCollectionNotReadySchema,
  validationErrorSchema,
  validationFailedMessage,
} from './api-errors.ts';
import { HttpStatus } from './constants.ts';

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof TradeCacheNotHydratedError) {
    const errorResponse = tradeCollectionNotReadySchema.parse({
      error: {
        code: 'TRADE_COLLECTION_NOT_READY',
        message: tradeCollectionNotReadyMessage,
        details: [],
      },
    });
    response.status(HttpStatus.SERVICE_UNAVAILABLE).json(errorResponse);
  } else if (error instanceof ZodError) {
    const errorResponse = validationErrorSchema.parse({
      error: {
        code: 'VALIDATION_FAILED',
        message: validationFailedMessage,
        details: error.issues.map((issue) => ({
          field: issue.path.map(String).join('.') || 'body',
          issue: issue.code,
          message: issue.message,
        })),
      },
    });
    response.status(HttpStatus.BAD_REQUEST).json(errorResponse);
  } else {
    console.error('Unhandled request error:', error);
    const errorResponse = internalServerErrorSchema.parse({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: internalServerErrorMessage,
        details: [],
      },
    });
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse);
  }
};
