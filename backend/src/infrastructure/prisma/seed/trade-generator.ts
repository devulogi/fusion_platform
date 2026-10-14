import type { Trade, TradeSide, TradeStatus } from '../../../features/trades/models/trade.ts';

const symbols = ['AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMZN', 'GOOGL', 'META', 'JPM', 'BP', 'VOD'];
const traders = ['JSMITH', 'ABROWN', 'MJONES', 'RLEE', 'SKHAN', 'TNGUYEN'];
const books = ['EQUITIES_UK', 'EQUITIES_US', 'TECH_GROWTH', 'GLOBAL_LARGE_CAP'];
const counterparties = ['Goldman Sachs', 'JP Morgan', 'Morgan Stanley', 'Barclays', 'Citigroup'];
const maximumTradeAgeMilliseconds = 30 * 24 * 60 * 60 * 1000;

export interface TradeGeneratorOptions {
  random?: () => number;
  now?: Date;
}

function choose<T>(values: readonly T[], random: () => number): T {
  return values[Math.floor(random() * values.length)];
}

export function generateTrades(count: number, options: TradeGeneratorOptions = {}): Trade[] {
  if (!Number.isInteger(count) || count < 100 || count > 1000) {
    throw new RangeError('Trade dataset count must be an integer between 100 and 1000');
  }

  const random = options.random ?? Math.random;
  const now = options.now ?? new Date();

  return Array.from({ length: count }, (_, index) => {
    const side: TradeSide = random() < 0.5 ? 'BUY' : 'SELL';
    const status: TradeStatus = random() < 0.05 ? 'CANCELLED' : 'ACTIVE';
    const tradeDate = new Date(
      now.getTime() - Math.floor(random() * maximumTradeAgeMilliseconds),
    ).toISOString();

    return {
      id: `TRD-${100001 + index}`,
      symbol: choose(symbols, random),
      quantity: (Math.floor(random() * 100) + 1) * 100,
      price: Number((10 + random() * 990).toFixed(2)),
      side,
      trader: choose(traders, random),
      tradeDate,
      status,
      book: choose(books, random),
      counterparty: choose(counterparties, random),
    };
  });
}
