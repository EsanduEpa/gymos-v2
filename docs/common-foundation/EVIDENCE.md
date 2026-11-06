# Common foundation evidence

## CF-00 baseline evidence (2026-11-06)

Repository state: `git status --short` was empty at inspection. Branch: `new-up`. No PT changes were present as uncommitted changes; the latest PT progress, evidence and runbook were read and retained without modification.

Documentation inspected: full `docs/COMMON-FOUNDATION-IMPLEMENTATION-GUIDE.md`; `docs/migration/NOTES.md`; full current `docs/pt-implementation/PROGRESS.md`, `EVIDENCE.md` and `RUNBOOK.md`; `docs/ui-ux-transformation/00-MASTER-UI-UX-PLAN.md`, Owner and Member workspace docs; `apps/web/AGENTS.md`. The web guide requires consulting the installed Next.js documentation before code changes.

Baseline routes include public `/`, `/login`, `/gyms/select`, `/no-access`, `/change-password`, gym role route `/gyms/[slug]`, owner member directory/create/detail, member workspace, and existing member/trainer enrollment-consent routes. There is no public application or applicant status route. `AuthController` authenticates normalized email/password and returns only active gym accesses; access tokens last 15 minutes. The gym access guard and tenant actor/operation/receipt bindings gate operational routes.

Enrollment baseline: `MemberEnrollmentService` already implements Master Operation checkpoints, owner authorization, tenant CommandReceipt, tenant member and membership-term writes, reciprocal actor binding, access activation and recovery. Existing-identity enrollment requires a subject-owned password/consent proof. New owner-created accounts receive a separate temporary credential and first-login change flow. Owner approval must not bypass or repurpose these protections.

Data ownership baseline: Master `User`, `Gym`, `GymAccess`, `Operation`, `EnrollmentProof`, credentials and registry are authoritative for identity/access/operation evidence. Tenant `Member`, `MembershipTerm`, PT and operational notifications are tenant-owned. Notification routing currently has a typed PT/session target and needs explicit extension for application targets. Master and tenant manifests/migrations are versioned; applied migrations are immutable.

Harness commands inspected from root/API/web manifests: workspace preparation/check/typecheck/lint/unit/build, owned database integrations (`test:database:owned`, `test:pt:owned`, domain configs), and Playwright (`pnpm --dir apps/web test:e2e`). Harnesses and fixtures must be inspected before running; owned Postgres/browser suites depend on Docker access. No automated test has yet been run for CF-00, and CF-00 makes no verification claim.

## Confirmed choices vs proposed defaults

Confirmed by guide: online MEMBER applications require owner approval; account creation grants no gym membership/access; recovery is staff-assisted without external messaging provider; personal devices may remain signed in and shared staff devices use shorter sessions; preserve architecture/theme; extend in-app notifications including PT events.

Proposed defaults (not confirmed product choices): personal sessions 7-day inactivity/30-day absolute, shared sessions 30-minute inactivity/8-hour absolute, shared mode selected by default, 15-minute access token retained, rotating renewal credentials; staff recovery credential 15-minute one-use bounded attempt; minimal contact/application fields; no mailbox verification claim. CF-01 does not implement session/recovery changes.

## Application lifecycle and policy baseline

Application states: `PENDING` after authenticated submission; `PROCESSING` while owner approval is reconciling; `APPROVED` only after required enrollment effects and access are reconciled; `REJECTED` after owner rejection; `WITHDRAWN` after applicant withdrawal before approval; `RECOVERY_REQUIRED` for a safely resumable interrupted operation. Terminal rejected/withdrawn records remain retained under a documented retention policy (duration not yet established); resubmission creates a new application only when no pending/processing/approved application or gym role exists. Exact duplicate pending submit returns the same generic success/status and does not create another row. Normalized email is case-insensitive/trimmed per `normalizeIdentityEmail`; public responses must not disclose whether an identity exists.

Existing identity: sign-in and explicit applicant consent are required before the application can be attached to that identity. Owner action cannot create consent. A self-created account keeps the submitted password hash; owner approval never writes credential fields or issues a temporary password. Another gym role or elevated global role is rejected without revealing identity details.

Pending applicant permissions: own application/status/outcome and ordinary account session/sign-out/help routes only. Deny all gym operational/member/PT/finance/configuration APIs until ACTIVE reciprocal enrollment has reconciled. Unauthenticated applicant can see public gym name and submit; cannot query application outcome by email or application ID.

## Field and action ownership

| Fact/action | Authority | Who may change/read |
| --- | --- | --- |
| Login email/password, global display label, account security | Master identity | Subject; staff recovery only under later documented CF-03 procedure. Gym owner cannot edit global credentials/identity. |
| Gym role/access and reciprocal tenant actor binding | Master `GymAccess` plus enrollment operation; checked against tenant | Authorized owner workflow; active subject receives own role after reconciled approval. |
| Application identity, state, decision, subject consent, private owner note, applicant-safe reason | Master | Subject reads own status/withdraws before processing; current gym owner reviews/decides; private notes owner-only. |
| Operational full name/contact/DOB/emergency data, membership terms, PT/credits | Tenant | Existing Member/Owner workflows; application collects only minimal name/contact and no health/emergency data. |
| PT notifications/reminders | Tenant | Existing tenant role/relationship policy and notification authorization. |
| Application outcome notification | Master identity scope | Only its subject; owner pending notice only within authorized gym context. |
| Platform support observations | Existing audited support scope | Read-only, time-limited; cannot mutate or decide applications. |

## CF-01 status

Implementation and exact automated results are recorded below. Manual browser walkthroughs and manual acceptance tests are deferred per user instruction. No deployment, merge, pilot, shared/production DB mutation, or external communication is authorized or performed.

## CF-01 implementation status (2026-11-06)

Source review found no public application/status route or application queue. The existing `MemberEnrollmentService` is a durable, recoverable owner registration command that requires an active membership plan, creates the Master operation, commits a tenant member and membership term under a tenant command receipt, and then activates the reciprocal Master `GymAccess`. It also contains the existing-identity `EnrollmentProof` gate and one-time temporary credential behavior for owner-created new identities. Existing notification storage is tenant-scoped; current typed target kinds are PT-only. Public applicant outcome therefore needs an identity-scoped Master fact/notification and typed application route, independent of tenant availability.

