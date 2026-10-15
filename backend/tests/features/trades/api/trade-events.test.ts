import { get, type IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../../../src/app.ts';
import { ApiPath } from '../../../../src/constants.ts';
import { HealthController } from '../../../../src/features/health/controllers/health-controller.ts';
import { TradeController } from '../../../../src/features/trades/controllers/trade-controller.ts';
import { TradeEventsController } from '../../../../src/features/trades/controllers/trade-events-controller.ts';
import { TradeCache } from '../../../../src/features/trades/trade-cache.ts';
import { TradeRepository } from '../../../../src/features/trades/repositories/trade-repository.ts';
import { TradeEventPublisher } from '../../../../src/features/trades/trade-event-publisher.ts';
import { TradeService } from '../../../../src/features/trades/services/trade-service.ts';
import { serializeTrade } from '../../../../src/features/trades/serializers/trade-serializer.ts';

describe('GET /api/v1/events', () => {
  it('streams the canonical trade.created event', async () => {
    const tradeCache = new TradeCache();
    tradeCache.hydrate([]);
    const tradeEventPublisher = new TradeEventPublisher();
    const app = createApp({
      healthController: new HealthController(),
      tradeController: new TradeController(
        new TradeService(
          tradeCache,
          new TradeRepository({
            trade: {
              findMany: () => Promise.resolve([]),
              create: () => Promise.reject(new Error('Not used in SSE test')),
            },
          }),
          tradeEventPublisher,
        ),
      ),
      tradeEventsController: new TradeEventsController(tradeEventPublisher),
    });
    const server = app.listen(0);
    let streamResponse: IncomingMessage | undefined;

    try {
      await new Promise<void>((resolve) => server.once('listening', resolve));
      const address = server.address();
      if (address === null || typeof address === 'string') {
        throw new Error('Test server did not bind to a TCP port');
      }

      const responsePromise = new Promise<IncomingMessage>((resolve, reject) => {
        const clientRequest = get(
          { host: '127.0.0.1', port: address.port, path: ApiPath.tradeEvents },
          resolve,
        );
        clientRequest.once('error', reject);
      });
      streamResponse = await responsePromise;
      expect(streamResponse.statusCode).toBe(200);
      expect(streamResponse.headers['content-type']).toContain('text/event-stream');

      const eventTextPromise = new Promise<string>((resolve) => {
        let eventText = '';
        streamResponse?.on('data', (chunk: Buffer | string) => {
          eventText += chunk.toString();
          if (eventText.includes('event: trade.created')) {
            resolve(eventText);
          }
        });
      });
      const trade = {
        id: 'generated-id',
        symbol: 'AAPL',
        quantity: 100,
        price: 185.25,
        side: 'BUY' as const,
        trader: 'Alex Morgan',
        tradeDate: '2026-10-14T12:00:00.000Z',
        status: 'ACTIVE' as const,
      };

      tradeEventPublisher.publishTradeCreated(trade);

      const eventText = await eventTextPromise;
      expect(eventText).toContain('event: trade.created\n');
      expect(eventText).toContain(`data: ${JSON.stringify(serializeTrade(trade))}`);
    } finally {
      streamResponse?.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
