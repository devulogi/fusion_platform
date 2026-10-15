# Backend User Stories

**Status:** Stories 1, 2, and 4 are implemented. Story 7 is partially implemented; Stories 3, 5, 6, 8, and 9 remain proposed.

These stories translate the take-home requirements into backend behavior. Implemented stories describe current behavior; paths and business rules in proposed stories are not claims about available API behavior.

## Scope and Assumptions

- The API returns the full trade collection as `{ items }`, expected to contain approximately 100–1,000 records. Sorting and filtering are client-side; redundant counts and pagination metadata are omitted.
- PostgreSQL is the system of record. A process-local `Map<TradeId, Trade>` is a disposable read cache and is hydrated from the database.
- Clients send create, amend, and cancel commands through REST. Server-to-client changes are delivered over SSE.
- The persisted trade contract uses the assessment's required fields: ID, symbol, side, quantity, price, trader, trade date, and status. Book and counterparty are optional sample-data fields.
- Proposed domain assumptions: cancelled trades cannot be amended, and repeated cancellation is idempotent. Confirm these rules before implementation.

## Stories

### 1. Seed an empty database

**Status:** Implemented

As a reviewer, I want realistic sample trades when starting with an empty database so I can evaluate the blotter quickly.

**Acceptance criteria**

- Seeding is optional and runs only when no trades exist.
- The generated dataset is within the agreed assessment scale (approximately 100–1,000 records) and uses valid symbols, sides, quantities, prices, traders, timestamps, and statuses.
- Rerunning database setup does not duplicate seed data.
- Seed failures are visible in setup output and prevent the backend from starting with an incomplete database.

**Implementation:** The development Compose database service opts in with `SEED_TRADES=true` and `SEED_TRADES_COUNT=500`. Seeding can be disabled with `SEED_TRADES=false`; configured counts must be between 100 and 1,000. The Dev Container setup invokes the database-owned SQL seeder before starting the API. Backend startup only connects to PostgreSQL and hydrates the cache. The Prisma schema and SQL migration define the required trade fields and optional `book` and `counterparty` sample fields.

### 2. View the trade collection

**Status:** Implemented

As a blotter user, I want to retrieve the current trades so the frontend can display, sort, and filter them.

**Acceptance criteria**

- `GET /api/v1/trades` returns `{ items }` with HTTP `200`; it returns the complete collection in one response without server-side paging or metadata.
- Before the API reports ready, startup loads the persisted collection from PostgreSQL and populates the cache.
- A request is not served from an uninitialized or partially populated cache.
- Once ready, `GET /api/v1/trades` returns the complete in-memory collection without a database read.
- A successfully loaded empty database returns `{ items: [] }` unless optional seed-on-empty behavior populates it.
- Database or hydration failure prevents the service from reporting ready; it retries according to the startup policy or exits for the container restart policy.

### 3. Check backend readiness

As a developer, I want to know whether the backend and its database dependency are ready before relying on the service.

**Acceptance criteria**

- Liveness indicates whether the API process is running.
- Readiness reports unavailable until PostgreSQL is reachable and initial cache hydration is complete.
- Compose health checks use readiness so dependent services do not start against an uninitialized backend.
- The current `/health` endpoint is a basic process check; a readiness check is a planned Phase 3 change.

### 4. Create a trade

**Status:** Implemented

As a trader, I want to create a trade so it is persisted and visible to all connected blotter users.

**Acceptance criteria**

- `POST /api/v1/trades` validates the request before persistence.
- Required fields are present; quantity and price are positive; side and status use supported values.
- Prisma generates the unique trade ID; `status` is required and must be `ACTIVE` or `CANCELLED`.
- A successful request persists the trade, updates the cache, emits `trade.created` using SSE, and returns the saved trade with HTTP `201`.
- A validation failure returns HTTP `400` with the structured error envelope and changes neither persistence, cache, nor event stream.
- A persistence failure does not update the cache or emit an event.

**Implementation:** The POST route and service validate input using the same Zod schema, including when the service is called outside HTTP. The repository persists through Prisma and returns the canonical saved trade; the service updates the cache, then publishes `trade.created`; the controller returns the serialized trade with HTTP `201`. Omitted optional `book` and `counterparty` fields are represented as `null` in the response. JSON errors contain `{ error: { code, reason, requestId } }`, with `details: [{ field, reason }]` for validation failures. Responses include a server-generated `X-Request-Id`, correlated with request/error logs.