The initial CF-00 handoff noted the missing application-bound enrollment flow; that baseline is superseded by the implementation below. CF-01 added additive Master application/notice storage, typed contracts/routes, public and authenticated application flows, status/consent screen, owner queue/decision screen, audit events, and identity-scoped application notices. The exact membership offer is snapshotted in Master and bound to the existing `REGISTER_MEMBER` operation. Applicant password consent uses the existing enrollment-consent endpoint; owner approval is not consent. `GymAccess` activates only through the existing enrollment reconciliation after tenant member/term and command receipt completion.

The CF-owned application integration suite covers normalized duplicate public submissions, real `GymAccessGuard` denial while pending, credential preservation, authenticated existing-identity application and auth-version fencing, withdrawal and reapplication after rejection/withdrawal, same-action and competing approve/reject races, private-note isolation, recipient-scoped notices, and outage/retry state. The tenant integration suite also covers the application-bound operation handoff: wrong password is rejected, correct applicant password records consent, tenant/member/term/access reconciliation completes, and no temporary password or password mutation occurs. Existing owner-created onboarding and enrollment-consent cases remain covered in the same regression suite. The owned application suite uses a mocked enrollment service for its outage/retry assertions; the real operation/consent path is exercised separately in the tenant integration suite.

## Automated checks run for CF-01 (2026-11-06)

