import type { Trade } from '../models/trade.ts';

export interface TradeResponse {
  readonly id: string;
  readonly symbol: string;
  readonly quantity: number;
  readonly price: number;
  readonly side: 'BUY' | 'SELL';
  readonly trader: string;
  readonly tradeDate: string;
  readonly status: 'ACTIVE' | 'CANCELLED';
  readonly book?: string;
  readonly counterparty?: string;
}

export function serializeTrade(trade: Trade): TradeResponse {
  return {
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
  };
}
