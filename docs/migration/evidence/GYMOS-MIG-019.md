# GYMOS-MIG-019 evidence

Date: 25 October 2026  
Base revision: `6f3358c` (changes remain uncommitted in the working tree)  
Status: Completed for role-aware root resolution, gym selection, and canonical protected route entry. Shared role dashboard chrome remains task 013.

## Implemented

- Replaced the public marketing root with server-side session resolution: signed-out users go to `/login`; platform admins to `/admin`; no-access identities to `/no-access`; one-gym identities to their canonical role route; multi-gym identities to `/gyms/select`.
- Login routes zero, one, and multiple active gym grants without silently choosing the first gym. Forced password changes retain the `/change-password` path.
- Added a no-store authenticated `GET /auth/session` projection. It validates token signature/expiry, authVersion and credential expiry, then returns only global role, forced-change state and active gym ID/slug/name/role. It returns no bearer token or tenant database detail.
- Added an authenticated gym chooser, explicit no-access page, and `/gyms/{slug}/owner|trainer|member` routes. Role entry validates current Master access. The bare gym route resolves current role and keeps the owner member screen available as a legacy entry.
- Member/trainer canonical entries do not request the owner-only member roster. The roster fetch is performed only after the API confirms OWNER access.

## Verification

| Command | Result |
| --- | --- |
| `pnpm build:workspace` | Exit 0; contracts, API, web and workspace packages built |
| `pnpm typecheck:workspace` | Exit 0 |
| `pnpm lint:workspace` | Exit 0 |
| `pnpm --dir apps/api exec vitest run src/auth-token.spec.ts src/identity/email.spec.ts --disableConsoleIntercept` | Exit 0; 10/10 unit tests passed |
| `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.identity.ts --disableConsoleIntercept` | Exit 0; 9/9 tests passed; four owned databases and container cleaned |
| `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.tenancy-integration.ts --disableConsoleIntercept` | Exit 0; 20/20 tests passed; eight owned databases and container cleaned |
| `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web test:e2e -- tests/two-gym.e2e.spec.ts` | Exit 0; 3/3 browser tests passed, including owner canonical route and responsive branding; six owned databases and container cleaned |
| `git diff --check` | Exit 0 |

## Notes and limits

- Initial Docker attempts were denied by the sandbox; final owned integration suites passed with approved local Docker access. See [shared run issues](../SEGMENT_RUN_ISSUES.md).
- Next.js cache-components required Suspense boundaries around cookie and parameter reads. The final production build passed.
- Trainer/member routes currently provide protected role landing placeholders because their feature screens are out of scope. Shared sidebar/header/bell/drawer chrome is task 013.
- DEC-11-dependent session renewal, final cookie deployment policy, logout revocation and CSRF treatment remain task 020.
- Multi-gym chooser options and each destination use current API access. Full stale UI/cache clearing on context switch belongs to task 013.
