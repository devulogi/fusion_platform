import express from 'express';
import apiDocsRouter from './http/openapi/api-docs.ts';
import { ApiPath } from './http/constants.ts';
import { createErrorHandler, notFoundHandler } from './http/error-handler.ts';
import {
  defaultRequestLogger,
  requestContext,
  type RequestLogger,
} from './http/request-context.ts';
import { tradeRouter } from './features/trades/trade-router.ts';
import { tradeEventsRouter } from './features/trades/trade-events-router.ts';
import { HealthController } from './features/health/controllers/health-controller.ts';
import { TradeController } from './features/trades/controllers/trade-controller.ts';
import { TradeEventsController } from './features/trades/controllers/trade-events-controller.ts';

export interface AppDependencies {
  healthController: HealthController;
  tradeController: TradeController;
  tradeEventsController: TradeEventsController;
  logger?: RequestLogger;
}

export function createApp({
  healthController,
  tradeController,
  tradeEventsController,
  logger = defaultRequestLogger,
}: AppDependencies): express.Express {
  const app = express();

  app.use(requestContext(logger));
  app.get(ApiPath.health, healthController.getHealth);
  app.get(ApiPath.readiness, healthController.getReadiness);
  app.use(ApiPath.apiDocs, apiDocsRouter);
  app.use(ApiPath.trades, tradeRouter(tradeController));
  app.use(ApiPath.tradeEvents, tradeEventsRouter(tradeEventsController));
  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));

  return app;
}
