import app, { tradeCache } from './app.ts';
import { PrismaClient } from '@prisma/client';
import { readSeedConfig } from './infrastructure/prisma/seed/seed-config.ts';
import { seedTrades } from './infrastructure/prisma/seed/trade-seeder.ts';
import { TradeRepository } from './features/trades/repositories/trade-repository.ts';

const port = Number(process.env.PORT) || 3001;
const prisma = new PrismaClient();
const tradeRepository = new TradeRepository(prisma);

async function start(): Promise<void> {
  const seedConfig = readSeedConfig();
  await prisma.$connect();

  const seedResult = await seedTrades(prisma, seedConfig);

  if (seedResult.status !== 'disabled') {
    console.info('Trade seeding result:', seedResult);
  }

  const trades = await tradeRepository.findAll();
  tradeCache.hydrate(trades);

  const server = app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });

  const shutdown = (): void => {
    server.close(() => {
      void prisma.$disconnect();
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

void start().catch(async (error: unknown) => {
  console.error('Backend startup failed:', error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
