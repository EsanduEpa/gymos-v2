# GYMOS-MIG-043 — selected-gym notifications and audit reads

Status: **In Progress; minimum read/UI foundation verified, event-producing session workflows incomplete.** Evidence was captured 3 November 2026 on `codex/segment-06-management` at the Segment 06/07 migration checkpoint. Hosted PR checks remain open.

## Implemented foundation

- Added strict notification/list/read/read-all and sanitized audit contracts, a typed API client, and a source-event helper whose key binds event, gym and recipient and whose retries reject content mismatches.
- Added member/owner/trainer selected-gym list and read-one/read-all operations with recipient ownership enforcement, bounded results and pure reads. Added owner-only paged audit reads with a narrow allowlist; time filters are intentionally absent because no corresponding audit filter UI is included in this task slice.
- Added a selected-gym dashboard bell with 20-second polling, five newest rows, unread total, mark-one/all behavior, stale-response suppression on context changes and unread-state retention when requests fail.

## Verification

- `pnpm --dir packages/contracts build && pnpm --dir packages/contracts test && pnpm --dir packages/api-client typecheck` — exit 0; 28 contract tests passed.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.notifications.ts --disableConsoleIntercept` — exit 0; 3/3 guarded disposable PostgreSQL tests. Verified two-gym/recipient isolation, pure reads, bounded limits, owned/idempotent read operations, read-all cutoff behavior, owner-only sanitized audit reads, source-event deduplication and mismatch denial. Harness output confirmed removal of six owned databases, container and run manifest.
- `pnpm --dir apps/web test:e2e --grep 'selected-gym bell'` — exit 0; 1/1 browser test. Verified mobile list/read/mark-all, unread state after API failure and screenshot capture.
- Captured and visually inspected [390px bell screenshot](GYMOS-MIG-043/notifications-bell-390.png); the notification panel remains within the viewport.
- `pnpm typecheck:workspace`, `pnpm lint:workspace`, `pnpm build:workspace`, `pnpm --dir apps/web build` and `git diff --check` — exit 0 on the current working tree. A default-sandbox attempt to start Docker failed before container creation due Docker socket permission; the same explicitly guarded disposable suite then passed under reviewed escalation.

Notification table DDL is part of the additive tenant migration with checksum `752b61acf2704e1cab46f51a2109db43f7bca896e27f34ca60e626b76e0f3022`; the test database was disposable and cleaned. No demo/V1 database was used.

## Remaining acceptance

- Booking (041), request/decision (042), member status (033), session start/completion (045/046), and cancellation/no-show (047) now persist recipient-bound notifications in their transaction boundaries. Their guarded suites cover atomic rollback/retry and exact event counts; lifecycle commands do not send out-of-band notifications.
- The full mapped cross-role acceptance and committed hosted checks remain open. Owner-visible Chrome review is unavailable because CUA reports that the browser access host is unavailable; no owner-observed review is claimed.

## Lifecycle producer integration follow-up — 3 November 2026

- Task 033 guarded recovery and cross-gym suite passed 1/1; its in-process Nest/Supertest guard route passed 1/1. Task 047's guarded suite passed 5/5, including a cancel/no-show race with exactly one persisted terminal event, notification, settlement, movement and earning. Tasks 041/042 and 045/046 have linked guarded evidence for their producers.
- The latest Task044 headed browser run passed 1/1 and verified role-specific read/quote controls. It was agent-performed Playwright automation and screenshot review, not owner-observed Chrome acceptance.
- Task 043 remains In Progress pending final hosted checks and owner-visible review.

## Isolated browser verification rerun — 3 November 2026

- The shared one-worker Playwright command recorded in [Task 041 evidence](GYMOS-MIG-041.md) ran this notification spec in isolated headless Chromium — exit 0; 1/1 test passed. It covered notification listing, links, explicit mark-read/all-read actions, unread state after API outage and recovery, and the 390px responsive layout.
- The two-gym fixture runner reported six owned databases dropped, its PostgreSQL container removed and its run manifest removed. The refreshed [390px bell screenshot](GYMOS-MIG-043/notifications-bell-390.png) was inspected and stays within the viewport.
- This automated rerun is not owner-observed Chrome acceptance. Task 043 remains In Progress pending hosted checks and the visible walkthrough.

## Agent-performed native Chrome review — 4 November 2026

- Member notification popover visibly contained request-declined and session-confirmed events. Mark-all-read returned the unread count to zero. Trainer notification events were visible, but trainer mark-all-read was not verified in this walkthrough. This was not owner-observed acceptance; see the [acceptance ledger](SEGMENTS-06-07-ACCEPTANCE.md).
