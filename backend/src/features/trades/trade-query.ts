import type { Trade, TradeCollectionQuery, TradePageData } from '../../types.ts';

const textCollator = new Intl.Collator('en', { sensitivity: 'base' });

export function queryCachedTrades(
  trades: readonly Trade[],
  query: TradeCollectionQuery,
): TradePageData {
  const startTime = query.startDate === undefined ? undefined : Date.parse(query.startDate);
  const endTime = query.endDate === undefined ? undefined : Date.parse(query.endDate);
  const symbol = query.symbol?.toLowerCase();
  const trader = query.trader?.toLowerCase();
  const matchingTrades = trades.filter((trade) => {
    if (symbol !== undefined && !trade.symbol.toLowerCase().includes(symbol)) return false;
    if (trader !== undefined && !trade.trader.toLowerCase().includes(trader)) return false;
    if (query.side !== undefined && !query.side.includes(trade.side)) return false;
    if (query.status !== undefined && !query.status.includes(trade.status)) return false;

    const tradeTime = Date.parse(trade.tradeTimestamp);
    if (startTime !== undefined && tradeTime < startTime) return false;
    if (endTime !== undefined && tradeTime > endTime) return false;
    return true;
  });
  const direction = query.sortDirection === 'asc' ? 1 : -1;
  const sortedTrades = [...matchingTrades].sort((left, right) => {
    const primaryOrder = compareTradeValues(left, right, query.sortBy);
    return direction * (primaryOrder || textCollator.compare(left.id, right.id));
  });
  const offset = (query.page - 1) * query.pageSize;

  return {
    items: sortedTrades.slice(offset, offset + query.pageSize),
    totalItems: matchingTrades.length,
  };
}

function compareTradeValues(
  left: Trade,
  right: Trade,
  field: TradeCollectionQuery['sortBy'],
): number {
  const leftValue = left[field];
  const rightValue = right[field];
  if (typeof leftValue === 'number' && typeof rightValue === 'number') {
    return leftValue - rightValue;
  }
  return textCollator.compare(String(leftValue), String(rightValue));
}