- `pnpm --dir packages/contracts test` — passed, 62 tests.
- `pnpm --dir packages/contracts build` — passed.
- `pnpm exec prisma validate --schema packages/database-master/prisma/schema.prisma` — passed.
- `pnpm --dir apps/api exec vitest run --config vitest.config.tenancy.ts` — passed, 2 files / 2 tests (Master and tenant manifest checks).
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.member-applications.ts --disableConsoleIntercept` — passed, 1 file / 4 tests; disposable run cleaned 4 databases and its container.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.tenancy-integration.ts test/tenancy/tenant-schema.integration.test.ts --disableConsoleIntercept` — passed, 1 file / 32 tests, including owner-created enrollment and the new application-bound consent/reconciliation test; disposable run cleaned 8 databases and its container.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.identity.ts --disableConsoleIntercept` — passed, 1 file / 13 tests; disposable run cleaned 4 databases and its container.
- `pnpm --dir apps/api exec tsc --noEmit --incremental false --pretty false` — passed.
- `pnpm --dir apps/web exec tsc --noEmit --incremental false --pretty false` — passed.
- `pnpm --dir apps/api lint` — passed with three existing unused-variable/import warnings in `analytics.service.ts`, `availability.service.ts`, and `availability.controller.ts`.
- `pnpm --dir apps/web lint` — passed.
- `pnpm --dir apps/web build` — passed; new `/apply`, `/apply/[slug]`, `/gyms/[slug]/apply`, `/applications` and owner applications routes were included.
- `pnpm check:workspace` — passed; 5 packages, workspace graph valid.
- `pnpm test:unit` — passed: contracts 62, API client 14, theme token 5, API source 61, pool tests 25.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:pt:owned` — passed, 13 files / 55 tests; PT command, recovery, reminders, availability, session reads/notifications, and upgrade rehearsal all completed with disposable fixture cleanup.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:recovery:owned` — passed, 1 file / 1 recovery drill; 8 disposable databases cleaned.
- `git diff --check` — passed. The final explicit documentation whitespace scan also passed.

The first sandboxed Docker-backed attempt failed because the Docker socket was unavailable; the same owned suites were then rerun with the permitted disposable-container execution and passed. One sandboxed `pnpm test:unit` attempt hit `listen EPERM` in an API controller unit test; rerunning with local listener permission passed. Two intermediate production builds exposed Next.js cache-component/Suspense requirements in new routes; route boundaries were corrected and the final build passed. An intermediate parallel web `tsc` invocation raced the Next build while `.next/types` was being regenerated; the isolated final web typecheck passed afterward. A focused 1-test run of the new application-bound consent test passed before rerunning the entire 32-test tenant suite.

Manual browser walkthroughs and manual acceptance tests remain deferred by instruction. Automated browser routes are not yet covered by a new CF-specific Playwright spec. No deployment, merge, pilot, external message, or shared/production database change occurred.

## Remaining risks and unverified behavior

- The public application submission response is deliberately generic for normalized email collisions; an applicant who already has an account must sign in and use the authenticated application route. The UI directs applicants to sign in, and no account-existence signal is returned.
- The full browser flow, visual/mobile acceptance, exact owner/applicant notification behavior in a running web/API stack, tenant outage recovery in a real deployment topology, and accessibility review are not manually accepted. Automated browser coverage is deferred.
- `RECOVERY_REQUIRED` is modeled for future repair states but this CF-01 implementation leaves recoverable enrollment failures in `PROCESSING` and retries the stable operation; permanent unexpected state repair is not covered by a new operator workflow.
- Retention duration for rejected/withdrawn application records remains a product policy decision.

## CF-00 documentation baseline checks (historical, before CF-01 implementation)

- `pnpm --dir packages/contracts test` — passed, 59 tests at the CF-00 baseline; superseded by the 62-test CF-01 run above.
- `pnpm --dir apps/api exec vitest run src/identity/email.spec.ts src/identity/gym-access-fence.spec.ts` — passed, 11 tests. These cover current identity email normalization and access-fence helpers, not the absent application journey.
- `pnpm exec prisma validate --schema packages/database-master/prisma/schema.prisma` — passed at the CF-00 baseline; superseded by the CF-01 schema validation above.
- `rg -n '[[:blank:]]+$' docs/common-foundation` — no trailing-whitespace matches.
- `git diff --check` — passed for tracked diffs. The new documentation is untracked, so the explicit whitespace scan above covers those files.

These historical checks documented the CF-00 baseline only and are not CF-01 verification results.

## CF-02 automated checks (2026-11-06)

Implementation review: added Master `IdentitySession` migration with immutable identity/history protections and manifest version `master-2026-11-06.3`; hashed refresh credentials; session-bound access tokens; 15-minute access-token renewal; proposed personal/shared idle and absolute limits; explicit current/all logout; owner-independent self-scoped session list/revoke APIs; HttpOnly browser transport; foreground and document-navigation renewal; and Security device management UI. Current/all session effects remain in Master and existing authVersion logout semantics continue. Legacy sid-less access tokens retain bounded compatibility until their existing 15-minute expiration. `sessions.ts` keeps its primitive schemas local to avoid a runtime ESM barrel cycle.

- `pnpm --dir packages/contracts build && pnpm --dir packages/contracts test` — passed; 62 contract tests.
- `pnpm exec prisma validate --schema packages/database-master/prisma/schema.prisma` — passed.
- `shasum -a 256 packages/database-master/prisma/migrations/20261106070000_identity_sessions/migration.sql` — `d35aa4917bce8a6c1d5a490b4395ac555f0f0c0995e2d0015a42505c6a92fe60`, matches the Master template manifest.
- `pnpm --dir apps/api exec vitest run --config vitest.config.tenancy.ts` — passed, 2 files / 2 tests (migration checksum and Master/tenant manifests).
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:pt:owned` — passed after the runtime DI fix, 13 files / 55 tests; disposable fixtures cleaned up. This covers PT command/recovery, reads, notifications, scheduled reminders, and tenant upgrade rehearsal.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.identity.ts --disableConsoleIntercept` — passed, 1 file / 14 tests. Uses disposable databases; cleanup reported 4 dropped databases and removed container. Covers concurrent refresh, replay revocation, personal/shared classification, session listing, passive vs foreground activity expiry, current/all logout and identity authVersion behavior.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:cf:owned` — passed, 1 file / 4 tests; disposable cleanup reported 4 databases dropped and container removed. Retains pending access, credential preservation, consent, duplicate/decision race and notice authorization coverage.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.tenancy-integration.ts test/tenancy/tenant-schema.integration.test.ts --disableConsoleIntercept` — passed, 1 file / 32 tests; disposable cleanup reported 8 databases dropped. Covers existing owner-created enrollment and CF-01 application-bound enrollment consent/reconciliation.
- `pnpm test:unit` — passed: 62 contract tests, 14 API client tests, 5 theme tests, 18 API source files / 63 tests, and 3 pool files / 25 tests.
- `pnpm --dir apps/api exec tsc --noEmit --incremental false --pretty false && pnpm --dir apps/web exec tsc --noEmit --incremental false --pretty false` — passed.
- `pnpm --dir apps/web build` — passed; includes `/security`, `/api/session/renew`, and CF-01 routes.
- `pnpm --dir apps/api lint && pnpm --dir apps/web lint` — passed. API lint reports three pre-existing unused-variable/import warnings in analytics and session availability; web lint is clean.
- `pnpm check:workspace` — passed; 5-package workspace graph valid.
- `git diff --check` — passed. `rg -n '[[:blank:]]+$' docs/common-foundation` — no matches (rg exit 1 means no trailing whitespace).

Corrected attempts: initial identity integration exposed one stale error-message assertion and a stale replay token; both were corrected, then the full identity suite passed. The first unit run hit sandbox `listen EPERM`; rerun with local listener permission passed. Initial PT owned regression surfaced Nest dependency injection metadata because `AuthSessionService` imported `DatabaseService` type-only; switched to runtime import and reran below. The manifest test initially expected `.2`; updated to `.3` to match the additive migration. Initial unit run before the local test permission also exposed the ESM primitive import cycle in contracts; fixed by making `sessions.ts` independent of the root barrel. These failed attempts are not counted as passes.

Manual browser/device selection, refresh and expiry walkthroughs, cross-device logout acceptance, visual/mobile/accessibility review, and live tenant-outage UX checks remain explicitly deferred. No manual tests were conducted and no deployment, merge, pilot, external message or shared/production database mutation occurred.

## CF-03 automated checks (2026-11-06)

CF-03 adds normal password-change session/recovery revocation and append-only security events; Master-owned hashed one-time recovery credentials; a reauthenticated gym Owner recovery flow for eligible ordinary identities and uniquely scoped pending applicants; a separately guarded SuperAdmin operator recovery flow; recovery completion, security history and application-facing recovery screens. Gym applicant recovery does not activate access or alter application state. Plaintext recovery credentials are returned once and delivered only in a URL fragment. Verification method and attestation are recorded; they do not prove that real-world identity checks occurred.

- `pnpm --dir packages/contracts build` — passed.
- `pnpm --dir packages/contracts test` — passed, 63 tests, including new strict staff recovery input/output coverage.
- `pnpm exec prisma format --schema packages/database-master/prisma/schema.prisma` and `pnpm exec prisma generate --schema packages/database-master/prisma/schema.prisma` — passed.
- `pnpm exec prisma validate --schema packages/database-master/prisma/schema.prisma` — passed.
- `shasum -a 256 packages/database-master/prisma/migrations/20261106080000_identity_recovery/migration.sql` — `c09cd5b94716b5a7c7714f2be4f57ec54fe57bdfbd1d1a2b77a22949a24a50bd`, matches the Master template manifest.
- `pnpm --dir apps/api exec vitest run --config vitest.config.tenancy.ts` — passed, 2 files / 2 tests (Master and tenant template manifests).
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.identity.ts --disableConsoleIntercept` — passed, 1 file / 17 tests with disposable database/container cleanup. Includes normal password change and durable session invalidation; owner-assisted Member and pending-applicant recovery; fresh owner/SuperAdmin password checks; token attempts, reissue, expiry/replay and issuer downgrade; pending applicant remains without GymAccess; and separate operator recovery.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:cf:owned` — passed, 1 file / 4 tests with disposable fixtures cleaned. Covers CF-01 pending access, consent/credentials, duplicate and decision concurrency, and identity-scoped notice authorization.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.tenancy-integration.ts test/tenancy/tenant-schema.integration.test.ts --disableConsoleIntercept` — passed, 1 file / 32 tests with disposable fixture cleanup; retains existing owner-created enrollment and CF-01 application-bound consent/reconciliation regression coverage.
- `pnpm test:unit` — passed: contracts 63, API client 14, theme tokens 5, API source 18 files / 63 tests, and pool suite 3 files / 25 tests. Executed with local listener permission for the API controller test.
- `pnpm --dir apps/api exec tsc --noEmit --incremental false --pretty false` — passed (run after the operator recovery implementation).
- `pnpm --dir apps/web exec tsc --noEmit --incremental false --pretty false` — passed after final support-context guard changes.
- `pnpm --dir apps/api lint && pnpm --dir apps/web lint` — passed; API reports three existing unused-variable/import warnings in analytics and session availability; web lint is clean.
- `pnpm --dir apps/web build` — passed; routes include `/recover`, `/admin/account-recovery`, `/gyms/[slug]/owner/account-recovery`, and `/security` plus prior CF-01/02 routes.
- `pnpm check:workspace` — passed; workspace graph valid for 5 packages.
- `git diff --check` — passed before the final documentation addition; final documentation whitespace and diff checks are recorded below.

