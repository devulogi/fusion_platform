import { json, Router } from 'express';
import { ApiPath } from '../../http/constants.ts';
import { recordRequestRoute } from '../../http/request-context.ts';
import type { TradeController } from './controllers/trade-controller.ts';

export function tradeRouter(controller: TradeController): Router {
  const tradeMiddlewarePipeline = (path: string) => {
    return [recordRequestRoute(path), json()];
  };

  const router = Router();
  router.get('/', recordRequestRoute(ApiPath.trades), controller.getAll);
  router.get('/:tradeId', recordRequestRoute(`${ApiPath.trades}/:tradeId`), controller.getById);
  router.post('/', ...tradeMiddlewarePipeline(ApiPath.trades), controller.create);
  router.patch(
    '/:tradeId',
    ...tradeMiddlewarePipeline(`${ApiPath.trades}/:tradeId`),
    controller.amend,
  );
  return router;
}
