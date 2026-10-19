import type { z } from 'zod';
import type { Logger } from 'pino';
import type {
  amendTradeInputSchema,
  apiErrorDetailSchema,
  cancelTradeInputSchema,
  createTradeInputSchema,
  healthResponseSchema,
  readinessResponseSchema,
  tradeCollectionQuerySchema,
  tradeCollectionResponseSchema,
  tradeIdSchema,
  tradeResponseSchema,
} from './schemas.ts';
import type { TradeEventType, TRADE_SIDE, TRADE_STATUS } from './constants.ts';
import type { HealthController } from './features/health/controllers/health-controller.ts';
import type { TradeController } from './features/trades/controllers/trade-controller.ts';
import type { TradeEventsController } from './features/trades/controllers/trade-events-controller.ts';

export type AppDependencies = {
  healthController: HealthController;
  tradeController: TradeController;
  tradeEventsController: TradeEventsController;
  logger?: RequestLogger;
};

export type RequestLogger = Logger;

export type ApiErrorMapping = {
  status: number;
  body: unknown;
  logUnexpected: boolean;
};

export type ReadinessCheck = () => Promise<boolean>;
export type TradeId = z.infer<typeof tradeIdSchema>;
export type TradeSide = (typeof TRADE_SIDE)[keyof typeof TRADE_SIDE];
export type TradeStatus = (typeof TRADE_STATUS)[keyof typeof TRADE_STATUS];
export type TradeEventName = (typeof TradeEventType)[keyof typeof TradeEventType];
export type CreateTradeInput = z.infer<typeof createTradeInputSchema>;
export type AmendTradeInput = z.infer<typeof amendTradeInputSchema>;
export type CancelTradeInput = z.infer<typeof cancelTradeInputSchema>;
export type TradeResponse = z.infer<typeof tradeResponseSchema>;
export type TradeCollectionResponse = z.infer<typeof tradeCollectionResponseSchema>;
export type TradeCollectionQuery = z.infer<typeof tradeCollectionQuerySchema>;
export type TradeCollectionPagination = TradeCollectionResponse['pagination'];
export type ApiErrorDetail = z.infer<typeof apiErrorDetailSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type ReadinessResponse = z.infer<typeof readinessResponseSchema>;

export type Trade = {
  readonly id: TradeId;
  readonly symbol: string;
  readonly quantity: number;
  readonly price: number;
  readonly side: TradeSide;
  readonly trader: string;
  readonly tradeTimestamp: string;
  readonly status: TradeStatus;
  readonly book?: string;
  readonly counterparty?: string;
};

export type TradePage = {
  readonly items: Trade[];
  readonly pagination: TradeCollectionPagination;
};

export type TradePageData = {
  readonly items: Trade[];
  readonly totalItems: number;
};

export type TradeChangedEvent = {
  readonly type: TradeEventName;
  readonly trade: Trade;
};

export type TradeEventListener = (event: TradeChangedEvent) => void;

export type TradeMutationResult = {
  readonly trade: Trade;
  readonly changed: boolean;
};

export type TradeRepositoryContract = {
  findAll(): Promise<Trade[]>;
  create(input: CreateTradeInput): Promise<Trade>;
  amend(id: string, input: AmendTradeInput): Promise<Trade>;
  cancel(id: string): Promise<TradeMutationResult>;
};

export type PersistedTrade = {
  readonly id: string;
  readonly symbol: string;
  readonly quantity: number;
  readonly price: { toNumber(): number };
  readonly side: TradeSide;
  readonly trader: string;
  readonly tradeTimestamp: Date;
  readonly status: TradeStatus;
  readonly book: string | null;
  readonly counterparty: string | null;
};

export type PersistedTradeCreateData = {
  readonly symbol: string;
  readonly quantity: number;
  readonly price: number;
  readonly side: TradeSide;
  readonly trader: string;
  readonly tradeTimestamp: Date;
  readonly status: TradeStatus;
  readonly book: string | null;
  readonly counterparty: string | null;
};

export type PersistedTradeUpdateData = Partial<PersistedTradeCreateData>;

export type TradeWriteDatabase = {
  trade: {
    findMany(): Promise<PersistedTrade[]>;
    findUnique(args: { where: { id: string } }): Promise<PersistedTrade | null>;
    create(args: { data: PersistedTradeCreateData }): Promise<PersistedTrade>;
    update(args: {
      where: { id: string; status: TradeStatus };
      data: PersistedTradeUpdateData;
    }): Promise<PersistedTrade>;
  };
};
