---
name: Backend engineering instructions
description: Use when editing or reviewing files under backend/. Covers approved scope, TypeScript safety, API layering, persistence, cache consistency, SSE, and tests.
applyTo: "backend/**"
---

# Backend Engineering Instructions

## Scope and decisions

- Use `backend/USER_STORIES.md` for approved domain behavior and acceptance criteria. Existing code is the authority on what is implemented; a story or design document describes intended work, not proof of implementation.
- Follow decisions the user has approved. If requirements conflict or leave a material behavior unresolved, raise it before expanding scope or choosing a behavior.
- For the API-story workflow, see `.github/skills/implement-backend-api-story/SKILL.md`.
- Keep backend changes proportionate to approved requirements. Do not introduce pagination, Redis, microservices, multi-instance guarantees, durable event replay, or extra abstractions without approval.

## Architecture and implementation

- Preserve strict TypeScript. Do not use `any`; treat untrusted values and caught errors as `unknown` and narrow them before use. Use named constants for repeated values and configuration rather than magic numbers or strings.
- Use controller, service, and repository as the standard application layers:
  - Controllers own the HTTP boundary.
  - Services coordinate use cases and own business/domain rules.
  - Repositories own PostgreSQL queries, transactions, and persistence mapping.
- Introduce supporting components only when they have a distinct responsibility; do not make them mandatory layers or create abstractions by default.
- Maintain a feature-first structure under `backend/src/features/<feature>/`: group code by the business capability it serves, with any needed `controllers/`, `services/`, and `repositories/` inside that feature. Do not organize the application as top-level layer folders or require empty/template-matching folders. Keep feature-specific supporting components with their feature.
- Keep HTTP application setup separate from process startup and resource lifecycle. Configure Express in `backend/src/app.ts`; wire dependencies explicitly and manage startup/shutdown in `backend/src/server.ts`, keeping feature logic out of setup code. Extract shared infrastructure only when genuinely needed across features; do not require a DI container or additional composition layers.
- Keep functions focused, testable, and readable; avoid unnecessary shared-state mutation.

## Controller design

- Keep route registration in Express routers and request handling in thin controllers.
- Validate untrusted HTTP bodies, parameters, and query values with Zod before calling application logic. Map validated values to use-case inputs; do not pass Express request or response objects into services.
- Delegate use-case execution to application logic rather than implementing business rules, persistence operations, or cache/event coordination in controllers.
- Map successful results to the appropriate HTTP status, headers, and response contract. Extract response mapping into a supporting component only when its complexity or reuse warrants it.
- Forward failures according to the error propagation and handling section below; do not format error responses or duplicate centralized error logging in controllers.

## Service design

- Start with one service per feature and use methods named for application use cases. Split services when responsibilities become unrelated or difficult to understand, not merely to match a template. A short method can still provide a useful boundary, such as hiding whether reads use a cache or repository.
- Keep public methods readable as the use-case flow: validate input, load required state, guard business rules, persist atomically where required, synchronize dependent state, and return the result. Include only the steps the operation needs.
- Never trust caller-supplied input or rely on TypeScript types for runtime safety. Validate use-case inputs before state access or side effects, including when services are called outside HTTP. Keep HTTP-specific parsing in controllers and reuse input schemas or validators rather than maintaining competing validation rules.
- Protect business invariants with meaningful guards. Extract detailed validation or state-dependent checks into private methods or focused functions when this clarifies the use case; keep simple, readable checks inline rather than extracting solely to reduce line count.
- Keep services focused on business logic and use-case coordination. Inject dependencies explicitly without requiring a DI framework; delegate database operations to repositories and transport or mapping details to their owning components. Do not use Prisma, Express objects, HTTP statuses, or JSON error envelopes in services.
- Service guards alone do not guarantee valid state under concurrent requests. Use repository-supported conditional writes or transactions and database constraints where required to enforce invariants atomically.

## Repository design

