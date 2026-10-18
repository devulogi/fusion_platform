# Frontend User Stories

These stories translate the full-stack take-home assessment into frontend workflows. Assessment requirements are prioritized over optional backend capabilities.

## Status

- **Implemented:** The current frontend behavior meets the story's listed acceptance criteria.
- **Partially implemented:** Some behavior exists, but one or more listed criteria remain.
- **Proposed:** The workflow is required by the assessment but is not implemented in the current frontend.

## Scope and assumptions

- The frontend uses React, TypeScript, Vite, Tailwind CSS, TanStack Table, TanStack Query, React Hook Form, and Zod.
- The browser uses the Vite `/api` proxy for backend calls and the backend's REST/SSE contracts; it never connects directly to PostgreSQL.
- TanStack Query owns server state for the trade snapshot. React Context is reserved for client state genuinely shared across components, such as SSE connection status. Component-local state owns form drafts and transient UI state.
- REST responses are authoritative for the initiating action; SSE delivers committed changes to other connected clients. Applying the same trade from both paths must upsert by trade ID rather than create duplicates.
- The assessment's required core model is `id`, `symbol`, `quantity`, `price`, `side`, `trader`, `tradeDate`, and `status`. The sample's `book` and `counterparty` fields may also be shown when present.
- Backend reactivation support exists, but reactivation is not required by the supplied assessment. Do not add a reactivation control unless explicitly approved.
- Storybook is configured for reusable component exploration. MSW and Playwright are not configured; request approval before adding their dependencies or project setup.

## Stories

### 1. View the trade blotter

**Status:** Implemented

As a blotter user, I want to see persisted trades in a readable table so I can review current trading activity.

**Acceptance criteria**

- When the SSE connection opens, the frontend fetches `GET /api/v1/trades` and renders the returned `{ items }` collection.
- The stream is established before the initial snapshot request. Events received while the request is in flight are reconciled over the snapshot.
- Rows clearly identify their trade and display the assessment's important fields: symbol, side, quantity, price, trader, trade date, and status. Optional `book` and `counterparty` fields are displayed when the UI has an appropriate layout for them.
- Loading, empty, and snapshot-error states are communicated clearly without exposing internal errors.
- The layout remains usable at narrow viewport widths; essential information and row actions are not silently lost.

**Implementation:** The page fetches and displays the collection after the SSE connection opens. A feature-local TanStack Table component displays all required trade fields and optional book/counterparty values, uses layout-matching loading skeletons, and presents empty and snapshot-error states. On narrow viewports the table scrolls within its wrapper without widening the page. Row actions open the validated amend form and cancellation confirmation; the header action opens the create form.

### 2. Sort, filter, and refresh trades

**Status:** Implemented

As a blotter user, I want to sort, filter, and refresh the collection so I can find trades and request the latest snapshot on demand.

**Acceptance criteria**

- Users can sort the table by supported columns with a visible sort direction.
- Users can apply and clear basic filters for symbol, trader, and status.
- A refresh action refetches the collection through TanStack Query and presents pending/error feedback without losing the last successful snapshot.
- Sorting and filtering are client-side for the assessment-sized collection; they do not change the server contract or add pagination.
- Sorting/filtering controls work by keyboard and expose their state accessibly.

**Implementation:** TanStack Table sorts supported columns and filters client-side by symbol, trader, and status. The clear action resets all filters. A refresh button refetches through TanStack Query, displays pending/error feedback, remains available during SSE reconnects after the first snapshot, and retains the last successful data if refresh fails.

### 3. Create a trade

**Status:** Implemented

As a trader, I want to create a trade so it is persisted and appears in the blotter and live updates.

**Acceptance criteria**

- A clearly located create action opens a labelled form with the required trade fields.
- Validate inputs with the existing Zod contract before submission. Show field-level, accessible errors and retain user input after validation or request failure.
- Submit through `POST /api/v1/trades`; prevent accidental duplicate submission while the request is pending.
- On success, close/reset the form and update the TanStack Query cache from the canonical response. A matching SSE event must not create a duplicate row.
- On failure, keep the form recoverable and show a safe, actionable message.

