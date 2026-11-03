# GYMOS-MIG-031 — partial implementation evidence

Status: **In Progress; not Verified or Completed.** Code and API recovery tests are committed on branch `codex/segment-05-member-enrollment` at `e1e4b1c`, based on `origin/main` at `97b16a7`. The browser run used `0994b1c`; the later commit only adds API recovery coverage and documentation.

## Implemented and locally checked

- Added strict member enrollment contracts and API client; owner enrollment form; a Master operation → tenant member/profile/term receipt → Master activation flow; exact plan price and half-open date snapshots; basic-contact upgrade; one-time credential handoff for newly created identities; idempotent replay; owner-only profile fields; completed-operation roster visibility; additive tenant profile schema migration.
- Existing-identity enrollment now remains pending until that identity signs in, confirms the current password and explicitly accepts or declines for the selected gym. Consent is bound to the identity, gym, MEMBER role and durable operation; the generated 256-bit proof is stored as a hash and consumed atomically with the pending role. Existing password/auth version and links in another gym are preserved; refusal creates no role or tenant member. Owner retry resumes the same operation. No temporary credential is issued for a reused identity.
- Injected a tenant transaction failure before commit; retry with the same key recovered the same prepared identity and durable operation and created exactly one member and term.
- Injected failure of the Master activation audit after the tenant receipt commits; retry reconciled the committed receipt and reached COMPLETE with exactly one tenant member and one membership term.
- A real-browser disposable-database journey registered a new member, displayed the one-time credential, enforced password change on first login, and confirmed that the second gym remained unchanged.
- The flow does not write a payment/revenue row. Health notes are omitted from Master intent and receipt intent and represented in the idempotency digest by a keyed fingerprint.
- The API and web TypeScript checks passed. `pnpm --dir packages/contracts build` passed. `pnpm --dir packages/contracts test` passed **26/26**. `pnpm --dir packages/api-client build` passed.
- `pnpm typecheck:workspace`, `pnpm lint:workspace`, `pnpm build:workspace`, and `pnpm --dir packages/contracts test` passed (26/26).
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.identity.ts --disableConsoleIntercept` passed **10/10**, including password reconfirmation, authentication-version binding, expired/restricted proof rejection, role conflict and cross-gym reuse cases.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.tenancy-integration.ts --disableConsoleIntercept` passed **23/23**. The integration harness reported cleanup of **8 disposable databases** and its container.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test` passed **12/12**, including the new member enrollment/first-login journey. The browser harness reported cleanup of **7 disposable databases**, its container and manifest. Generated screenshots are routed to ignored `apps/web/test-results/`.
- All database-backed checks used guarded disposable databases; no existing local GymOS database was used.

## Remaining acceptance work at evidence revision `e1e4b1c`

- Credential delivery-loss/reissue recovery is not yet proven end to end. Fault coverage now proves retry after tenant rollback and after tenant commit/before Master activation; it does not cover every other checkpoint or owner-revocation/concurrent-change race.
- Full digest/idempotency and durable-recovery matrices, all task-specific role/privacy/foreign-ID cases, and complete two-gym failure-path acceptance remain outstanding. Task 031 remains In Progress; no owner acceptance is recorded.
- Full task 031 acceptance requires these items and review of the final committed revision; no completion is claimed.

## Follow-up verification — 3 November 2026

Code and tests added in commit `41a6ad5` on `codex/segment-05-member-enrollment`.

- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.identity.ts --disableConsoleIntercept` — **10/10 passed**. The credential lifecycle case now simulates a committed reissue whose response was lost, confirms same-key recovery returns the new version without replaying its secret, rotates the unseen secret, rejects the revoked secret, acknowledges the current version, and forces a password change.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test -g "full member enrollment hands off|existing identity explicitly consents"` — **2/2 passed**. Chromium verified an owner replacing a lost one-time credential, rejection of the old password, the selected gym’s profile, first-login password change, explicit existing-identity consent/reuse without password change, and the same identity entering Gym B as a member while preserving Gym A.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.tenancy-integration.ts --disableConsoleIntercept` — **26/26 passed**; includes a 125-membership-term paging case with stable order, accurate total, page clamping, and no overlap between pages.
- `pnpm --dir packages/contracts build`, API/web TypeScript checks, focused web ESLint, `pnpm --dir apps/api build`, `pnpm --dir apps/web build`, and `git diff --check` — **exit 0**.
- The browser and integration harnesses used owned disposable databases; final runs cleaned 6 browser databases plus container/manifest and 8 tenancy databases plus container. Generated captures remain under ignored `apps/web/test-results/`. No local demo database was used.

