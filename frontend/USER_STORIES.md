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
- REST mutation responses are canonical. After successful mutations and valid SSE events, the frontend refetches the active server query so page membership, ordering, and counts remain accurate.
- The assessment's required core model is `id`, `symbol`, `quantity`, `price`, `side`, `trader`, `tradeTimestamp`, and `status`. The sample's `book` and `counterparty` fields may also be shown when present.
- Cancellation is terminal in the backend contract. Do not send `{ "status": "ACTIVE" }` to undo cancellation or expose a direct Reactivate action.
- Storybook is configured for reusable component exploration. MSW and Playwright are not configured; request approval before adding their dependencies or project setup.

## Stories

### 1. View the trade blotter

**Status:** Implemented

As a blotter user, I want to see persisted trades in a readable table so I can review current trading activity.

**Acceptance criteria**

- When the SSE connection opens, the frontend fetches page 1 from `GET /api/v1/trades` and renders `{ items, pagination }`.
- The stream is established before the initial page request. Events received while a request is in flight trigger a follow-up refresh of the active query.
- Rows clearly identify their trade and display the assessment's important fields: symbol, side, quantity, price, trader, trade date, and status. Optional `book` and `counterparty` fields are displayed when the UI has an appropriate layout for them.
- Loading, empty, and snapshot-error states are communicated clearly without exposing internal errors.
- The layout remains usable at narrow viewport widths; essential information and row actions are not silently lost.

**Implementation:** The page fetches and displays the collection after the SSE connection opens. A feature-local TanStack Table component displays all required trade fields and optional book/counterparty values, uses layout-matching loading skeletons, and presents empty and snapshot-error states. On narrow viewports the table scrolls within its wrapper without widening the page. Row actions open the validated amend form and cancellation confirmation; the header action opens the create form.

### 2. Sort, filter, and refresh trades

**Status:** Implemented

As a blotter user, I want to sort, filter, and refresh the collection so I can find trades and request the latest snapshot on demand.

**Acceptance criteria**

- Users can sort the table by supported columns with a visible sort direction.
- Users can search by symbol and open the Filters dialog for trader, date range, side, and status criteria.
- Users can reset all filter drafts, cancel without applying, and see how many criteria are active.
- A refresh action refetches the collection through TanStack Query and presents pending/error feedback without losing the last successful snapshot.
- Sorting, filters, and numbered pagination are sent to the server and apply to the complete cached result set. The UI renders the returned page and filtered `totalItems`/`pageCount` metadata.
- Sorting/filtering controls work by keyboard and expose their state accessibly.

**Implementation:** TanStack Table controls supported sort state and the Filter dialog collects symbol, trader, date, side, and status criteria; those values are sent as validated query parameters. Apply commits the draft, Cancel discards it, and Reset all clears it. Changing a filter or sort resets to page 1. The numbered pagination controls use the server's filtered counts. A refresh action refetches the current query, displays pending/error feedback, remains available during SSE reconnects after the first snapshot, and retains the last successful page if refresh fails.

### 3. Create a trade

**Status:** Implemented

As a trader, I want to create a trade so it is persisted and appears in the blotter and live updates.

**Acceptance criteria**

- A clearly located create action opens a labelled form with the required trade fields.
- Validate inputs with the existing Zod contract before submission. Show field-level, accessible errors and retain user input after validation or request failure.
- Submit through `POST /api/v1/trades`; prevent accidental duplicate submission while the request is pending.
- On success, close/reset the form and refetch the active numbered query. A matching SSE event must not leave duplicate or stale rows.
- On failure, keep the form recoverable and show a safe, actionable message.

**Implementation:** The blotter's New trade action opens a validated dialog. Required fields, including status, are explicit; optional book and counterparty are supported. The form submits through REST, disables duplicate submission while pending, refetches the active numbered query after success, and preserves the draft with a safe message on failure. RTL covers validation, payload shape, pending state, and recovery.

### 4. Amend a trade

**Status:** Implemented

As a trader, I want to amend an active trade so corrected details are persisted and visible in the blotter.

**Acceptance criteria**

- An amend action is associated with the selected trade and opens a pre-populated, labelled form.
- Only fields allowed by the PATCH contract are editable; the ID and status are not submitted as amendment fields.
- Validate before sending and show field-level errors without discarding the draft.
- Submit the amendment to `PATCH /api/v1/trades/{tradeId}`. Disable duplicate submission while pending.
- On success, refetch the active numbered query; the corresponding SSE event also refreshes that query rather than upserting into a potentially stale page.
- Show safe feedback for not-found, not-amendable, validation, and unexpected errors. Do not expose raw server details.

**Implementation:** Active rows expose an amend action that opens a prepopulated dialog. It submits only editable fields to the existing PATCH endpoint, refetches the active numbered query after success, and leaves the draft available after safe error feedback. RTL verifies prepopulation, validation, payload exclusions, pending state, and failure recovery.

### 5. Cancel a trade

**Status:** Implemented

