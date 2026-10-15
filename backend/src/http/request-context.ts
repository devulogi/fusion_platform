import { randomUUID } from 'node:crypto';
import type { RequestHandler, Response } from 'express';
import { z } from './openapi/zod.ts';

export const requestIdHeader = 'X-Request-Id';
export const requestIdResponseHeader = {
  description: 'Server-generated identifier for correlating this request with server logs.',
  schema: { type: 'string' as const, format: 'uuid' },
};

export interface RequestLogger {
  info(entry: {
    requestId: string;
    method: string;
    route: string;
    status: number;
    durationMs: number;
  }): void;
  error(entry: { requestId: string; error: unknown }): void;
}

export const defaultRequestLogger: RequestLogger = {
  info: (entry) => console.info(entry),
  error: (entry) => console.error(entry),
};

export function getRequestId(response: Response): string {
  return z.string().uuid().parse(response.getHeader(requestIdHeader));
}

export function requestContext(logger: RequestLogger): RequestHandler {
  return (request, response, next) => {
    const requestId = randomUUID();
    const startedAt = performance.now();
    response.setHeader(requestIdHeader, requestId);
    let logged = false;

    const logCompletion = (): void => {
      if (logged) return;
      logged = true;
      const matchedRoute = z.object({ path: z.string() }).safeParse(request.route);
      const requestRoute = (response.locals as Record<string, unknown>).requestRoute;
      const routePath = matchedRoute.success
        ? `${request.baseUrl}${matchedRoute.data.path}`.replace(/\/$/, '') || '/'
        : '[unmatched]';
      logger.info({
        requestId,
        method: request.method,
        route: typeof requestRoute === 'string' ? requestRoute : routePath,
        status: response.statusCode,
        durationMs: performance.now() - startedAt,
      });
    };

    response.once('finish', logCompletion);
    response.once('close', logCompletion);
    next();
  };
}

export function recordRequestRoute(route: string): RequestHandler {
  return (_request, response, next) => {
    (response.locals as Record<string, unknown>).requestRoute = route;
    next();
  };
}