**Implementation:** The blotter's New trade action opens a validated dialog. Required fields, including status, are explicit; optional book and counterparty are supported. The form submits through REST, disables duplicate submission while pending, updates the Query cache from the saved response, and preserves the draft with a safe message on failure. RTL covers validation, payload shape, pending state, and recovery.

### 4. Amend a trade

**Status:** Implemented

As a trader, I want to amend an active trade so corrected details are persisted and visible in the blotter.

**Acceptance criteria**

- An amend action is associated with the selected trade and opens a pre-populated, labelled form.
- Only fields allowed by the PATCH contract are editable; the ID and status are not submitted as amendment fields.
- Validate before sending and show field-level errors without discarding the draft.
- Submit the amendment to `PATCH /api/v1/trades/{tradeId}`. Disable duplicate submission while pending.
- On success, update the query cache from the canonical trade response; the corresponding SSE event upserts the same trade.
- Show safe feedback for not-found, not-amendable, validation, and unexpected errors. Do not expose raw server details.

**Implementation:** Active rows expose an amend action that opens a prepopulated dialog. It submits only editable fields to the existing PATCH endpoint, updates the Query cache from the canonical response, and leaves the draft available after safe error feedback. RTL verifies prepopulation, validation, payload exclusions, pending state, and failure recovery.

### 5. Cancel a trade

**Status:** Implemented

As a trader, I want to cancel an active trade without deleting it so its status remains visible to the blotter.

**Acceptance criteria**

- A cancel action is available for an active row and requires confirmation before sending.
- Submit the assessment's cancellation command `{ "status": "CANCELLED" }` to `PATCH /api/v1/trades/{tradeId}`.
- On success, retain the row and update its status from the canonical response; the matching SSE event must not duplicate it.
- Prevent duplicate submission while pending and show safe feedback when cancellation fails.
- A cancelled trade has no row-level action to directly return it to `ACTIVE`; the frontend must not send `{ "status": "ACTIVE" }` as an undo command.

**Implementation:** Active rows expose a confirmation dialog that states cancellation will not delete the trade. Confirm sends `{ "status": "CANCELLED" }` through PATCH; the canonical response updates the Query cache and the matching SSE event upserts the same row. Cancelled rows expose no actions. Pending state prevents duplicate confirmation; errors retain a retry path. RTL covers confirmation content, payload, pending state, success close, and failure recovery.

### 6. Receive live trade updates

**Status:** Implemented

As a connected blotter user, I want committed changes from other clients to appear without manually reloading the page.

**Acceptance criteria**

- Connect to `GET /api/v1/events` using native `EventSource` and show the connection state accessibly.
- Handle `trade.created`, `trade.amended`, `trade.cancelled`, and `trade.reactivated` payloads as untrusted input; ignore malformed events.
- Upsert valid trades into the TanStack Query cache by ID. Events arriving during a snapshot fetch are buffered and reconciled over the snapshot.
- Close the stream when the app unmounts. After automatic reconnect, refetch the snapshot because this backend has no durable event replay or event IDs.
- Connection loss/recovery is visible without blocking access to the last successful snapshot.

## Cross-cutting quality criteria

- Use React Testing Library for accessible, user-observable component behavior. Use Storybook stories for reusable component states and visual variants; use MSW for mocked API responses only when approved and configured. Reserve Playwright for a small number of critical end-to-end user journeys when configured.
- Use an app-level error boundary for unexpected render failures. Its fallback is accessible and safe, supports retry/reset and reload, and does not display raw error details.
- Keep trade data in TanStack Query rather than duplicating it in Context. Use Context only for shared client state; keep drafts and transient presentation state local.
- Preserve the shared frontend interaction, motion, focus, loading, touch-target, and form conventions in `.github/instructions/frontend.instructions.md`.
- Do not add optional features outside these stories without explicit approval.
