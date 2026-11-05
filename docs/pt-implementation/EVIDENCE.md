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


## PT-04 — Implemented, not Verified (2026-11-06)

Baseline/current revision inspected: `623abed`; clean working tree on entry, with PT-03 already committed. Re-read the guide’s PT-04 requirements, web instructions/local Next.js page and server-action guidance, architecture/UI documentation, current contracts, guarded reads, delivery/settlement commands, theme components, and owned test harnesses.

Changes:
- Shared guarded detail API and `/gyms/[slug]/sessions/[sessionId]` server screen reuse the role shell, existing components and lifecycle/policy/request controls. Strict shared schemas and API-client methods cover detail, paged timeline and paged owner attention. Read transactions are read-only/repeatable; role predicates and requester enrollment/access/receipt bindings are checked. Unknown and foreign IDs produce the same not-found outcome. Member output contains no fee, pay, receipt, actor-identity, raw audit or pack-allocation internals.
- Details show historical service/time, gym timezone, confirmation-snapshot location/policy where available, member-visible notes, one-credit reservation/settlement, request/cancellation deadlines, start/end and sanitized chronological events. A due unswept request renders expired without writing a fabricated event. Delivery affordances use database time, held-credit state and the stored minimum duration; missing Start cannot be bypassed by the UI.
- Existing calendars, lists, member/owner home previews, trainer next-client panel, profile histories, request/booking outcomes and session notifications link to the same resource. The old member `?session=` URL redirects to it. Role shell navigation identifies the detail view. Existing start/complete/notes/cancel/decision commands revalidate the gym layout; focus/timed refresh uses a router merge and skips open forms/dialogs.
- Owner attention is paged with honest totals and unavailable/empty states. “Long-running active” means active after the booked end; scheduled after booked end and pending at/past expiry are the other queue categories. The detail’s owner review area records that correction tools remain unavailable until PT-05.
- Found and repaired a PT-03 schema dependency: the old state shape constraint excluded `EXPIRED`. Added forward-only migration `20261106030000_pt_expired_state_shape`, SHA-256 `9fa2b90879b8115ed45c47dc303bc99c6ea97fd6c50c217878907a16d9dad691`, manifest `tenant-2026-11-06.3`, and a verified new constraint name. No prior migration was edited; all earlier manifests remain available. The original confirmed/delivery timestamp checks are retained. No Prisma model change/client regeneration is required for this SQL constraint repair.
- Web lint found the prior PT-02 availability editor calling `Date.now()` while rendering. Its default effective dates now derive from the read’s `asOf` in the configured gym timezone, preserving the same 365-day suggested duration.

Checks and actual results:
- `pnpm --dir packages/contracts build` and `pnpm --dir packages/contracts test` — passed, 56 tests.
- `pnpm --dir packages/api-client build` and `pnpm --dir packages/api-client test` — passed, 14 tests.
- `pnpm --dir apps/api exec vitest run src/sessions/session-details.spec.ts src/sessions/session-reads.spec.ts src/sessions/session-state.spec.ts src/sessions/session-lifecycle-policy.spec.ts src/sessions/session-transactions.spec.ts` — passed, 21 tests. Eight new detail tests cover role-scoped projection/privacy, missing/stale bindings, start/completion/no-show boundaries, request cutoff and unresolved classification.
- `pnpm --dir apps/api exec vitest run --config vitest.config.tenancy.ts test/tenancy/tenant-template-manifest.test.ts` — passed, 1 test; includes the forward repair checksum.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.session-reads.ts --disableConsoleIntercept` — final elevated owned run passed, 7 tests across 2 files. Covers role projections, physical gym isolation, forged actor IDs, missing IDs, bounded owner queue, no read effects, real expiry/replay, no held credit on expiry, two persisted expiry notices and sanitized expiry history. Both environment cleanup records confirm six databases dropped, container removed and manifest removed.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.session-lifecycle.ts --disableConsoleIntercept` — final elevated owned run passed, 3 tests. Covers access/start safeguards, minimum-duration enforcement, completion/replay/settlement uniqueness, rollback on earning failure, pay-period correction, member-visible notes, and all three role details agreeing with persisted completion and credit/earning effects. Cleanup confirmed six databases dropped, container/manifest removed.
- The first non-elevated integration attempt could not access the local Docker socket. Elevated execution succeeded. Two intermediate detail fixture runs failed the existing state-shape and confirmation-snapshot constraints because the new synthetic COMPLETED fixture omitted required timestamps/rate/level; the fixture was corrected without weakening those checks. A separate inspection found the actual EXPIRED constraint omission described above, which is covered by the passing regression.
- `pnpm --dir apps/api exec tsc --noEmit --incremental false --pretty false` — passed.
- `pnpm --dir apps/web exec tsc --noEmit --incremental false --pretty false` — passed again after final navigation/editor cleanup.
- `pnpm --dir apps/web build` — passed, including `/gyms/[slug]/sessions/[sessionId]`, before the final profile-link/navigation/editor cleanup. No production server was deployed/restarted.
- `pnpm --dir apps/api lint` — passed with pre-existing unused declarations/import warnings in availability and analytics; removed the single-Promise warning in the touched session-read method afterward.
- `pnpm --dir apps/web lint` — final run passed after the availability default-date fix.
- `git diff --check` — passed after code and documentation edits.

Deferred evidence: browser/HTTP journey and unknown-outcome regression, mobile 320/390px and desktop screenshots in both existing themes, keyboard/focus/zoom/accessibility checks, broad race/worker tests, existing-tenant upgrade rehearsal and operational runner deployment. SQL migrations were applied only by the owned disposable fixtures; no shared/production database, deployment, merge or pilot was performed. The main tests passing does not mark the milestone Verified.

Next exact action: PT-05 section 12, starting with source-credit expiry remedy and owner reschedule/correction quotes plus immutable compensating records. Deferred verification must revisit PT-01–PT-04 and the actual runtime runner before any Verified or rollout claim.
