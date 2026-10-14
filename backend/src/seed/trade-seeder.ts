import type { Trade } from '../domain/trade.js';
import { generateTrades } from './trade-generator.js';
import type { SeedConfig } from './seed-config.js';

type PersistedTradeSeed = Omit<Trade, 'tradeDate'> & { tradeDate: Date };

export interface TradeSeedTransaction {
    trade: {
        count(): Promise<number>;
        createMany(args: { data: PersistedTradeSeed[] }): Promise<{ count: number }>;
    };
}

export interface TradeSeedDatabase {
    $transaction<T>(operation: (transaction: TradeSeedTransaction) => Promise<T>): Promise<T>;
}

export type SeedResult =
    | { status: 'disabled' }
    | { status: 'skipped'; existingTradeCount: number }
    | { status: 'seeded'; count: number };

export async function seedTrades(
    database: TradeSeedDatabase,
    config: SeedConfig,
): Promise<SeedResult> {
    if (!config.enabled) {
        return { status: 'disabled' };
    }

    return database.$transaction(async (transaction) => {
        const existingTradeCount = await transaction.trade.count();

        if (existingTradeCount > 0) {
            return { status: 'skipped', existingTradeCount };
        }

        const trades = generateTrades(config.count).map((trade) => ({
            ...trade,
            tradeDate: new Date(trade.tradeDate),
        }));
        const result = await transaction.trade.createMany({ data: trades });

        return { status: 'seeded', count: result.count };
    });
}
