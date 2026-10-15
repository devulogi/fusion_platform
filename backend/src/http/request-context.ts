import { randomUUID } from 'node:crypto';
import type { RequestHandler, Response } from 'express';
import { z } from './openapi/zod.ts';

export const requestIdHeader = 'X-Request-Id';
const routeRecorders = new WeakMap<Response, (route: string) => void>();
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
    let route = '[unmatched]';
    let logged = false;

    const logCompletion = (): void => {
      if (logged) return;
      logged = true;
      logger.info({
        requestId,
        method: request.method,
        route,
        status: response.statusCode,
        durationMs: performance.now() - startedAt,
      });
    };

    // The route is recorded before handlers run, without retaining raw URL/query values.
    routeRecorders.set(response, (matchedRoute: string): void => {
      route = matchedRoute;
    });
    response.once('finish', logCompletion);
    response.once('close', logCompletion);
    next();
  };
}

export function recordRequestRoute(route: string): RequestHandler {
  return (_request, response, next) => {
    const record = routeRecorders.get(response);
    if (record === undefined) {
      next(new Error('Request context is not initialized'));
      return;
    }
    record(route);
    next();
  };
}
