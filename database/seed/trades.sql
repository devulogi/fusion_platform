WITH fixed_trades AS (
  SELECT
    'TRD-100001' AS id,
    'AAPL' AS symbol,
    5000 AS quantity,
    227.45::decimal(18, 4) AS price,
    'BUY'::"TradeSide" AS side,
    'JSMITH' AS trader,
    '2026-08-18T09:15:23Z'::timestamptz AS "tradeTimestamp",
    'ACTIVE'::"TradeStatus" AS status,
    'EQUITIES_UK' AS book,
    'Goldman Sachs' AS counterparty
  UNION ALL
  SELECT
    'TRD-100002', 'MSFT', 1200, 534.22::decimal(18, 4), 'SELL'::"TradeSide",
    'ABROWN', '2026-08-18T09:18:54Z'::timestamptz, 'ACTIVE'::"TradeStatus",
    'EQUITIES_US', 'JP Morgan'
  UNION ALL
  SELECT
    'TRD-100003', 'TSLA', 800, 341.75::decimal(18, 4), 'BUY'::"TradeSide",
    'MJONES', '2026-08-18T09:20:11Z'::timestamptz, 'CANCELLED'::"TradeStatus",
    'TECH_GROWTH', 'Morgan Stanley'
), random_values AS MATERIALIZED (
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
  FROM generate_series(4, :trade_count) AS series(trade_number)
), generated_trades AS (
  SELECT
    'TRD-' || (100000 + trade_number)::text AS id,
    (ARRAY['AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMZN', 'GOOGL', 'META', 'JPM', 'BP', 'VOD'])[floor(symbol_roll * 10)::integer + 1] AS symbol,
    (floor(quantity_roll * 100)::integer + 1) * 100 AS quantity,
    round((10 + price_roll * 990)::numeric, 2)::decimal(18, 4) AS price,
    (CASE WHEN side_roll < 0.5 THEN 'BUY' ELSE 'SELL' END)::"TradeSide" AS side,
    (ARRAY['JSMITH', 'ABROWN', 'MJONES', 'RLEE', 'SKHAN', 'TNGUYEN'])[floor(trader_roll * 6)::integer + 1] AS trader,
    CURRENT_TIMESTAMP - floor(trade_date_roll * 2592000000)::bigint * INTERVAL '1 millisecond' AS "tradeTimestamp",
    (CASE WHEN status_roll < 0.05 THEN 'CANCELLED' ELSE 'ACTIVE' END)::"TradeStatus" AS status,
    (ARRAY['EQUITIES_UK', 'EQUITIES_US', 'TECH_GROWTH', 'GLOBAL_LARGE_CAP'])[floor(book_roll * 4)::integer + 1] AS book,
    (ARRAY['Goldman Sachs', 'JP Morgan', 'Morgan Stanley', 'Barclays', 'Citigroup'])[floor(counterparty_roll * 5)::integer + 1] AS counterparty
  FROM random_values
), all_trades AS (
  SELECT * FROM fixed_trades
  UNION ALL
  SELECT * FROM generated_trades
)
INSERT INTO "Trade" (
  "id",
  "symbol",
  "quantity",
  "price",
  "side",
  "trader",
  "tradeTimestamp",
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
  "tradeTimestamp",
  status,
  book,
  counterparty
FROM all_trades
WHERE NOT EXISTS (SELECT 1 FROM "Trade");