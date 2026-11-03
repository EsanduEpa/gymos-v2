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

## Remaining acceptance work

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

Still incomplete: failure injection at every enrollment checkpoint, owner-access revocation and concurrent mutation races, broad digest/validation and recursive-secret cases, and the complete two-gym failure/recovery matrix. These follow-up passes do not satisfy all 031 acceptance criteria. Owner manual acceptance is not recorded.
