import { describe, expect, it } from 'vitest';
import { readSeedConfig } from './seed-config.js';

describe('readSeedConfig', () => {
    it('disables seeding unless explicitly enabled', () => {
        expect(readSeedConfig({})).toEqual({ enabled: false, count: 500 });
    });

    it('uses the default count and accepts configured counts in range', () => {
        expect(readSeedConfig({ SEED_TRADES: 'true' })).toEqual({ enabled: true, count: 500 });
        expect(readSeedConfig({ SEED_TRADES: 'true', SEED_TRADES_COUNT: '1000' })).toEqual({
            enabled: true,
            count: 1000,
        });
    });

    it.each(['99', '1001', '1.5', 'invalid'])('rejects an invalid count: %s', (count) => {
        expect(() => readSeedConfig({ SEED_TRADES: 'true', SEED_TRADES_COUNT: count })).toThrow(
            'SEED_TRADES_COUNT must be an integer between 100 and 1000',
        );
    });
});
