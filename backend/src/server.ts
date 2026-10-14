import app, { tradeCache } from './app.ts';
import { PrismaClient } from '@prisma/client';
import { TradeRepository } from './features/trades/repositories/trade-repository.ts';

const port = Number(process.env.PORT) || 3001;
const prisma = new PrismaClient();
const tradeRepository = new TradeRepository(prisma);

async function start(): Promise<void> {
  await prisma.$connect();
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
