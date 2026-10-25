# GYMOS-MIG-018 evidence

Date: 25 October 2026  
Base revision: `6f3358c` (changes remain uncommitted in the working tree)  
Status: Completed for the shared current-access, tenant-binding and operational-actor authorization boundary.

## Implemented

- Extended `GymAccessGuard` to reread current identity/auth version, credential expiry, active gym and active gym access on every protected request. It exposes the current access version and verified actor context only to server-side controllers.
- Owner access requires a current active owner link with no tenant actor tuple. There is no SUPER_ADMIN owner bypass.
- Member/trainer access now requires the expected completed registration operation bound to the same identity, gym and tenant actor; a committed tenant receipt for that operation; a verified tenant schema/binding; and a reciprocal tenant actor row whose kind, identity, registration operation, completion state and status match Master access.
- Master-pending plus tenant-complete registrations, mismatched actor tuples, missing receipts, foreign gym slugs, stale auth versions and unverifiable tenants fail closed. Master or tenant availability failures return sanitized 503 responses.
- Kept the existing all-member contact/history list owner-only. Trainers have no relationship-filtered client endpoint yet, so the shared guard does not grant access to the unfiltered list.
- Added a current identity/access/gym version recheck inside the existing owner member-create tenant transaction. A revoked or version-changed owner is rejected before the tenant row is created.

## Verification

All commands ran from the repository root with Node `v24.22.0` and pnpm `9.15.0`.

| Command | Result |
| --- | --- |
| `pnpm build:workspace` | Exit 0; API, web and workspace packages built |
| `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.tenancy-integration.ts --disableConsoleIntercept` | Exit 0; 20/20 two-tenant schema/authorization tests passed. Covers complete reciprocal actor, pending Master + complete tenant denial, actor mismatch, foreign gym, SUPER_ADMIN denial, owner-only member list and revocation before tenant create with unchanged row count. Eight owned databases and container cleaned. |
| `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.identity.ts --disableConsoleIntercept` | Exit 0; 9/9 identity integration tests passed, including current identity/auth-version checks. Four owned databases and container cleaned. |
| `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web test:e2e` | Exit 0; 3/3 browser tests passed, including two-gym isolation and trainer denial for the unfiltered member list. Six owned databases and containers cleaned. |
| `pnpm typecheck:workspace` | Exit 0 |
| `pnpm lint:workspace` | Exit 0 |
| `git diff --check` | Exit 0 |

## Notes and limits

- Docker socket access was denied on the initial sandbox attempt; final isolated database/browser suites passed with approved local Docker access and reported cleanup.
- The current product has no trainer-client relationship or foreign-resource detail endpoints. This task keeps the global member list owner-only; relationship-scoped trainer endpoints and safe 404 resource policies must be applied by their owning feature tasks when those routes are introduced.
- No authorization cache is used. Each request resolves current Master status/access and rechecks the tenant schema/actor as required. The remaining cross-database commit race follows DEC-04's documented reconciliation boundary.
