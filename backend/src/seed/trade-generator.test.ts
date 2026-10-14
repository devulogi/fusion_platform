import { describe, expect, it } from 'vitest';
import { generateTrades } from './trade-generator.js';

describe('generateTrades', () => {
  it('generates a realistic dataset that matches the assessment contract', () => {
    const now = new Date('2026-10-14T12:00:00.000Z');
    const trades = generateTrades(100, { random: () => 0.5, now });

    expect(trades).toHaveLength(100);
    expect(trades[0]?.id).toBe('TRD-100001');
    expect(trades[0]?.side).toBe('SELL');
    expect(trades[0]?.status).toBe('ACTIVE');
    expect(typeof trades[0]?.book).toBe('string');
    expect(typeof trades[0]?.counterparty).toBe('string');
    expect(new Set(trades.map((trade) => trade.id)).size).toBe(100);

    for (const trade of trades) {
      expect(trade.symbol).toBeTruthy();
      expect(trade.quantity).toBeGreaterThan(0);
      expect(trade.price).toBeGreaterThan(0);
      expect(['BUY', 'SELL']).toContain(trade.side);
      expect(['ACTIVE', 'CANCELLED']).toContain(trade.status);
      expect(new Date(trade.tradeDate).toISOString()).toBe(trade.tradeDate);
      expect(new Date(trade.tradeDate).getTime()).toBeLessThanOrEqual(now.getTime());
      expect(trade.trader).toBeTruthy();
    }
  });

  it('rejects counts outside the assessment range', () => {
    expect(() => generateTrades(99)).toThrow(RangeError);
    expect(() => generateTrades(1001)).toThrow(RangeError);
  });
});
