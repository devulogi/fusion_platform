import type { CreateTradeInput, Trade, TradeSide, TradeStatus } from '../models/trade.ts';

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

export interface PersistedTradeCreateData {
  readonly symbol: string;
  readonly quantity: number;
  readonly price: number;
  readonly side: TradeSide;
  readonly trader: string;
  readonly tradeDate: Date;
  readonly status: TradeStatus;
  readonly book: string | null;
  readonly counterparty: string | null;
}

export interface TradeWriteDatabase {
  trade: {
    findMany(): Promise<PersistedTrade[]>;
    create(args: { data: PersistedTradeCreateData }): Promise<PersistedTrade>;
  };
}

export interface TradeRepositoryContract {
  findAll(): Promise<Trade[]>;
  create(input: CreateTradeInput): Promise<Trade>;
}

export class TradeRepository implements TradeRepositoryContract {
  constructor(private readonly database: TradeWriteDatabase) {}

  async findAll(): Promise<Trade[]> {
    const persistedTrades = await this.database.trade.findMany();

    return persistedTrades.map((trade) => this.toDomainTrade(trade));
  }

  async create(input: CreateTradeInput): Promise<Trade> {
    const persistedTrade = await this.database.trade.create({
      data: {
        symbol: input.symbol,
        quantity: input.quantity,
        price: input.price,
        side: input.side,
        trader: input.trader,
        tradeDate: new Date(input.tradeDate),
        status: input.status,
        book: input.book ?? null,
        counterparty: input.counterparty ?? null,
      },
    });

    return this.toDomainTrade(persistedTrade);
  }

  private toDomainTrade(trade: PersistedTrade): Trade {
    return {
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
    };
  }
}
