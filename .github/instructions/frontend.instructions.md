---
name: Frontend engineering instructions
description: Use when editing or reviewing files under frontend/. Covers React, TypeScript, trade blotter UX, API integration, SSE, Storybook/MSW, Playwright, accessibility, and tests.
applyTo: "frontend/**"
---

# Frontend Engineering Instructions

## Document ownership

- This file owns shared frontend architecture and engineering standards; it does not define the requested feature scope or implementation cycle.
- The Frontend Feature Engineer agent owns frontend task scope and implementation workflow. Use the full-stack assessment and the user's request as the source of acceptance criteria.
- The backend OpenAPI document is served from the backend origin at `/api-docs/openapi.yaml` (`http://localhost:4001/api-docs/openapi.yaml` in local Compose). It is not routed through the frontend Vite `/api` proxy.

## Architecture and implementation

- Preserve the current React 18, TypeScript, and Vite application structure. Keep UI components, browser API integration, and client-side state in `frontend/src/`; do not add top-level layer directories or state-management frameworks without a concrete need and user approval.
- Follow component-first, feature-local organization. Put each custom trade component in its own PascalCase-named directory under `frontend/src/features/trades/components/`. `index.tsx` is the parent/composition entry point: it owns the component's logic and state and imports focused child components for presentation. Keep child markup/styles in those child components instead of placing the entire UI in `index.tsx`; children receive typed data and callbacks and do not call APIs. Colocate stories and tests for the component in the same directory. Keep app-wide components in a top-level `frontend/src/components/` only when reused across features.
- Treat `frontend/src/features/trades/TradeHistoryPage.tsx` as the Trade History page wrapper: it owns feature-level data fetching, REST/SSE orchestration, mutations, and selected-trade state, then composes child components via typed props and callbacks. Child components own focused presentation and transient interaction state, and must not call trade APIs directly. Keep `App.tsx` focused on the application shell/providers and mount the page from it. Build and explore components in Storybook before integrating them into the page.
- Use functional components and React hooks for all new UI development. Avoid class components.
- Prefer composition over inheritance when structuring components. Break down complex UI into smaller, reusable pieces rather than creating large monolithic components.
- Keep component logic and side effects encapsulated within hooks whenever possible. Avoid scattering stateful logic across multiple components.
- Avoid useEffect and useLayoutEffect for data fetching or complex side effects. Prefer custom hooks that encapsulate the necessary logic and manage side effects in a controlled manner.
- Prefer using context and custom hooks for shared state rather than lifting state up unnecessarily. This helps keep components focused and reduces prop drilling.
- Use TypeScript's type system to enforce component and hook contracts. Define explicit prop types, return types, and state shapes to improve maintainability and catch errors early.
- Keep styling concerns separate from component logic. Use CSS modules, styled-components, or the existing styling conventions to maintain a consistent and maintainable UI.
- Keep logic and state management separate in parent component. Parent components should handle orchestration, data fetching, and passing down necessary state and callbacks to child components, while child components focus on rendering and local UI state.
- Avoid duplicating state between local component state and global context unnecessarily. Use context only for truly shared state.
- Use the installed libraries where they fit: TanStack Table for interactive trade-grid behavior, TanStack Query for server-state caching and mutations, React Context for genuinely shared client state, React Hook Form and Zod for forms and validation, and Vitest/React Testing Library for component behavior. Do not duplicate query-managed server state in Context.
- Do not assume a component library or design system that is not configured. Reuse existing components and styling conventions; ask before adding a new component framework or shared design-system dependency.
- Keep API communication in the browser and use the existing `/api` Vite proxy with `VITE_API_PROXY_TARGET`. Never connect the frontend directly to PostgreSQL.
- Keep feature behavior in focused components and hooks. Avoid a general state-management abstraction unless the feature demonstrates a need beyond local component or hook state.
- Use an app-level React error boundary to contain unexpected render failures. Show a safe, accessible fallback with retry/reset and reload actions; keep diagnostic details out of the UI.
- Do not add pagination, audit history, positions/P&L, authentication, or other optional assessment extensions unless explicitly requested.

## Trade workflow design