At that revision, failure injection at every enrollment checkpoint, owner-access revocation and concurrent mutation races, broad digest/validation and recursive-secret cases, and the complete two-gym failure/recovery matrix remained incomplete. The new evidence below closes the automated 031 items; owner manual acceptance is still not recorded.

## Original credential acknowledgment follow-up — 3 November 2026

Commit `5d9cf8a` fixes the owner form’s handoff guard to accept delivery version `0` (checking specifically for `undefined`) and adds a browser case proving the original credential can be acknowledged without reissue. `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test -g "original version-zero"` passed **1/1** in Chromium; the fixture asserted version zero before acknowledgment, an acknowledgment timestamp after, and exactly one member. The full lost-credential browser flow passed **1/1** after this fix as well. Web typecheck and focused ESLint passed. At that revision, the remaining fault/concurrency/privacy matrix was still open.

Final current-code browser run: `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test -g "original version-zero|full member enrollment hands off|existing identity explicitly consents"` — **3/3 passed**; cleanup removed 6 disposable databases, the container and manifest. The latest commit is pushed to the existing PR branch. Hosted check state remains unverified: unauthenticated GitHub REST access returned 404 for this private repository, `gh` is unavailable, and the browser-access host is unavailable in this session. No owner manual acceptance is recorded.

## Recovery boundaries, revocation, concurrency and redaction — 3 November 2026

The implementation now revalidates the owner and selected gym on every retry, including completed-operation replay. Owner identity, gym and access rows are locked for the authorization transaction so an in-flight owner revocation has a defined ordering with enrollment and credential issue/reissue/acknowledgment. Invalid gym-local plan and future DOB input is preflighted before a new durable operation or pending identity is created; the tenant write repeats these checks under row locks. Existing operations skip that duplicate preflight and still pass through their immutable digest and current authorization checks.

New disposable integration cases prove:

- Failure while writing the Master preparation audit rolls back the operation and new identity together; no tenant member is written.
- Failure after the tenant member, membership term, audit and committed receipt persist but before the Master tenant checkpoint is recorded recovers the same receipt and completes with one member, one term and one receipt.
- Failure after Master preparation followed by owner access revocation rejects retry before tenant writes; the member access remains PENDING/unpublished, has no tenant actor, and Gym B remains unchanged.
- Concurrent owner acknowledgment and lost-handoff reissue have one winner under the operation lock; delivery version, auth version and audit event counts match the winner. An advisory-lock barrier also proves in-flight reissue completes before a concurrent owner revocation; a later reissue after revocation fails without changing the delivery or member password hash.
- Invalid email/unknown credential fields, future DOB and a plan from another gym produce no new user, operation, tenant member or term. Serialized operation, receipt and audit evidence contains neither health notes nor the one-time credential.

Verification on the working revision (all database-backed suites used owned disposable PostgreSQL and cleaned their resources):

- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.identity.ts test/identity/identity.integration.test.ts --disableConsoleIntercept` — **13/13 passed**, exit 0; cleanup dropped 4 disposable databases and its container.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.tenancy-integration.ts test/tenancy/tenant-schema.integration.test.ts --disableConsoleIntercept` — **29/29 passed**, exit 0; cleanup dropped 8 disposable databases and its container.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test tests/two-gym.e2e.spec.ts --grep 'original version-zero|full member enrollment hands off|existing identity explicitly consents'` — **3/3 passed**, exit 0; cleanup dropped 6 disposable databases, its container and manifest.
- `pnpm --dir apps/api exec tsc --noEmit`, focused API Oxlint, and `git diff --check` — exit 0.

The automated acceptance gaps previously listed for 031 now have passing evidence. Status remains **In Progress** until the required project-owner manual acceptance is recorded and the latest PR revision’s hosted checks/review findings are verified. No owner acceptance is inferred from these tests.

The hosted run on `3bfeb3c` has 10/11 required checks passing. The remaining Browser isolation check fails in the unrelated Segment 06 trainer-registration browser case because its test navigates to the gym root, then to the trainer form while the owner redirect is still in flight. The test now opens its final trainer route directly; the focused disposable Chromium test passed **1/1** locally with cleanup of 6 databases, its container and manifest. This harness correction does not change 031 behavior. It must be pushed and all hosted checks reverified before closing 031. Project-owner manual acceptance is also still not recorded.
