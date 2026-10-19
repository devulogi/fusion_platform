import type { RequestHandler, Response } from 'express';
import { HttpStatus } from '../../../constants.ts';
import { serializeTrade } from '../trade-serializer.ts';
import { TradeEventPublisher } from '../trade-event-publisher.ts';

const eventStreamContentType = 'text/event-stream';

interface ActiveStream {
  unsubscribe: () => void;
  onClose: () => void;
}

export class TradeEventsController {
  private readonly activeStreams = new Map<Response, ActiveStream>();
  private isDraining = false;

  constructor(private readonly tradeEventPublisher: TradeEventPublisher) {}

  readonly stream: RequestHandler = (_request, response) => {
    if (this.isDraining) {
      response.status(HttpStatus.SERVICE_UNAVAILABLE).end();
      return;
    }

    response.status(HttpStatus.OK);
    response.setHeader('Content-Type', `${eventStreamContentType}; charset=utf-8`);
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');

    const unsubscribe = this.tradeEventPublisher.subscribe(({ type, trade }) => {
      response.write(`event: ${type}\ndata: ${JSON.stringify(serializeTrade(trade))}\n\n`);
    });

    const onClose = (): void => {
      if (!this.activeStreams.delete(response)) return;
      unsubscribe();
    };
    this.activeStreams.set(response, { unsubscribe, onClose });
    response.once('close', onClose);
    response.flushHeaders();
    response.write('retry: 3000\n\n');
  };

  closeActiveStreams(): void {
    this.isDraining = true;
    for (const [response, stream] of this.activeStreams) {
      this.activeStreams.delete(response);
      response.removeListener('close', stream.onClose);
      stream.unsubscribe();
      response.end(() => response.socket?.end());
    }
  }
}
