import { z } from 'zod';

export const tradeSchema = z
  .object({
    id: z.string(),
    symbol: z.string(),
    quantity: z.number(),
    price: z.number(),
    side: z.enum(['BUY', 'SELL']),
    trader: z.string(),
    tradeTimestamp: z.string(),
    status: z.enum(['ACTIVE', 'CANCELLED']),
    book: z.string().nullable(),
    counterparty: z.string().nullable(),
  })
  .strict();

export const tradePageSchema = z
  .object({
    items: z.array(tradeSchema),
    pagination: z
      .object({
        page: z.number().int().positive(),
        pageSize: z.number().int().positive(),
        totalItems: z.number().int().nonnegative(),
        pageCount: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();

export const tradeEventTypes = ['trade.created', 'trade.amended', 'trade.cancelled'] as const;

export type Trade = z.infer<typeof tradeSchema>;
export type TradePage = z.infer<typeof tradePageSchema>;
export type TradeSortBy =
  'symbol' | 'tradeTimestamp' | 'quantity' | 'price' | 'trader' | 'side' | 'status';
export type TradeSortDirection = 'asc' | 'desc';
export type TradeQuery = {
  page: number;
  pageSize: number;
  sortBy: TradeSortBy;
  sortDirection: TradeSortDirection;
  symbol: string;
  trader: string;
  sides: Trade['side'][];
  statuses: Trade['status'][];
  startDate: string;
  endDate: string;
};
