import type { ZodError } from 'zod';
import { ApiErrorCode, ApiErrorMessage, HttpStatus } from './constants.ts';
import {
  internalServerErrorSchema,
  routeNotFoundSchema,
  serviceNotReadySchema,
  tradeCollectionNotReadySchema,
  tradeNotAmendableSchema,
  tradeNotFoundErrorSchema,
  validationErrorSchema,
} from './schemas.ts';
import type { ApiErrorMapping } from './types.ts';

export class RouteNotFoundError extends Error {
  constructor() {
    super(ApiErrorMessage.ROUTE_NOT_FOUND);
    this.name = 'RouteNotFoundError';
  }
}

export class ServiceNotReadyError extends Error {
  constructor() {
    super(ApiErrorMessage.SERVICE_NOT_READY);
    this.name = 'ServiceNotReadyError';
  }
}

export class TradeNotFoundError extends Error {
  constructor(tradeId: string, options?: ErrorOptions) {
    super(`Trade ${tradeId} was not found`, options);
    this.name = 'TradeNotFoundError';
  }
}

export class TradeNotAmendableError extends Error {
  constructor(tradeId: string, options?: ErrorOptions) {
    super(`Trade ${tradeId} cannot be amended`, options);
    this.name = 'TradeNotAmendableError';
  }
}

export class TradeInputValidationError extends Error {
  constructor(readonly cause: ZodError) {
    super('Invalid trade input', { cause });
    this.name = 'TradeInputValidationError';
  }
}

export class TradeCacheNotHydratedError extends Error {
  constructor() {
    super('Trade cache has not been hydrated');
    this.name = 'TradeCacheNotHydratedError';
  }
}

export function mapApiError(error: unknown, requestId: string): ApiErrorMapping {
  if (error instanceof TradeCacheNotHydratedError) {
    return {
      status: HttpStatus.SERVICE_UNAVAILABLE,
      body: tradeCollectionNotReadySchema.parse({
        error: {
          code: ApiErrorCode.TRADE_COLLECTION_NOT_READY,
          reason: ApiErrorMessage.TRADE_COLLECTION_NOT_READY,
          requestId,
        },
      }),
      logUnexpected: false,
    };
  }

  if (error instanceof TradeInputValidationError) {
    return {
      status: HttpStatus.BAD_REQUEST,
      body: validationErrorSchema.parse({
        error: {
          code: ApiErrorCode.VALIDATION_FAILED,
          reason: ApiErrorMessage.VALIDATION_FAILED,
          requestId,
          details: error.cause.issues.map((issue) => ({
            field: issue.path.map(String).join('.') || 'body',
            reason: issue.message,
          })),
        },
      }),
      logUnexpected: false,
    };
  }

  if (isMalformedJsonError(error)) {
    return {
      status: HttpStatus.BAD_REQUEST,
      body: validationErrorSchema.parse({
        error: {
          code: ApiErrorCode.VALIDATION_FAILED,
          reason: ApiErrorMessage.VALIDATION_FAILED,
          requestId,
          details: [{ field: 'body', reason: 'Request body must be valid JSON.' }],
        },
      }),
      logUnexpected: false,
    };
  }

  if (error instanceof RouteNotFoundError) {
    return {
      status: HttpStatus.NOT_FOUND,
      body: routeNotFoundSchema.parse({
        error: {
          code: ApiErrorCode.ROUTE_NOT_FOUND,
          reason: ApiErrorMessage.ROUTE_NOT_FOUND,
          requestId,
        },
      }),
      logUnexpected: false,
    };
  }

  if (error instanceof ServiceNotReadyError) {
    return {
      status: HttpStatus.SERVICE_UNAVAILABLE,
      body: serviceNotReadySchema.parse({
        error: {
          code: ApiErrorCode.SERVICE_NOT_READY,
          reason: ApiErrorMessage.SERVICE_NOT_READY,
          requestId,
        },
      }),
      logUnexpected: false,
    };
  }

  if (error instanceof TradeNotFoundError) {
    return {
      status: HttpStatus.NOT_FOUND,
      body: tradeNotFoundErrorSchema.parse({
        error: {
          code: ApiErrorCode.TRADE_NOT_FOUND,
          reason: ApiErrorMessage.TRADE_NOT_FOUND,
          requestId,
        },
      }),
      logUnexpected: false,
    };
  }

  if (error instanceof TradeNotAmendableError) {
    return {
      status: HttpStatus.CONFLICT,
      body: tradeNotAmendableSchema.parse({
        error: {
          code: ApiErrorCode.TRADE_NOT_AMENDABLE,
          reason: ApiErrorMessage.TRADE_NOT_AMENDABLE,
          requestId,
        },
      }),
      logUnexpected: false,
    };
  }

  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    body: internalServerErrorSchema.parse({
      error: {
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        reason: ApiErrorMessage.INTERNAL_SERVER_ERROR,
        requestId,
      },
    }),
    logUnexpected: true,
  };
}

function isMalformedJsonError(error: unknown): error is SyntaxError & { type: string } {
  return error instanceof SyntaxError && 'type' in error && error.type === 'entity.parse.failed';
}
