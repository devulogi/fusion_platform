import {
  amendTradeInputSchema,
  createTradeInputSchema,
  tradeCollectionQuerySchema,
  tradeIdSchema,
} from '../../schemas.ts';
import { cancelTradeInputSchema } from '../../schemas.ts';
import { TradeInputValidationError } from '../../errors.ts';
import type {
  AmendTradeInput,
  CancelTradeInput,
  CreateTradeInput,
  TradeCollectionQuery,
} from '../../types.ts';

export function parseTradeCollectionQuery(input: unknown): TradeCollectionQuery {
  const result = tradeCollectionQuerySchema.safeParse(input);
  if (!result.success) {
    throw new TradeInputValidationError(result.error);
  }
  return result.data;
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

export function parseCancelTradeInput(input: unknown): CancelTradeInput {
  const result = cancelTradeInputSchema.safeParse(input);
  if (!result.success) {
    throw new TradeInputValidationError(result.error);
  }
  return result.data;
}

export function parseTradeId(input: unknown): string {
  const result = tradeIdSchema.safeParse(input);
  if (!result.success) {
    throw new TradeInputValidationError(result.error);
  }
  return result.data;
}
