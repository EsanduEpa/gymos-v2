# GYMOS-MIG-016 evidence

Date: 25 October 2026
Base revision: `6f3358c` (changes remain uncommitted in the working tree)
Status: Completed for the approved DEC-02 login/session policy and backend forced-change gate. The `/change-password` destination is intentionally completed by dependent task GYMOS-MIG-017; final cookie/logout decisions remain with DEC-11 and GYMOS-MIG-020.

## Implemented

- Login still uses strict email/password validation, canonical email, Argon2id verification, five attempts per minute, and a 15-minute JWT. Unknown email addresses perform Argon2 work before the same generic invalid-credentials response.
- Access tokens now carry `authVersion`; verification rejects missing/invalid versions, wrong issuer/audience/algorithm, expired tokens and tampering.
- Login rejects expired temporary credentials and temporary credentials missing their required expiry. Its safe response includes `mustChangePassword` and only the public fields for current active gym access: gym ID, slug, name and role.
- Super Admin and gym guards reread the current Master identity/version and database time. They reject revoked token versions, expired credentials and forced-change identities before protected handlers run. Gym access is resolved from current Master state for each request; non-OWNER gym roles remain denied by the current guard until task 018 establishes reciprocal actor authorization.
- The web server action validates the login response with the shared E01 contract, retains the token only in an HttpOnly cookie, routes forced-change sessions to `/change-password`, and maps service failures to an unavailable message.
- Added unit, owned PostgreSQL integration and browser assertions for token claims, expiry, stale versions, forced-change denials, active role projection and HttpOnly transport.

## Verification

All commands ran from the repository root with Node `v24.22.0` and pnpm `9.15.0`.

| Command | Result |
| --- | --- |
| `pnpm build:workspace` | Exit 0; API, web and workspace packages built |
| `pnpm check:workspace` | Exit 0; 5 workspace packages validated |
| `pnpm lint:workspace` | Exit 0 |
| `pnpm test:unit` | Exit 0; contracts 17, API client 12, theme tokens 5, API source 19, pool lifecycle 23 passed |
| `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.identity.ts --disableConsoleIntercept` | Exit 0; 8/8 owned Master/two-tenant identity integration tests passed; 4 owned databases and container cleaned |
| `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web test:e2e` | Exit 0; 3/3 browser tests passed, including forced-change redirect, HttpOnly cookie, and API denial; 6 owned databases and container cleaned |
| `git diff --check` | Exit 0 |

## Notes and limits

- The browser harness starts production `dist`/`.next` output. Its first run used stale builds; rebuilding the workspace fixed the mismatch. An intermediate browser attempt also hit the expected five-attempt login throttle because it made a redundant direct login; the final browser run passed with one fewer login request.
- Docker access was denied inside the sandbox on initial owned integration/browser attempts. The same tests passed after approved access to their explicitly owned disposable containers.
- The forced-change browser assertion verifies the redirect, HttpOnly cookie and API denial. The route's usable password-change form and credential rotation are task 017. Provider cookie details and revoking all sessions on logout remain task 020 / DEC-11.
- No production/shared database, V1 database, V1 source or exposed V1 credential was accessed.
