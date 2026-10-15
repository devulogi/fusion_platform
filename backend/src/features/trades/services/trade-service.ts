import { TradeCache } from '../trade-cache.ts';
import type { CreateTradeInput, Trade } from '../models/trade.ts';
import type { TradeRepositoryContract } from '../repositories/trade-repository.ts';
import { TradeEventPublisher } from '../trade-event-publisher.ts';
import { parseCreateTradeInput } from '../trade-input.ts';

export class TradeService {
  constructor(
    private readonly tradeCache: TradeCache,
    private readonly tradeRepository: TradeRepositoryContract,
    private readonly tradeEventPublisher: Pick<TradeEventPublisher, 'publishTradeCreated'>,
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
}
