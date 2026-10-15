import { describe, expect, it, vi } from 'vitest';
import { TradeRepository } from '../../../../src/features/trades/repositories/trade-repository.ts';
import type {
  PersistedTrade,
  TradeWriteDatabase,
} from '../../../../src/features/trades/repositories/trade-repository.ts';

const persistedTrade: PersistedTrade = {
  id: 'trade-1',
  symbol: 'AAPL',
  quantity: 100,
  price: { toNumber: () => 185.25 },
  side: 'BUY',
  trader: 'Alex Morgan',
  tradeDate: new Date('2026-10-14T12:00:00.000Z'),
  status: 'ACTIVE',
  book: null,
  counterparty: null,
};

describe('TradeRepository', () => {
  it('maps persisted records to domain trades', async () => {
    const findMany = vi
      .fn<TradeWriteDatabase['trade']['findMany']>()
      .mockResolvedValue([persistedTrade]);
    const create = vi.fn<TradeWriteDatabase['trade']['create']>();
    const repository = new TradeRepository({ trade: { findMany, create } });

    await expect(repository.findAll()).resolves.toEqual([
      {
        id: 'trade-1',
        symbol: 'AAPL',
        quantity: 100,
        price: 185.25,
        side: 'BUY',
        trader: 'Alex Morgan',
        tradeDate: '2026-10-14T12:00:00.000Z',
        status: 'ACTIVE',
      },
    ]);
  });

  it('propagates database read failures', async () => {
    const databaseError = new Error('Database unavailable');
    const findMany = vi
      .fn<TradeWriteDatabase['trade']['findMany']>()
      .mockRejectedValue(databaseError);
    const create = vi.fn<TradeWriteDatabase['trade']['create']>();
    const repository = new TradeRepository({ trade: { findMany, create } });

    await expect(repository.findAll()).rejects.toBe(databaseError);
  });

  it('creates a trade and maps the persisted record', async () => {
    const create = vi
      .fn<TradeWriteDatabase['trade']['create']>()
      .mockResolvedValue({ ...persistedTrade, id: 'generated-id' });
    const findMany = vi.fn<TradeWriteDatabase['trade']['findMany']>().mockResolvedValue([]);
    const repository = new TradeRepository({ trade: { findMany, create } });
    const input = {
      symbol: 'AAPL',
      quantity: 100,
      price: 185.25,
      side: 'BUY' as const,
      trader: 'Alex Morgan',
      tradeDate: '2026-10-14T12:00:00.000Z',
      status: 'ACTIVE' as const,
    };

    await expect(repository.create(input)).resolves.toEqual({
      id: 'generated-id',
      ...input,
      book: undefined,
      counterparty: undefined,
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        ...input,
        tradeDate: new Date(input.tradeDate),
        book: null,
        counterparty: null,
      },
    });
  });

  it('propagates write failures without returning a fabricated trade', async () => {
    const failure = new Error('Database unavailable');
    const create = vi.fn<TradeWriteDatabase['trade']['create']>().mockRejectedValue(failure);
    const findMany = vi.fn<TradeWriteDatabase['trade']['findMany']>();
    const repository = new TradeRepository({ trade: { findMany, create } });

    await expect(
      repository.create({
        symbol: 'AAPL',
        quantity: 10,
        price: 12,
        side: 'BUY',
        trader: 'Alex',
        tradeDate: '2026-10-14T12:00:00.000Z',
        status: 'ACTIVE',
      }),
    ).rejects.toBe(failure);
    expect(findMany).not.toHaveBeenCalled();
  });
});