Final documentation checks: `git diff --check` passed; `rg -n '[[:blank:]]+$' docs/common-foundation` returned no matches. No manual browser walkthrough or acceptance test was performed. No deployment, merge, pilot, external communication, or shared/production database change occurred. User-requested manual recovery, browser, visual/mobile, accessibility, support verification and outage acceptance remain deferred. Automated passing status is **Ready for review**, not Verified.

Known risks: gym staff attestation cannot establish the truth of an external identity check; the SuperAdmin process does not provide dual control. Recovery help directs applicants to contact details supplied by their gym; there is no verified in-app contact directory or email reset provider.

## CF-04 automated checks (2026-11-06)

Implementation review: added strict account/profile contracts; Master `/auth/profile` projection and self-only display-name update; Master immutable profile command receipt/migration `20261106090000_profile_command_receipts`; version audit without field values; gym-scoped self-profile reads/updates for verified Member and Trainer actors; Owner corrections for verified published Member records; tenant CAS/CommandReceipt/AuditLog behavior; a shared accessible header account disclosure; `/account/profile`, `/gyms/[slug]/profile`, and `/help`; profile editors on the Member detail page; and an existing-bell Notifications destination. No tenant schema change was necessary. Global `displayName` remains separate from gym `fullName`. Health fields, email, role/status, trainer level/pay/shift and membership/credits are not accepted by the profile mutations.

- `pnpm --dir packages/contracts build` — passed.
- `pnpm --dir packages/contracts test` — passed, 64 tests including strict account/member/trainer/Owner correction schemas and rejection of mass-assignment fields.
- `pnpm exec prisma format --schema packages/database-master/prisma/schema.prisma && pnpm exec prisma generate --schema packages/database-master/prisma/schema.prisma && pnpm exec prisma validate --schema packages/database-master/prisma/schema.prisma` — passed.
- `shasum -a 256 packages/database-master/prisma/migrations/20261106090000_profile_command_receipts/migration.sql` — `de3417f9317369918e27fe68b0f77fd4682d721263fd4d38afcbdaab024f3fa8`, matches the Master template manifest.
- `pnpm --dir apps/api exec vitest run --config vitest.config.tenancy.ts` — passed, 2 files / 2 tests; migration checksum and Master/tenant manifests.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.tenancy-integration.ts test/tenancy/tenant-schema.integration.test.ts --disableConsoleIntercept` — passed, 1 file / 33 tests using isolated disposable PostgreSQL. The profile test exercises real synthetic Master/tenant rows, Master display-name receipt/audit and gym-name separation, Member/Trainer field-scoped updates, Owner correction with enumerated reason, wrong-subject and mass-assignment rejection, duplicate replay, concurrent stale-version conflict, and audit omission of contact values. Harness cleanup reported 8 databases and its container removed. Existing owner-created and application-bound enrollment/reconciliation tests in the same suite also passed.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:cf:owned` — passed, 1 file / 4 tests; disposable cleanup reported 4 databases and container removed. Confirms the updated Master manifest/migration leaves CF-01 application consent, pending-access denial, duplicate/decision and notice authorization behavior intact.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.identity.ts --disableConsoleIntercept` — passed, 1 file / 17 tests with disposable cleanup (4 databases and container removed), confirming CF-03 identity/session/recovery behavior on the updated Master migration chain.
- `pnpm test:unit` — passed: contracts 64, API client 14, theme tokens 5, API source 18 files / 63 tests, and pool suite 3 files / 25 tests. Executed with local listener permission required by an API controller test.
- `pnpm --dir apps/api exec tsc --noEmit --incremental false --pretty false` and `pnpm --dir apps/web exec tsc --noEmit --incremental false --pretty false` — passed.
- `pnpm --dir apps/api lint && pnpm --dir apps/web lint` — passed; API has three pre-existing unused-code warnings in analytics/session availability; web lint clean after correcting the profile success refresh and action payload patterns.
- `pnpm --dir apps/web build` — passed; new routes `/account/profile`, `/gyms/[slug]/profile` and `/help` included with the existing CF routes. The first attempt caught the required Next.js Suspense boundary for `/account/profile`; that boundary and its later field-union type issue were corrected before the final passing build.
- `pnpm check:workspace` — passed; 5-package workspace graph valid.
- Final `git diff --check` — passed. `rg -n '[[:blank:]]+$' docs/common-foundation` returned no matches.

No manual browser or accessibility test was run. Manual role-switching/multi-gym, responsive layout, keyboard/focus, in-page link behavior, offline/retry UX and Member DOB correction-request behavior remain unverified. No deployment, merge, pilot, external communication, or shared/production database change occurred. CF-04 is **Ready for review**, not Verified. An initial Next production build failed on the new route's missing Suspense boundary, an initial lint pass rejected a synchronous state update from an Effect, and an intermediate build exposed action union typing; each was corrected, and only the final check results above count as passing.

## CF-05 automated checks (2026-11-06)

Implementation review: added Master `IdentityEmailCorrectionRequest` with normalized requested address, unique subject/idempotency key, partial uniqueness for one pending request per subject and target address, immutable request facts, and a single versioned close/withdraw transition. Master manifest is `master-2026-11-06.7`. Added strict request/status/admin contracts, current-password-confirmed authenticated submission, subject-only status and withdrawal, a SuperAdmin-only bounded queue and versioned closure, read-only login email with request UI, help entry, and the operator follow-up runbook. No login identity email is changed and no mailbox verification, external message, tenant contact update, account merge, new access, notification, recovery invalidation, or session revocation is claimed.

- `pnpm exec prisma format --schema packages/database-master/prisma/schema.prisma && pnpm exec prisma generate --schema packages/database-master/prisma/schema.prisma` — passed; Master generated client includes the additive request model.
- `pnpm exec prisma validate --schema packages/database-master/prisma/schema.prisma` — passed.
- `shasum -a 256 packages/database-master/prisma/migrations/20261106100000_identity_email_correction_requests/migration.sql` — `b5444d2ae4391cf6f1d5a770636b506d392d8b66c7e12fa68e34746a66f89387`, matches the Master template manifest.
- `pnpm --dir packages/contracts build && pnpm --dir packages/contracts test` — passed; 66 contract tests, including normalization and strict safe request/admin DTO tests.
- `pnpm --dir apps/api exec vitest run --config vitest.config.tenancy.ts` — passed; 2 files / 2 tests, including updated Master migration checksums and manifest postconditions.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.identity.ts --disableConsoleIntercept` — passed; 1 file / 18 tests using owned disposable Master and tenant databases. CF-05 coverage verifies wrong current password, live session guard, normalized target address, concurrent same-key replay, duplicate pending conflicts, rejection of a target already used by another identity, unchanged login email/password hash/tenant contact snapshot, own-only status and withdrawal, audit privacy, SuperAdmin guard and follow-up closure, and one-winner competing closure. Existing identity/session/recovery regressions also passed. Harness cleanup reported 4 disposable databases dropped and its container removed.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:cf:owned` — passed; 1 file / 4 tests using owned disposable fixtures, confirming CF-01 pending access, consent, duplicate/decision race and applicant notice authorization.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.tenancy-integration.ts test/tenancy/tenant-schema.integration.test.ts --disableConsoleIntercept` — passed; 1 file / 33 tests using owned disposable databases. Preserves owner-created onboarding, application-bound enrollment reconciliation and CF-04 profile field ownership. Cleanup reported 8 databases dropped and its container removed.
- `pnpm test:unit` — passed: contracts 66, API client 14, theme tokens 5, API source 18 files / 63 tests, and pool suite 3 files / 25 tests.
- `pnpm --dir apps/api exec tsc --noEmit --incremental false --pretty false && pnpm --dir apps/web exec tsc --noEmit --incremental false --pretty false` — passed.
- `pnpm --dir apps/api lint && pnpm --dir apps/web lint` — passed. API reports three existing unused import/variable warnings in session availability and analytics; web lint is clean.
- `pnpm check:workspace` — passed; 5-package workspace graph is valid.
- `pnpm --dir apps/web build` — first attempt failed because the new authenticated routes accessed dynamic cookies/fetch outside a Suspense boundary. Both routes were wrapped in Suspense; rerun passed, compiling and typechecking and generating all 61 static/partial routes. Output includes `/account/email-correction` and `/admin/email-correction-requests`.
- `git diff --check` — passed after final source and documentation edits. `rg -n '[[:blank:]]+$' docs/common-foundation/CF-05-EMAIL-CORRECTION-RUNBOOK.md docs/common-foundation/PROGRESS.md docs/common-foundation/EVIDENCE.md` — no trailing whitespace matches.

