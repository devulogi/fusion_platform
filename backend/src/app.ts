import express from 'express';
import apiDocsRouter from './http/openapi/api-docs.ts';
import { ApiPath } from './http/constants.ts';
import { createErrorHandler } from './http/error-handler.ts';
import { RouteNotFoundError } from './http/api-errors.ts';
import {
  defaultRequestLogger,
  recordRequestRoute,
  requestContext,
  type RequestLogger,
} from './http/request-context.ts';
import { tradeRouter } from './features/trades/trade-router.ts';
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
  app.use('/api-docs', recordRequestRoute('/api-docs'), apiDocsRouter);
  app.get(ApiPath.health, recordRequestRoute(ApiPath.health), healthController.getHealth);
  app.use(ApiPath.trades, tradeRouter(tradeController));
  app.get(
    ApiPath.tradeEvents,
    recordRequestRoute(ApiPath.tradeEvents),
    tradeEventsController.stream,
  );
  app.use((_request, _response, next) => {
    next(new RouteNotFoundError());
  });
  app.use(createErrorHandler(logger));

  return app;
}
