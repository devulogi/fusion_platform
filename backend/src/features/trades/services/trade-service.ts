import { TradeCache } from '../trade-cache.ts';
import type {
  AmendTradeInput,
  CreateTradeInput,
  Trade,
  TradeRepositoryContract,
} from '../../../types.ts';
import { TradeEventPublisher } from '../trade-event-publisher.ts';
import type { TradeCollectionQuery, TradePage } from '../../../types.ts';
import { queryCachedTrades } from '../trade-query.ts';
import {
  parseAmendTradeInput,
  parseCancelTradeInput,
  parseCreateTradeInput,
  parseTradeCollectionQuery,
  parseTradeId,
} from '../trade-input.ts';

export class TradeService {
  constructor(
    private readonly tradeCache: TradeCache,
    private readonly tradeRepository: TradeRepositoryContract,
    private readonly tradeEventPublisher: Pick<
      TradeEventPublisher,
      'publishTradeCreated' | 'publishTradeAmended' | 'publishTradeCancelled'
    >,
  ) {}

  getTradePage(input: unknown): TradePage {
    const query: TradeCollectionQuery = parseTradeCollectionQuery(input);
    this.tradeCache.assertHydrated();
    const { items, totalItems } = queryCachedTrades(this.tradeCache.getAll(), query);
    const pageCount = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);

    return {
      items,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        pageCount,
      },
    };
  }

  async createTrade(input: CreateTradeInput): Promise<Trade> {
    const validatedInput = parseCreateTradeInput(input);
    this.tradeCache.assertHydrated();
    const savedTrade = await this.tradeRepository.create(validatedInput);
    this.tradeCache.add(savedTrade);
    this.tradeEventPublisher.publishTradeCreated(savedTrade);
    return savedTrade;
  }

  async amendTrade(id: unknown, input: unknown): Promise<Trade> {
    const validatedId = parseTradeId(id);
    const validatedInput: AmendTradeInput = parseAmendTradeInput(input);
    this.tradeCache.assertHydrated();
    const savedTrade = await this.tradeRepository.amend(validatedId, validatedInput);
    this.tradeCache.replace(savedTrade);
    this.tradeEventPublisher.publishTradeAmended(savedTrade);
    return savedTrade;
  }

  async cancelTrade(id: unknown, input: unknown): Promise<Trade> {
    const validatedId = parseTradeId(id);
    parseCancelTradeInput(input);
    this.tradeCache.assertHydrated();
    const result = await this.tradeRepository.cancel(validatedId);
    this.tradeCache.replace(result.trade);
    if (result.changed) {
      this.tradeEventPublisher.publishTradeCancelled(result.trade);
    }
    return result.trade;
  }
}
