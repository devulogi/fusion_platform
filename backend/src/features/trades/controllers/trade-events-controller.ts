import type { RequestHandler } from 'express';
import { HttpStatus } from '../../../http/constants.ts';
import { serializeTrade } from '../serializers/trade-serializer.ts';
import { TradeEventPublisher } from '../trade-event-publisher.ts';

const eventStreamContentType = 'text/event-stream';

export class TradeEventsController {
  constructor(private readonly tradeEventPublisher: TradeEventPublisher) {}

  readonly stream: RequestHandler = (_request, response) => {
    response.status(HttpStatus.OK);
    response.setHeader('Content-Type', `${eventStreamContentType}; charset=utf-8`);
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');

    const unsubscribe = this.tradeEventPublisher.subscribe(({ type, trade }) => {
      response.write(`event: ${type}\ndata: ${JSON.stringify(serializeTrade(trade))}\n\n`);
    });

    response.once('close', unsubscribe);
    response.flushHeaders();
    response.write('retry: 3000\n\n');
  };
}
