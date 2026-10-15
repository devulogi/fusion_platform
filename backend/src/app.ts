import express from 'express';
import { TradeCache } from './features/trades/trade-cache.ts';
import { healthController } from './features/health/controllers/health-controller.ts';
import { createTradeController } from './features/trades/controllers/trade-controller.ts';
import { TradeService } from './features/trades/services/trade-service.ts';
import apiDocsRouter from './api-docs.ts';
import { ApiPath } from './api-contract.ts';

export const tradeCache = new TradeCache();

export function createApp(cache: TradeCache = tradeCache): express.Express {
  const app = express();
  const tradeController = createTradeController(new TradeService(cache));

  app.use(express.json());
  app.use('/api-docs', apiDocsRouter);
  app.get(ApiPath.health, healthController);
  app.get(ApiPath.trades, tradeController.getAll);

  return app;
}

export default createApp();
