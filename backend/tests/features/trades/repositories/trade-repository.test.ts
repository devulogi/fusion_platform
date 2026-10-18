import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { TradeRepository } from '../../../../src/features/trades/repositories/trade-repository.ts';
import { TradeNotAmendableError, TradeNotFoundError } from '../../../../src/errors.ts';
import type { PersistedTrade, TradeWriteDatabase } from '../../../../src/types.ts';

const persistedTrade: PersistedTrade = {
  id: 'trade-1',
  symbol: 'AAPL',
  quantity: 100,
  price: { toNumber: () => 185.25 },
  side: 'BUY',
  trader: 'Alex Morgan',
  tradeTimestamp: new Date('2026-10-14T12:00:00.000Z'),
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
    const repository = new TradeRepository({
      trade: {
        findMany,
        create,
        findUnique: () => Promise.resolve(null),
        update: () => Promise.reject(new Error('Not used in read test')),
      },
    });

    await expect(repository.findAll()).resolves.toEqual([
      {
        id: 'trade-1',
        symbol: 'AAPL',
        quantity: 100,
        price: 185.25,
        side: 'BUY',
        trader: 'Alex Morgan',
        tradeTimestamp: '2026-10-14T12:00:00.000Z',
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
    const repository = new TradeRepository({
      trade: {
        findMany,
        create,
        findUnique: () => Promise.resolve(null),
        update: () => Promise.reject(new Error('Not used in read test')),
      },
    });

    await expect(repository.findAll()).rejects.toBe(databaseError);
  });

  it('creates a trade and maps the persisted record', async () => {
    const create = vi
      .fn<TradeWriteDatabase['trade']['create']>()
      .mockResolvedValue({ ...persistedTrade, id: 'generated-id' });
    const findMany = vi.fn<TradeWriteDatabase['trade']['findMany']>().mockResolvedValue([]);
    const repository = new TradeRepository({
      trade: {
        findMany,
        create,
        findUnique: () => Promise.resolve(null),
        update: () => Promise.reject(new Error('Not used in create test')),
      },
    });
    const input = {
      symbol: 'AAPL',
      quantity: 100,
      price: 185.25,
      side: 'BUY' as const,
      trader: 'Alex Morgan',
      tradeTimestamp: '2026-10-14T12:00:00.000Z',
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
        tradeTimestamp: new Date(input.tradeTimestamp),
        book: null,
        counterparty: null,
      },
    });
  });

  it('propagates write failures without returning a fabricated trade', async () => {
    const failure = new Error('Database unavailable');
    const create = vi.fn<TradeWriteDatabase['trade']['create']>().mockRejectedValue(failure);
    const findMany = vi.fn<TradeWriteDatabase['trade']['findMany']>();
    const repository = new TradeRepository({
      trade: {
        findMany,
        create,
        findUnique: () => Promise.resolve(null),
        update: () => Promise.reject(new Error('Not used in create test')),
      },
    });

    await expect(
      repository.create({
        symbol: 'AAPL',
        quantity: 10,
        price: 12,
        side: 'BUY',
        trader: 'Alex',
        tradeTimestamp: '2026-10-14T12:00:00.000Z',
        status: 'ACTIVE',
      }),
    ).rejects.toBe(failure);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('conditionally updates an active trade and returns the canonical row', async () => {
    const updatedTrade: PersistedTrade = {
      ...persistedTrade,
      symbol: 'MSFT',
      price: { toNumber: () => 420.5 },
      book: 'EQUITIES_US',
    };
    const update = vi.fn().mockResolvedValue(updatedTrade);
    const repository = new TradeRepository({
      trade: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(persistedTrade),
        create: vi.fn(),
        update,
      },
    });
    const input = {
      symbol: 'MSFT',
      price: 420.5,
      tradeTimestamp: '2026-10-15T10:30:00.000Z',
      book: 'EQUITIES_US',
    };

    await expect(repository.amend('trade-1', input)).resolves.toEqual({
      id: 'trade-1',
      symbol: 'MSFT',
      quantity: 100,
      price: 420.5,
      side: 'BUY',
      trader: 'Alex Morgan',
      tradeTimestamp: '2026-10-14T12:00:00.000Z',
      status: 'ACTIVE',
      book: 'EQUITIES_US',
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'trade-1', status: 'ACTIVE' },
      data: {
        symbol: 'MSFT',
        price: 420.5,
        tradeTimestamp: new Date(input.tradeTimestamp),
        book: 'EQUITIES_US',
      },
    });
  });

  it('maps an absent row after a conditional update failure to not found', async () => {
    const updateError = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: 'test',
    });
    const findUnique = vi.fn<TradeWriteDatabase['trade']['findUnique']>().mockResolvedValue(null);
    const repository = new TradeRepository({
      trade: {
        findMany: vi.fn<TradeWriteDatabase['trade']['findMany']>().mockResolvedValue([]),
        findUnique,
        create: vi.fn<TradeWriteDatabase['trade']['create']>(),
        update: vi.fn<TradeWriteDatabase['trade']['update']>().mockRejectedValue(updateError),
      },
    });

    await expect(repository.amend('missing-trade', { symbol: 'MSFT' })).rejects.toBeInstanceOf(
      TradeNotFoundError,
    );
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'missing-trade' } });
  });

  it('maps an existing cancelled row after a conditional update failure to not amendable', async () => {
    const updateError = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: 'test',
    });
    const findUnique = vi
      .fn<TradeWriteDatabase['trade']['findUnique']>()
      .mockResolvedValue({ ...persistedTrade, status: 'CANCELLED' });
    const repository = new TradeRepository({
      trade: {
        findMany: vi.fn<TradeWriteDatabase['trade']['findMany']>().mockResolvedValue([]),
        findUnique,
        create: vi.fn<TradeWriteDatabase['trade']['create']>(),
        update: vi.fn<TradeWriteDatabase['trade']['update']>().mockRejectedValue(updateError),
      },
    });

    await expect(repository.amend('trade-1', { symbol: 'MSFT' })).rejects.toBeInstanceOf(
      TradeNotAmendableError,
    );
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'trade-1' } });
  });

  it('conditionally cancels an active trade and returns the canonical row', async () => {
    const cancelledTrade: PersistedTrade = { ...persistedTrade, status: 'CANCELLED' };
    const update = vi.fn<TradeWriteDatabase['trade']['update']>().mockResolvedValue(cancelledTrade);
    const repository = new TradeRepository({
      trade: {
        findMany: vi.fn<TradeWriteDatabase['trade']['findMany']>().mockResolvedValue([]),
        findUnique: vi.fn<TradeWriteDatabase['trade']['findUnique']>().mockResolvedValue(null),
        create: vi.fn<TradeWriteDatabase['trade']['create']>(),
        update,
      },
    });

    await expect(repository.cancel('trade-1')).resolves.toEqual({
      trade: {
        id: 'trade-1',
        symbol: 'AAPL',
        quantity: 100,
        price: 185.25,
        side: 'BUY',
        trader: 'Alex Morgan',
        tradeTimestamp: '2026-10-14T12:00:00.000Z',
        status: 'CANCELLED',
      },
      changed: true,
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'trade-1', status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    });
  });

  it('returns an already cancelled trade without marking it changed', async () => {
    const updateError = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: 'test',
    });
    const cancelledTrade: PersistedTrade = { ...persistedTrade, status: 'CANCELLED' };
    const findUnique = vi
      .fn<TradeWriteDatabase['trade']['findUnique']>()
      .mockResolvedValue(cancelledTrade);
    const repository = new TradeRepository({
      trade: {
        findMany: vi.fn<TradeWriteDatabase['trade']['findMany']>().mockResolvedValue([]),
        findUnique,
        create: vi.fn<TradeWriteDatabase['trade']['create']>(),
        update: vi.fn<TradeWriteDatabase['trade']['update']>().mockRejectedValue(updateError),
      },
    });

    await expect(repository.cancel('trade-1')).resolves.toEqual({
      trade: {
        id: 'trade-1',
        symbol: 'AAPL',
        quantity: 100,
        price: 185.25,
        side: 'BUY',
        trader: 'Alex Morgan',
        tradeTimestamp: '2026-10-14T12:00:00.000Z',
        status: 'CANCELLED',
      },
      changed: false,
    });
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'trade-1' } });
  });

  it('maps a missing row after a conditional cancellation failure to not found', async () => {
    const updateError = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: 'test',
    });
    const repository = new TradeRepository({
      trade: {
        findMany: vi.fn<TradeWriteDatabase['trade']['findMany']>().mockResolvedValue([]),
        findUnique: vi.fn<TradeWriteDatabase['trade']['findUnique']>().mockResolvedValue(null),
        create: vi.fn<TradeWriteDatabase['trade']['create']>(),
        update: vi.fn<TradeWriteDatabase['trade']['update']>().mockRejectedValue(updateError),
      },
    });

    await expect(repository.cancel('missing-trade')).rejects.toBeInstanceOf(TradeNotFoundError);
  });
});
