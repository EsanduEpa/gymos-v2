# GYMOS-MIG-017 evidence

Date: 25 October 2026  
Base revision: `6f3358c` (changes remain uncommitted in the working tree)  
Status: Completed for the approved DEC-02 temporary credential and password-change behavior. Initial credentials are exposed only through the owner-only delivery endpoint after the enrollment operation is COMPLETE; enrollment creation screens and handlers remain in their owning later tasks.

## Implemented

- Added Master `CredentialDelivery` metadata linked uniquely to its operation. The additive migration enforces immutable operation/identity/issuer/gym binding, monotonic delivery/auth versions, expiry ordering, and one-time acknowledgement. It stores no plaintext credential.
- Added an owner-only initial issue endpoint. The service derives the subject from the completed REGISTER_MEMBER/REGISTER_TRAINER operation, checks the current active owner link and new-identity conditions, creates a cryptographically random temporary credential, stores only its Argon2id hash, sets the 24-hour expiry and forced-change state, and returns the secret only on the first response.
- Added owner-only reissue and acknowledgement endpoints. Reissue requires an unacknowledged new identity tied to the same operation, enforces expected delivery version and reason, allows any current active gym owner to recover that same operation, rotates the credential and auth version, records a redacted audit event, and returns no secret on idempotent replay. Reused or multi-gym identities are denied.
- Added strict shared contracts for password change, issuance, reissue and acknowledgement. Password rules require 10–200 characters, at least one non-letter, no edge whitespace, a different new password, and matching confirmation.
- Added `/change-password` with current/new/confirm inputs. Password change verifies the current secret, rotates the hash and auth version atomically, clears forced-change/expiry, and audits only safe version metadata. The web flow displays success, then clears the stale cookie when the user continues to sign-in.

## Verification

All commands ran from the repository root with Node `v24.22.0` and pnpm `9.15.0`.

| Command | Result |
| --- | --- |
| `pnpm exec prisma format --config prisma.master.config.ts` | Exit 0 |
| `pnpm exec prisma generate --config prisma.master.config.ts` | Exit 0 |
| `pnpm build:workspace` | Exit 0; contracts, API, web and workspace packages built |
| `pnpm --dir packages/contracts test` | Exit 0; 18/18 contract tests passed |
| `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.identity.ts --disableConsoleIntercept` | Exit 0; 9/9 owned identity integration tests passed, including migration application, one-time issue/replay, lost-handoff rotation, old-secret rejection, expiry reissue, wrong reason, acknowledgement, second active owner recovery, reused/cross-gym denial, password change and safe audit/operation contents. Four owned databases and the test container were cleaned. |
| `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web test:e2e` | Exit 0; 3/3 browser tests passed, including wrong-current-password rejection, forced change, cookie revocation, new-password login and two-gym isolation. Six owned databases and test containers were cleaned. |
| `pnpm typecheck:workspace` | Exit 0 |
| `pnpm lint:workspace` | Exit 0 |
| `pnpm --dir apps/api build` | Exit 0 |
| `git diff --check` | Exit 0 |

## Notes and limits

- Docker socket access was denied in the sandbox on the first identity/browser attempts. The explicitly owned disposable database runs passed after approved Docker access and reported cleanup.
- Initial web build found that the cookie check needed a Suspense boundary. The runtime Nest launch found that `CredentialService` needed the injectable `DatabaseService` token. Both were corrected and the final workspace build passed.
- The browser test was updated to use a stable input selector and to expect the completed password change state. Its final full run passed.
- Workspace dependency resolution could not contact the npm registry while the API's new `@gymos/contracts` dependency was being added. The workspace dependency and lockfile entry were recorded locally; no package download was needed.
- Enrollment create handlers and their owner-facing registration screens are outside Segment 02. The issue/reissue API is ready for those later tasks to call after their operation commits.
- Final cookie domain/secure deployment policy, refresh, logout revocation and CSRF handling remain DEC-11 / GYMOS-MIG-020.
