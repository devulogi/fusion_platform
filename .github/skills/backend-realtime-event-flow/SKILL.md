---
name: backend-realtime-event-flow
description: "Use when implementing backend Server-Sent Events, trade event publishing, live updates, subscriber lifecycle, or reconnect behavior."
argument-hint: "Name the event flow and acceptance criteria."
user-invocable: true
---

# Backend Real-Time Event Flow

## When to use

Use for SSE endpoint, event publisher, trade event contracts, or backend live-update tests.

## Procedure

1. Read backend instructions, the live-update story, and current REST/domain code.
2. Define a typed event contract for `trade.created`, `trade.amended`, and `trade.cancelled`, carrying the canonical persisted trade.
3. Keep client commands on REST. SSE only carries server-to-client notifications.
4. For mutations, enforce the order: database commit, cache update, event publication. A failed commit publishes nothing; a failed SSE send must not reverse a successful commit or fail the REST response.
5. At startup, complete database connection, optional seed, and cache hydration before reporting readiness.
6. Clean up subscriber listeners when clients disconnect. Use SSE framing/content type correctly and avoid retaining dead responses.
7. Address the initial snapshot race: establish the stream before fetching the collection, then reconcile events received while the snapshot is loading. After reconnect, reload the collection because events are not durable.
8. Test event payloads, ordering, disconnect cleanup, persistence failure, and client recovery assumptions.

Do not add Redis, durable replay, multi-instance fan-out, or WebSockets without an approved requirement. Report SSE limitations explicitly.
