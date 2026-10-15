import { json, Router } from 'express';
import { ApiPath } from '../../constants.ts';
import { recordRequestRoute } from '../../request-context.ts';
import type { TradeController } from './controllers/trade-controller.ts';

export function tradeRouter(controller: TradeController): Router {
  const router = Router();
  router.get('/', recordRequestRoute(ApiPath.trades), controller.getAll);
  router.post('/', recordRequestRoute(ApiPath.trades), json(), controller.create);
  return router;
}
