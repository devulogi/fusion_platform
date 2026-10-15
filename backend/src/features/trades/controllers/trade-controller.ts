import type { RequestHandler } from 'express';
import { TradeService } from '../services/trade-service.ts';
import { serializeTrade, serializeTradeCollection } from '../serializers/trade-serializer.ts';
import { HttpStatus } from '../../../constants.ts';
import { parseCreateTradeInput } from '../trade-input.ts';

export class TradeController {
  constructor(private readonly tradeService: TradeService) {}

  readonly getAll: RequestHandler = (_request, response) => {
    const trades = this.tradeService.getAllTrades();
    response.status(HttpStatus.OK).json(serializeTradeCollection(trades));
  };

  readonly create: RequestHandler = async (request, response, next) => {
    try {
      const input = parseCreateTradeInput(request.body);
      const trade = await this.tradeService.createTrade(input);
      response.status(HttpStatus.CREATED).json(serializeTrade(trade));
    } catch (error: unknown) {
      next(error);
    }
  };
}
