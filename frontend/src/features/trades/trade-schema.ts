import { z } from 'zod';

export const tradeSchema = z
  .object({
    id: z.string(),
    symbol: z.string(),
    quantity: z.number(),
    price: z.number(),
    side: z.enum(['BUY', 'SELL']),
    trader: z.string(),
    tradeDate: z.string(),
    status: z.enum(['ACTIVE', 'CANCELLED']),
    book: z.string().nullable(),
    counterparty: z.string().nullable(),
  })
  .strict();

export const tradeCollectionSchema = z.object({ items: z.array(tradeSchema) }).strict();

export const tradeEventTypes = [
  'trade.created',
  'trade.amended',
  'trade.cancelled',
  'trade.reactivated',
] as const;

export type Trade = z.infer<typeof tradeSchema>;
