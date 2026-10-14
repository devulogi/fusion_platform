---
name: backend-database-change
description: "Use when changing PostgreSQL persistence, the backend Prisma schema/client, SQL migrations, or SQL seed scripts."
argument-hint: "Describe the schema or persistence change and its story."
user-invocable: true
---

# Backend Database Change

## When to use

Use for PostgreSQL schema, SQL migrations/seeds in `database/`, or Prisma client/repository work in `backend/`.

## Procedure

1. Read backend instructions and the relevant user story. Inspect `backend/prisma/schema.prisma`, SQL migrations and scripts under `database/`, the setup orchestrator, repositories, and tests before proposing changes.
2. If no schema or migration workflow exists yet, treat setup as a design decision: agree on the initial model and migration strategy before creating one. Do not silently assume `db push` is the project's migration policy.
3. Keep PostgreSQL authoritative. Define constraints for required trade fields, positive quantity/price, supported side/status values, and unique IDs in the appropriate layers.
4. Create a versioned SQL migration under `database/migrations/`; verify `database/scripts/migrate.sh` applies it transactionally and records it in the migration ledger. Do not use Prisma Migrate for this repository's database setup.
5. Keep SQL seeding idempotent and limited to an empty trade table. `.devcontainer/shell/setup.sh` is the only orchestrator for migrations and seeding; the backend process must not seed on startup.
6. Update repository behavior and tests. For writes, ensure the transaction commits before cache mutation and event publication.
7. Validate the SQL scripts against PostgreSQL without resetting developer data, generate Prisma client types, and run backend lint/tests/build as appropriate. Report any database prerequisite or command that could not be exercised.

## Safety

- Never delete or reset developer data without explicit approval.
- Do not expose credentials in source, logs, API responses, or fixtures.
- Do not claim migration rollback or transaction guarantees unless they are implemented and tested.