- Prioritize the assessment's core user workflows: view and refresh trades, sort and filter the blotter, create trades, amend trades, cancel trades, and see committed changes from other clients in real time.
- Present clear loading, empty, error, and reconnecting states. Keep errors actionable and user-safe; do not expose stack traces, database messages, or implementation details in the UI.
- Validate user input with the existing Zod patterns before sending commands. Treat API responses and SSE payloads as untrusted data and validate them at runtime.
- Keep request and response handling aligned with the OpenAPI contract, including the `{ items }` collection shape and structured `{ error: { code, reason, requestId, details? } }` errors.
- Use native `EventSource` for the current SSE contract. Open the stream before fetching the initial snapshot, buffer and reconcile events received during snapshot loading, close the stream when the owning component/hook unmounts, and reload the snapshot after reconnect because the backend does not provide event IDs or durable replay.
- Do not introduce WebSocket or Socket.IO clients unless the user changes the transport decision.

## UX and accessibility

- Design for a trading blotter: information-dense, scannable, responsive, and optimized for repeated use rather than marketing presentation. Preserve the established visual language unless the user requests a redesign.
- For the approved Trade History redesign, use the supplied TradeLog image as the visual reference: pale lavender canvas (`#e7e9f6`), white/off-white work surface (`#f7f8fb`), cool gray borders (`#cbd0dc`), near-black text (`#20232b`), muted secondary text (`#626a78`), and indigo-blue primary/selection accent (`#3048cc`). Use pale green/green (`#dff3e8` / `#31966a`) for Active and pale red/red (`#f8dfe1` / `#d25360`) for Cancelled. These are approximate raster-derived starting tokens; use supplied exact tokens if they become available. The screenshot's browser chrome is framing, not product UI.
- Primary actions use `bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white`. Destructive actions use `text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30`.
- Use natural interaction transitions with `cubic-bezier(0.16, 1, 0.3, 1)` or `duration-200 ease-out`; avoid linear or abrupt transitions. Buttons and clickable cards may use `transition-all duration-150 ease-out hover:scale-[1.01] active:scale-[0.98]` when that feedback will not shift or disrupt surrounding layout.
- Keyboard focus uses a visible 2px offset ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900`.
- Use layout-matching skeletons rather than a global spinner, for example `animate-pulse bg-slate-200 dark:bg-slate-800 rounded-lg`.
- Interactive targets must be at least 44x44px. Icon buttons need an adequate hit area such as `p-2.5` or `p-3`.
- Form fields need clear top-aligned or floating labels, visible focus borders, and explicit error messages below the field in red.
- Use semantic controls, labels, keyboard operation, and accessible announcements for important asynchronous state changes. Keep layouts usable at narrow viewports without clipping critical trade fields or actions.

## Testing and validation

- Add or update focused tests for behavior changes. Storybook is configured with the React-Vite framework in `frontend/.storybook`; create stories and tests inside each component directory under `frontend/src/features/trades/components/<ComponentName>/`, beside its `index.tsx`. Use stories to explore visual variants and document meaningful states, including loading, empty, error, disabled, and interactive states where relevant. Reuse the app's Tailwind styles and preview backgrounds; do not create a parallel design system in Storybook.
- Use React Testing Library (RTL) for accessible, user-observable component behavior. Use MSW for mocked API responses only after it is configured and approved. Use Playwright through the actual application UI for a small number of critical end-to-end workflows when configured.
- Storybook dependencies and configuration are approved and present. MSW and Playwright are not configured; ask before adding those dependencies, test runners, or project configuration.
- Run the relevant focused tests, then `npm --prefix frontend run lint` and `npm --prefix frontend run build` when code changes warrant them.
- For user-facing UI changes, run the app and verify the affected workflow in a browser, including responsive layout, keyboard access, and meaningful loading/error states. Report environment blockers rather than claiming visual verification.
- Keep test doubles typed and deterministic; avoid unnecessary wall-clock waits and external services.
- Do not claim checks passed unless the commands completed successfully. Report tests and browser checks actually performed and any unresolved assumptions.

## Scope and approval

- Preserve user changes and keep frontend edits limited to the approved workflow.
- Ask before adding dependencies or changing project configuration, introducing a new architectural abstraction, or making material product/interaction decisions not covered by these instructions.
- Backend scope and feature approval are owned by the Frontend Feature Engineer agent; no backend files or API contracts may be changed without explicit user approval.
