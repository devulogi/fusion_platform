import { z } from './openapi/zod.ts';

export const tradeCollectionNotReadyMessage = 'Trade collection is not ready';
export const tradeNotFoundMessage = 'Trade not found';
export const tradeNotAmendableMessage = 'Only active trades can be amended';
export const validationFailedMessage = 'The provided payload failed data validation rules.';
export const internalServerErrorMessage = 'Internal server error';

export class RouteNotFoundError extends Error {
  constructor() {
    super('Endpoint not found');
    this.name = 'RouteNotFoundError';
  }
}

export const apiErrorDetailSchema = z
  .object({
    field: z.string(),
    reason: z.string(),
  })
  .openapi('ApiErrorDetail');

export const tradeCollectionNotReadySchema = z
  .object({
    error: z.object({
      code: z.literal('TRADE_COLLECTION_NOT_READY'),
      reason: z.literal(tradeCollectionNotReadyMessage),
      requestId: z.string().uuid(),
    }),
  })
  .openapi('TradeCollectionNotReadyError');

export const tradeNotFoundSchema = z
  .object({
    error: z.object({
      code: z.literal('TRADE_NOT_FOUND'),
      reason: z.literal(tradeNotFoundMessage),
      requestId: z.string().uuid(),
    }),
  })
  .openapi('TradeNotFoundError');

export const tradeNotAmendableSchema = z
  .object({
    error: z.object({
      code: z.literal('TRADE_NOT_AMENDABLE'),
      reason: z.literal(tradeNotAmendableMessage),
      requestId: z.string().uuid(),
    }),
  })
  .openapi('TradeNotAmendableError');

export const validationErrorSchema = z
  .object({
    error: z.object({
      code: z.literal('VALIDATION_FAILED'),
      reason: z.literal(validationFailedMessage),
      requestId: z.string().uuid(),
      details: z.array(apiErrorDetailSchema),
    }),
  })
  .openapi('ValidationError');

export const internalServerErrorSchema = z
  .object({
    error: z.object({
      code: z.literal('INTERNAL_SERVER_ERROR'),
      reason: z.literal(internalServerErrorMessage),
      requestId: z.string().uuid(),
    }),
  })
  .openapi('InternalServerError');

export const routeNotFoundSchema = z
  .object({
    error: z.object({
      code: z.literal('ROUTE_NOT_FOUND'),
      reason: z.literal('Endpoint not found'),
      requestId: z.string().uuid(),
    }),
  })
  .openapi('RouteNotFoundError');
