# Predeployment review — 7 November 2026

## Follow-up implementation

Session enforcement, refresh-only logout, automated provisioning, the Trainer profile history contract and post-rollout scheduled work have follow-up fixes. See [fix evidence](2026-11-07-fix-evidence.md) for current results and remaining limits. The findings below describe the reviewed pre-fix snapshot; public signup assurance and other separately identified hardening work remain open.

## Verdict

Hold public/client-data deployment. The application has substantial working functionality, but session validation, identity assurance, operational provisioning and unresolved browser journeys prevent readiness sign-off. A restricted synthetic demonstration needs the affected journeys repaired and rehearsed first.

This is a source review and selected local checks, not a penetration-test certification. Read current AGENTS.md and manual-testing instructions. Development and testing credentials/data were not read or changed. Existing untracked manual-review documents were preserved. Prior findings were rechecked against current code rather than assumed fixed.

## Findings, in priority order

### 1. Protected account routes can skip revocation for legacy tokens — high priority

`apps/api/src/identity/auth-session.guard.ts:13–18` allows a signed token without `sid` through without calling `assertActive`. `apps/api/src/credentials.controller.ts:34–37` reads security history using only the parsed identity, and `apps/api/src/identity/credential.service.ts:559` does not recheck authVersion. Current login uses durable sessions, but possession of a previously valid session-less signed token can retain access to this account route after revocation until its expiry. Tenant/admin guards have additional checks; this is not a universal tenant-access bypass.

The adjacent token verifier (`apps/api/src/auth-token.ts:20`) does not require `exp` or `iat`. A fresh in-memory probe using a synthetic signing key confirmed a token with no expiry and no session was accepted, and the guard made zero revocation calls. No real credentials or tokens were used. This is not a signature-forgery exploit; it matters for legacy/alternate issuers and enforcement consistency.

Fix: require session-bound tokens and mandatory bounded timing claims on protected routes, explicitly identify public routes, and test revoked/expired/missing-claim tokens across account endpoints. If legacy compatibility is necessary, use a fixed cutoff and authoritative authVersion checks.

### 2. Public application claims an email without proving ownership — high priority for public signup

`apps/api/src/member-applications.service.ts:20–31` creates a global identity directly from submitted email/password, without mailbox verification. Someone can reserve another person's unused address. Existing identities are not overwritten and Owner approval remains necessary for gym access; do not describe this as takeover of an existing account.

Fix: pending signup with single-use, expiring mailbox verification before treating that address as verified. Provide recovery from abandoned reservations. For a restricted demo, use synthetic accounts and restrict external access until this is resolved.

### 3. Authentication throttling groups users behind the web server — medium availability/security priority

`apps/web/src/app/actions.ts:42–44` sends login requests from the web server with only content-type. `apps/api/src/auth.controller.ts:37` uses a five-per-minute throttle; `apps/api/src/app.module.ts:70` uses default throttler configuration. No shared storage or trusted per-client attribution is configured there. In the expected deployment, multiple visitors share the API-visible web-server IP, so one user's failures can block other users. Process-local counters also do not coordinate across replicas. This is a source-based deployment inference, not a newly executed load test.

Fix: trusted client attribution plus account/client limits and shared counters where replicas exist. Do not trust arbitrary forwarded headers or simply remove the limit. Rehearse multiple role logins through the deployed proxy.

### 4. Gym provisioning lacks a deployed execution path — deployment blocker

`ProvisioningWorker.runOnce` exists, but no persistent provisioning dispatcher is registered in `apps/api/src/app.module.ts`. The available `apps/api/scripts/provision-gym.mjs` uses an owned-local-run gate. A UI reservation alone does not execute provisioning. Current Chrome evidence records a new gym remaining PENDING/PROVISIONING.

Implement and supervise a deployment-compatible worker or controlled operator runner with the existing leases, ownership and migration checks. Verify Create gym through owner credential handoff on the target host. Do not bypass ownership checks or manually mark a gym active.

### 5. Browser behavior has unresolved functional/security acceptance failures

Current `docs/CHROME-MANUAL-ISSUES.md` reports:

- E01: Member logout clears local cookies but server revocation is unconfirmed.
- E18: Trainer client profile fails to load, blocking coaching-plan creation/assignment acceptance.
- E05: Unexpected expired session after support exit; suspension later worked after signing in again, but the original expiry remains unexplained.
- E04: Pending provisioning as described above.
- Suspended Owner receives misleading member application guidance.

