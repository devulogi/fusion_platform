import { z } from 'zod';

const createTradeFormSchema = z
  .object({
    symbol: z.string().trim().min(1, 'Enter a symbol').max(16, 'Use 16 characters or fewer'),
    quantity: z
      .number({ invalid_type_error: 'Enter a quantity above zero' })
      .int('Enter a whole number')
      .positive('Enter a quantity above zero'),
    price: z
      .number({ invalid_type_error: 'Enter a price above zero' })
      .finite('Enter a valid price')
      .positive('Enter a price above zero'),
    side: z.enum(['BUY', 'SELL'], {
      errorMap: () => ({ message: 'Select a side' }),
    }),
    trader: z.string().trim().min(1, 'Enter a trader').max(32, 'Use 32 characters or fewer'),
    tradeTimestamp: z
      .string()
      .min(1, 'Enter a trade date and time')
      .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid trade date and time')
      .transform((value) => new Date(value).toISOString()),
    status: z.enum(['ACTIVE', 'CANCELLED'], {
      errorMap: () => ({ message: 'Select a status' }),
    }),
    book: z
      .string()
      .max(64, 'Use 64 characters or fewer')
      .optional()
      .transform((value) => value?.trim() || undefined),
    counterparty: z
      .string()
      .max(120, 'Use 120 characters or fewer')
      .optional()
      .transform((value) => value?.trim() || undefined),
  })
  .strict();

export type CreateTradeInput = z.output<typeof createTradeFormSchema>;
export type CreateTradeFormValues = z.input<typeof createTradeFormSchema>;
export type CreateTradeFieldName = keyof CreateTradeInput;
export { createTradeFormSchema };