The initial sandboxed attempt at the owned identity suite could not access the local Docker socket; it was rerun with permission on the repository's run-labeled disposable container and passed. An initial disposable identity run exposed a duplicate synthetic tenant database-name fixture; the unnecessary fixture was removed and the rerun passed. Failed attempts are not counted as successful checks.

Manual browser, mobile, visual, keyboard/focus/accessibility, actual staff identity verification, and live API-outage acceptance were not performed, as requested. No deployment, merge, pilot, external communication, PT-source change, or shared/production database mutation occurred. CF-05 remains **Ready for review**, not Verified.

## CF-06 automated checks (2026-11-06)

Implementation review: added the Master `IdentitySecurityEventRead` receipt table with a subject-matching insert guard while keeping `IdentitySecurityEvent` append-only; added `SESSIONS_REVOKED` events inside the Master session-revocation transactions; added Account and Gym notification paging APIs and separate history pages; added typed session/application/profile/security/owner-queue targets; preserved the tenant PT bell preview and scheduled reminder behavior; and added a generic Member-facing notice in the same tenant transaction as an Owner profile correction. Master manifest is `master-2026-11-06.8`; tenant manifest is `tenant-2026-11-06.6`. The two inboxes remain source-scoped and do not claim a cross-database atomic read or mark-all operation. No preferences or external messages were added.

