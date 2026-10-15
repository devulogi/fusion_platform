import { TradeCache } from '../trade-cache.ts';
import type { CreateTradeInput, Trade } from '../models/trade.ts';
import type { TradeRepositoryContract } from '../repositories/trade-repository.ts';
import { TradeEventPublisher } from '../trade-event-publisher.ts';

export class TradeService {
  constructor(
    private readonly tradeCache: TradeCache,
    private readonly tradeRepository: TradeRepositoryContract,
    private readonly tradeEventPublisher: TradeEventPublisher,
  ) {}

  getAllTrades(): readonly Trade[] {
    return this.tradeCache.getAll();
  }

  async createTrade(input: CreateTradeInput): Promise<Trade> {
    this.tradeCache.assertHydrated();
    const savedTrade = await this.tradeRepository.create(input);
    this.tradeCache.add(savedTrade);
    this.tradeEventPublisher.publishTradeCreated(savedTrade);
    return savedTrade;
  }
}
