# PT implementation evidence

## Baseline inspection — 2026-11-06

- Read `docs/PT-IMPLEMENTATION-GUIDE.md` fully, applicable `apps/web/AGENTS.md`, migration notes, current UI/Owner/Trainer/Member documentation, and `docs/manual-testing.md`.
- `git status --short` initially showed only the untracked user-supplied implementation guide; preserved it.
- Inspected booking/request contracts and services, tenant PT session model, migration manifest, session read/lifecycle/notification maps and existing API/browser test paths.
- Confirmed current booking owner endpoint snapshots a credit hold, receipt, state event and notification transactionally; request/decision paths also use receipts, row locks and credit recheck. Current policy remains permissive and checks a calendar-day 365 horizon. Request creation does not persist expiry or enforce the per-member pending cap. No availability model or scheduled expiry/reminder runner was found.
- Historical UI screenshots are reference-only and some fixture captures are absent; they are not acceptable before/after V2 evidence. No browser or responsive/theme visual review has been executed.

## PT-01 — Implemented, not Verified

Changes: narrowed only new booking/request inputs and option contracts; kept booking/request/read response session types and historical duration bounds broad. API direct booking/request commands enforce in-person/60 minutes and the rolling `now + 2h` through `now + 14d` instant window using tenant `clock_timestamp()`. Trainer acceptance skips creation notice and only permits existing in-person/60-minute requests. UI removed service/duration choices and explains one-credit service; member form warns requests within 24 hours are already in the late-cancellation window. No schema migration was needed.

Checks and actual results:
- `pnpm --dir packages/contracts build` — passed.
- `pnpm --dir packages/contracts test` — 55 passed.
- `pnpm --dir apps/api exec tsc --noEmit --incremental false --pretty false` — passed.
- `pnpm --dir apps/web exec tsc --noEmit --incremental false --pretty false` — passed.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.sessions.ts test/sessions/session-booking.integration.test.ts --disableConsoleIntercept` — 3 passed. Owned harness cleanup: six databases dropped, container and manifest removed.
- `pnpm --dir apps/api lint && pnpm --dir apps/web lint` — passed; API emitted existing `analytics.service.ts` unused `monthStart` warning, and the changed booking service warning was removed afterward (API lint was not rerun after that one-line cleanup).
- `git diff --check` — passed.

An initial disposable integration run failed because stale package `dist` had old schema literals and the race fixture reused credits. The contracts package was rebuilt; the fixture was returned to its original account assumptions. A subsequent full run passed. An exact test for the inclusive two-hour and 14-day edges is still missing, although production comparisons implement inclusive bounds. No browser screenshots/visual checks were taken at mobile or desktop in either theme; this is why PT-01 is not Verified. No migration/legacy inventory was required or performed for PT-01. Next exact action: begin PT-02 availability schema/manifest and slot evaluation.

Final status: PT-01 implementation is ready for review, but it is not Verified because exact inclusive timing edges and browser visual review have not been completed. PT-02 is the first unfinished milestone and the next work session should begin with tenant availability/closure schema plus manifest requirements. No deploy, shared database migration, pilot or production claim was made.
