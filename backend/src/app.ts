// main application setup
import express, { Router } from 'express';
import apiDocsRouter from './api-docs.ts';
import { ApiPath } from './api-contract.ts';
// controllers
import { HealthController } from './features/health/controllers/health-controller.ts';
import { TradeController } from './features/trades/controllers/trade-controller.ts';

/**
 * Main application setup for the Fusion Platform backend.
 * Configures routes, controllers, and services.
 */
export interface AppDependencies {
  healthController: HealthController;
  tradeController: TradeController;
}

export function tradeRouter(controller: TradeController): Router {
  const router = Router();
  router.get('/', controller.getAll);
  return router;
}

export function createApp({ healthController, tradeController }: AppDependencies): express.Express {
  const app = express();

  app.use(express.json());
  app.use('/api-docs', apiDocsRouter);
  app.get(ApiPath.health, healthController.getHealth);
  app.use(ApiPath.trades, tradeRouter(tradeController));

  return app;
}
