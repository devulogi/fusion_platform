import type { Trade, TradeCollectionResponse, TradeResponse } from '../../types.ts';
import { tradeCollectionResponseSchema, tradeResponseSchema } from '../../schemas.ts';

export function serializeTrade(trade: Trade): TradeResponse {
  return tradeResponseSchema.parse({
    id: trade.id,
    symbol: trade.symbol,
    quantity: trade.quantity,
    price: trade.price,
    side: trade.side,
    trader: trade.trader,
    tradeTimestamp: trade.tradeTimestamp,
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
