export type TradeId = string;
export type TradeSide = 'BUY' | 'SELL';
export type TradeStatus = 'ACTIVE' | 'CANCELLED';

export interface Trade {
  readonly id: TradeId;
  readonly symbol: string;
  readonly quantity: number;
  readonly price: number;
  readonly side: TradeSide;
  readonly trader: string;
  readonly tradeDate: string;
  readonly status: TradeStatus;
  readonly book?: string;
  readonly counterparty?: string;
}

export interface CreateTradeInput {
  readonly symbol: string;
  readonly quantity: number;
  readonly price: number;
  readonly side: TradeSide;
  readonly trader: string;
  readonly tradeDate: string;
  readonly status: TradeStatus;
  readonly book?: string | null;
  readonly counterparty?: string | null;
}
