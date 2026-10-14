---
name: implement-backend-api-story
description: "Use when implementing a backend trade API story or endpoint. Guides controller, Zod validation, service, repository, cache/event ordering, tests, and verification."
argument-hint: "Provide the story and acceptance criteria."
user-invocable: true
---

# Implement a Backend API Story

## When to use

Use for an approved backend story involving collection reads, trade creation, amendment, cancellation, or another backend HTTP workflow.

## Procedure

1. Read `.github/instructions/backend.instructions.md`, `backend/USER_STORIES.md`, and the current code/tests for the affected flow.
2. Confirm endpoint shape, fields, and domain rules. Ask about unresolved assumptions instead of filling them in silently.
3. Trace request handling through controller, service, repository, cache, and event publisher as needed.
4. Validate untrusted input with Zod at the boundary. Put use-case and trade rules in the service; keep database operations in the repository.
5. For writes, commit to PostgreSQL, update cache from the canonical saved record, then publish the typed event. Do not change cache or emit on failed persistence.
6. Document using openapi specifications for the implemented endpoints.
7. Add tests for acceptance criteria and important error paths. Keep client-side sorting/filtering and full collection reads unless approved requirements change.
8. Run the focused tests, `npm --prefix backend run lint`, and `npm --prefix backend run build` as appropriate.

## Completion report

State implemented behavior, changed files, tests and checks run, and remaining assumptions or limitations. Distinguish implemented code from planned architecture.
