import { Prisma } from '@prisma/client';
import type {
  AmendTradeInput,
  CreateTradeInput,
  Trade,
  TradeSide,
  TradeStatus,
} from '../models/trade.ts';
import { TradeNotAmendableError, TradeNotFoundError } from '../trade-errors.ts';

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

export type PersistedTradeUpdateData = Partial<PersistedTradeCreateData>;

export interface TradeWriteDatabase {
  trade: {
    findMany(): Promise<PersistedTrade[]>;
    findUnique(args: { where: { id: string } }): Promise<PersistedTrade | null>;
    create(args: { data: PersistedTradeCreateData }): Promise<PersistedTrade>;
    update(args: {
      where: { id: string; status: TradeStatus };
      data: PersistedTradeUpdateData;
    }): Promise<PersistedTrade>;
  };
}

export interface TradeRepositoryContract {
  findAll(): Promise<Trade[]>;
  create(input: CreateTradeInput): Promise<Trade>;
  amend(id: string, input: AmendTradeInput): Promise<Trade>;
  cancel(id: string): Promise<TradeMutationResult>;
  reactivate(id: string): Promise<TradeMutationResult>;
}

export interface TradeMutationResult {
  readonly trade: Trade;
  readonly changed: boolean;
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

  async amend(id: string, input: AmendTradeInput): Promise<Trade> {
    const { tradeDate, ...tradeFields } = input;
    const updateData: PersistedTradeUpdateData = {
      ...tradeFields,
      ...(tradeDate === undefined ? {} : { tradeDate: new Date(tradeDate) }),
    };

    try {
      const persistedTrade = await this.database.trade.update({
        where: { id, status: 'ACTIVE' },
        data: updateData,
      });

      return this.toDomainTrade(persistedTrade);
    } catch (error: unknown) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2025') {
        throw error;
      }

      const existingTrade = await this.database.trade.findUnique({ where: { id } });
      if (existingTrade === null) {
        throw new TradeNotFoundError(id, { cause: error });
      }
      if (existingTrade.status === 'CANCELLED') {
        throw new TradeNotAmendableError(id, { cause: error });
      }

      throw error;
    }
  }

  async cancel(id: string): Promise<TradeMutationResult> {
    try {
      const persistedTrade = await this.database.trade.update({
        where: { id, status: 'ACTIVE' },
        data: { status: 'CANCELLED' },
      });

      return { trade: this.toDomainTrade(persistedTrade), changed: true };
    } catch (error: unknown) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2025') {
        throw error;
      }

      const existingTrade = await this.database.trade.findUnique({ where: { id } });
      if (existingTrade === null) {
        throw new TradeNotFoundError(id, { cause: error });
      }
      if (existingTrade.status === 'CANCELLED') {
        return { trade: this.toDomainTrade(existingTrade), changed: false };
      }

      throw error;
    }
  }

  async reactivate(id: string): Promise<TradeMutationResult> {
    try {
      const persistedTrade = await this.database.trade.update({
        where: { id, status: 'CANCELLED' },
        data: { status: 'ACTIVE' },
      });

      return { trade: this.toDomainTrade(persistedTrade), changed: true };
    } catch (error: unknown) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2025') {
        throw error;
      }

      const existingTrade = await this.database.trade.findUnique({ where: { id } });
      if (existingTrade === null) {
        throw new TradeNotFoundError(id, { cause: error });
      }
      if (existingTrade.status === 'ACTIVE') {
        return { trade: this.toDomainTrade(existingTrade), changed: false };
      }

      throw error;
    }
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