- `pnpm exec prisma format --schema packages/database-master/prisma/schema.prisma && pnpm exec prisma generate --schema packages/database-master/prisma/schema.prisma` — passed; Master client generated with the security read-receipt model.
- `pnpm exec prisma format --schema packages/database-tenant/prisma/schema.prisma && pnpm exec prisma generate --schema packages/database-tenant/prisma/schema.prisma` — passed; tenant client generated with the `MEMBER_PROFILE` notification link kind.
- `pnpm --dir packages/contracts build && pnpm --dir packages/contracts test` — passed; 66 tests including typed destination allowlists and bounded Account/Gym notification queries.
- `pnpm exec prisma validate --schema packages/database-master/prisma/schema.prisma` and `pnpm exec prisma validate --schema packages/database-tenant/prisma/schema.prisma` — passed.
- `shasum -a 256 packages/database-master/prisma/migrations/20261106110000_account_notification_read_receipts/migration.sql packages/database-tenant/prisma/migrations/20261106120000_member_profile_notifications/migration.sql` — Master `7e3bbbd82046e3562fbe445657b94e8c51b4d62dd71d71f7bf7e3e5b3ed2e6fd`; tenant `afc031dfbdc3068a060e9757c97b105ba5fd4d7741427012024d4c2ef51ad144`; both match their manifests.
- `pnpm --dir apps/api exec vitest run --config vitest.config.tenancy.ts` — passed, 2 files / 2 tests for Master and tenant manifest/checksum consistency.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.notifications.ts --disableConsoleIntercept` — passed, 3 files / 15 tests using owned disposable PostgreSQL. Covers tenant recipient authorization, stable history paging, notification read state, Account identity-scoped application/security inbox and append-only security receipts, account snapshot mark-all, tenant dedupe, plus PT reminder execution and upgrade rehearsal from tenant `.4` to `.6`. Cleanup removed all labeled disposable databases and containers.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.tenancy-integration.ts test/tenancy/tenant-schema.integration.test.ts --disableConsoleIntercept` — passed, 1 file / 33 tests on disposable Master/tenant databases. In addition to existing enrollment/profile coverage, confirms Owner Member correction emits one generic field-free notice in the same transaction. Cleanup reported 8 databases dropped and the container removed.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:cf:owned` — passed, 1 file / 4 tests, preserving CF-01 application consent, pending-access denial, repeated submissions, competing owner decisions, and applicant-notice authorization.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.identity.ts --disableConsoleIntercept` — passed, 1 file / 18 tests on owned disposable Master/tenant databases, preserving identity, session, password-change/recovery, temporary-credential and pending-applicant behavior. Cleanup reported 4 databases dropped and the container removed.
- `pnpm test:unit` — passed when rerun with local-listener permission: contracts 66, API client 14, theme tokens 5, API source 18 files / 63 tests, and pool suite 3 files / 25 tests. The first sandboxed run was blocked by `listen EPERM` in an existing API controller test; it was rerun with permission and passed.
- `pnpm typecheck:workspace` — passed after the Master/tenant client generation and implementation updates.
- `pnpm --dir apps/api lint && pnpm --dir apps/web lint` — passed; API retains three pre-existing unused-code warnings in analytics/session availability; web lint is clean.
- `pnpm --dir apps/api build` — passed.
- `pnpm --dir apps/web build` — passed; output includes `/account/notifications` and `/gyms/[slug]/notifications` among 63 generated static/partial routes.
- `pnpm check:workspace` — passed; 5-package workspace graph valid.
- `git diff --check` — passed after final source, schema and evidence edits.

Automated browser attempt: `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.ts tests/notifications-bell.e2e.spec.ts` — failed. The existing notification-bell browser journey redirected to `/login?error=expired` while opening the bell. Diagnostic retries confirmed the synthetic token/session contract, browser cookie storage, and direct API session, gym-access and history preflights, but the browser-rendered journey still redirected. The browser test file was restored to its pre-task state; this result is unverified, not passed. No manual browser walkthrough was performed.

Remaining gaps: resolve the automated Next.js/browser redirect in the existing notification-bell harness and rerun it against the Account and Gym history destinations; perform manual keyboard/focus, responsive, accessibility and role-switching acceptance only in the later authorized review. Choose and document a retention/archival period before any retention automation; inbox read actions do not delete events. No deploy, merge, pilot, external message, shared/production database mutation, or PT progress/evidence/runbook update occurred. CF-06 is not marked Ready for review or Verified due to the failed automated browser journey.

## CF-07 automated checks (2026-11-06)

Implementation: added Help links from sign-in, recovery, authenticated application, and application status; expanded `/help` with safe application/access states, account-versus-membership explanation, privacy/correction/duplicate/departure/data-access next steps, and the existing email-correction limits; clarified unknown application-submit outcome; added a SuperAdmin-only aggregate Master operational visibility endpoint and `/admin` summary. Added [the CF-07 owner privacy runbook](CF-07-OWNER-PRIVACY-RUNBOOK.md). No schema/migration changes, external messaging, account merge, hard delete, retention automation, or PT source changes.

- `pnpm --dir packages/contracts build && pnpm --dir packages/contracts test && pnpm --dir apps/api exec vitest run src/platform/platform-registry.service.spec.ts` — passed; 67 contract tests and 1 service test. Contract coverage rejects identity/private data and keeps unrecorded metrics explicit.
- `pnpm --dir apps/api exec tsc --noEmit --incremental false --pretty false && pnpm --dir apps/web exec tsc --noEmit --incremental false --pretty false` — passed.
- `pnpm --dir apps/api lint && pnpm --dir apps/web lint` — passed; API reports the same three existing unused-code warnings in analytics/session availability; web lint clean.
- `pnpm test:unit` — first sandboxed attempt failed at an existing API controller test because it could not bind `127.0.0.1` (`listen EPERM`). Rerun with permitted local-listener access passed: contracts 67, API client 14, theme tokens 5, API source 19 files / 64 tests, pool suite 3 files / 25 tests.
- `pnpm check:workspace` — passed; 5-package workspace graph valid.
- `pnpm --dir apps/api build` — passed (`nest build`).
- `pnpm --dir apps/web build` — passed; Next.js compiled, typechecked, and generated 63 static/partial routes including Help, login, recovery, application status, and admin.
- `git diff --check` — passed after final CF-07 edits.

No automated browser test was run for CF-07. CF-06's existing Playwright notification journey remains failed as recorded above and must be resolved in CF-08. Manual browser walkthroughs, mobile/zoom/theme, keyboard/focus/accessibility, and real owner privacy workflow tests were not performed. No deploy, merge, pilot, external message, or shared/production DB change occurred; PT progress/evidence/runbook were not modified. CF-07 is Ready for review on its passing automated checks, not Verified; the common-foundation release remains unverified while the CF-06 automated browser failure is unresolved.

## CF-08 automated verification (2026-11-06)

### Browser session fixture and focused journeys

