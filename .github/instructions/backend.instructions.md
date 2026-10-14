---
name: Backend engineering instructions
description: Use when editing or reviewing files under backend/. Covers approved scope, TypeScript safety, API layering, persistence, cache consistency, SSE, and tests.
applyTo: "backend/**"
---

# Backend Engineering Instructions

## Scope and decisions

- Use `backend/USER_STORIES.md` as the source for domain behavior and acceptance criteria. Use the backend decision section in `README.md` for architecture rationale and trade-offs.
- Treat both documents as proposed Phase 3 guidance, not proof that those features exist. Existing code is the authority for what is currently implemented.
- Follow decisions the user has explicitly approved. If a story conflicts with an approved architecture decision, or either is ambiguous, explain the conflict and ask before expanding scope.
- Avoid mutating shared or critical state directly; always work with copies or persistent data structures.
- Keep functions thin, testable, readable to lighten cognitive load, and ensure logic is grouped and organized.
- Write tests before implementing functionality to ensure correctness based on the user stories and acceptance criteria.
- Create scoped test using describe blocks to group related tests together, improving readability and organization.
- Use `it` blocks for individual test cases, clearly stating the expected behavior in the test description.
- Prefer `beforeEach` and `afterEach` hooks for setup and teardown to keep tests isolated and reduce duplication.
- Follow test driven development (TDD) practices (red green refactor cycle: write a failing test, implement functionality to pass the test, then refactor for maintainability and scalability).
- Keep the take-home solution proportionate: do not introduce pagination, Redis, microservices, multi-instance guarantees, durable event replay, or extra abstractions without an approved requirement.

## TypeScript and API boundaries

- Preserve strict TypeScript. Do not use `any`; use `unknown` and narrow it when input is not yet trusted.
- No magic numbers or strings in the code; define constants for repeated values and configuration e.g. `const StatusCode = { OK: 200, SERVICE_UNAVAILABLE: 503 }`.
- Treat every HTTP request body, parameter, and query value as untrusted. Validate it at the controller boundary with Zod before calling application logic.
- Keep responsibilities explicit without requiring strict MVC terminology: models define domain types and data shape; serializers map domain results to API response contracts and contain no business rules; controllers validate/map HTTP and delegate to services; services own use-case coordination and business/domain rules; repositories own PostgreSQL queries, transactions, and persistence mapping. Cache and event delivery are infrastructure concerns, not alternate homes for domain rules.
- Organize backend code by feature under `src/features/<feature>/`, with that feature's models, serializers, controllers, services, and repositories together. Use `serializers/` for JSON/API response mapping rather than `views/`; this backend does not render UI or server-side views. Keep feature-specific cache modules inside the owning feature; keep a single module such as `trade-cache.ts` flat at the feature root and introduce a subdirectory only when it groups multiple related modules. Keep the Prisma schema in `backend/prisma/` for client generation. SQL migrations and seeding belong in `database/`; `.devcontainer/shell/setup.sh` invokes those scripts before starting the applications. Backend startup only connects and hydrates the cache. Keep app composition and process startup in `src/app.ts` and `src/server.ts`; add shared infrastructure only when genuinely shared across features.
- Keep business rules and use-case coordination in services, and PostgreSQL queries, transactions, and persistence mapping in repositories. Do not put domain rules in models, serializers, controllers, or cache infrastructure.
- Return stable, intentional HTTP errors for validation, missing records, and conflicts. Never expose stack traces, secrets, or raw database details to clients.

## HTTP API Documentation

- Every change that adds or changes an HTTP API endpoint must update `backend/openapi.yaml` in the same change. Document the implemented method and path, parameters, request and response schemas, validation/error responses, and relevant status codes.
- Keep the OpenAPI document limited to implemented behavior; do not describe proposed or planned routes as available.
- An OpenAPI file is not a browsable documentation endpoint. When Swagger UI is part of the approved scope, serve it from the backend at `/api-docs` on the existing API port and keep it synchronized with the specification. Do not claim Swagger UI is available unless the route is mounted and tested.

## Persistence, cache, and events

- PostgreSQL is the system of record. The in-process `Map` is disposable and only valid within one backend process.
- Database setup and optional seeding are completed by `.devcontainer/shell/setup.sh` before backend startup. The backend connects to PostgreSQL, hydrates the cache, and reports readiness only after hydration succeeds. Never serve an empty or partial cache as a successful complete collection after a failed load.
- For mutations, persist and commit first, update the cache from the canonical saved record second, and publish the typed event last. On persistence failure, do not mutate the cache or publish an event.
- Keep REST as the client-to-server command path. SSE is server-to-client only; it is not the source of truth and events are not durable. Clients recover missed events by reloading the collection.
- Ensure shutdown and disconnect paths release database resources and SSE subscriber listeners.

## Tests and validation

- Add or update tests for successful behavior and relevant failure paths, including validation errors, missing records, persistence failures, cache consistency, and event ordering.
- Keep tests deterministic; avoid relying on wall-clock timing or external services when an existing test double can cover the behavior.
- Keep tests out of `src/` in a mirrored `backend/tests/features/<feature>/` tree. Within each feature, use `api/` for HTTP/controller tests, `services/` for use-case/domain behavior, and `repositories/` for persistence behavior. Name files `*.test.ts`; do not colocate tests with production modules. Database shell scripts and SQL are owned by `database/`, not backend tests.
- `backend/tsconfig.json` compiles `src/` only. ESLint applies type-aware rules to tests using explicit, non-recursive `projectService.allowDefaultProject` globs; keep one entry for every test directory in `backend/eslint.config.js` and add the matching glob in the same change. Do not assume a parent glob covers nested files.
- Keep test doubles strictly typed. Prefer `vi.fn<Contract['method']>()` or explicit fixture interfaces; avoid `any`, untyped mock callbacks, unsafe matcher values such as `expect.any()` in typed assignments, unbound object methods in assertions, and `async` mocks that do not await anything.
- Treat lint as a blocking correctness gate, not a best-effort check. Run `npm --prefix backend run lint` after adding or changing backend code/tests and again after the final edit; resolve every reported error without disabling or weakening rules unless the user explicitly approves that trade-off. Do not report lint as passed unless the command exits successfully.
- If type-aware lint reports Prisma imports or calls as `any`, check whether the generated client is missing or stale and run `npm --prefix backend run db:generate`, then rerun lint. Do not work around missing generated types with casts, `any`, or lint suppressions.
- In a test-first change, run the focused test and `npm --prefix backend run lint` before implementing production behavior so test harness and type-aware lint issues surface early.
- Run focused backend checks first, then `npm --prefix backend run lint`, `npm --prefix backend test`, and `npm --prefix backend run build` as appropriate. After a clean install or container rebuild, generate Prisma types before build/lint validation when the generated client is absent or stale.
- Report checks that could not be run and distinguish implemented behavior from proposed design.
