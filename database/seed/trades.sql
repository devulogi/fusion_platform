WITH random_values AS MATERIALIZED (
  SELECT
    trade_number,
    random() AS side_roll,
    random() AS status_roll,
    random() AS trade_date_roll,
    random() AS symbol_roll,
    random() AS quantity_roll,
    random() AS price_roll,
    random() AS trader_roll,
    random() AS book_roll,
    random() AS counterparty_roll
  FROM generate_series(1, :trade_count) AS series(trade_number)
), generated_trades AS (
  SELECT
    'TRD-' || (100000 + trade_number)::text AS id,
    (ARRAY['AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMZN', 'GOOGL', 'META', 'JPM', 'BP', 'VOD'])[floor(symbol_roll * 10)::integer + 1] AS symbol,
    (floor(quantity_roll * 100)::integer + 1) * 100 AS quantity,
    round((10 + price_roll * 990)::numeric, 2)::decimal(18, 4) AS price,
    (CASE WHEN side_roll < 0.5 THEN 'BUY' ELSE 'SELL' END)::"TradeSide" AS side,
    (ARRAY['JSMITH', 'ABROWN', 'MJONES', 'RLEE', 'SKHAN', 'TNGUYEN'])[floor(trader_roll * 6)::integer + 1] AS trader,
    CURRENT_TIMESTAMP - floor(trade_date_roll * 2592000000)::bigint * INTERVAL '1 millisecond' AS "tradeDate",
    (CASE WHEN status_roll < 0.05 THEN 'CANCELLED' ELSE 'ACTIVE' END)::"TradeStatus" AS status,
    (ARRAY['EQUITIES_UK', 'EQUITIES_US', 'TECH_GROWTH', 'GLOBAL_LARGE_CAP'])[floor(book_roll * 4)::integer + 1] AS book,
    (ARRAY['Goldman Sachs', 'JP Morgan', 'Morgan Stanley', 'Barclays', 'Citigroup'])[floor(counterparty_roll * 5)::integer + 1] AS counterparty
  FROM random_values
)
INSERT INTO "Trade" (
  "id",
  "symbol",
  "quantity",
  "price",
  "side",
  "trader",
  "tradeDate",
  "status",
  "book",
  "counterparty"
)
SELECT
  id,
  symbol,
  quantity,
  price,
  side,
  trader,
  "tradeDate",
  status,
  book,
  counterparty
FROM generated_trades
WHERE NOT EXISTS (SELECT 1 FROM "Trade");