- Added `apps/web/tests/support/browser-session.ts` to mint a real Master `IdentitySession`, store the matching SHA-256 refresh hash, and install a signed session-bound access token plus refresh cookie in Playwright. Updated test helpers in the two-gym, member, trainer, PT workspace and session-read specs. The notification-bell test now obtains cookies through `/auth/login`.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.ts tests/notifications-bell.e2e.spec.ts` — passed, 1 test; disposable databases/container removed.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.ts tests/two-gym.e2e.spec.ts --grep 'web sessions enforce'` — passed, 1 test; disposable fixture cleanup completed. The session journey verifies current-device logout and refresh lifecycle.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.ts tests/two-gym.e2e.spec.ts --grep 'existing identity explicitly consents|web sessions enforce|full member enrollment'` — 2 passed, 1 failed on the initial run; the session assertion was corrected for the current shell/logout contract and subsequently passed in isolation.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.ts` — 36 tests: 23 passed, 13 failed. Passed notifications, PT workspace viewports/cancellation, CF owner-created temporary-credential onboarding, existing-identity consent/credential preservation, session lifecycle after correction, and several platform journeys. Failures exposed stale selectors, outdated role/layout assertions, missing availability in owned booking fixtures, and enrollment/session journeys needing further diagnosis.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.ts tests/member-workspace.e2e.spec.ts tests/owner-session-booking.e2e.spec.ts` — 4 member-workspace tests passed; the owner-booking test exposed a stale one-notice assertion (the booking correctly creates member and trainer notices). After correcting that assertion, `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.ts tests/owner-session-booking.e2e.spec.ts` passed, 1 test.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.ts tests/member-workspace.e2e.spec.ts --grep 'member requests keep drafts'` — passed, 1 test after aligning the owned fixture with the two-live-pending-request cap and current late-cancellation quote copy.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.ts tests/member-workspace.e2e.spec.ts` — passed, all 4 member-workspace tests, including responsive/theme coverage, plan/calendar behavior, request/withdrawal without credit holds, late-cancellation policy, and outage recovery. Owned databases/container were removed by teardown.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.ts tests/session-reads.e2e.spec.ts` — passed, 1 test after correcting stale role headings/regions/dialogs and pagination expectations. The app's monthly member overview link now explicitly opens `view=list`; before the fix it landed on the calendar route despite promising filtered matching sessions.
- The earlier 2-passed/4-failed targeted run above is superseded by these focused passing reruns. The full browser suite was not rerun after the corrections; its earlier 23-passed/13-failed result remains the latest full-suite result, so the other failures remain unresolved.

### Owned API/database and regression suites

- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:cf:owned` — passed, 1 file / 4 tests; cleanup removed 4 owned DBs and disposable container.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.identity.ts --disableConsoleIntercept` — passed, 1 file / 18 tests; cleanup removed 4 owned DBs and disposable container.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.notifications.ts --disableConsoleIntercept` — passed, 3 files / 15 tests, including Account/Gym notice authorization, PT reminders and tenant upgrade `.4`→`.6`; owned databases/container removed.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:pt:owned` — passed, 13 files / 56 tests; owned disposable cleanup and PT upgrade rehearsal completed. Injected finance errors were expected test cases; command exited 0.

### Workspace checks after latest harness edits

- `pnpm --dir apps/web exec tsc --noEmit --incremental false --pretty false` — passed.
- `pnpm --dir apps/web build` — passed after the owner month-overview drilldown source change; Next.js compiled, typechecked and generated 63 routes.
- `pnpm typecheck:workspace` — passed.
- `pnpm lint:workspace` — passed; API reports three existing unused-code warnings in analytics/session availability; web lint clean.
- `pnpm check:workspace` — passed; five-package graph valid.
- `git diff --check` — passed.

Manual browser/device/accessibility acceptance, pilot, deployment and merge were not performed. No shared or production database was changed. CF-08 is incomplete because browser regressions remain; no Ready for review or Verified status is claimed. The notification-bell failure described in the earlier CF-06 record was resolved by this durable session fixture and the focused notification rerun above. Next automated work is to correct or retire stale test interactions based on current UI/API behavior, rerun the full browser suite, then record final workspace and upgrade results. PT implementation and PT progress/evidence/runbook remain untouched.

### CF-08 follow-up browser rerun (2026-11-06)

- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.ts --grep 'trainer accepts declines completes|real browser and HTTP requests|trainer roster/profile and member directory|role shell supports keyboard|member roster and profile keep|member roster and profile expose'` — 0 passed, 6 failed. The trainer action remained pending in the browser; two-gym journeys exposed stale assertions for current navigation/member totals and a missing current start-time selector; member profile pack issuance reached the workspace error boundary; the loading-state journey used the roster label for the profile loading state. Disposable DB/container cleanup completed.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.ts --grep 'member roster and profile keep|member roster and profile expose'` — 0 passed, 2 failed. Confirmed pack issuance browser journey still fails at the success assertion with the workspace error boundary; loading journey had the profile's distinct `Loading member profile…` label. Updated the loading assertion to match the respective route. Disposable DB/container cleanup completed.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.ts --grep 'member roster and profile expose accessible loading states'` — passed, 1 test after correcting the profile-specific loading label; disposable DB/container cleanup completed.
- `pnpm typecheck:workspace && pnpm --dir apps/web build && git diff --check` — passed. TypeScript completed for contracts, API client, API and web; Next production build generated 63 routes; diff check passed.
- Corrected the owned trainer UI fixture to seed required gym configuration and use a 60-minute request. Corrected stale two-gym assertions to current pager totals and slot selector. These changes have not yet cleared the failed browser journeys; no passing result is claimed for them.

### CF-08 continued checks and Chrome manual application (2026-11-06)

- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.ts --grep 'trainer roster/profile and member directory are usable'` — failed. The member session, member options and session-slots API preflights all returned 200, but submitting the booking form navigated to `/login?error=expired`; member request creation and the downstream trainer decision/cancellation journey did not complete in this rerun. One earlier attempt timed out because its Playwright response predicate did not match Next server-action encoding; that wait was removed. This remains an unresolved browser regression.
- `pnpm typecheck:workspace && pnpm --dir apps/web build && GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.ts --grep 'public member application entry stays available' && git diff --check` — passed. Workspace TS checks passed; Next compiled and generated 63 routes; isolated Playwright public application test passed 1/1; diff check passed. The source change excludes `/apply` and `/apply/[slug]` from authenticated session polling and resets document visibility when initializing the lifecycle, so an expired/no-session API check no longer hides or redirects the public application form.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:cf:owned` — passed, 1 file / 4 tests; owned disposable DBs/container removed.
- `pnpm --dir apps/web lint` — passed with no reported issues.
- Manual Chrome on the persistent owned local sandbox: opened `/apply`, navigated to synthetic `test-alpha`, confirmed the application form rendered, submitted the synthetic applicant `cf08.manual.20261106@example.test` on the configured `localhost` origin, signed in, and confirmed the authenticated application page showed “Pending review” while the no-access screen reported no active gym access. The first submission from `127.0.0.1` was refused by the configured-origin protection; using `localhost` succeeded. No owner decision was submitted, so owner queue/approval/rejection manual acceptance remains outstanding.
- The persistent manual sandbox lacked the additive CF-01 Master application tables. Applied `prisma migrate deploy --config prisma.master.config.ts` to its verified local Master database; migrations `20261106060000_member_applications` through `20261106110000_account_notification_read_receipts` applied successfully. No shared/production database was touched.
- `pnpm manual:check` after that migration — failed (exit 1): `owner /gyms/test-alpha/session-booking-options?memberPageSize=50 returned 503`. This is not a pass and was not caused by the application journey, which succeeded in Chrome. Earlier repeated login checks had also hit the scripted admin 500/rate-limit failure; the current check progresses to the owner booking-options request.

