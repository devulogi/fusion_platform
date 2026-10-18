import type { RequestHandler } from 'express';
import { HttpStatus } from '../../../constants.ts';
import { ServiceNotReadyError } from '../../../errors.ts';
import { healthResponseSchema, readinessResponseSchema } from '../../../schemas.ts';
import type { ReadinessCheck } from '../../../types.ts';

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
