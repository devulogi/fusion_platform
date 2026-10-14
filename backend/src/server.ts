import app from './app.js';
import { PrismaClient } from '@prisma/client';
import { readSeedConfig } from './seed/seed-config.js';
import { seedTrades } from './seed/trade-seeder.js';

const port = Number(process.env.PORT) || 3001;
const prisma = new PrismaClient();

async function start(): Promise<void> {
  const seedConfig = readSeedConfig();
  await prisma.$connect();

  const seedResult = await seedTrades(prisma, seedConfig);

  if (seedResult.status !== 'disabled') {
    console.info('Trade seeding result:', seedResult);
  }

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
