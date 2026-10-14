import type { RequestHandler } from 'express';
import { TradeService } from '../services/trade-service.ts';
import { serializeTrade } from '../serializers/trade-serializer.ts';

const HttpStatus = {
  OK: 200,
  SERVICE_UNAVAILABLE: 503,
} as const;

const collectionNotReadyMessage = 'Trade collection is not ready';

export function createTradeController(service: TradeService): {
  getAll: RequestHandler;
} {
  const getAll: RequestHandler = (_request, response) => {
    const trades = service.getAllTrades();

    if (trades === undefined) {
      response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        error: collectionNotReadyMessage,
      });
      return;
    }

    response.status(HttpStatus.OK).json(trades.map(serializeTrade));
  };

  return { getAll };
}