- Keep the Prisma schema in `backend/prisma/`; SQL migrations and seed scripts belong in `database/`.
- Start with one concrete repository per feature and focused persistence methods that support its use cases. Avoid generic base repositories or unnecessary query abstractions.
- Inject the database dependency; keep client creation, connection management, and shutdown in application startup/composition. Use APIs supported by the project's installed Prisma version.
- Own Prisma queries, writes, and persistence-to-application mapping. Return canonical saved state for mutations, including database-generated values; do not expose Prisma-specific representations to services.
- Keep business policy in services. Enforce the required persistence preconditions atomically through Prisma conditional writes and database constraints, not a separate JavaScript check followed by an unconditional write.
- Use Prisma transactions when multiple database operations must succeed or fail together. Keep transactions short and choose isolation appropriate to the invariant; a default-isolation read/check/write transaction does not eliminate every race. Share the same transaction context when an atomic operation spans repositories. Update caches and publish events only after successful commit, outside the database transaction.
- Use PostgreSQL constraints for structural invariants where required. Prisma field types do not enforce every rule, such as positive quantities; define constraints unsupported by the Prisma schema through SQL migrations in `database/`.
- Make absence and failure distinct: a lookup may return `null`, but database failures must propagate rather than become empty results or success-shaped fallbacks. A failed write or unmet write precondition must have an explicit outcome or meaningful exception. Do not assume Prisma `P2025` distinguishes a missing record from a conditional-write mismatch.
- Translate known database failures locally when they have a meaningful application interpretation, preserving their cause; otherwise follow the shared error propagation rules. Keep HTTP concerns, API serialization, cache updates, and event publishing out of repositories.

## Error propagation and handling

- Handle or translate a failure near its source when that layer understands its meaning; format its HTTP response centrally. Do not add `try/catch` to every method merely to detect failures.
- Repositories let Prisma failures reject by default. Catch and narrow known Prisma errors only when translating them into a meaningful application error; preserve the original cause. Distinguish expected lookup absence from failed persistence, and do not infer a specific business outcome from an ambiguous conditional-write failure.
- Services throw meaningful domain/application errors when input or business preconditions fail. Let dependency failures propagate unless the service can recover safely, add useful use-case context, translate a failure, or clean up owned resources. Neither services nor repositories use Express objects, `next`, HTTP statuses, or response envelopes.
- Await or return asynchronous operations throughout the call chain: a rejected database promise propagates through the repository and service to the controller without intermediate catches. Do not swallow failures, catch and rethrow unchanged errors, return success-shaped fallbacks, or start unobserved fire-and-forget request work. A failed awaited operation must prevent dependent steps from executing.
- For the current Express 4 backend, asynchronous controllers use a boundary `try/catch` around validation and awaited application calls and forward failures with `next(error)`. Stop processing after forwarding; do not send an error response locally. A shared async-handler wrapper may replace repeated forwarding if needed, but is not required.
- The central Express error middleware maps recognized errors to stable HTTP statuses and the standard error envelope, logs unexpected failures once, and returns a safe internal-error response for unrecognized failures. It must not become the place that interprets Prisma-specific failures or decides business rules. Never expose stack traces, secrets, or raw database details to clients.
- Catch values as `unknown` and narrow them before inspection. Avoid duplicate logging at each propagation layer. Handle startup failures at the startup boundary because no request is active; failures after an HTTP response or within a long-lived stream require explicit lifecycle handling rather than relying on the controller's initial catch.

## HTTP API Documentation

- Every change that adds or changes an HTTP API endpoint must update `backend/src/api-contract.ts`, the source used to generate the OpenAPI document, and its tests in the same change. `backend/src/api-docs.ts` serves the generated document. Document the implemented method and path, parameters, request and response schemas, validation/error responses, and relevant status codes.
- Document implemented behavior only; do not describe proposed or planned routes as available.

## HTTP API response design

Apply these conventions to JSON REST endpoints and their documented schemas, not HTML documentation or SSE streams. These are project contract choices, not universal REST requirements. Preserve approved existing contracts until a coordinated change updates implementation, clients, documentation, and tests; the conventions below do not imply that every field is already implemented.

### General constraints

- JSON response bodies use an object at the root rather than a primitive or bare array. Responses whose HTTP semantics prohibit a body, including `204 No Content`, have no body.
- Use `camelCase` for all JSON keys.
- Keep nullable resource fields present with `null` when they are part of the response schema.
- Document consistent representations for timestamps, decimal/money values, IDs, and enums. Distinguish required nullable fields from genuinely optional fields.

