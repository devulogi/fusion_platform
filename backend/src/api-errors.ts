import { z } from './openapi/zod.ts';

export const tradeCollectionNotReadyMessage = 'Trade collection is not ready';
export const validationFailedMessage = 'The provided payload failed data validation rules.';
export const internalServerErrorMessage = 'Internal server error';

export const apiErrorDetailSchema = z
  .object({
    field: z.string(),
    issue: z.string(),
    message: z.string(),
  })
  .openapi('ApiErrorDetail');

export const tradeCollectionNotReadySchema = z
  .object({
    error: z.object({
      code: z.literal('TRADE_COLLECTION_NOT_READY'),
      message: z.literal(tradeCollectionNotReadyMessage),
      details: z.array(apiErrorDetailSchema),
    }),
  })
  .openapi('TradeCollectionNotReadyError');

export const validationErrorSchema = z
  .object({
    error: z.object({
      code: z.literal('VALIDATION_FAILED'),
      message: z.literal(validationFailedMessage),
      details: z.array(apiErrorDetailSchema),
    }),
  })
  .openapi('ValidationError');

export const internalServerErrorSchema = z
  .object({
    error: z.object({
      code: z.literal('INTERNAL_SERVER_ERROR'),
      message: z.literal(internalServerErrorMessage),
      details: z.array(apiErrorDetailSchema),
    }),
  })
  .openapi('InternalServerError');
