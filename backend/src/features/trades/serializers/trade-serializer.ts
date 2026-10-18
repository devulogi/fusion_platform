import type { Trade } from '../models/trade.ts';
import { z } from '../../../http/openapi/zod.ts';

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

export const tradeNotFoundSchema = z
  .object({
    message: z.string(),
  })
  .strict()
  .openapi('TradeNotFound');

export const tradeCollectionResponseSchema = z
  .object({
    items: z.array(tradeResponseSchema),
  })
  .strict()
  .openapi('TradeCollectionResponse');

export type TradeResponse = z.infer<typeof tradeResponseSchema>;
export type TradeCollectionResponse = z.infer<typeof tradeCollectionResponseSchema>;
export type TradeNotFound = z.infer<typeof tradeNotFoundSchema>;

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
  return tradeCollectionResponseSchema.parse({
    items,
  });
}