### Payload shapes

- **Single resource:** Return the resource object directly at the root. Do not add a `data` envelope unless an approved existing contract requires it.
- **Collections:** Return unpaginated collections as `{ items: [...] }`. Omit `pagination`, `currentPage`, `totalPages`, and redundant counts such as `totalItems` when clients can use `items.length`. Add metadata only for an explicit consumer requirement; do not add server-side pagination without approval. This is the target for the trade collection; migrate its existing pagination-shaped contract through the coordinated contract-change process above.
- **Creation and update:** For `201 Created` or `200 OK`, return the canonical saved resource using the endpoint's documented response schema, not an echoed request or automatically expanded database model.
- **Deletion:** Default to `204 No Content`; use `200 OK` only when returning useful documented information. Trade cancellation is a state transition, not deletion, and returns the updated trade.
- **Errors:** JSON REST errors use an `error` envelope with a stable application `code`, a client-safe `reason`, and a `requestId`. Include `details` for actionable validation failures, identifying each `field` and its `reason`. Clients must not parse human-readable reasons to identify error types; do not expose raw exception messages or ORM-specific codes. The target shape is:

  ```json
  {
    "error": {
      "code": "VALIDATION_FAILED",
      "reason": "The request contains invalid fields.",
      "requestId": "9f9f670d-7698-444a-b812-9d911d4f94c0",
      "details": [
        {
          "field": "email",
          "reason": "The email address format is invalid."
        }
      ]
    }
  }
  ```

### Request traceability

- Assign a server-generated request ID at request entry, before parsing or validation can fail. Return it in `X-Request-Id` on successful and failed responses and in JSON error bodies. Do not blindly trust client-supplied identifiers.
- Include the request ID in structured request/error logs alongside method, normalized route, status, and duration. Record unexpected exceptions and their causes server-side without logging secrets or sensitive payloads.
- Keep endpoint and timestamp metadata in logs by default, not error bodies. Avoid full URLs or query strings that may expose sensitive values. Introduce distributed trace identifiers only when tracing is actually adopted.
- Do not attempt to send a JSON error body once SSE headers or response data have been sent; use the stream lifecycle's error handling.
- Verify response contracts with tests covering statuses, headers, body shapes, validation details, and empty/nullable cases.

## Persistence, cache, and events

- PostgreSQL is the system of record. The in-process `Map` is disposable and only valid within one backend process.
- Backend startup must connect to PostgreSQL and complete cache hydration before reporting readiness. Never serve an empty or partial cache as a successful complete collection after a failed load.
- For mutations, persist and commit first, update the cache from the canonical saved record second, and publish the typed event last. On persistence failure, do not mutate the cache or publish an event.
- Keep REST as the client-to-server command path. SSE is server-to-client only; it is not the source of truth and events are not durable. Clients recover missed events by reloading the collection.
- Ensure shutdown and disconnect paths release database resources and SSE subscriber listeners.

## Tests and validation

- Add or update deterministic tests for the successful behavior and material failure paths. Use test doubles instead of wall-clock timing or external services when practical.
- Keep tests out of `src/` in a mirrored `backend/tests/features/<feature>/` tree. Use `api/` for HTTP/controller tests, `services/` for use-case/domain behavior, and `repositories/` for persistence behavior. Name test files `*.test.ts`.
- ESLint uses explicit, non-recursive `projectService.allowDefaultProject` globs for test directories. When adding a test directory, add its matching glob to `backend/eslint.config.js`; do not assume a parent glob covers nested files.
- Keep test doubles strictly typed; do not use `any` or untyped mock callbacks.
- Lint is a blocking gate for backend code and tests. Run `npm --prefix backend run lint` after changes and resolve reported errors without disabling or weakening rules unless explicitly approved. Do not report lint success unless the command exits zero.
- If type-aware lint indicates Prisma types are missing or stale, run `npm --prefix backend run db:generate` and rerun lint; do not work around generated-type issues with casts or suppressions.
- Run focused tests and lint for the change. Run `npm --prefix backend test` and `npm --prefix backend run build` when the scope warrants full-suite and build validation.
