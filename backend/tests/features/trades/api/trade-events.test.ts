import { get, type IncomingMessage } from 'node:http';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../../../../src/app.ts';
import { ApiPath } from '../../../../src/constants.ts';
import { HealthController } from '../../../../src/features/health/controllers/health-controller.ts';
import { TradeController } from '../../../../src/features/trades/controllers/trade-controller.ts';
import { TradeEventsController } from '../../../../src/features/trades/controllers/trade-events-controller.ts';
import { TradeCache } from '../../../../src/features/trades/trade-cache.ts';
import { TradeRepository } from '../../../../src/features/trades/repositories/trade-repository.ts';
import { TradeEventPublisher } from '../../../../src/features/trades/trade-event-publisher.ts';
import { TradeService } from '../../../../src/features/trades/services/trade-service.ts';
import { serializeTrade } from '../../../../src/features/trades/trade-serializer.ts';
import { createShutdownHandler } from '../../../../src/server-shutdown.ts';

describe('GET /api/v1/events', () => {
  it('streams canonical created, amended, and cancelled trade events', async () => {
    const tradeCache = new TradeCache();
    tradeCache.hydrate([]);
    const tradeEventPublisher = new TradeEventPublisher();
    const originalSubscribe = tradeEventPublisher.subscribe.bind(tradeEventPublisher);
    let resolveSubscriberRemoved = () => undefined;
    const subscriberRemoved = new Promise<void>((resolve) => {
      resolveSubscriberRemoved = resolve;
    });
    const unsubscribe = vi.fn(() => resolveSubscriberRemoved());
    vi.spyOn(tradeEventPublisher, 'subscribe').mockImplementation((listener) => {
      const removeListener = originalSubscribe(listener);
      return () => {
        removeListener();
        unsubscribe();
      };
    });
    const tradeEventsController = new TradeEventsController(tradeEventPublisher);
    const healthController = new HealthController();
    const tradeController = new TradeController(
      new TradeService(
        tradeCache,
        new TradeRepository({
          trade: {
            findMany: () => Promise.resolve([]),
            create: () => Promise.reject(new Error('Not used in SSE test')),
            findUnique: () => Promise.resolve(null),
            update: () => Promise.reject(new Error('Not used in SSE test')),
          },
        }),
        tradeEventPublisher,
      ),
    );
    const app = createApp({ healthController, tradeController, tradeEventsController });
    const server = app.listen(0);
    let streamResponse: IncomingMessage | undefined;
    let reconnectedResponse: IncomingMessage | undefined;

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
      expect(streamResponse.headers['content-encoding']).toBeUndefined();

      const eventTextPromise = new Promise<string>((resolve) => {
        let eventText = '';
        streamResponse?.on('data', (chunk: Buffer | string) => {
          eventText += chunk.toString();
          if (eventText.includes('event: trade.cancelled')) {
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
        tradeTimestamp: '2026-10-14T12:00:00.000Z',
        status: 'ACTIVE' as const,
      };

      tradeEventPublisher.publishTradeCreated(trade);
      tradeEventPublisher.publishTradeAmended({ ...trade, symbol: 'MSFT' });
      tradeEventPublisher.publishTradeCancelled({ ...trade, status: 'CANCELLED' });

      const eventText = await eventTextPromise;
      expect(eventText).toContain('event: trade.created\n');
      expect(eventText).toContain(`data: ${JSON.stringify(serializeTrade(trade))}`);
      expect(eventText).toContain('event: trade.amended\n');
      expect(eventText).toContain(
        `data: ${JSON.stringify(serializeTrade({ ...trade, symbol: 'MSFT' }))}`,
      );
      expect(eventText).toContain('event: trade.cancelled\n');
      expect(eventText).toContain(
        `data: ${JSON.stringify(serializeTrade({ ...trade, status: 'CANCELLED' }))}`,
      );
      streamResponse.destroy();
      await subscriberRemoved;
      expect(unsubscribe).toHaveBeenCalledOnce();

      const reconnectResponsePromise = new Promise<IncomingMessage>((resolve, reject) => {
        const clientRequest = get(
          { host: '127.0.0.1', port: address.port, path: ApiPath.tradeEvents },
          resolve,
        );
        clientRequest.once('error', reject);
      });
      reconnectedResponse = await reconnectResponsePromise;
      expect(reconnectedResponse.statusCode).toBe(200);

      const reconnectedEventPromise = new Promise<string>((resolve) => {
        let eventText = '';
        reconnectedResponse?.on('data', (chunk: Buffer | string) => {
          eventText += chunk.toString();
          if (eventText.includes('event: trade.created')) resolve(eventText);
        });
      });
      tradeEventPublisher.publishTradeCreated({ ...trade, id: 'reconnected-trade' });
      expect(await reconnectedEventPromise).toContain('event: trade.created\n');

      let reconnectedStreamEnded = false;
      const reconnectedStreamEndedPromise = new Promise<void>((resolve) => {
        reconnectedResponse?.once('close', () => {
          reconnectedStreamEnded = true;
          resolve();
        });
      });
      const disconnect = vi.fn(() => Promise.resolve());
      const closeActiveStreams = vi.fn(() => tradeEventsController.closeActiveStreams());
      const shutdown = createShutdownHandler(server, closeActiveStreams, disconnect);
      const firstShutdown = shutdown();
      const repeatedShutdown = shutdown();
      expect(repeatedShutdown).toBe(firstShutdown);
      expect(closeActiveStreams).toHaveBeenCalledOnce();
      expect(unsubscribe).toHaveBeenCalledTimes(2);
      await reconnectedStreamEndedPromise;
      await Promise.all([firstShutdown, repeatedShutdown]);
      expect(reconnectedStreamEnded).toBe(true);
      expect(disconnect).toHaveBeenCalledOnce();
      expect(unsubscribe).toHaveBeenCalledTimes(2);

      const restartedEventsController = new TradeEventsController(tradeEventPublisher);
      const restartedServer = createApp({
        healthController,
        tradeController,
        tradeEventsController: restartedEventsController,
      }).listen(0);
      let restartedResponse: IncomingMessage | undefined;
      try {
        await new Promise<void>((resolve) => restartedServer.once('listening', resolve));
        const restartedAddress = restartedServer.address();
        if (restartedAddress === null || typeof restartedAddress === 'string') {
          throw new Error('Restarted test server did not bind to a TCP port');
        }
        const restartedResponsePromise = new Promise<IncomingMessage>((resolve, reject) => {
          const clientRequest = get(
            { host: '127.0.0.1', port: restartedAddress.port, path: ApiPath.tradeEvents },
            resolve,
          );
          clientRequest.once('error', reject);
        });
        restartedResponse = await restartedResponsePromise;
        expect(restartedResponse.statusCode).toBe(200);
        const restartedStreamClosed = new Promise<void>((resolve) => {
          restartedResponse?.once('close', resolve);
        });
        restartedResponse.destroy();
        await restartedStreamClosed;
        await vi.waitFor(() => expect(unsubscribe).toHaveBeenCalledTimes(3));
        expect(unsubscribe).toHaveBeenCalledTimes(3);

        restartedEventsController.closeActiveStreams();
        const refusedStreamResponse = await fetch(
          `http://127.0.0.1:${restartedAddress.port}${ApiPath.tradeEvents}`,
        );
        expect(refusedStreamResponse.status).toBe(503);
        await refusedStreamResponse.arrayBuffer();
      } finally {
        restartedResponse?.destroy();
        await new Promise<void>((resolve) => restartedServer.close(() => resolve()));
      }
    } finally {
      streamResponse?.destroy();
      reconnectedResponse?.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
