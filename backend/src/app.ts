import express from 'express';
import { TradeCache } from './features/trades/trade-cache.ts';
import { healthController } from './features/health/controllers/health-controller.ts';
import { createTradeController } from './features/trades/controllers/trade-controller.ts';
import { TradeService } from './features/trades/services/trade-service.ts';
import apiDocsRouter from './infrastructure/openapi/api-docs.ts';

export const tradeCache = new TradeCache();

export function createApp(cache: TradeCache = tradeCache): express.Express {
  const app = express();
  const tradeController = createTradeController(new TradeService(cache));

  app.use(express.json());
  app.use('/api-docs', apiDocsRouter);
  app.get('/health', healthController);
  app.get('/api/trades', tradeController.getAll);

  return app;
}

export default createApp();
