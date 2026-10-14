---
name: backend-database-change
description: "Use when changing backend PostgreSQL persistence, Prisma schema, migrations, generated clients, or seed data."
argument-hint: "Describe the schema or persistence change and its story."
user-invocable: true
---

# Backend Database Change

## When to use

Use for PostgreSQL schema, Prisma, repository, migration, or seed-data work in `backend/`.

## Procedure

1. Read backend instructions and the relevant user story. Inspect the current Prisma schema, migration history, repository, package scripts, and test setup before proposing changes.
2. If no schema or migration workflow exists yet, treat setup as a design decision: agree on the initial model and migration strategy before creating one. Do not silently assume `db push` is the project's migration policy.
3. Keep PostgreSQL authoritative. Define constraints for required trade fields, positive quantity/price, supported side/status values, and unique IDs in the appropriate layers.
4. Create a migration using the repository's agreed Prisma workflow; review generated SQL and ensure the development path is reproducible.
5. Keep seed behavior idempotent. If seeding on startup is selected, seed only an empty database before cache hydration and readiness.
6. Update repository behavior and tests. For writes, ensure the transaction commits before cache mutation and event publication.
7. Run Prisma validation/generation, focused database tests, backend lint, and TypeScript build where available. Report any database prerequisite or command that could not be exercised.

## Safety

- Never delete or reset developer data without explicit approval.
- Do not expose credentials in source, logs, API responses, or fixtures.
- Do not claim migration rollback or transaction guarantees unless they are implemented and tested.
