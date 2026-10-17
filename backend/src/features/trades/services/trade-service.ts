import { TradeCache } from '../trade-cache.ts';
import type { AmendTradeInput, CreateTradeInput, Trade } from '../models/trade.ts';
import type { TradeRepositoryContract } from '../repositories/trade-repository.ts';
import { TradeEventPublisher } from '../trade-event-publisher.ts';
import {
  parseAmendTradeInput,
  parseCancelTradeInput,
  parseCreateTradeInput,
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

  getAllTrades(): readonly Trade[] {
    return this.tradeCache.getAll();
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
