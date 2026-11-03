# GYMOS-MIG-041 — owner session booking

Status: **In Progress; API and owner form implemented, guarded API and headed browser checks passed, full acceptance remains open.** Evidence captured 3 November 2026 on `codex/segment-06-management` at the Segment 06/07 migration checkpoint. Hosted checks and owner-observed review remain open.

## Implemented

- Added owner-only C21 booking options with sanitized same-gym published member/trainer options, eligibility totals, selected actor lookup, gym timezone, duration/horizon/cancellation policy and server configuration fee/rate data. GET performs no writes.
- Added C22 owner booking. It checks published same-gym member/trainer bindings, fences the owner/member/trainer GymAccess links, and keeps the Master access fence open around the tenant command transaction.
- Resolves local date/time against the configured gym IANA zone. Nonexistent daylight-saving times reject; ambiguous times require a matching explicit offset. The command checks future time, 365-local-day horizon, duration policy, current membership, active actors, configured fee/rate and session collision.
- In the tenant transaction, it creates the scheduled session and confirmation snapshots, allocates and holds a DEC-06 credit ordinal/value using the shared reservation helper, records the initial versioned state event, creates the required tenant audit and persisted member notification, and commits the receipt. The receipt safe result stores the stable session and notification resource IDs plus notification state; command replay reconstructs the immutable initial booking projection (SCHEDULED/version 0, stored schedule/type/fee, HELD credit ordinal/value and notification outcome) even if the current lifecycle state later changes. A changed request with the same key conflicts.
- Added owner booking form/action. It displays server-provided pricing/policy and eligible credit counts, reports the committed held-credit value, retains the idempotency key for unknown outcomes, and only shows the session oversight link after a verified success.

## Verification

- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.booking.config.ts --disableConsoleIntercept` — exit 0; 3/3 guarded disposable PostgreSQL tests passed. Verified options and owner rejection, atomic booking effects, idempotent replay and changed-body conflict, persisted receipt/session/hold/movement/state event/audit/member notification, concurrent last-credit single winner, foreign-gym member denial, daylight-saving gap/ambiguity/offset behavior, stale timezone, past time and horizon rejection. Harness cleanup reported six owned databases dropped, container removed and run manifest removed.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config=playwright.booking.config.ts` — exit 0; 1/1 headed Chromium browser test passed at 390×844 against the built API and web apps. Verified server options, owner booking submit, committed fee and credit ordinal/value display, and persisted session/hold/notification. Cleanup reported six owned databases dropped, container removed and run manifest removed. Screenshot: [owner-booking-390.png](GYMOS-MIG-041/owner-booking-390.png).
- `pnpm --dir packages/contracts build` — exit 0.
- `pnpm --dir apps/api build` — exit 0.
- `pnpm --dir apps/web build` — exit 0.
- `pnpm --dir apps/api exec tsc --noEmit --incremental false` and `pnpm --dir apps/web exec tsc --noEmit` — exit 0.
- Targeted Task 041 API TypeScript check and Oxlint — exit 0.
- `pnpm --dir apps/web exec eslint src/app/session-booking-actions.ts 'src/app/gyms/[slug]/owner/sessions/book/page.tsx' src/components/sessions/owner-session-booking-form.tsx` — exit 0.
- `pnpm --dir apps/web exec eslint src/app/session-booking-actions.ts 'src/app/gyms/[slug]/owner/sessions/book/page.tsx' src/components/sessions/owner-session-booking-form.tsx tests/owner-session-booking.e2e.spec.ts` — exit 0.
- The screenshot was reviewed by the agent. The CUA browser access host was unavailable, and native Chrome continued to show the existing GitHub PR #7 window. This is headed Playwright evidence, not independent or owner-observed acceptance. No hosted checks have run.

### Isolated browser verification rerun — 3 November 2026

- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.ts tests/owner-session-booking.e2e.spec.ts tests/notifications-bell.e2e.spec.ts --workers=1` — exit 0; 2/2 tests passed in isolated headless Chromium using separate disposable two-gym fixtures and loopback API/web servers. The booking test reverified owner booking, quoted fee, credit allocation, persisted session/hold/notification and refreshed [owner-booking-390.png](GYMOS-MIG-041/owner-booking-390.png). The notification test verified selected-gym listing, explicit read state, API failure recovery and refreshed [notifications-bell-390.png](GYMOS-MIG-043/notifications-bell-390.png).
- Each spec reported cleanup of six owned databases, its temporary PostgreSQL container and ownership manifest. The pre-existing `gymos-v2-db-1` development container remained untouched. These are agent-run automated checks; the headless test browser is separate from the visible Chrome walkthrough.
- Both screenshots were inspected after capture. Owner-visible walkthrough and hosted checks remain pending; this rerun does not close either acceptance gate.

## Remaining acceptance

- Parent-owned cross-task integration and hosted checks remain pending.
- C21 exposes authoritative fee/policy data and current eligible actors/credits; exact slot collision is authoritatively checked by C22 at submit time and is reported as a conflict.
- The headed browser check was automated and agent-reviewed. Owner-observed visible review remains pending because the CUA browser host was unavailable.
- Task remains In Progress until parent integration and remaining end-to-end/hosted acceptance are verified. No completion is claimed.