Manual browser/device/accessibility acceptance for owner decisions and remaining member flows is still incomplete. The full Playwright suite has not been rerun after corrections, and the focused mobile booking regression remains failing. CF-08 is not Ready for review or Verified, and CF-01 remains Ready for review only on its passing CF-01 automated tests; neither that label nor these outcomes mark manual acceptance complete. No deployment, merge, pilot or external message occurred. PT source and PT progress/evidence/runbook remain untouched.
## Client prototype pass — 6 November 2026

- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.ts` — 34 passed, 3 failed before the final repairs. The failing mobile trainer/member directory booking, owner live-refresh, and owner mobile appearance journeys subsequently passed in focused reruns. No final complete suite rerun.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.ts --grep 'trainer roster/profile and member directory|owner appearance upgrades live operations|owner appearance covers directories'` — owner tests 2 passed, mobile test failed with slot API 500. Focused diagnostic showed Prisma P2028, transaction timeout 5,576 ms against a 5,000 ms limit. Replaced the 1,681-offset-per-slot timezone search with bounded hourly offset sampling plus exact local round-trip validation and DST fold/gap handling.
- `pnpm --dir apps/api exec vitest run src/sessions/availability-policy.spec.ts` — 5 passed, including fractional timezone and DST gap/fold checks.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.ts --grep 'trainer roster/profile and member directory|public member application entry'` — 2 passed. Covers mobile PT request/accept/decline/cancel/withdraw and public application/recovery/help responsiveness and light/dark styling.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:pt:owned && GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:cf:owned` — stopped after PT suite: 12 files passed, 1 failed; 55 tests passed, 1 failed. Failure: account notification test expected two notices and received one. The CF half did not run in that command.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.pt.ts test/notifications/notifications.integration.test.ts --disableConsoleIntercept` — first sandbox attempt blocked by Docker socket permission; escalated isolated run passed 6/6. After serializing notification reads on the same transaction, escalated isolated rerun passed 6/6. A complete PT suite rerun remains outstanding.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:cf:owned` — 4/4 passed; owned databases and container removed.
- `pnpm manual:setup` — first fresh attempt failed credit-unit conservation; second failed pending-session request-expiry constraint. Both incomplete owned containers/states were removed after verification. Corrected the current-schema synthetic seeder; third attempt passed with 20 members and 40 PT sessions in each of three gyms.
- `pnpm manual:check` on the fresh local fixture — passed: four logins, three isolated gyms, eligible bookings, role access and credit balances. Local server remains at `http://localhost:3000`; private credentials are in ignored `.env.manual-test.json`.
- `pnpm check:workspace`, `pnpm lint:workspace`, `pnpm typecheck:workspace`, `pnpm --dir apps/api build`, `pnpm --dir apps/web build`, `git diff --check` — passed. Web build generated 63 routes. Lint emitted three unused-code warnings, no errors.
- Manual Chrome visual inspection of `http://localhost:3000/apply/test-alpha` — application form, theme, content, and consent controls rendered on the local current-schema fixture. No owner decision was manually exercised. Other visual and manual acceptance remains deferred.

See [PROTOTYPE-DEFERRED-ISSUES.md](PROTOTYPE-DEFERRED-ISSUES.md) for the separate follow-up list. No deployment, merge, pilot, external message, or shared/production database change occurred.

## Membership prototype update — 6 November 2026

The direct Owner approval path uses application consent, creates pending access in the durable operation, and activates the link only after tenant effects reconcile. It retains a self-created or existing account password. Owner-created enrollment still follows its separate onboarding/consent path. The approved application response now conforms to the strict shared contract after the durable side effects; an earlier Chrome run had exposed a ZodError caused by returning internal `identityId` from that response. The new processing status does not ask for a second password confirmation when tenant reconciliation is delayed.

- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:cf:owned` — passed, 2 files / 5 tests. Owned disposable databases and container removed. Includes new and existing applicants, consent, pending denial, direct approval, member/term creation, password preservation, no other-gym access, no PT pack and replay without duplication.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.trainers.ts --disableConsoleIntercept` — passed, 2 files / 2 tests. Confirms published Trainer profile safe fields, role fence and tenant isolation. The first run failed on an owned fixture missing the current `requestExpiresAt` field; the fixture was corrected and the rerun passed.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.ts --grep 'public member application entry|trainer roster/profile and member directory'` — 1 passed, 1 failed on an outdated `requestLink` test variable after the new Trainer-profile step. The assertion was corrected. Focused rerun with `--grep 'trainer roster/profile and member directory'` passed 1/1; the public application test had passed 1/1 in the first run. These checks cover two-column no-access/application widths at 390/320 in both themes and the mobile Trainer profile-to-booking path.
- `pnpm typecheck:workspace` — passed after the last page edit.
- `pnpm lint:workspace` — passed after the last page edit, with three existing API unused-code warnings and no errors.
- `pnpm --dir apps/api build` — passed. `pnpm --dir apps/web build` — passed after the last status-page edit; web built 64 routes including the Trainer profile.
- `git diff --check` — passed after the last page edit.

The full Playwright/PT suites and current-fixture `pnpm manual:check` were not rerun after the demo browser mutated one synthetic applicant. Do not infer a full-suite pass or manual acceptance from focused checks. No shared/production database, deployment, merge, pilot or external messaging was involved.

- `curl -I --max-time 10 http://localhost:3000/applications` — HTTP 200 after restarting `pnpm manual:start` on the isolated demo fixture. This is an availability check, not application acceptance.