### 5. Amend a trade

As a trader, I want to amend an existing trade so corrections are reflected in the blotter and visible to other users.

**Acceptance criteria**

- `PATCH /api/v1/trades/:tradeId` validates the permitted amendment fields.
- A valid amendment is persisted first, then the saved trade replaces the cached entry, then `trade.amended` is emitted.
- The response contains the persisted trade.
- An unknown trade returns HTTP `404`; invalid fields return HTTP `400`.
- Under the proposed domain rule, a cancelled trade cannot be amended.
- If version-based optimistic concurrency is selected, a stale amendment returns HTTP `409` and leaves the cache and event stream unchanged.

### 6. Cancel a trade

As a trader, I want to cancel an active trade without deleting its record, so the blotter retains the trade and its status.

**Acceptance criteria**

- Cancellation changes status to `CANCELLED` and preserves the trade record.
- The change is committed to PostgreSQL before the cache is updated and `trade.cancelled` is emitted.
- A successful cancellation returns the updated trade.
- Repeating cancellation follows the agreed idempotency rule and does not publish duplicate state-change events.
- Unknown trades return HTTP `404`; persistence failures do not alter cache state or publish an event.

### 7. Receive live trade updates

**Status:** Partially implemented

As a connected blotter user, I want other users' committed trade changes pushed to my browser without refreshing the page.

**Acceptance criteria**

- `GET /api/v1/events` opens an SSE stream with the correct `text/event-stream` content type.
- The server sends named `trade.created`, `trade.amended`, and `trade.cancelled` events containing the canonical saved trade.
- The event publisher runs only after a successful database mutation and cache update.
- A disconnected client is removed from active subscribers and can reconnect.
- Events are process-local and not durable. After reconnect, the client reloads `GET /api/v1/trades` to reconcile missed events.
- The client opens the event stream before fetching its initial snapshot and reconciles events received during that fetch, avoiding a snapshot/subscribe gap.
- SSE delivery errors do not roll back committed data or change the successful REST response.

**Implementation to date:** `GET /api/v1/events` streams `trade.created`. Amend/cancel event types, reconnect recovery, and snapshot reconciliation remain proposed.

### 8. Explore the API contract

As an interviewer or frontend developer, I want a browsable API contract so I can understand and try the implemented backend endpoints.

**Acceptance criteria**

- An OpenAPI document describes implemented REST routes, request and response schemas, validation errors, and relevant status codes.
- Swagger UI is served by the backend at `/api-docs` on the existing API port; it does not introduce another service or port.
- The specification is updated alongside API changes and does not present planned endpoints as implemented.
- The SSE endpoint documents its `text/event-stream` response, event names, payload shape, and reconnect expectations. Any SSE details not represented clearly by the chosen OpenAPI tooling are documented alongside the specification.

### 9. Review the backend architecture

As an interviewer, I want a concise architecture diagram so I can understand the backend components and data flow without inferring them from source code.

**Acceptance criteria**

- The editable diagrams.net source and an SVG export are stored under `docs/diagrams/`.
- The diagram shows the browser/API boundary, controller, service, PostgreSQL repository, startup cache hydration, and SSE delivery path.
- Mutation ordering is explicit: database commit, cache update, then event publication.
- Proposed or unimplemented components are labeled as such and the diagram is updated when the design changes.
- The diagram remains legible at normal document scale and complements rather than duplicates the README.

## Cross-Cutting Expectations

- Controllers own HTTP parsing and response mapping; services own use cases and domain rules; repositories own database access; the cache and event publisher are infrastructure components behind clear interfaces.
- All cache and event changes use the canonical trade returned by persistence, not the untrusted request body.
- Tests cover validation failures, unknown IDs, persistence failures, cache hydration, mutation ordering, event publication, SSE disconnect/reconnect, and concurrent amendments if optimistic locking is selected.
- Multi-instance fan-out, durable event replay, authentication, and pagination are outside the initial scope unless requirements change.
