export const defaultSeedTradeCount = 500;

export interface SeedConfig {
    enabled: boolean;
    count: number;
}

export function readSeedConfig(
    environment: Record<string, string | undefined> = process.env,
): SeedConfig {
    if (environment.SEED_TRADES !== 'true') {
        return { enabled: false, count: defaultSeedTradeCount };
    }

    const count = environment.SEED_TRADES_COUNT
        ? Number(environment.SEED_TRADES_COUNT)
        : defaultSeedTradeCount;

    if (!Number.isInteger(count) || count < 100 || count > 1000) {
        throw new Error('SEED_TRADES_COUNT must be an integer between 100 and 1000');
    }

    return { enabled: true, count };
}
