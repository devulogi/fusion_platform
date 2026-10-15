// main application setup
import express, { Router } from 'express';
import apiDocsRouter from './api-docs.ts';
import { ApiPath } from './api-contract.ts';
import { errorHandler } from './error-handler.ts';
// controllers
import { HealthController } from './features/health/controllers/health-controller.ts';
import { TradeController } from './features/trades/controllers/trade-controller.ts';
import { TradeEventsController } from './features/trades/controllers/trade-events-controller.ts';

/**
 * Main application setup for the Fusion Platform backend.
 * Configures routes, controllers, and services.
 */
export interface AppDependencies {
  healthController: HealthController;
  tradeController: TradeController;
  tradeEventsController: TradeEventsController;
}

export function tradeRouter(controller: TradeController): Router {
  const router = Router();
  router.get('/', controller.getAll);
  router.post('/', controller.create);
  return router;
}

export function createApp({
  healthController,
  tradeController,
  tradeEventsController,
}: AppDependencies): express.Express {
  const app = express();

  app.use(express.json());
  app.use('/api-docs', apiDocsRouter);
  app.get(ApiPath.health, healthController.getHealth);
  app.use(ApiPath.trades, tradeRouter(tradeController));
  app.get(ApiPath.tradeEvents, tradeEventsController.stream);
  app.use(errorHandler);

  return app;
}
