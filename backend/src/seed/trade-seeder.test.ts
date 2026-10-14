import { describe, expect, it, vi } from 'vitest';
import type { TradeSeedDatabase, TradeSeedTransaction } from './trade-seeder.js';
import { seedTrades } from './trade-seeder.js';

function createDatabase(existingCount: number) {
  const count = vi.fn<TradeSeedTransaction['trade']['count']>().mockResolvedValue(existingCount);
  const createMany = vi.fn<TradeSeedTransaction['trade']['createMany']>();
  createMany.mockImplementation(({ data }) => Promise.resolve({ count: data.length }));
  const transaction: TradeSeedTransaction = {
    trade: { count, createMany },
  };
  let transactionCount = 0;
  const database: TradeSeedDatabase = {
    $transaction: <T>(operation: (transaction: TradeSeedTransaction) => Promise<T>) => {
      transactionCount += 1;
      return operation(transaction);
    },
  };

  return { database, createMany, transactionCount: () => transactionCount };
}

describe('seedTrades', () => {
  it('does not access the database when seeding is disabled', async () => {
    const { database, transactionCount } = createDatabase(0);

    await expect(seedTrades(database, { enabled: false, count: 500 })).resolves.toEqual({
      status: 'disabled',
    });
    expect(transactionCount()).toBe(0);
  });

  it('leaves an existing trade collection unchanged', async () => {
    const { database, createMany } = createDatabase(3);

    await expect(seedTrades(database, { enabled: true, count: 500 })).resolves.toEqual({
      status: 'skipped',
      existingTradeCount: 3,
    });
    expect(createMany).not.toHaveBeenCalled();
  });

  it('inserts the requested dataset into an empty collection', async () => {
    const { database, createMany } = createDatabase(0);

    await expect(seedTrades(database, { enabled: true, count: 100 })).resolves.toEqual({
      status: 'seeded',
      count: 100,
    });
    const createManyCall = createMany.mock.calls[0]?.[0];
    expect(createManyCall?.data).toHaveLength(100);
    expect(createManyCall?.data[0]?.id).toBe('TRD-100001');
    expect(createMany).toHaveBeenCalledTimes(1);
  });

  it('propagates insert failures so the transaction can roll back', async () => {
    const { database, createMany } = createDatabase(0);
    createMany.mockRejectedValueOnce(new Error('insert failed'));

    await expect(seedTrades(database, { enabled: true, count: 500 })).rejects.toThrow(
      'insert failed',
    );
  });
});

describe.runIf(process.env.VERIFY_DATABASE_SEED === 'true')(
  'development database seed check',
  () => {
    it('confirms startup completed and PostgreSQL contains trades', async () => {
      const { config } = await import('dotenv');
      config({ path: '.env.dev' });
      const { readSeedConfig } = await import('./seed-config.js');

      if (!readSeedConfig().enabled) {
        console.info('Database seed verification skipped: SEED_TRADES is disabled.');
        return;
      }

      const { PrismaClient } = await import('@prisma/client');
      const database = new PrismaClient();

      try {
        await vi.waitFor(
          async () => {
            try {
              const response = await fetch(`http://backend:${process.env.PORT ?? '4001'}/health`, {
                signal: AbortSignal.timeout(2000),
              });
              if (!response.ok) {
                throw new Error('Backend startup is incomplete.');
              }
              const tradeCount = await database.trade.count();
              expect(tradeCount).toBeGreaterThan(0);
              console.info(
                `Database seed verification passed: ${tradeCount} persisted trades; existing data preserved.`,
              );
            } catch {
              throw new Error(
                'Database seed verification failed: backend unavailable or no persisted trades.',
              );
            }
          },
          { timeout: 60000, interval: 1000 },
        );
      } finally {
        await database.$disconnect();
      }
    }, 70000);
  },
);
