DROP INDEX "Trade_tradeTimestamp_idx";

CREATE INDEX "Trade_tradeTimestamp_id_idx"
    ON "Trade"("tradeTimestamp" DESC, "id" DESC);