These are existing 7 November browser observations, not newly reproduced in this review. Investigate actual API responses and current session/account scope, then rerun on port 3002. Recent evidence does show successful Owner booking, Member request/withdrawal/Trainer acceptance and pack issuance; the earlier 6 November booking/request failures must not be presented as freshly confirmed current defects.

### 6. Deployment hardening and release evidence are incomplete

- `apps/web/next.config.ts` and API startup do not define CSP/framing protections. An upstream proxy could provide them, but no deployed headers were inspected. Configure and verify actual HTTPS response headers.
- The JWT verifier only checks minimum secret length; it does not reject known example values. Validate production secrets at startup without logging them.
- Privileged authentication/recovery remains password-based; no MFA/passkey flow was found in the reviewed source. Add privileged MFA and step-up controls before broad real-data operation, or explicitly document compensating access restrictions for the demo.
- Per-gym physical databases use one runtime connection template. Isolation guards are valuable, but the runtime credential's actual grants determine the impact of API compromise. Separate serving/provisioning privileges and verify grants and remote TLS on the target server.
- PT scheduled work is an in-process persistent runner. A sleeping/request-only host does not fulfill it. Verify enabled state, recent successful sweeps, restart recovery and overdue-job latency on the deployed host.
- The tracked compose file covers the database, not a complete production rollout. Add reproducible app builds/startup, HTTPS/origin configuration, health checks, restart policy, backup/restore procedure and migration rollout instructions before deploying.
- CI browser coverage is a selected subset, not every `*.e2e.spec.ts`. A green CI result alone does not establish all client demo journeys work.

## Architecture assessment

No rewrite is justified by this review. Tenant binding, bounded connection pools, strict contracts, durable operations, command receipts and append-only credit/earning adjustments are useful foundations. The deployment must preserve their transaction/lease assumptions and tenant ownership evidence. The primary gaps are authentication consistency, scheduled operational execution, production configuration and end-to-end acceptance.

## Verification

Fresh commands and completion results are appended below. Initial unit and identity attempts hit permission restrictions on local listening sockets and Docker; these are environmental failures, not passing tests or proven product regressions. Permitted retries use owned disposable resources only.

Dependency advisories were not uploaded/queried: the previous security review records an explicit preference not to transmit package metadata. No current clean-dependency claim is made. No full history secret scan, full browser suite, external penetration test, production restore rehearsal or deployed load test was performed.

Recommended order: fix token/session enforcement and the reported logout issue; make provisioning operational; resolve trainer profile/support-session failures; fix signup assurance and throttling; complete deployment configuration; run full isolated regression and a port-3002 rehearsal; then validate the actual HTTPS deployment using synthetic data.

Guidance: [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) and [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet).

### Completed fresh checks (revision `7deb960`)

- `pnpm check:workspace`: passed, five-package graph.
- `pnpm typecheck:workspace`: passed.
- `pnpm lint:workspace`: passed; four unused-code/import warnings.
- `pnpm test:unit`: permitted retry passed 180 tests (67 contracts, 14 client, 5 theme, 69 API, 25 pool tests).
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.identity.ts --disableConsoleIntercept`: permitted retry passed 20 tests; seven owned databases and container cleaned up.
- `GYMOS_NEXT_DIST_DIR=.next-review pnpm build:workspace`: passed, including API and production web build. Separate review output avoided replacing the running test web build. Removed only this generated output and its automatically inserted TypeScript include entries after completion.
- Synthetic token probe: missing `exp`/`sid` accepted; global guard accepted with zero calls to the rejecting session checker. This characterizes the defect, not a passing security requirement.
- `git diff --check`: passed after review-build cleanup. No product source changes made.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:pt:owned`: 55 passed, 1 failed across 13 files. Failure was a Prisma transaction expiry during `prepare()`'s initial booking (`session-exceptions.integration.test.ts:92`): 5,191 ms against the 5,000 ms limit. The late-charge/reschedule assertions had not run. Owned cleanup was reported for all 13 fixtures, including upgrade and restore coverage.
- Focused rerun: `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.pt.ts test/sessions/session-exceptions.integration.test.ts -t 'cannot evade a late member charge' --disableConsoleIntercept`: passed 1, skipped 8; six owned databases/container cleaned up. Local contention is a plausible explanation, not proven. This does not convert the original full run to a pass; recheck transaction latency and run a complete clean release suite on the target capacity.
- Both database runs emitted a pg warning about overlapping `client.query` calls, deprecated for pg@9. This is a future compatibility follow-up, not the demonstrated cause of the timeout.
