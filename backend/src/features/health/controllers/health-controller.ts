import type { RequestHandler } from 'express';
import { z } from '../../../openapi/zod.ts';

export const healthResponseSchema = z
  .object({
    status: z.literal('ok'),
  })
  .openapi('HealthResponse');

export const healthController: RequestHandler = (_request, response) => {
  response.json(healthResponseSchema.parse({ status: 'ok' }));
};
