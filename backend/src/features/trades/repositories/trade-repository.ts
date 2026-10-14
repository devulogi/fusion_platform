import type { Trade, TradeSide, TradeStatus } from '../models/trade.ts';

export interface PersistedTrade {
  readonly id: string;
  readonly symbol: string;
  readonly quantity: number;
  readonly price: { toNumber(): number };
  readonly side: TradeSide;
  readonly trader: string;
  readonly tradeDate: Date;
  readonly status: TradeStatus;
  readonly book: string | null;
  readonly counterparty: string | null;
}

export interface TradeReadDatabase {
  trade: {
    findMany(): Promise<PersistedTrade[]>;
  };
}

export class TradeRepository {
  constructor(private readonly database: TradeReadDatabase) {}

  async findAll(): Promise<Trade[]> {
    const persistedTrades = await this.database.trade.findMany();

    return persistedTrades.map((trade) => ({
      id: trade.id,
      symbol: trade.symbol,
      quantity: trade.quantity,
      price: trade.price.toNumber(),
      side: trade.side,
      trader: trade.trader,
      tradeDate: trade.tradeDate.toISOString(),
      status: trade.status,
      ...(trade.book === null ? {} : { book: trade.book }),
      ...(trade.counterparty === null ? {} : { counterparty: trade.counterparty }),
    }));
  }
}
