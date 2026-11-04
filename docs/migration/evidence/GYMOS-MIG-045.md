# GYMOS-MIG-045 — Start and safe shared notes

Status: **In Progress.** Evidence is from the uncommitted working tree on 3 November 2026. The lifecycle API/controller and contracts are registered; trainer schedule controls are mounted and covered by the combined headed session-read journey.

## Implemented

- `POST /gyms/:slug/sessions/:sessionId/start` accepts a strict expected-version/idempotency command for an assigned active trainer or authorized owner. It uses database server time and the DEC-07 inclusive window from 15 minutes before scheduled start through scheduled end, requires the booking's held credit, serializes starts for the assigned trainer, rejects another active session, and records one versioned state event, receipt, audit and persisted member notification in the transaction.
- START and notes hold the selected-gym `GymAccess` fence for the member, assigned trainer, and owner when applicable across the tenant transaction. The service validates same-gym published tenant actor bindings before acting.
- `PATCH /gyms/:slug/sessions/:sessionId/notes` accepts completed sessions only, normalizes line endings, and limits text to 4,000 Unicode codepoints. It writes a versioned event/audit and no financial effects. The receipt stores a bounded note snapshot so retry returns the original note/version after a later edit.
- Added `SESSION_STARTED` notification content using the member session link. Notification insertion remains inside the tenant command transaction.
- Added contract, API-client, server-action and form/component files. The UI action preserves idempotency keys for unknown outcomes and displays server errors without treating them as success.

## Verification

- `pnpm --dir packages/contracts build` — exit 0.
- `pnpm --dir packages/contracts test` — exit 0; 47/47 tests passed, including lifecycle DTO bounds and strict notification/member output.
- `pnpm --dir packages/api-client typecheck` — exit 0.
- `pnpm --dir apps/api exec tsc --noEmit --incremental false --pretty false` — exit 0 before the latest test-only additions.
- `pnpm --dir apps/web exec tsc --noEmit --incremental false --pretty false` — exit 0.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.session-lifecycle.ts --disableConsoleIntercept` — exit 0; 3/3 guarded disposable PostgreSQL tests passed. Start coverage includes same-key replay, different-key conflict, database server time/window rejection, wrong-role, inactive trainer and foreign-gym session rejection, and persisted state-event/audit/notification counts. Notes coverage confirms 4,000 Unicode codepoint validation, receipt replay returns the first saved note/version after a later edit, member session reads show the latest shared note, and note commands create no credit/revenue/pay effects. Harness cleanup: six owned databases dropped, container removed and run manifest removed.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.ts tests/session-reads.e2e.spec.ts --headed` — exit 0; 1/1 headed browser test. It verifies the assigned trainer sees command controls for an active session and the member view has no trainer commands. The combined run also covers role-specific cancellation quote panels. This is agent-performed Playwright evidence, not owner-observed Chrome review.

## Remaining acceptance

- Owner-observed Chrome review and hosted checks remain pending; the CUA browser-access host is unavailable. No independent owner-observed acceptance is claimed.
- Task remains In Progress pending hosted checks and final cross-task dependency review.
