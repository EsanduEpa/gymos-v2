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

## PT-02 — Implemented, not Verified (2026-11-06)

- Added tenant `PTAvailabilityRule` storage and additive migration `20261106010000_pt_availability`; manifest version `tenant-2026-11-06.1` keeps the previous V4 manifest available. Current migration SHA-256 matches the manifest entry: `eb74a2f3b4534cb25fef4854250cab8315822bc8b4c46c13cbab04f83d328171`.
- Added shared contracts and client transport, the pure slot evaluator, fenced trainer/owner availability reads and writes, receipt/audit/version checks, same-transaction rejection of edits that invalidate live sessions, closure edits scoped to the editor’s explicit 60-day range, and timezone-aware slot discovery. Owner booking and member request commits recheck availability under trainer/member serialization.
- Added trainer availability route and editor, owner trainer profile editor, and member/owner slot selection. Existing UI components, semantic classes, DashboardChrome and theme tokens are used. Empty/load/error/conflict/draft preservation and same-key retry behavior are represented in the implementation.

Checks and actual results:
- `pnpm --dir packages/contracts build` — passed.
- `pnpm --dir apps/api exec vitest run src/sessions/availability-policy.spec.ts` — 3 passed.
- `pnpm --dir apps/api exec vitest run --config vitest.config.tenancy.ts test/tenancy/tenant-template-manifest.test.ts` — 1 passed.
- `pnpm exec prisma validate --schema packages/database-tenant/prisma/schema.prisma` — passed.
- `pnpm --dir apps/api exec tsc --noEmit --incremental false --pretty false` — passed after rebuilding contracts.
- `pnpm --dir apps/web exec tsc --noEmit --incremental false --pretty false` — passed.
- `pnpm --dir apps/web build` — passed; build included `/gyms/[slug]/trainer/availability`.
- `git diff --check` — passed before final documentation changes; rerun after final code review.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.sessions.ts test/sessions/session-availability.integration.test.ts --disableConsoleIntercept` — could not start its owned disposable Postgres: Docker denied access to `unix:///Users/esanduepa/.docker/run/docker.sock`; failure occurred in `docker run` before DB setup. Booking/request disposable suites likewise could not execute in this session for the same Docker access prerequisite. Their test bodies were skipped and do not count as passes here.
- Browser harness inspection confirmed it creates its own disposable DB and synthetic identities, but therefore also depends on the denied Docker socket. No browser screenshots, mobile/desktop review, or light/dark verification were performed.

PT-02 remains not Verified. Remaining evidence: successful disposable migration/API/permissions/concurrency integration; UI browser checks with synthetic disposable accounts; screenshots at mobile and desktop widths in both current appearances. No shared or production database was touched, no deployment occurred, and no pilot claim is made.

Next exact action: in an environment authorized to access the owned Docker socket, run `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.sessions.ts test/sessions/session-availability.integration.test.ts --disableConsoleIntercept`; then run browser availability and booking/request flows against rebuilt artifacts, capture 320/390/768/1440-width light/dark evidence, fix issues, and update this record. Because PT-01 also remains unverified, keep the milestone sequence and close PT-01’s exact timing-boundary/browser evidence before proceeding to PT-03.

## PT-03 — Implemented, not Verified (2026-11-06)

- Added tenant migration `20261106020000_pt_request_expiry` (SHA-256 `a1ae2e3a23f0e189e479a48ce037102ff9c1d697f0bbc9a2490776af08caa688`) and manifest `tenant-2026-11-06.2`. The migration backfills pending deadlines, adds `EXPIRED`, adds request deadline/availability version columns, enforces a deadline on pending rows, and adds an ordered expiry index. The prior PT-02 template remains addressable.
- Enforced the two-live-pending limit and absolute request deadline. Decision and withdrawal paths resolve due requests to `EXPIRED` under existing serialization; due requests are excluded from active reads/conflicts and cannot be accepted or withdrawn. Expiry preserves credits, writes audit/event evidence and sends in-app notices. Owner booking uses the shared lock order and respects pending conflicts.
- Added the bounded active-tenant expiry runner, installed-manifest verification, per-gym serialization, stable expiry receipts, and `PT_EXPIRY_RUNNER_ENABLED` operational control. This is code inspection evidence only; the worker has not been exercised against PostgreSQL in this session.

Fast checks and actual results:
- `pnpm --dir packages/contracts build && pnpm --dir packages/contracts test` — passed; 55 tests.
- `pnpm --dir apps/api exec vitest run src/sessions/session-state.spec.ts src/sessions/availability-policy.spec.ts src/operations/primitives.spec.ts` — passed; 18 tests.
- `pnpm --dir apps/api exec vitest run --config vitest.config.tenancy.ts test/tenancy/tenant-template-manifest.test.ts` — passed; 1 test.
- `pnpm --dir apps/api exec tsc --noEmit --incremental false --pretty false` — passed.
- `pnpm --dir apps/web exec tsc --noEmit --incremental false --pretty false` — passed.
- `pnpm exec prisma validate --schema packages/database-tenant/prisma/schema.prisma` — passed.
- `git diff --check` — pending rerun after this evidence edit.

Deferred checks: the PT request and lifecycle integration suites were not run against an owned disposable PostgreSQL database, so migration application, permissions, lock races, credit conservation, notification/audit atomicity, runner idempotency, tenant isolation, and failure recovery remain unverified. No browser checks or screenshots at mobile/desktop sizes in either existing theme were taken. Prior PT-02 evidence records the environment’s owned Docker socket denial (`unix:///Users/esanduepa/.docker/run/docker.sock`); no production/shared database was accessed.

Next exact action: run the PT request and lifecycle integration suites in an environment permitting the owned Docker socket, then add/run an owned-database expiry-runner integration covering retries, idempotency, tenant isolation and recovery. Perform the deferred browser/theme review afterward. Do not mark PT-03 Verified until those results are recorded.
