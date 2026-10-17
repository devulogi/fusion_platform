import { z } from '../../http/openapi/zod.ts';
import type { ZodError } from 'zod';

export const createTradeInputSchema = z
  .object({
    symbol: z.string().trim().min(1).max(16),
    quantity: z.number().int().positive(),
    price: z.number().finite().positive(),
    side: z.enum(['BUY', 'SELL']),
    trader: z.string().trim().min(1).max(32),
    tradeDate: z.string().datetime(),
    status: z.enum(['ACTIVE', 'CANCELLED']),
    book: z.string().max(64).nullable().optional(),
    counterparty: z.string().max(120).nullable().optional(),
  })
  .strict()
  .openapi('CreateTradeRequest');

export const amendTradeInputSchema = createTradeInputSchema
  .omit({ status: true })
  .partial()
  .strict()
  .openapi('AmendTradeRequest');

export type CreateTradeInput = z.infer<typeof createTradeInputSchema>;
export type AmendTradeInput = z.infer<typeof amendTradeInputSchema>;

export class TradeInputValidationError extends Error {
  constructor(readonly cause: ZodError) {
    super('Invalid trade input', { cause });
    this.name = 'TradeInputValidationError';
  }
}

export function parseCreateTradeInput(input: unknown): CreateTradeInput {
  const result = createTradeInputSchema.safeParse(input);
  if (!result.success) {
    throw new TradeInputValidationError(result.error);
  }
  return result.data;
}

export function parseAmendTradeInput(input: unknown): AmendTradeInput {
  const result = amendTradeInputSchema.safeParse(input);
  if (!result.success) {
    throw new TradeInputValidationError(result.error);
  }
  return result.data;
}

export function parseTradeId(input: unknown): string {
  const result = z.string().min(1).max(32).safeParse(input);
  if (!result.success) {
    throw new TradeInputValidationError(result.error);
  }
  return result.data;
}
