import type { AmendTradeInput } from './components/AmendTradeDialog';
import type { CreateTradeInput } from './components/CreateTradeDialog';
import { tradePageSchema, tradeSchema } from './trade-schema';
import type { Trade, TradePage, TradeQuery } from './trade-schema';

async function parseTradeResponse(response: Response, errorMessage: string): Promise<Trade> {
  if (!response.ok) throw new Error(errorMessage);

  const payload: unknown = await response.json();
  const result = tradeSchema.safeParse(payload);
  if (!result.success) throw new Error('Trade command response was invalid');

  return result.data;
}

function localDayStart(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString();
}

function localDayEnd(date: string): string {
  return new Date(`${date}T23:59:59.999`).toISOString();
}

export async function fetchTradePage(query: TradeQuery): Promise<TradePage> {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
    sortBy: query.sortBy,
    sortDirection: query.sortDirection,
  });
  if (query.symbol.trim()) params.set('symbol', query.symbol.trim());
  if (query.trader.trim()) params.set('trader', query.trader.trim());
  for (const side of query.sides) params.append('side', side);
  for (const status of query.statuses) params.append('status', status);
  if (query.startDate) params.set('startDate', localDayStart(query.startDate));
  if (query.endDate) params.set('endDate', localDayEnd(query.endDate));

  const response = await fetch(`/api/v1/trades?${params.toString()}`);
  if (!response.ok) throw new Error('Trade snapshot request failed');

  const payload: unknown = await response.json();
  const result = tradePageSchema.safeParse(payload);
  if (!result.success) throw new Error('Trade snapshot response was invalid');

  return result.data;
}

export async function createTrade(input: CreateTradeInput): Promise<Trade> {
  const response = await fetch('/api/v1/trades', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseTradeResponse(response, 'Trade command failed');
}

export async function amendTrade(tradeId: string, input: AmendTradeInput): Promise<Trade> {
  const response = await fetch(`/api/v1/trades/${encodeURIComponent(tradeId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseTradeResponse(response, 'Trade command failed');
}

export async function cancelTrade(tradeId: string): Promise<Trade> {
  const response = await fetch(`/api/v1/trades/${encodeURIComponent(tradeId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'CANCELLED' }),
  });
  return parseTradeResponse(response, 'Trade command failed');
}