As a trader, I want to cancel an active trade without deleting it so its status remains visible to the blotter.

**Acceptance criteria**

- A cancel action is available for an active row and requires confirmation before sending.
- Submit the assessment's cancellation command `{ "status": "CANCELLED" }` to `PATCH /api/v1/trades/{tradeId}`.
- On success, retain the trade and refetch the active numbered query; the matching SSE event must not leave duplicate or stale rows.
- Prevent duplicate submission while pending and show safe feedback when cancellation fails.
- A cancelled trade has no row-level action to directly return it to `ACTIVE`; the frontend must not send `{ "status": "ACTIVE" }` as an undo command.

**Implementation:** Active rows expose a confirmation dialog that states cancellation will not delete the trade. Confirm sends `{ "status": "CANCELLED" }` through PATCH; successful cancellation refetches the active numbered query. Cancelled rows expose no actions. Pending state prevents duplicate confirmation; errors retain a retry path. RTL covers confirmation content, payload, pending state, success close, and failure recovery.

### 6. Receive live trade updates

**Status:** Implemented

As a connected blotter user, I want committed changes from other clients to appear without manually reloading the page.

**Acceptance criteria**

- Connect to `GET /api/v1/events` using native `EventSource` and show the connection state accessibly.
- Handle `trade.created`, `trade.amended`, and `trade.cancelled` payloads as untrusted input; ignore malformed events.
- Validate supported events and refetch the active server query; do not manually upsert into a partial page.
- Close the stream when the app unmounts. After automatic reconnect, refetch the snapshot because this backend has no durable event replay or event IDs.
- Connection loss/recovery is visible without blocking access to the last successful snapshot.

### 7. Adopt the supplied Trade History visual design

**Status:** Implemented

As a blotter user, I want the existing assessment workflows to use the supplied TradeLog visual direction while retaining their current behavior and API contracts.

**Design direction:** Use a pale lavender application canvas (`#e7e9f6`) around a white/off-white work surface (`#f7f8fb`). Use cool gray borders (`#cbd0dc`), near-black text (`#20232b`), muted secondary text (`#626a78`), and saturated indigo-blue actions/selection (`#3048cc`). Status uses a pale green badge with green indicator for Active (`#dff3e8` / `#31966a`) and a pale red badge with red indicator for Cancelled (`#f8dfe1` / `#d25360`). These are starting estimates from the supplied raster; prefer exact design tokens if provided later. Use compact neutral sans-serif typography, thin separators, restrained radii, and no shadows beyond the contained application surface. The mock browser chrome in the reference is presentation framing, not an in-app component.

**Acceptance criteria**

- Apply the reference palette and compact visual hierarchy to the existing Trade History screen, including loading, empty, error, and dialog states.
- Keep the current assessment actions and refresh behavior. Do not add navigation destinations or controls without an implemented workflow.
- Keep symbol search inline; put trader, inclusive local-date range, side, and status criteria in the Filters dialog. Show the number of active criteria.
- Apply commits the filter draft; Cancel and Escape discard it; Reset all clears symbol search and advanced filters.
- Use the reference columns: composite Trade (symbol/side with trader secondary), Date & Time, Quantity, Price, Status, and Actions. Do not display Trade ID, Book, or Counterparty as columns.
- Keep create/amend/cancel and refresh workflows. Active trades expose Amend and Cancel through the dedicated Actions menu; cancelled trades have no actions. Status is text-labelled and not communicated by color alone.
- Keep numbered pagination with result range and filtered total. Do not add CSV export, side tabs, or bulk-selection actions.
- Use only fields supplied by the API. Do not present `counterparty` as issuer/company metadata.

**Components and Storybook work**

- `TradeStatusBadge`: reusable Active/Cancelled variants. Stories cover both variants; RTL verifies visible labels and semantic styling.
- `TradeFilterToolbar`: symbol search plus a staged Filter Trades dialog with manual date range, side/status checkboxes, trader, Reset all, Cancel, and Apply Filters. Stories cover closed, open, and active-filter states; RTL verifies manual dates, draft/apply/cancel/reset, keyboard close/focus, and accessible controls.
- `TradeRowActions`: three-dot row menu for Amend and Cancel trade. Stories cover collapsed, open, and disabled states; RTL verifies callbacks, Escape/outside dismissal, focus restoration, and disabled behavior.
- `TradeBlotterTable`: reference columns, sortable composite Trade cell, dedicated Actions column, status badge, and loading/empty states. Stories cover populated, loading, and empty; RTL covers sorting, filtering, and row-action integration.
- Existing create, amend, and cancel dialogs retain their validated REST workflows and receive the reference palette.

**Tests and validation**

- Keep stories colocated with components in `frontend/src/`; use deterministic fixtures and no live API calls.
- Use the Storybook accessibility addon and RTL for component states and user-observable interactions. Do not add screenshot infrastructure or MSW without approval.
- Preserve REST/SSE contracts. Run focused tests during component development, then the frontend suite, lint, application build, Storybook build, and browser checks.

## Cross-cutting quality criteria
