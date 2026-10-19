# Improvement Stories

**Status:** Stories 1–6 are implemented and validated, including the revised numbered-pagination contract.

The stories address findings 1, 3, 4, 5, 6, and 7. Finding 2, the documented single-process scale limit, remains outside this scope.

## Story 1: Verify Database Migrations Against the Running Model

**Finding:** #1, database migration and application schema drift.

**User story:** As an engineer changing persistence, I want automated verification that SQL migrations produce a database compatible with Prisma and the backend, so schema mismatches are caught before startup or deployment.

**Solution:** Use a disposable PostgreSQL instance and the existing migration runner. Verify a clean install and an upgrade from the prior migration, preserving an existing row; then start the backend and verify readiness, hydration, and the API response. Keep unit tests independent of PostgreSQL and never mutate a developer's persistent database.

**Acceptance criteria:**

- The check applies migrations to clean and prior-migration databases.
- The upgrade preserves existing rows and verifies the current timestamp column and index.
- The backend starts, hydrates, reports ready, and returns the preserved record.
- The check runs through an explicit integration command or CI step using disposable resources.
- A broken/incomplete migration fails with a clear diagnostic.

## Story 2: Move Trade Data Orchestration Behind a Testable Frontend Boundary

**Finding:** #3, page-level REST, query, mutation, and SSE coordination is too concentrated.

**User story:** As a frontend engineer, I want API and synchronization logic behind a small feature boundary, so the page is easy to scan and behavior can be tested independently.

**Solution:** Keep validated REST functions in a feature-local API module and query/mutation/SSE orchestration in a focused hook. Keep dialog selection and page composition in `TradeHistoryPage`; hide event reconciliation and reconnect state inside the hook.

**Acceptance criteria:**

- The page contains no direct `fetch` or EventSource lifecycle code.
- REST and SSE payloads are runtime-validated and expose typed results/errors.
- SSE opens before the initial snapshot; reconnect and events refresh the current result; unmount closes the stream.
- Hook tests cover initial load, reconnect, refresh failure, mutations, and cleanup.
- Query-owned trade data is not duplicated in Context.

## Story 3: Remove Duplicate Trade Workflow Tests

**Finding:** #4, App and page tests duplicate workflow scenarios.

**User story:** As a maintainer, I want each workflow tested at one appropriate boundary, so changes have a clear source of regression coverage.

**Solution:** Keep trade workflow integration tests with `TradeHistoryPage`. Limit `App.test.tsx` to application shell/provider wiring; keep error-boundary behavior with its owning boundary.

**Acceptance criteria:**

- Each trade workflow is covered once at the page boundary.
- Page tests cover snapshot/SSE reconciliation, reconnect, refresh, create, amend, cancel, and cleanup.
- App tests do not duplicate trade or SSE scenarios.
- Removing duplicate tests preserves distinct user-visible coverage.

## Story 4: Align Frontend SSE Events With the Backend Contract

**Finding:** #5, frontend includes unsupported `trade.reactivated`.

**User story:** As a frontend and backend engineer, I want client event names and tests to match the server contract, so unsupported transitions are not implied.

**Solution:** Remove reactivation from frontend event types and fixtures; retain created, amended, and cancelled. Future events require a coordinated contract change.

**Acceptance criteria:**

- Frontend subscribes only to created, amended, and cancelled.
- No test references reactivation.
- Frontend names match backend constants and OpenAPI.
- Supported workflow and reconnect tests pass.

## Story 5: Filter, Sort, and Paginate Trades on the Server

**Finding:** #6, pagination was client-side and filters/sort were limited to the loaded page.

**User story:** As a blotter user, I want filtering, sorting, and numbered pagination applied to the complete cached result set by the backend, so page contents and totals describe all matching trades without a database round trip.

**Solution:** Keep 1-based offset pagination on `GET /api/v1/trades`. Accept validated page, bounded page size, allow-listed sort field/direction, and existing symbol, trader, side, status, and date filters. Apply all operations to a defensive snapshot returned by `TradeCache.getAll()`; do not mutate the cache. Return `{ items, pagination: { page, pageSize, totalItems, pageCount } }`, with counts from the same snapshot. Use named defaults and limits. Send date boundaries as ISO instants derived from local calendar days. The frontend displays range/total, “Page N of M,” and numbered navigation. SSE and mutations refetch the current query. Update OpenAPI, README, and tests together.

**Acceptance criteria:**

- The endpoint accepts validated page, pageSize, sort, and filter parameters and returns exact filtered totalItems and pageCount.
- Named default and maximum page sizes bound the query.
- The cache query helper filters and sorts a copied snapshot before applying offset/take and never mutates shared cache state.
- Sort fields are allow-listed with a deterministic ID tie-breaker; invalid query parameters produce structured validation errors.
- Count and page data derive from the same cache snapshot, so metadata and items are internally consistent without a database round trip.
- OpenAPI describes all parameters and the pagination response.
- The UI displays result range, filtered total, “Page N of M,” and numbered controls; changing sort/filter resets to page 1.
- Date filtering preserves local calendar-day semantics.
- SSE and mutations refetch the current server query rather than merging into stale pages.
- Tests cover combined filters, sort, page boundaries/counts, invalid inputs, empty states, navigation, and refresh after events/mutations.

## Story 6: Close Active SSE Streams During Backend Shutdown

**Finding:** #7, graceful shutdown can wait on long-lived SSE responses.

**User story:** As an operator, I want shutdown to close SSE responses and release subscriptions before disconnecting Prisma, so process termination is predictable.

**Solution:** Track active SSE responses and unsubscribe callbacks. During shutdown, stop accepting requests, close streams, await HTTP closure, then disconnect Prisma. Keep cleanup idempotent; any forced deadline must be a named configuration value.

**Acceptance criteria:**

- Normal disconnect and shutdown remove each response and subscription exactly once.
- Repeated SIGINT/SIGTERM is safe and no new SSE stream is accepted while draining.
- Tests hold a stream open during shutdown and verify stream closure, HTTP completion, and Prisma disconnect ordering.
- Tests cover repeat signals, already-closed streams, and restart/new SSE connection.

## Verification Status

- Backend tests: 64 passed, including rejection of negative page values.
- Frontend tests: 65 passed, including invalid pagination metadata normalization, BUY/SELL color distinction, and page retention during in-flight navigation.
- Backend and frontend lint: passed.
- Backend and frontend production builds: passed.
- Disposable PostgreSQL integration check: passed for clean install, prior-migration upgrade, preserved row, schema/index, startup readiness, hydration, and API response.
- Browser interaction verification could not run because integrated Chrome crashes during startup due to a missing desktop settings schema. SPA behavior is verified in RTL; the live API is checked separately.

## Remaining Constraint

Server-side pagination bounds API responses and browser memory, but startup still hydrates all trades into a process-local cache. Server memory remains proportional to the full dataset; changing that cache/read architecture is outside these stories.
