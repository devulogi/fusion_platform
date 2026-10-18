import { Router } from 'express';
import { ApiPath } from '../../../constants.ts';
import { recordRequestRoute } from '../../../middleware.ts';
import type { TradeEventsController } from '../controllers/trade-events-controller.ts';

export function tradeEventsRouter(controller: TradeEventsController): Router {
  const router = Router();
  router.get('/', recordRequestRoute(ApiPath.tradeEvents), controller.stream);
  return router;
}
