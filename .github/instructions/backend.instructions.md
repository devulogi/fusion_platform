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
- Keep functions thin, testable, and maintainable.
- Follow test driven development (TDD) practices: write tests before implementing functionality to ensure correctness and maintainability.
- Keep the take-home solution proportionate: do not introduce pagination, Redis, microservices, multi-instance guarantees, durable event replay, or extra abstractions without an approved requirement.

## TypeScript and API boundaries

- Preserve strict TypeScript. Do not use `any`; use `unknown` and narrow it when input is not yet trusted.
- Treat every HTTP request body, parameter, and query value as untrusted. Validate it at the controller boundary with Zod before calling application logic.
- Keep responsibilities explicit: controllers handle HTTP and response mapping; services coordinate use cases and domain rules; repositories own PostgreSQL access; cache and event delivery are infrastructure concerns.
- Return stable, intentional HTTP errors for validation, missing records, and conflicts. Never expose stack traces, secrets, or raw database details to clients.

## Persistence, cache, and events

- PostgreSQL is the system of record. The in-process `Map` is disposable and only valid within one backend process.
- At startup, connect to PostgreSQL, seed only if the approved behavior enables it and the database is empty, hydrate the cache, and report readiness only after hydration succeeds. Never serve an empty or partial cache as a successful complete collection after a failed load.
- For mutations, persist and commit first, update the cache from the canonical saved record second, and publish the typed event last. On persistence failure, do not mutate the cache or publish an event.
- Keep REST as the client-to-server command path. SSE is server-to-client only; it is not the source of truth and events are not durable. Clients recover missed events by reloading the collection.
- Ensure shutdown and disconnect paths release database resources and SSE subscriber listeners.

## Tests and validation

- Add or update tests for successful behavior and relevant failure paths, including validation errors, missing records, persistence failures, cache consistency, and event ordering.
- Keep tests deterministic; avoid relying on wall-clock timing or external services when an existing test double can cover the behavior.
- Backend `tsconfig.json` excludes test files from the build, while ESLint applies type-aware rules to them. Before adding tests under a new nested directory, check `backend/eslint.config.js` and add that path to `projectService.allowDefaultProject`; run backend lint as soon as the tests exist.
- Keep test doubles strictly typed. Prefer `vi.fn<Contract['method']>()` or explicit fixture interfaces; avoid `any`, untyped mock callbacks, unsafe matcher values such as `expect.any()` in typed assignments, unbound object methods in assertions, and `async` mocks that do not await anything.
- In a test-first change, run the focused test and `npm --prefix backend run lint` before implementing production behavior so test harness and type-aware lint issues surface early.
- Run focused backend checks first, then `npm --prefix backend run lint`, `npm --prefix backend test`, and `npm --prefix backend run build` as appropriate.
- Report checks that could not be run and distinguish implemented behavior from proposed design.
