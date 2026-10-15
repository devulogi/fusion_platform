import type { RequestHandler } from 'express';
import { z } from '../../../openapi/zod.ts';
import { TradeService } from '../services/trade-service.ts';
import { serializeTrade, serializeTradeCollection } from '../serializers/trade-serializer.ts';
import { HttpStatus } from '../../../constants.ts';

export const createTradeRequestSchema = z
  .object({
    symbol: z.string().trim().min(1).max(16),
    quantity: z.number().int().positive(),
    price: z.number().positive(),
    side: z.enum(['BUY', 'SELL']),
    trader: z.string().trim().min(1).max(32),
    tradeDate: z.string().datetime(),
    status: z.enum(['ACTIVE', 'CANCELLED']),
    book: z.string().max(64).nullable().optional(),
    counterparty: z.string().max(120).nullable().optional(),
  })
  .strict()
  .openapi('CreateTradeRequest');

export class TradeController {
  constructor(private readonly tradeService: TradeService) {}

  readonly getAll: RequestHandler = (_request, response) => {
    const trades = this.tradeService.getAllTrades();
    response.status(HttpStatus.OK).json(serializeTradeCollection(trades));
  };

  readonly create: RequestHandler = (request, response, next) => {
    const parsedRequest = createTradeRequestSchema.safeParse(request.body);
    if (!parsedRequest.success) {
      next(parsedRequest.error);
      return;
    }

    void this.tradeService
      .createTrade(parsedRequest.data)
      .then((trade) => response.status(HttpStatus.CREATED).json(serializeTrade(trade)))
      .catch(next);
  };
}
