import type { RequestHandler } from 'express';
import { z } from '../../../http/openapi/zod.ts';

export const healthResponseSchema = z
  .object({
    status: z.literal('ok'),
  })
  .openapi('HealthResponse');

export class HealthController {
  readonly getHealth: RequestHandler = (_request, response) => {
    response.json(healthResponseSchema.parse({ status: 'ok' }));
  };
}
