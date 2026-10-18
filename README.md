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

**Decision:** The backend is one independently deployable service (a small microservice in deployment terms) and a modular monolith internally. HTTP controllers, trade use cases, the PostgreSQL repository, in-process cache, and SSE event publisher remain modules within that service; they are not split into separately deployed services.

**Source organization:** `backend/src/app.ts` configures Express and `backend/src/server.ts` wires dependencies and manages process startup. Business capabilities live under `backend/src/features/`, including their controllers, services, repositories, and supporting helpers. Shared `types.ts`, `constants.ts`, `schemas.ts`, `errors.ts`, and `middleware.ts` live at `backend/src/`; OpenAPI contracts and documentation routes live under `backend/src/openapi/`.

### Backend Folder Structure

Backend code is organized feature-first, with conventional Express layers grouped inside each feature. The trade feature uses this layout:

```text
backend/src/
├── app.ts
├── constants.ts
├── errors.ts
├── schemas.ts
├── features/
│   ├── trades/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── trade-serializer.ts
│   │   ├── trade-cache.ts
│   │   ├── trade-event-publisher.ts
│   │   └── trade-input.ts
│   └── health/controllers/
├── middleware.ts
├── openapi/
├── server.ts
└── types.ts

backend/prisma/schema.prisma
backend/tests/features/trades/
├── api/
├── repositories/
└── services/
database/
├── migrations/
└── scripts/
```

Use kebab-case filenames such as `trade-controller.ts`, `trade-service.ts`, and `trade-repository.ts`. Keep one-off feature helpers at the feature root; add a subfolder when it groups related files, not just to hold a singleton. Cross-cutting HTTP middleware is composed from `backend/src/middleware.ts`; feature-specific route middleware stays in its router. SQL migrations and seed scripts belong under `database/`.

**Responsibilities:**

- Controllers parse HTTP input, validate request schemas with Zod, call a service, and map outcomes to HTTP responses.
- Trade services own use-case coordination and business rules for creating, amending, and cancelling trades.
- The repository owns PostgreSQL queries and transactions. PostgreSQL remains the system of record.
- `TradeCache` owns an in-process `Map<TradeId, Trade>` used to serve the full collection after initial hydration.
- A typed event publisher emits `trade.created`, `trade.amended`, `trade.cancelled`, and `trade.reactivated` after persistence and cache update. The SSE endpoint broadcasts committed trade changes to connected clients.

**Startup and read flow:** `setup.sh` applies SQL migrations and optionally seeds an empty database before starting the backend. The backend connects to PostgreSQL and loads persisted trades into the Map before listening. `GET /ready` reports HTTP `200` only while PostgreSQL responds and cache hydration is complete; otherwise it returns `503`. Compose uses readiness before starting dependent services. `GET /api/v1/trades` returns `{ items }` for the complete collection, without redundant counts or pagination metadata; it does not perform a database load on each request. If startup hydration fails, the service does not begin serving. The client sorts and filters locally; the API does not page the collection server-side.

**HTTP contracts and traceability:** JSON REST errors use `{ error: { code, reason, requestId } }`, with `details: [{ field, reason }]` for invalid fields. A server-generated `X-Request-Id` accompanies both successful and failed responses and correlates with structured request/error logs. Request logs record normalized routes rather than raw URLs or query values. API changes are reflected in the OpenAPI document served at `/api-docs/openapi.yaml` and Swagger UI at `/api-docs/`. The frontend consumes the trade collection and event stream.

**Security, logging, and payloads:** Helmet is applied globally for security headers. Its CSP permits the inline scripts and styles Swagger UI requires; `upgrade-insecure-requests` is enabled only in production so the HTTP development server can load its assets. `pino-http` emits structured request logs to stdout, and unexpected errors are logged with the request ID. Express compression negotiates gzip for sufficiently large compressible responses; the SSE route is excluded to avoid delaying streamed events. Logs are not stored in PostgreSQL or application-managed files; retention and shipping belong to the container/runtime environment. The backend currently has no authentication, rate limiter, or API gateway because these are not assessment requirements.

**Exploring the API:** Open <http://localhost:4001/api-docs> on the configured backend port. Swagger UI uses that same origin for "Try it out"; no additional service or port is needed. Active trades can be amended with editable fields, cancelled with `{ "status": "CANCELLED" }`, or reactivated with `{ "status": "ACTIVE" }` through `PATCH /api/v1/trades/{tradeId}`. The SSE operation documents `trade.created`, `trade.amended`, `trade.cancelled`, and `trade.reactivated`, their JSON payloads, wire format, reconnect delay, and recovery limitations. Swagger UI is not a live event viewer: use `curl -N http://localhost:4001/api/v1/events` or a browser `EventSource`. Events have no IDs or durable replay; the frontend reloads the collection on reconnect and reconciles events buffered during snapshot fetches.

