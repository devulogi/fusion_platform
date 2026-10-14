set -eu

psql \
  --set ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --command 'CREATE TABLE IF NOT EXISTS "_fusion_platform_migrations" ("name" TEXT PRIMARY KEY, "applied_at" TIMESTAMPTZ NOT NULL DEFAULT now())'

for migration in /database-migrations/*/migration.sql; do
  [ -f "$migration" ] || continue
  migration_name="$(basename "$(dirname "$migration")")"
  already_applied="$(psql --tuples-only --no-align --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --command "SELECT 1 FROM \"_fusion_platform_migrations\" WHERE \"name\" = '$migration_name'")"

  if [ "$already_applied" = "1" ]; then
    echo "Migration already applied: $migration_name"
    continue
  fi

  if [ "$migration_name" = "20261014000000_init_trade" ]; then
    existing_trade_table="$(psql --tuples-only --no-align --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --command "SELECT to_regclass('public.\"Trade\"') IS NOT NULL")"
    if [ "$existing_trade_table" = "t" ]; then
      echo "Existing Trade table found; recording migration as applied: $migration_name"
      psql \
        --set ON_ERROR_STOP=1 \
        --username "$POSTGRES_USER" \
        --dbname "$POSTGRES_DB" \
        --command "INSERT INTO \"_fusion_platform_migrations\" (\"name\") VALUES ('$migration_name') ON CONFLICT DO NOTHING"
      continue
    fi
  fi

  echo "Applying database migration: $migration_name"
  {
    cat "$migration"
    printf "\nINSERT INTO \"_fusion_platform_migrations\" (\"name\") VALUES ('%s');\n" "$migration_name"
  } | psql \
    --set ON_ERROR_STOP=1 \
    --single-transaction \
    --username "$POSTGRES_USER" \
    --dbname "$POSTGRES_DB"
done