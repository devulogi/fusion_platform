import type { Trade } from '../models/trade.ts';
import { z } from '../../../openapi/zod.ts';

export const tradeResponseSchema = z
  .object({
    id: z.string(),
    symbol: z.string(),
    quantity: z.number().int().min(1),
    price: z.number().positive(),
    side: z.enum(['BUY', 'SELL']),
    trader: z.string(),
    tradeDate: z.string().datetime(),
    status: z.enum(['ACTIVE', 'CANCELLED']),
    book: z.string().nullable(),
    counterparty: z.string().nullable(),
  })
  .openapi('Trade');

export const tradeCollectionPaginationSchema = z
  .object({
    totalItems: z.number().int().nonnegative(),
    currentPage: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  })
  .openapi('TradeCollectionPagination');

export const tradeCollectionResponseSchema = z
  .object({
    items: z.array(tradeResponseSchema),
    pagination: tradeCollectionPaginationSchema,
  })
  .openapi('TradeCollectionResponse');

export type TradeResponse = z.infer<typeof tradeResponseSchema>;
export type TradeCollectionResponse = z.infer<typeof tradeCollectionResponseSchema>;

export function serializeTrade(trade: Trade): TradeResponse {
  return tradeResponseSchema.parse({
    id: trade.id,
    symbol: trade.symbol,
    quantity: trade.quantity,
    price: trade.price,
    side: trade.side,
    trader: trade.trader,
    tradeDate: trade.tradeDate,
    status: trade.status,
    book: trade.book ?? null,
    counterparty: trade.counterparty ?? null,
  });
}

export function serializeTradeCollection(trades: readonly Trade[]): TradeCollectionResponse {
  const items = trades.map(serializeTrade);
  const totalItems = items.length;

  return tradeCollectionResponseSchema.parse({
    items,
    pagination: {
      totalItems,
      currentPage: 1,
      totalPages: totalItems === 0 ? 0 : 1,
    },
  });
}
