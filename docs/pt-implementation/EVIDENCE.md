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


## PT-05 — Implemented, not Verified (2026-11-06)

Baseline: PT-04 changes were already present in the working tree at PT-05 entry and were preserved. During this work the user committed PT-04/PT-05 as `fae290c` (`PT4,5`). The final zero-value fixture correction and this evidence update follow that commit. No merge or deployment was performed.

Implemented journeys and persistence:
- Owner-only exception quote/commit contracts, API, API-client transport, server actions and shared-detail controls. Quotes bind gym/owner, source event/version, reason/initiating party, source/destination allocations and values, fee/rate/policy snapshots, actual-time evidence, earning/pay deltas and the actual open pay-adjustment period. Validity is two minutes using database time. Stable receipt retries resolve prior committed outcomes before rechecking expired quote claims.
- Cancellation distinguishes member charges from trainer/gym cancellation; trainer/gym reasons are retained. New PT uses the confirmed 24-hour inclusive cutoff even if current configurable legacy defaults differ. Historical sessions without the PT availability marker retain their confirmation policy. The 15-minute no-show grace and existing start/completion minimum-duration safeguards remain in force.
- Source-unit remedies restore only the original allocation/value and require explicit owner expiry approval. The pack price, issued count, allocation/remainder inputs and original expiry are not rewritten. Membership still gates use on the replacement date. Expired restored value is shown as awaiting owner resolution; approved unit expiries appear in booking/member-pack views.
- Rescheduling supports the assigned trainer's replacement slots. It records the actual initiating party, preserves the original booking and creates a linked confirmed replacement using the existing booking transaction. Late member changes consume the source and reserve a separate eligible unit; gym/trainer changes release without charge and may include an explicit unit expiry remedy. Failure rolls back source state/settlement, movements, earnings and replacement. Original and replacement timezones/terms are previewed separately.
- Bounded corrections support delivered training with missing actions, missed attendance, free cancellation/reversal and late cancellation. They require the latest source event, reason and expected version. Delivered corrections require supplied, ordered past actual times, on the original booked gym-local date, meeting the stored minimum duration. They do not offer arbitrary state editing or move delivery to a different date. Previous actual times and all original state/settlement facts remain recorded.
- Operational earning reversals exactly reference their immutable source. Signed trainer-pay corrections use an open period and preserve original closed/approved period facts. Zero-value delivered correction creates an explicit zero pay fact. Session detail, finance and trainer earnings aggregate the net facts; no payment is claimed. A recorded source-unit expiry earning is compensated and is not counted again as derived unused-expiry value.
- Detail, calendars, balances, owner attention, member profiles, request eligibility and booking allocation use the per-unit projection. Source event timelines are sanitized and paged; owner reasons and raw allocation/pay internals are not exposed to members. Original command receipts can replay after later outcome correction.
- The existing role shell/components and appearance tokens are reused. Owner/trainer policy reviews preserve the original intent/key on unknown outcomes and provide reauthentication in another tab. Browser recovery behavior has not been visually verified in this pass.

Schema/compatibility:
- Additive migration `20261106040000_pt_owner_exceptions`; SHA-256 `d23789d50058968bca527e95ca21563e81f2eb4f177cd4aba219410f0c34ed0d`; manifest `tenant-2026-11-06.4`. Earlier migrations/manifests, including the PT-04 forward expiry repair, are retained.
- Added `PTSessionAdjustment`, `PTCreditRemedy`, `PTCreditUnitBalance`, source-bound conserved correction movements and source-bound exact earning reversals. Existing append-only protection remains; new adjustment/remedy rows are append-only too.
- Extended trainer corrections from one row per session to multiple uniquely sourced signed rows. Signed correction-period totals are deliberate accrual facts, with existing approval reconciliation retained. Approved source facts are not rewritten.
- Replaced the former terminal-ordinal unique index with terminal history plus pack serialization and a deferred check that each original unit has exactly one nonnegative credit across its buckets. Kept the existing requirement that every non-issue movement identifies an ordinal and the unique active-held-unit index. A test proves reuse after restoration and rejection of a second consumption.
- Operational tenant access now waits for the current manifest, before tenant acquisition, because this binary depends on the new projection. Administrative inspection of older reviewed manifests remains available to the existing rollout/recovery workflow. A shared/production rollout still needs authorization; none was attempted. Old binaries are not a safe rollback after new adjustment facts exist.

