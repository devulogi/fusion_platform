import { z } from './openapi/zod.ts';
import {
  ApiErrorCode,
  ApiErrorMessage,
  DEFAULT_TRADE_SORT_BY,
  DEFAULT_TRADE_SORT_DIRECTION,
  DEFAULT_TRADE_PAGE_SIZE,
  MAX_TRADE_PAGE_SIZE,
  TRADE_SIDE,
  TRADE_SORT_FIELDS,
  TRADE_STATUS,
} from './constants.ts';

export const createTradeInputSchema = z
  .object({
    symbol: z.string().trim().min(1).max(16),
    quantity: z.number().int().positive(),
    price: z.number().finite().positive(),
    side: z.enum([TRADE_SIDE.BUY, TRADE_SIDE.SELL]),
    trader: z.string().trim().min(1).max(32),
    tradeTimestamp: z.string().datetime(),
    status: z.enum([TRADE_STATUS.ACTIVE, TRADE_STATUS.CANCELLED]),
    book: z.string().max(64).nullable().optional(),
    counterparty: z.string().max(120).nullable().optional(),
  })
  .strict()
  .openapi('CreateTradeRequest');

export const amendTradeInputSchema = createTradeInputSchema
  .omit({ status: true })
  .partial()
  .strict()
  .openapi('AmendTradeRequest');

export const cancelTradeInputSchema = z
  .object({ status: z.literal(TRADE_STATUS.CANCELLED) })
  .strict()
  .openapi('CancelTradeRequest');

export const tradeIdSchema = z.string().min(1).max(32);
export const tradeIdParamsSchema = z.object({ tradeId: tradeIdSchema });
export const tradeMutationInputSchema = z.union([amendTradeInputSchema, cancelTradeInputSchema]);

export const tradeResponseSchema = z
  .object({
    id: z.string(),
    symbol: z.string(),
    quantity: z.number().int().min(1),
    price: z.number().positive(),
    side: z.enum([TRADE_SIDE.BUY, TRADE_SIDE.SELL]),
    trader: z.string(),
    tradeTimestamp: z.string().datetime(),
    status: z.enum([TRADE_STATUS.ACTIVE, TRADE_STATUS.CANCELLED]),
    book: z.string().nullable(),
    counterparty: z.string().nullable(),
  })
  .openapi('Trade');

export const tradeCollectionResponseSchema = z
  .object({
    items: z.array(tradeResponseSchema),
    pagination: z
      .object({
        page: z.number().int().positive(),
        pageSize: z.number().int().positive().max(MAX_TRADE_PAGE_SIZE),
        totalItems: z.number().int().nonnegative(),
        pageCount: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict()
  .openapi('TradeCollectionResponse');

const sideQuerySchema = z
  .union([
    z.enum([TRADE_SIDE.BUY, TRADE_SIDE.SELL]),
    z.array(z.enum([TRADE_SIDE.BUY, TRADE_SIDE.SELL])).min(1),
  ])
  .transform((value) => (typeof value === 'string' ? [value] : value));
const statusQuerySchema = z
  .union([
    z.enum([TRADE_STATUS.ACTIVE, TRADE_STATUS.CANCELLED]),
    z.array(z.enum([TRADE_STATUS.ACTIVE, TRADE_STATUS.CANCELLED])).min(1),
  ])
  .transform((value) => (typeof value === 'string' ? [value] : value));

export const tradeCollectionQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(Number.MAX_SAFE_INTEGER).default(1),
    pageSize: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_TRADE_PAGE_SIZE)
      .default(DEFAULT_TRADE_PAGE_SIZE),
    sortBy: z.enum(TRADE_SORT_FIELDS).default(DEFAULT_TRADE_SORT_BY),
    sortDirection: z.enum(['asc', 'desc']).default(DEFAULT_TRADE_SORT_DIRECTION),
    symbol: z.string().trim().min(1).max(16).optional(),
    trader: z.string().trim().min(1).max(32).optional(),
    side: sideQuerySchema.optional(),
    status: statusQuerySchema.optional(),
    startDate: z.string().datetime({ offset: true }).optional(),
    endDate: z.string().datetime({ offset: true }).optional(),
  })
  .strict()
  .superRefine((query, context) => {
    if (!Number.isSafeInteger((query.page - 1) * query.pageSize)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['page'],
        message: 'Page is too large.',
      });
    }
    if (
      query.startDate !== undefined &&
      query.endDate !== undefined &&
      Date.parse(query.startDate) > Date.parse(query.endDate)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date must be on or after start date.',
      });
    }
  })
  .openapi('TradeCollectionQuery');

export const healthResponseSchema = z.object({ status: z.literal('ok') }).openapi('HealthResponse');

export const readinessResponseSchema = z
  .object({ status: z.literal('ready') })
  .openapi('ReadinessResponse');

export const apiErrorDetailSchema = z
  .object({ field: z.string(), reason: z.string() })
  .openapi('ApiErrorDetail');

export const tradeCollectionNotReadySchema = z
  .object({
    error: z.object({
      code: z.literal(ApiErrorCode.TRADE_COLLECTION_NOT_READY),
      reason: z.literal(ApiErrorMessage.TRADE_COLLECTION_NOT_READY),
      requestId: z.string().uuid(),
    }),
  })
  .openapi('TradeCollectionNotReadyError');

export const serviceNotReadySchema = z
  .object({
    error: z.object({
      code: z.literal(ApiErrorCode.SERVICE_NOT_READY),
      reason: z.literal(ApiErrorMessage.SERVICE_NOT_READY),
      requestId: z.string().uuid(),
    }),
  })
  .openapi('ServiceNotReadyError');

export const tradeNotFoundErrorSchema = z
  .object({
    error: z.object({
      code: z.literal(ApiErrorCode.TRADE_NOT_FOUND),
      reason: z.literal(ApiErrorMessage.TRADE_NOT_FOUND),
      requestId: z.string().uuid(),
    }),
  })
  .openapi('TradeNotFoundError');

export const tradeNotAmendableSchema = z
  .object({
    error: z.object({
      code: z.literal(ApiErrorCode.TRADE_NOT_AMENDABLE),
      reason: z.literal(ApiErrorMessage.TRADE_NOT_AMENDABLE),
      requestId: z.string().uuid(),
    }),
  })
  .openapi('TradeNotAmendableError');

export const validationErrorSchema = z
  .object({
    error: z.object({
      code: z.literal(ApiErrorCode.VALIDATION_FAILED),
      reason: z.literal(ApiErrorMessage.VALIDATION_FAILED),
      requestId: z.string().uuid(),
      details: z.array(apiErrorDetailSchema),
    }),
  })
  .openapi('ValidationError');

export const internalServerErrorSchema = z
  .object({
    error: z.object({
      code: z.literal(ApiErrorCode.INTERNAL_SERVER_ERROR),
      reason: z.literal(ApiErrorMessage.INTERNAL_SERVER_ERROR),
      requestId: z.string().uuid(),
    }),
  })
  .openapi('InternalServerError');

export const routeNotFoundSchema = z
  .object({
    error: z.object({
      code: z.literal(ApiErrorCode.ROUTE_NOT_FOUND),
      reason: z.literal(ApiErrorMessage.ROUTE_NOT_FOUND),
      requestId: z.string().uuid(),
    }),
  })
  .openapi('RouteNotFoundError');

export const requestIdSchema = z.string().uuid();
export const matchedRouteSchema = z.object({ path: z.string() });
export const tradeEventStreamSchema = z.string().openapi('TradeEventStream');