**Mutation flow:** The controller validates the request; the service applies domain rules; the repository commits to PostgreSQL and returns the saved trade; the service then updates the Map synchronously and publishes the corresponding event. A persistence failure must leave the cache unchanged and publish no event. SSE delivery failures must not turn an already-committed HTTP mutation into a failure.

**Cache trade-off:** A Map provides average O(1) lookup by trade ID, but producing the full collection remains O(n), and serialization and network payload costs remain proportional to the result. For up to 1,000 trades this is a deliberate, bounded single-process design, not a claim of sub-millisecond end-to-end reads. PostgreSQL remains authoritative; the cache is disposable and rehydrates from PostgreSQL on every startup. It is not shared across multiple backend instances.

### Real-Time Transport Decision

| Option                   | Strengths                                                                                                                | Trade-offs for this application                                                                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server-Sent Events (SSE) | Built on HTTP; browsers provide `EventSource` with automatic reconnect; simple server-to-client named events.            | One-way only; event payloads are text; reconnect does not recover missed events unless the server implements event IDs and replay. This implementation uses no IDs or durable replay.                    |
| Native WebSocket         | Full-duplex communication with low framing overhead; useful when clients and server both need to send frequent messages. | Requires a custom application protocol, reconnect/backoff, heartbeat, and recovery behavior. Those add complexity while trade commands already use REST.                                                 |
| Socket.IO                | Higher-level rooms, acknowledgements, reconnect handling, and transport fallback features.                               | Requires the Socket.IO protocol and matching client/server libraries; adds dependencies and abstraction beyond the current one-way update need. It is not interchangeable with a plain WebSocket client. |

**Decision:** Use SSE for committed trade notifications because the browser sends commands through REST and only needs server-to-client updates. Native `EventSource` keeps the client simple and reconnects automatically; WebSockets or Socket.IO would be reconsidered if bidirectional messaging, rooms, or acknowledgements become requirements.

The backend publishes `trade.created`, `trade.amended`, `trade.cancelled`, and `trade.reactivated` only after persistence and cache update. The frontend opens the stream before fetching its initial snapshot, buffers events while the fetch is in flight, and reloads the collection after reconnect. Events are process-local and non-durable; missed events are recovered by reloading the collection, not replaying the stream.

**Concurrency and alternatives:** Amendments use an atomic active-status condition in PostgreSQL, but do not use version-based optimistic concurrency; concurrent amendments to an active trade may overwrite one another. Redis, distributed caching, and multiple services are deferred because the assessment specifies neither multi-instance scale nor a cache bottleneck. This is a single-process architecture with explicit limits, not a horizontally scaled design.

The proposed backend workflows and acceptance criteria are documented in [backend/USER_STORIES.md](backend/USER_STORIES.md).

### Frontend Structure

The frontend currently uses a compact `App.tsx` entry and colocated tests. As the assessment workflows grow, organize code by application shell and business feature rather than by global component type. This is the recommended destination, not a claim that every directory already exists:

```text
frontend/src/
├── app/
│   ├── App.tsx
│   └── providers.tsx
├── features/
│   └── trades/
│       ├── api/
│       ├── components/
│       ├── hooks/
│       └── schemas.ts
├── shared/
│   ├── components/
│   ├── hooks/
│   └── lib/
├── test/
│   └── mocks/
├── index.css
└── main.tsx
```

Keep trade-specific API access, query hooks, schemas, and UI within `features/trades/`; reserve `shared/` for code used by multiple features. Keep tests and Storybook stories beside the component or hook they exercise (`*.test.tsx`, `*.stories.tsx`); put shared MSW handlers under `test/mocks/` when that tooling is approved and configured. Add subfolders only when there are related files to group. Keep providers and application-wide error handling in `app/`, and let `main.tsx` remain the browser entry point.

Use TanStack Query for server-state caching and mutations, React Context for genuinely shared client state, TanStack Table for grid interactions, and React Hook Form/Zod for forms and validation. Do not mirror query-owned trade data in Context. Continue using the Vite `/api` proxy for browser requests. Vite provides development hot module replacement; the production Dockerfile uses Nginx to serve the built static assets.

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
- Backend liveness: <http://localhost:4001/health>
- Backend readiness: <http://localhost:4001/ready>
- PostgreSQL: `localhost:5432`

| Setting        | Value              |
| -------------- | ------------------ |
| DB Server name | `database`         |
| Port           | `5432`             |
| Username       | `postgres`         |
| Password       | `postgrespassword` |
| Database       | `fusion_platform`  |
| SSL            | `disable`          |

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
