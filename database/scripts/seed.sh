set -eu

if [ "${SEED_TRADES:-false}" != "true" ]; then
  echo "Trade seeding disabled."
  exit 0
fi

seed_count="${SEED_TRADES_COUNT:-500}"
case "$seed_count" in
  ''|*[!0-9]*) echo "SEED_TRADES_COUNT must be an integer between 100 and 1000." >&2; exit 1 ;;
esac

if [ "$seed_count" -lt 100 ] || [ "$seed_count" -gt 1000 ]; then
  echo "SEED_TRADES_COUNT must be an integer between 100 and 1000." >&2
  exit 1
fi

psql \
  --set ON_ERROR_STOP=1 \
  --set trade_count="$seed_count" \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --file /database-seed/trades.sql