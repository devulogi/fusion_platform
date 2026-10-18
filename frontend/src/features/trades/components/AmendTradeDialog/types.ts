import { z } from 'zod';
import type { Trade } from '../../trade-schema';

export type AmendTradeInput = Omit<Trade, 'id' | 'status'>;

export const amendTradeFormSchema = z
  .object({
    symbol: z
      .string()
      .trim()
      .min(1, 'Enter a symbol')
      .max(16, 'Symbol must be 16 characters or fewer'),
    quantity: z
      .number()
      .int('Quantity must be a whole number')
      .positive('Quantity must be greater than zero'),
    price: z.number().finite().positive('Price must be greater than zero'),
    side: z.enum(['BUY', 'SELL']),
    trader: z
      .string()
      .trim()
      .min(1, 'Enter a trader')
      .max(32, 'Trader must be 32 characters or fewer'),
    tradeTimestamp: z
      .string()
      .min(1, 'Enter a trade date')
      .refine((value) => Number.isFinite(Date.parse(value)), 'Enter a valid trade date'),
    book: z.string().max(64, 'Book must be 64 characters or fewer'),
    counterparty: z.string().max(120, 'Counterparty must be 120 characters or fewer'),
  })
  .strict();

export type AmendTradeFormValues = z.infer<typeof amendTradeFormSchema>;

export const emptyAmendTradeFormValues: AmendTradeFormValues = {
  symbol: '',
  quantity: 0,
  price: 0,
  side: 'BUY',
  trader: '',
  tradeTimestamp: '',
  book: '',
  counterparty: '',
};
