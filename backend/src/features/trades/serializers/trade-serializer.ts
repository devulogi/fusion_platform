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
    book: z.string().optional(),
    counterparty: z.string().optional(),
  })
  .openapi('Trade');

export const tradeCollectionResponseSchema = z
  .array(tradeResponseSchema)
  .openapi('TradeCollection');

export type TradeResponse = z.infer<typeof tradeResponseSchema>;

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
    ...(trade.book === undefined ? {} : { book: trade.book }),
    ...(trade.counterparty === undefined ? {} : { counterparty: trade.counterparty }),
  });
}
