# GYMOS-MIG-031 — partial implementation evidence

Status: **In Progress; not Verified or Completed.** Working tree on branch `codex/segment-05-member-enrollment`, based on `origin/main` at `97b16a7`.

## Implemented and locally checked

- Added strict member enrollment contracts and API client; owner enrollment form; a Master operation → tenant member/profile/term receipt → Master activation flow; exact plan price and half-open date snapshots; basic-contact upgrade; one-time credential handoff for newly created identities; idempotent replay; owner-only profile fields; completed-operation roster visibility; additive tenant profile schema migration.
- Existing-identity enrollment now remains pending until that identity signs in, confirms the current password and explicitly accepts or declines for the selected gym. Consent is bound to the identity, gym, MEMBER role and durable operation; the generated 256-bit proof is stored as a hash and consumed atomically with the pending role. Existing password/auth version and links in another gym are preserved; refusal creates no role or tenant member. Owner retry resumes the same operation. No temporary credential is issued for a reused identity.
- Injected failure of the Master activation audit after the tenant receipt commits; retry reconciled the committed receipt and reached COMPLETE with exactly one tenant member and one membership term.
- A real-browser disposable-database journey registered a new member, displayed the one-time credential, enforced password change on first login, and confirmed that the second gym remained unchanged.
- The flow does not write a payment/revenue row. Health notes are omitted from Master intent and receipt intent and represented in the idempotency digest by a keyed fingerprint.
- The API and web TypeScript checks passed. `pnpm --dir packages/contracts build` passed. `pnpm --dir packages/contracts test` passed **26/26**. `pnpm --dir packages/api-client build` passed.
- `pnpm typecheck:workspace`, `pnpm lint:workspace`, `pnpm build:workspace`, and `pnpm --dir packages/contracts test` passed (26/26).
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.identity.ts --disableConsoleIntercept` passed **10/10**, including password reconfirmation, authentication-version binding, expired/restricted proof rejection, role conflict and cross-gym reuse cases.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.tenancy-integration.ts --disableConsoleIntercept` passed **22/22**. The integration harness reported cleanup of **8 disposable databases** and its container.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test` passed **12/12**, including the new member enrollment/first-login journey. The browser harness reported cleanup of **7 disposable databases**, its container and manifest. Generated screenshots are routed to ignored `apps/web/test-results/`.
- All database-backed checks used guarded disposable databases; no existing local GymOS database was used.

## Remaining acceptance work

- Credential delivery-loss/reissue recovery and forced-change journey are not yet proven for every retry/replay or delivery failure state. Fault coverage currently proves recovery only after the tenant receipt and before Master activation; it does not cover every earlier/later checkpoint or owner-revocation/concurrent-change race.
- Full digest/idempotency and durable-recovery matrices, all task-specific role/privacy/foreign-ID cases, and complete two-gym failure-path acceptance remain outstanding. Task 031 remains In Progress; no owner acceptance is recorded.
- Full task 031 acceptance requires these items and review of the final committed revision; no completion is claimed.
