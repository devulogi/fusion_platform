import { randomUUID } from 'node:crypto';
import type { ErrorRequestHandler, Request, RequestHandler, Response } from 'express';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { requestIdHeader } from './constants.ts';
import { mapApiError, RouteNotFoundError } from './errors.ts';
import { matchedRouteSchema, requestIdSchema } from './schemas.ts';
import type { RequestLogger } from './types.ts';

export const defaultRequestLogger: RequestLogger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
});

export function getRequestId(response: Response): string {
  return requestIdSchema.parse(response.getHeader(requestIdHeader));
}

export function requestLogging(logger: RequestLogger): RequestHandler {
  const pinoMiddleware = pinoHttp<Request, Response>({
    logger,
    genReqId: (_request, response) => {
      const requestId = randomUUID();
      response.setHeader(requestIdHeader, requestId);
      return requestId;
    },
    serializers: {
      req: (request: unknown) => serializeRequest(request),
    },
    customLogLevel: () => 'info',
    customSuccessObject: (request, response, logObject: unknown) =>
      createRequestLog(request, response, logObject),
    customErrorObject: (request, response, _error, logObject: unknown) =>
      createRequestLog(request, response, logObject),
  });

  return (request, response, next) => {
    pinoMiddleware(request, response, () => next());
  };
}

export function recordRequestRoute(route: string): RequestHandler {
  return (_request, response, next) => {
    (response.locals as Record<string, unknown>).requestRoute = route;
    next();
  };
}

export const notFoundHandler: RequestHandler = (_request, _response, next) => {
  next(new RouteNotFoundError());
};

export function createErrorHandler(
  logger: RequestLogger = defaultRequestLogger,
): ErrorRequestHandler {
  return (error: unknown, _request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    const requestId = getRequestId(response);
    const mappedError = mapApiError(error, requestId);
    if (mappedError.logUnexpected) {
      logger.error({ requestId, err: error }, 'Unhandled request error');
    }
    response.status(mappedError.status).json(mappedError.body);
  };
}

function createRequestLog(request: Request, response: Response, logObject: unknown) {
  return {
    requestId: request.id,
    method: request.method,
    route: getRequestRoute(request, response),
    status: response.statusCode,
    durationMs: getResponseTime(logObject),
  };
}

function getRequestRoute(request: Request, response: Response): string {
  const requestRoute = (response.locals as Record<string, unknown>).requestRoute;
  if (typeof requestRoute === 'string') return requestRoute;

  const matchedRoute = matchedRouteSchema.safeParse(request.route);
  return matchedRoute.success
    ? `${request.baseUrl}${matchedRoute.data.path}`.replace(/\/$/, '') || '/'
    : '[unmatched]';
}

function getResponseTime(logObject: unknown): number {
  if (
    typeof logObject === 'object' &&
    logObject !== null &&
    'responseTime' in logObject &&
    typeof logObject.responseTime === 'number'
  ) {
    return logObject.responseTime;
  }

  return 0;
}

function serializeRequest(request: unknown): Record<string, unknown> {
  if (typeof request !== 'object' || request === null) return {};

  const requestId = 'id' in request ? request.id : undefined;
  const method = 'method' in request ? request.method : undefined;

  return {
    ...(typeof requestId === 'string' || typeof requestId === 'number' ? { id: requestId } : {}),
    ...(typeof method === 'string' ? { method } : {}),
  };
}
