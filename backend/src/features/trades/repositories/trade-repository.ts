import { Prisma } from '@prisma/client';
import { TRADE_STATUS } from '../../../constants.ts';
import { TradeNotAmendableError, TradeNotFoundError } from '../../../errors.ts';
import type {
  AmendTradeInput,
  CreateTradeInput,
  Trade,
  TradeMutationResult,
  TradeRepositoryContract,
  PersistedTrade,
  PersistedTradeUpdateData,
  TradeWriteDatabase,
} from '../../../types.ts';

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
        tradeTimestamp: new Date(input.tradeTimestamp),
        status: input.status ?? TRADE_STATUS.ACTIVE,
        book: input.book ?? null,
        counterparty: input.counterparty ?? null,
      },
    });

    return this.toDomainTrade(persistedTrade);
  }

  async amend(id: string, input: AmendTradeInput): Promise<Trade> {
    const { tradeTimestamp, ...tradeFields } = input;
    const updateData: PersistedTradeUpdateData = {
      ...tradeFields,
      ...(tradeTimestamp === undefined ? {} : { tradeTimestamp: new Date(tradeTimestamp) }),
    };

    try {
      const persistedTrade = await this.database.trade.update({
        where: { id, status: TRADE_STATUS.ACTIVE },
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
      if (existingTrade.status === TRADE_STATUS.CANCELLED) {
        throw new TradeNotAmendableError(id, { cause: error });
      }

      throw error;
    }
  }

  async cancel(id: string): Promise<TradeMutationResult> {
    try {
      const persistedTrade = await this.database.trade.update({
        where: { id, status: TRADE_STATUS.ACTIVE },
        data: { status: TRADE_STATUS.CANCELLED },
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
      if (existingTrade.status === TRADE_STATUS.CANCELLED) {
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
      tradeTimestamp: trade.tradeTimestamp.toISOString(),
      status: trade.status,
      ...(trade.book === null ? {} : { book: trade.book }),
      ...(trade.counterparty === null ? {} : { counterparty: trade.counterparty }),
    };
  }
}
