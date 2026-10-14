# Fusion Platform

A small full-stack trading platform take-home project. The repository is organized as a monorepo with separate `frontend` and `backend` packages, plus a PostgreSQL service and shared local-development tooling.

## Architecture

- `frontend/`: React 18, TypeScript, Vite, Tailwind CSS, TanStack Table, React Hook Form, and Zod.
- `backend/`: Express 4 and TypeScript, with Vitest and Supertest for testing.
- `database/`: PostgreSQL 16 development image, versioned SQL migrations, idempotent migration/seed shell scripts, and the randomized SQL trade dataset.
- `workspace`: Node 24 development container used by VS Code.
- `docker-compose.yml`: starts the workspace, database, backend, and frontend services.

The backend currently listens on port `4001`; the frontend's Vite server is published on host port `3001`; PostgreSQL is published on port `5432`.

Compose loads backend connection settings from `backend/.env.dev` and frontend settings from `frontend/.env.dev`. The `database` service owns the `SEED_TRADES` and `SEED_TRADES_COUNT` settings. The backend connects to PostgreSQL by its Compose service name; frontend API requests use the Vite `/api` proxy to reach the backend. The frontend does not connect directly to PostgreSQL.

## Architecture Decisions and Trade-offs

### Shared development environment

- Docker Compose defines the workspace, database, backend, and frontend so manual Compose users and VS Code Dev Container users can start the same environment. The trade-off is maintaining container configuration in addition to package scripts.
- Backend and frontend keep separate package manifests; root-level Husky and lint-staged coordinate shared Git hooks without merging app dependencies.

### Backend Decision Analysis and Resolution

**Status:** Partially implemented. The PostgreSQL trade schema and optional empty-database seeding are implemented; the REST trade API, cache, and SSE components below remain proposed.

**Scope:** A single backend service for reading, creating, amending, and cancelling the assessment's approximately 100–1,000 trades. The API returns the complete collection; TanStack Table handles sorting and filtering in the browser. Pagination and multi-instance deployment are not assumed requirements.

**Decision:** Keep the backend as one deployable service with clear internal components: HTTP controllers, trade services, a PostgreSQL repository, an in-process trade cache, and an event publisher feeding an SSE gateway. “One service” describes the deployment boundary; the internal components keep responsibilities testable without introducing microservices.

**Responsibilities:**

- Controllers parse HTTP input, validate request schemas with Zod, call a service, and map outcomes to HTTP responses.
- Trade services own use-case coordination and business rules for creating, amending, and cancelling trades.
- The repository owns PostgreSQL queries and transactions. PostgreSQL remains the system of record.
- `TradeCache` owns an in-process `Map<TradeId, Trade>` used to serve the full collection after initial hydration.
- A typed event publisher emits `trade.created`, `trade.amended`, and `trade.cancelled` after persistence and cache updates. The SSE gateway subscribes and broadcasts the changed trade to connected clients.

**Startup and read flow:** `setup.sh` applies SQL migrations and optionally seeds an empty database before starting the backend. The backend connects to PostgreSQL and loads persisted trades into the Map. `GET /api/trades` returns `Array.from(cache.values())`; it does not perform a database load on the first request. If startup hydration fails, the service must not report ready or serve an empty cache as complete. The client sorts and filters locally; the API does not add pagination by assumption.

**Mutation flow:** The controller validates the request; the service applies domain rules; the repository commits to PostgreSQL and returns the saved trade; the service then updates the Map synchronously and publishes the corresponding event. A persistence failure must leave the cache unchanged and publish no event. SSE delivery failures must not turn an already-committed HTTP mutation into a failure.

**Cache trade-off:** A Map provides average O(1) lookup by trade ID, but producing the full collection remains O(n), and serialization and network payload costs remain proportional to the result. For up to 1,000 trades this is a deliberate, bounded single-process design, not a claim of sub-millisecond end-to-end reads. PostgreSQL remains authoritative; the cache is disposable and rehydrates from PostgreSQL on every startup. It is not shared across multiple backend instances.

