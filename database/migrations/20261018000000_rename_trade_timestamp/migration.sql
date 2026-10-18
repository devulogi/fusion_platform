ALTER TABLE "Trade" RENAME COLUMN "tradeDate" TO "tradeTimestamp";

ALTER INDEX "Trade_tradeDate_idx" RENAME TO "Trade_tradeTimestamp_idx";