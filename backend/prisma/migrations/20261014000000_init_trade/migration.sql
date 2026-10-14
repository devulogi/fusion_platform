CREATE TYPE "TradeSide" AS ENUM ('BUY', 'SELL');

CREATE TYPE "TradeStatus" AS ENUM ('ACTIVE', 'CANCELLED');

CREATE TABLE "Trade" (
    "id" VARCHAR(32) NOT NULL,
    "symbol" VARCHAR(16) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(18, 4) NOT NULL,
    "side" "TradeSide" NOT NULL,
    "trader" VARCHAR(32) NOT NULL,
    "tradeDate" TIMESTAMPTZ(3) NOT NULL,
    "status" "TradeStatus" NOT NULL DEFAULT 'ACTIVE',
    "book" VARCHAR(64),
    "counterparty" VARCHAR(120),
    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Trade_quantity_positive" CHECK ("quantity" > 0),
    CONSTRAINT "Trade_price_positive" CHECK ("price" > 0)
);

CREATE INDEX "Trade_tradeDate_idx" ON "Trade"("tradeDate");