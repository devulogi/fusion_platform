import { TradeCache } from '../trade-cache.ts';
import type { AmendTradeInput, CreateTradeInput, Trade } from '../models/trade.ts';
import type { TradeRepositoryContract } from '../repositories/trade-repository.ts';
import { TradeEventPublisher } from '../trade-event-publisher.ts';
import { parseAmendTradeInput, parseCreateTradeInput, parseTradeId } from '../trade-input.ts';

export class TradeService {
  constructor(
    private readonly tradeCache: TradeCache,
    private readonly tradeRepository: TradeRepositoryContract,
    private readonly tradeEventPublisher: Pick<
      TradeEventPublisher,
      'publishTradeCreated' | 'publishTradeAmended'
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
}