**Real-time transport:** Use Server-Sent Events because clients send commands through REST and only need server-to-client updates. SSE is receive-only by design; the assessment does not require client events over the real-time channel. WebSockets would be reconsidered if bidirectional streaming becomes a real requirement. SSE events are not durable: after reconnect, a client reloads `GET /api/trades` to reconcile missed updates. The client should establish the event stream before its initial snapshot and reconcile events received while that snapshot is loading.

**Concurrency and alternatives:** Database transactions protect persistence. A `version` field with conditional updates can reject stale amendments with `409 Conflict`; include it if concurrent amendments are in scope and cover it with tests. Redis, distributed caching, and multiple services are deferred because the assessment specifies neither multi-instance scale nor a cache bottleneck. This is a single-process architecture with explicit limits, not a horizontally scaled design.

The proposed backend workflows and acceptance criteria are documented in [backend/USER_STORIES.md](backend/USER_STORIES.md).

### Frontend

- Vite serves the app directly in development to provide hot module replacement; the production Dockerfile uses Nginx to serve the built static assets.
- React and TypeScript are the required UI foundation. Table and form dependencies are available for the planned blotter workflow but are not yet used by the starter screen.

## Prerequisites

For either Docker-based option:

- Docker Desktop, or Docker Engine with Docker Compose v2.

For the VS Code option:

- Visual Studio Code.
- The Dev Containers extension.

## Run With Docker Compose

From the repository root, run the setup script:

```sh
bash .devcontainer/shell/setup.sh
```

Setup installs dependencies, starts the database, runs `database/scripts/migrate.sh` and `database/scripts/seed.sh` inside the PostgreSQL container, generates the Prisma client, and only then starts the backend and frontend. The backend does not apply migrations or seed data on startup.

Running `docker compose up` by itself does not run migrations or seed data, and may start the backend before the database schema exists. Use the setup script as the entry point. If you already ran `docker compose up`, run `bash .devcontainer/shell/setup.sh`; it stops the app services, applies database setup, then starts them again.

In development, `SEED_TRADES=true` seeds an empty table with 500 trades; set `SEED_TRADES=false` to disable it. `SEED_TRADES_COUNT` can be set from 100 to 1,000. The SQL migration ledger makes setup repeatable, and the seed script skips a non-empty table.

- Frontend: <http://localhost:3001>
- Backend health check: <http://localhost:4001/health>
- PostgreSQL: `localhost:5432`

Local database settings are `postgres` / `postgrespassword`, database `fusion_platform`. These credentials are for local development only.

To stop the stack, press `Ctrl+C` or run `docker compose down` from another terminal. The `postgres_data` volume preserves database files. To remove the volume and its data as well, run `docker compose down --volumes`.

To view service logs:

```sh
docker compose logs --follow database backend frontend
```

## Run In VS Code Dev Containers

1. Clone the repository and open its root folder in VS Code.
2. Install the Dev Containers extension if needed.
3. Run **Dev Containers: Reopen in Container** from the Command Palette.

VS Code uses the Compose configuration in `.devcontainer/devcontainer.json`, attaches to `workspace`, and initially starts only `workspace` and `database`. The setup script applies migrations and seeds before starting the backend and frontend. On subsequent starts, its database-only mode runs the idempotent database scripts before starting the apps.

The same application URLs and local database settings listed above apply. Docker is required for this option as well.

## Run Checks

After dependencies are installed, run these commands from the repository root:

```sh
npm run lint
npm run format:check
npm test
npm run test:all
```

To build the packages:

```sh
npm --prefix backend run build
npm --prefix frontend run build
```

Pre-commit hooks run ESLint and Prettier on staged files. Pre-push hooks inspect the commits being pushed and run tests only for packages with changed files. Changes outside `backend/` and `frontend/` run both suites because they may affect the whole workspace.

## AI Usage Report

### Tool Used

GitHub Copilot Chat in Visual Studio Code was used as an AI-assisted development tool.

### How It Was Used

- Copilot helped scaffold the backend and frontend, configure Docker Compose and Dev Containers, set up formatting/linting/testing workflows, and review setup decisions.
- Backend-scoped instructions, agents, and skills under `.github/` guide future story implementation, database changes, SSE work, and code review. They document workflows; they do not mean those Phase 3 features are implemented.

### Decisions Influenced by AI

- To update the README with the latest development setup and AI-assisted decisions.
