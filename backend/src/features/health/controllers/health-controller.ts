import type { RequestHandler } from 'express';
import { z } from '../../../http/openapi/zod.ts';
import { HttpStatus } from '../../../http/constants.ts';
import { ServiceNotReadyError } from '../../../http/api-errors.ts';

export const healthResponseSchema = z
  .object({
    status: z.literal('ok'),
  })
  .openapi('HealthResponse');

export const readinessResponseSchema = z
  .object({ status: z.literal('ready') })
  .openapi('ReadinessResponse');

export type ReadinessCheck = () => Promise<boolean>;

export class HealthController {
  constructor(private readonly readinessCheck: ReadinessCheck = () => Promise.resolve(false)) {}

  readonly getHealth: RequestHandler = (_request, response) => {
    response.json(healthResponseSchema.parse({ status: 'ok' }));
  };

  readonly getReadiness: RequestHandler = async (_request, response, next) => {
    try {
      const isReady = await this.readinessCheck();
      if (!isReady) {
        throw new ServiceNotReadyError();
      }

      response.status(HttpStatus.OK).json(readinessResponseSchema.parse({ status: 'ready' }));
    } catch (error: unknown) {
      next(error);
    }
  };
}
