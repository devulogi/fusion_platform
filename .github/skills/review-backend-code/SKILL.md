---
name: review-backend-code
description: "Use when reviewing a backend diff or endpoint for correctness, security, persistence/cache consistency, SSE reliability, TypeScript safety, and missing tests."
argument-hint: "Provide the backend diff or files and the relevant story."
user-invocable: true
---

# Review Backend Code

## When to use

Use for a focused, read-only review of changes under `backend/`.

## Procedure

1. Read the relevant user story, backend instructions, and changed code/tests.
2. Trace the full path from HTTP input through validation, service, repository, cache, and event delivery.
3. Check both successful and failed paths: malformed input, missing record, database failure, startup hydration failure, conflicting update if supported, SSE disconnect, and event ordering.
4. Check for untrusted input use, unsafe TypeScript types, leaked secrets/errors, unhandled async failures, and tests that assert only implementation details.
5. Compare the implementation against approved scope. Flag unsupported pagination, Redis, multi-node claims, or invented domain rules as scope concerns only when they affect correctness or delivery.

## Output

List actionable findings first, ordered by severity. Include file/line, impact, and a concrete fix. Then list assumptions or test gaps. If no findings exist, say so and note meaningful residual risks. Do not modify files during review.
