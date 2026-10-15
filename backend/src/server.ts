import { createApp } from './app.ts';
import { PrismaClient } from '@prisma/client';
import { HealthController } from './features/health/controllers/health-controller.ts';
import { TradeController } from './features/trades/controllers/trade-controller.ts';
import { TradeCache } from './features/trades/trade-cache.ts';
import { TradeRepository } from './features/trades/repositories/trade-repository.ts';
import { TradeService } from './features/trades/services/trade-service.ts';

const port = Number(process.env.PORT) || 3001;
const prisma = new PrismaClient();
const tradeCache = new TradeCache();
const tradeRepository = new TradeRepository(prisma);
const tradeService = new TradeService(tradeCache);
const tradeController = new TradeController(tradeService);
const healthController = new HealthController();
const app = createApp({ healthController, tradeController });

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