Main checks and actual results:
- `pnpm --dir packages/contracts build` and `pnpm --dir packages/contracts test` — passed, **59 tests** (including three exception input/authority-boundary tests).
- `pnpm --dir packages/api-client build` and `pnpm --dir packages/api-client test` — passed, **14 tests**.
- `pnpm --dir apps/api exec vitest run src/tenancy/tenant-schema-gate.spec.ts src/sessions/session-details.spec.ts src/sessions/session-lifecycle-policy.spec.ts src/sessions/session-state.spec.ts src/sessions/availability-policy.spec.ts src/sessions/session-transactions.spec.ts` — passed, **25 tests**. Includes exact cancellation/no-show boundaries, new-policy versus legacy snapshots and rejecting an older operational schema before tenant acquisition.
- `pnpm --dir apps/api exec vitest run --config vitest.config.tenancy.ts test/tenancy/tenant-template-manifest.test.ts` — passed, **1 test**, including the final SQL checksum.
- `pnpm exec prisma validate --schema packages/database-tenant/prisma/schema.prisma` and tenant client generation — passed.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.sessions.ts test/sessions/session-exceptions.integration.test.ts --disableConsoleIntercept` — final run **8 passed**. Covers trainer cancellation inside the late window, required reason, expired value/owner attention, remedy replay, original unit/value conservation, membership recheck, subsequent ordinary start/completion of a restored unit, deferred rejection of double consumption, late-member versus gym reschedule, injected replacement-hold failure/rollback, last-credit conflict, actual-time delivery recovery, immutable original settlement and approved payroll, signed correction-period effects, incorrect no-show reversal, concurrent corrections, original no-show replay, role/foreign-gym/stale-intent/expired-quote denial, source expiry earning compensation, and exact zero-value correction/replay.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.sessions.ts test/sessions/session-booking.integration.test.ts --disableConsoleIntercept` — **3 passed**. Updated the notification assertion to require one persisted confirmation for each participant.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.session-cancel.ts --disableConsoleIntercept` — **5 passed**. Charged-policy/race cases now use the member actor, matching R08; gym cases retain free cancellation and supply the required reason. Assertions were not weakened to permit gym-side charges.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.session-lifecycle.ts --disableConsoleIntercept` — **3 passed**.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.finance.ts --disableConsoleIntercept` — final isolated run **3 passed**. The expected injected audit failure is part of the rollback test. One earlier run timed out while other suites and the web build ran concurrently. Reused a formatter within timezone scans, preserving the existing conversion algorithm and timeout; did not increase the timeout or remove assertions.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.session-requests.ts --disableConsoleIntercept` — **6 passed**.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.session-reads.ts --disableConsoleIntercept` — **7 passed** across two files.
- All database runs used the owned local disposable harness with synthetic accounts. Final cleanup records confirm six databases dropped plus container/ownership-manifest removal per environment. No `.env`/live credentials or shared data were used. The driver emitted its existing concurrent-query deprecation warning.
- `pnpm --dir apps/api exec tsc --noEmit --incremental false --pretty false` — passed.
- `pnpm --dir apps/web exec tsc --noEmit --incremental false --pretty false` — passed; final production build also ran TypeScript successfully.
- `pnpm --dir apps/api lint` — passed with existing unused `weekdayNames`, `monthStart`, and `ConflictException` warnings in availability/analytics files.
- `pnpm --dir apps/web lint` — final run passed without warnings.
- `pnpm --dir apps/web build` — final optimized production build passed; includes the shared detail route and owner resolution controls. No server was deployed/restarted.
- `git diff --check` — passed after the final evidence and fixture edits.

Intermediate failures retained honestly: the initial new lock query returned PostgreSQL `void`, which the driver could not deserialize; changed it to the repository's `SELECT 1 FROM pg_advisory_xact_lock(...)` pattern. A proposed bulk-expiry fixture was rejected by the existing mandatory-ordinal check; preserved that check and tested a named expired unit instead. The final zero-value fixture initially selected an earlier valid restored paid unit, correctly following expiry ordering; moved that booking beyond the earlier remedy expiry and asserted its source pack/value before testing zero settlement. No production allocation rule or accounting assertion was relaxed.

Deferred: mobile/desktop/light/dark screenshots; keyboard, zoom and accessibility review; full HTTP/browser unknown-outcome and expired-access exercises; the complete deactivation/cancel/complete/correction/reschedule/availability/worker race matrix; DST/upgrade/restore rehearsal and real runner/deployment evidence. Earlier PT-01–PT-04 gaps remain open. This milestone is **not Verified** and no real-world pilot is claimed.

Next exact action: implement PT-06 section 13 on the PT-03 runner. Add durable tenant-local 24H/1H work, transactionally create jobs at confirmation/replacement, invalidate obsolete jobs at cancellation/correction, recheck state/schedule identity at emission, and persist retry/claim/skip evidence. Linked replacement IDs are new schedule identities; notes-only version changes must not duplicate work. No reminder jobs currently exist to invalidate, and reminders are not claimed implemented by PT-05.


## PT-06/PT-07 — 6 November 2026 local implementation and main checks

This entry supersedes the preceding instruction to start PT-06. The earlier PT-01–PT-05 evidence and deferred checks remain historical evidence, not overwritten passes. Work used harness-owned local PostgreSQL 17 containers and synthetic accounts only. Each completed owned run reported container/database/ownership-manifest cleanup; the restore case used seven owned databases, ordinary two-gym suites six, and the independent upgrade case five. No registry activation, deployment, shared database, merge or real pilot occurred.

### Implemented and exercised

- Additive reminder migration `20261106050000_pt_reminders`; SHA-256 `3ef3a8cdd086da49e25592ca4d783e8897b441da7d66dc1d5bb080b0d1903bab`; current template `tenant-2026-11-06.5`, reviewed .4 retained. Exact fresh schema/manifest verification passes. Jobs, retry diagnostics and health are tenant-local; no financial schema/approved-pay rewriting was introduced.
- Transactional confirmation/backfill and invalidation trigger, schedule/recipient uniqueness, 24H/1H thresholds, both participants, notes-only dedupe, absolute gym-local content and canonical detail links. The PT03 runner handles expiry and reminders with verified tenant discovery; no browser timer/external channel is used for delivery. Owner-only health has recent success, lag, retry/failure and expired-request indicators. Suppressed reminders remain retained history.
- Cancellation/no-show/completion now notify both affected participants. Reschedule/correction notifications retain existing transaction boundaries, privacy and replacement links. Remedy notices include the exact usable expiry from their immutable receipt-linked remedy. The bell retains 20-second polling and stale-context discard, adds focus refresh, avoids unavailable-as-zero/empty displays, and explains in-app-only delivery.
- PT07 Home/owner priorities, credit expiry, plain-language unknown-booking copy, and shared route recovery. Browser tests found the live-session guard wrongly treating `/sessions/:id` as a role prefix; fixed only the shared authorized path check. Existing server-side access/tenant/participant checks stay in force.
- Availability regression found production code creating a COMMITTED receipt then modifying its result, correctly rejected by the database's immutable-final-receipt trigger. Fixed the transaction to create RUNNING and commit the final response once after effects/audit. The existing publication/replay/stale/permission integration now passes without weakening the trigger.

### Actual command results

| Check | Actual result |
| --- | --- |
| `pnpm prepare:checks` | Passed: generated clients and package builds. |
| `pnpm check:workspace` | Passed: workspace graph valid. |
| `pnpm typecheck:workspace` | Passed after replacing test BigInt literal syntax with the existing compatible constructor convention. |
| `pnpm lint:workspace` | Passed; three existing API unused-symbol warnings remain (availability `weekdayNames`/`ConflictException`, analytics `monthStart`); web clean. New restore helper's cancellation promise was corrected, not ignored. |
| `pnpm test:unit` | Passed: contracts 59, API client 14, theme 5, API 61, pool tests 25. Initial sandbox run denied a loopback listener; rerun with local-listener access passed. |
| `pnpm build:workspace` | Passed: production API/web/package builds; 46 Next routes. |
| `vitest --config vitest.config.tenancy.ts` | 1/1 checksum test passed. |
| `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:pt:owned` | **55/55 tests, 13/13 files passed**, 77.71s. Includes availability, booking, exceptions/restore, requests, delivery, cancellation/no-show, reads/overview, notifications/reminders/upgrade and finance. |
| Targeted notification config | **14/14 passed** across 3 files, including eight reminder cases, five notification/controller cases and one upgrade rehearsal. |
| Targeted exception/restore run with console evidence | **9/9 passed**; restore reconciled 33 tables/views. |
| PT browser spec | **2/2 passed**, real synthetic holds/state events: both themes, 320/390/768/1440 widths, all three roles and shared detail pages, pending deadline/credit expiry, bell detail link, no horizontal document overflow, no page errors, and a mobile cancellation with Escape/focus restoration and actual API/credit/reminder/recipient assertions. |
| Existing bell browser recovery spec | **1/1 passed**: mobile unread state/marking and API outage/recovery. Its old link expectation was updated to the established canonical detail contract; behavior was not bypassed. |
| `git diff --check` | Passed at final review. |

The initial all-session regression reported two failures: availability's genuine receipt-order defect (fixed) and an old single-recipient notification assertion. Completion had the same outdated assertion in its separate suite. Assertions now require exactly two distinct intended participants and one outcome event, preserving single-settlement/revenue/movement checks. A new terminal-state fixture initially violated the existing confirmation-snapshot constraint; corrected its seed snapshots to null for unconfirmed states. The upgrade seed's BASIC identity binding was similarly corrected to PENDING; no production constraint was relaxed. PostgreSQL's existing concurrent-query deprecation warning remains.

### Recovery and visual artifacts

- Upgrade rehearsal constructs the exact reviewed PT05 schema/history, verifies .4, seeds a future virtual 90-minute session, a short-notice introductory 30-minute session and an overdue pending request, then uses Prisma migrate deploy for .5. All three session rows compare exactly before/after; six eligible reminder jobs backfill; the short-notice booking receives only 1H work and the overdue request stays unchanged. This does not claim every historic tenant version has been rehearsed.
- Restore exports a consistent database snapshot, writes a mode-0600 synthetic custom-format archive, restores into a newly owned isolated target and verifies the current manifest. Sorted JSON fingerprints/counts match **every public table and view**, and source fingerprints remain unchanged. Evidence: 11 sessions, 11 holds, 32 credit movements, 10 adjustments, 2 remedies, 3 trainer-pay corrections, 9 revenue records, 47 notifications, 50 reminder jobs, 24 state events, plus the remaining tables. The archive is removed and the restored target is never selected in Master. This test does not replace production encrypted backup/retention or activation authorization.
- Screenshots: `docs/pt-implementation/evidence/2026-11-06-pt67/`: 48 role/workspace/detail/theme/viewport captures. Browser fixture uses a real issued pack, covering membership, held credit and state history; geometry captures precede the cancellation. Representative mobile and desktop light/dark Home, owner, trainer and details were visually inspected; this is not an exhaustive visual/accessibility certification. The current captures are archived here to survive Playwright output-directory cleanup. Future runs write `apps/web/test-results/pt-workspaces`; archive a new dated copy before another browser run clears that output.
- Runtime and release handoff: [RUNBOOK.md](RUNBOOK.md). CI now explicitly discovers/runs `vitest.config.pt.ts` through `test:pt:owned` and the two targeted browser specs. No remote CI result is claimed.

### Remaining verification and first unfinished task

PT06 is implemented and its main local acceptance checks pass. PT07 interface/main local checks are implemented and pass. **Neither milestone, nor the earlier PT milestones, is marked fully Verified.** The original exit gates require the remaining matrix and actual environment/pilot evidence.

1. First unfinished local task: full owned browser availability → request → acceptance → start/notes/completion, including failed/unknown response and expired-auth draft/same-command recovery. The completed browser mutation here is early member cancellation; it is not the entire delivery journey.
2. Broaden the existing API evidence for exact creation cutoffs/horizon, both request-expiry branches/accept-expiry race, availability/book/closure concurrent edits and DST permutations, reschedule/cancel race and all cross-role/support/revocation permutations. Existing main suites cover several individual cases; this run does not claim the complete guide matrix.
3. Finish mobile long-name/error/loading/stale states, all dialogs and keyboard order, contrast/zoom/reduced-motion/touch-target review, coaching/relationship/health regressions and full prior browser suite. Main role pages and details were checked; unchanged coaching/plans and unrelated screens were not recertified.
4. Rehearse other supported starting tenant versions and intended-environment encrypted backup/recovery/configuration. Current evidence covers fresh current tenants, reviewed PT05→PT06 and isolated full-data PT restoration only.
5. Under separate authorization, deploy a persistent compatible runner and observe startup, shutdown/restart, last-success, 60-second normal latency target and backlog/capacity. Then run the specified several-operating-day real owner/trainers/members pilot and obtain explicit wider-launch sign-off. These are release gates, not inferred passes.


## Follow-up: committed-tree review and Google Chrome desktop testing

Reviewed committed HEAD `353ba7a` (PT67) after the user's concurrent commits; working tree was initially clean. No tracked `.env` secrets, generated Prisma clients, node_modules, build output, test logs, archives or database dumps were found. The 48 synthetic visual captures were deliberate evidence, not application assets. To reduce redundant Git content, moved the 24 intermediate-width 390/768 captures to ignored `apps/web/test-results/archived-pt67-intermediate/` and retained 24 representative 320/1440 light/dark workspace/detail captures. The earlier 48-capture run remains historical evidence; this cleanup does not change its outcome. Existing commits/history were not rewritten. Source, migrations, contracts, CI, tests and runbook remain necessary.

Used actual **Google Chrome desktop UI**, not the earlier headless Chromium run. Browser connector discovery was unavailable, so native Chrome accessibility/input was used. Opened a separate tab and preserved the user's existing tabs. The user explicitly made Chrome available for testing. Each fixture used a fresh harness-owned PostgreSQL container, synthetic two-gym identities, membership, issued credits and isolated loopback API/web servers; normal app databases and `.env` were untouched. Chrome password-save prompts were dismissed; credentials were not committed.

Observed in Chrome:

1. Trainer completed a separately seeded, already-active synthetic appointment through its explicit confirmation dialog. The UI showed COMPLETED, consumed credit, one credit used and recorded trainer earning LKR 40 on the LKR 100 appointment. The fixture had already accrued more than the required 20-minute ordinary completion duration; no host-clock change or timing-policy bypass occurred. This is not a claim that a newly requested future appointment was delivered immediately.
2. Trainer saved a synthetic member-visible note after completion, consistent with the existing completed-only notes rule. Member later read the same note and completed credit outcome.
3. Trainer published Saturday 09:00–17:00 and a 12:00–13:00 break. Member saw Friday's honest no-availability state, changed to Saturday, and saw eligible starts 09:00…11:00 then 13:00…16:00, excluding every start overlapping the break.
4. Member requested Saturday 10:00–11:00. The canonical detail page showed pending confirmation, response deadline, request note and **no credit hold**. Trainer saw one pending request and accepted it through the daily workspace.
5. Detail then showed SCHEDULED, held credit, preserved request note and pending→scheduled history; early start was not offered. Member Home showed Confirmed and **6 unheld + 1 reserved**, following the earlier one-credit completion from the eight-credit issued pack. Bell showed both completion and confirmation with local times and canonical authorized detail links. These were UI observations, not an independent full database reconciliation.
6. Owner Sessions showed the completed session/note, runner enabled, a recent successful pass, zero overdue expiry/reminder work, zero retries and zero recorded failures. This proves local persistent-runner health in this fixture only, not deployed operation or load capacity.

Chrome exposed a real form parsing defect: unavailable-period reasons were split with a three-token limit, silently truncating multiword reasons. Removed that limit. Rebuilt the web app and used a second fresh Chrome fixture to publish `Synthetic full reason retained`; after full page reload the complete reason remained. Also replaced the visible exclusive-end jargon with “Weekly availability ends before” and relabeled response deadlines on non-pending booking details as “Original request deadline”. The latter conditional label was build/type checked; the accepted-booking observation above occurred before that copy fix.

Validation for these changes: production web build passed; workspace typecheck and lint passed (the same three pre-existing API unused-symbol warnings). Added `vitest.config.pt-visible.ts` and its owned holding fixture for repeatable Chrome walkthroughs; this fixture's pass means controlled setup/teardown, **not an automated assertion of every manual observation**. Both fixture runs reported cleanup of six databases, their container and ownership manifest. No real pilot, deployment, merge, production modification or full Verified promotion occurred.

Next exact local task: exercise expired-auth and response-lost-after-commit draft/same-command recovery through the real browser, then finish the remaining concurrency/support, accessibility/error-state and regression matrix. Availability→request→acceptance and separate eligible completion/notes now have manual Chrome evidence; start on a newly confirmed future booking still needs its own eligible-time fixture/browser check. Older-template rollout rehearsal, deployed runner/capacity monitoring, several-day participant pilot and owner launch sign-off remain release gates.


### Owner “all sessions going on now” visibility check

Checked source and actual Google Chrome using a fresh disposable PT fixture. Owner dashboard displayed Active PT sessions = 1 (all dates), Active PT sessions today = 1, and the active member/trainer row. Owner Sessions displayed today's date, All states, one matching ACTIVE row and Page 1 of 1. This was a one-active-session UI check, not a large/multi-trainer or midnight-boundary browser certification.

Source confirms the owner API has no participant restriction unless explicit member/trainer filters are supplied; tenant gating remains selected-gym scoped. Dashboard `activeSessions` counts all ACTIVE rows across scheduled dates, but its `sessions` preview is capped at 10 rows scheduled today. The owner Sessions UI supplies a day/month range and pagination (default 25), so it is not a dedicated complete all-dates active-session list. Prior-date sessions still ACTIVE can be counted but absent from today's schedule. “Active” means explicitly started and not yet ended in the application, not automatic physical attendance or inference from the booked clock interval.

Conclusion: gym-wide active count exists, and owner session browsing exists, but the current default UI does not guarantee every in-progress session appears together. A dedicated paginated/fully accounted “In progress now” view queried by ACTIVE without a scheduled-date restriction is the exact remaining enhancement if that visibility is required. No product code was changed during this check.
