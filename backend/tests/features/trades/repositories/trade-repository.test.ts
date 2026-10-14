import { describe, expect, it, vi } from 'vitest';
import { TradeRepository } from '../../../../src/features/trades/repositories/trade-repository.ts';
import type {
  PersistedTrade,
  TradeReadDatabase,
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
      .fn<TradeReadDatabase['trade']['findMany']>()
      .mockResolvedValue([persistedTrade]);
    const repository = new TradeRepository({ trade: { findMany } });

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
      .fn<TradeReadDatabase['trade']['findMany']>()
      .mockRejectedValue(databaseError);
    const repository = new TradeRepository({ trade: { findMany } });

    await expect(repository.findAll()).rejects.toBe(databaseError);
  });
});
