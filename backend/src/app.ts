import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import apiDocsRouter from './openapi/api-docs.ts';
import { ApiPath } from './constants.ts';
import {
  createErrorHandler,
  defaultRequestLogger,
  notFoundHandler,
  requestLogging,
} from './middleware.ts';
import { tradeRouter } from './features/trades/routes/trade-router.ts';
import { tradeEventsRouter } from './features/trades/routes/trade-events-router.ts';
import type { AppDependencies } from './types.ts';

export function createApp({
  healthController,
  tradeController,
  tradeEventsController,
  logger = defaultRequestLogger,
}: AppDependencies): express.Express {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
    }),
  );
  app.use(
    compression({
      filter: (request, response) =>
        request.path !== ApiPath.tradeEvents && compression.filter(request, response),
    }),
  );
  app.use(requestLogging(logger));
  app.get(ApiPath.health, healthController.getHealth);
  app.get(ApiPath.readiness, healthController.getReadiness);
  app.use(ApiPath.apiDocs, apiDocsRouter);
  app.use(ApiPath.trades, tradeRouter(tradeController));
  app.use(ApiPath.tradeEvents, tradeEventsRouter(tradeEventsController));
  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));

  return app;
}
