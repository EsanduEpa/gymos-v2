# GYMOS-MIG-031 — partial implementation evidence

Status: **In Progress; not Verified or Completed.** Evidence captured on branch `codex/segment-05-member-enrollment`, based on `origin/main` at `97b16a7`; this working revision had not yet been committed when recorded.

## Implemented and locally checked

- Added strict member enrollment contracts and API client; owner enrollment form; a Master operation → tenant member/profile/term receipt → Master activation flow; exact plan price and half-open date snapshots; basic-contact upgrade; one-time credential handoff for newly created identities; idempotent replay; owner-only profile fields; completed-operation roster visibility; additive tenant profile schema migration.
- The flow does not write a payment/revenue row. Health notes are omitted from Master intent and receipt intent and represented in the idempotency digest by a keyed fingerprint.
- The API and web TypeScript checks passed. `pnpm --dir packages/contracts build` passed. `pnpm --dir packages/contracts test` passed **26/26**. `pnpm --dir packages/api-client build` passed.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.tenancy-integration.ts --disableConsoleIntercept` passed **21/21**. The integration harness reported cleanup of **8 disposable databases** and its container. No existing local GymOS database was used.

## Remaining acceptance work

- Explicit consent and secure reuse of an existing identity are not implemented. Existing identities are currently rejected safely; this does not satisfy the required reuse workflow.
- Forced-change login and access journey, recovery after every Master/tenant checkpoint, credential delivery-loss cases, duplicate digest/idempotency conflict matrix, owner revocation races, and broader two-gym isolation evidence remain outstanding.
- Full task 031 acceptance requires these items and review of the final committed revision; no completion is claimed.
