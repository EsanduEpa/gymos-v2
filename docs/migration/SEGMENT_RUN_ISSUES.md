# Migration segment run issues

Use this shared log for issues discovered while executing migration segment files. Add one dated section per segment run. Record symptoms, impact, resolution or next action, and evidence links. Keep credentials, customer data, and other secrets out of this file.

## Entry template

### Segment NN — YYYY-MM-DD

| Issue | Impact | Resolution / next action | Status |
| --- | --- | --- | --- |
| Describe what happened without including secret values. | Which checks or decisions are affected. | Fix, retry, or owner needed. | Resolved / Open / External |

Evidence: link to segment evidence and any relevant task IDs.

## Segment 01 — 2026-10-25

| Issue | Impact | Resolution / next action | Status |
| --- | --- | --- | --- |
| No Git remote is configured in this checkout. | Cannot create a PR or run hosted GitHub checks; secret scanning and dependency review are unverified. GYMOS-MIG-008 cannot be closed. | Configure/connect the repository remote, open a PR, and record the hosted run URL and result in GYMOS-MIG-008 evidence. | Open |
| `pnpm audit --audit-level high` could not resolve `registry.npmjs.org` in the sandbox. An escalated retry was rejected by automatic approval review because it would transmit dependency metadata to the npm audit endpoint. | Current lockfile vulnerability status was not verified during this segment run. | Run the audit from an approved networked environment or use an authorized internal audit route, then update GYMOS-MIG-008 evidence. Do not treat the earlier audit result from a different revision as current verification. | Open |
| Owned database, browser, and recovery tests initially could not access the local Docker socket in the sandbox. | First attempts failed before the integration checks could run. | Reran the explicitly owned disposable database suites with approved Docker access; all passed and reported cleanup of their owned containers/databases. | Resolved |
| The first browser run failed before the test body due to the Docker socket denial and created local Playwright failure artifacts. The passing rerun also rewrote several GYMOS-MIG-011 visual PNG evidence files. | Temporary failure artifacts and unrelated evidence diffs could have polluted the working tree. | Passing rerun completed owned-resource cleanup. Restored the nine changed GYMOS-MIG-011 PNGs from `HEAD`; only intentional migration evidence/log edits remain. | Resolved |

Evidence: [GYMOS-MIG-008 evidence](evidence/GYMOS-MIG-008.md), [Segment 01 execution record](segments/01_PLATFORM_FOUNDATION_AND_DECISION_GATES.md). Related task: GYMOS-MIG-008. GYMOS-MIG-010 remains externally blocked on provider-owner credential containment, as already recorded in the segment task evidence; it was not caused by this run.

## Segment 02 — 2026-10-25

| Issue | Impact | Resolution / next action | Status |
| --- | --- | --- | --- |
| Owned API and browser integration tests initially could not access the local Docker socket. | Migration-backed checks failed before test setup; browser tests also require `GYMOS_TEST_ALLOW_DOCKER=1`. | Reran with explicit owned-test flag and approved Docker access. Final API suite passed 9/9 and browser suite passed 3/3; disposable databases and containers reported cleanup. | Resolved |
| Initial Master migration-backed credential test attempted to create a gym using a tenant database already assigned to another gym. | The new integration scenario stopped at fixture setup before exercising credential behavior. | Reused an active gym from the disposable fixture; final identity integration suite passed. | Resolved |
| Workspace typecheck initially could not resolve `@gymos/contracts/credentials`; the API package did not declare the contracts workspace dependency. A lockfile-only install also could not reach `registry.npmjs.org`. | Credential controller types could not compile during the first check. | Declared the workspace dependency in `apps/api/package.json` and `pnpm-lock.yaml`; local typecheck and workspace build passed using existing dependencies. Registry access is not required for the local run. | Resolved |
| Next.js prerender failed on `/change-password` because the route read cookies outside a Suspense boundary. Nest runtime then failed to inject `CredentialService` because its Prisma type-only constructor argument had no runtime token. | The production web build and API startup initially failed. | Added the route Suspense boundary and injected the existing `DatabaseService`. Final workspace build and browser suite passed. | Resolved |
| The password-change success action originally deleted the cookie before rendering its success panel, causing the server route to redirect to login immediately. | The V1-style “password updated” confirmation could not be shown after a successful change. | Moved cookie deletion to the explicit “Continue to sign in” action; browser coverage confirms success, stale-token rejection and cookie removal. | Resolved |
| A Playwright label query was ambiguous because helper text joined the accessible name; a later `role=status` query also matched two status elements. | One browser run timed out and a subsequent assertion failed despite the password update succeeding. | Targeted the input by stable ID, the success feedback by class, and awaited the sign-in redirect. Final 3/3 browser suite passed. | Resolved |
| E2E visual checks rewrote nine tracked GYMOS-MIG-011 PNGs. `git restore` could not write `.git/index.lock` because `.git` is read-only in this workspace. | Test-generated visual diffs were unrelated to Segment 02. | Restored the nine files directly from `HEAD` with `git show`; the index was not modified. | Resolved |
| First task 018 tenancy run had a stale expected member count after adding an authorization fixture; a follow-up assertion also treated a synchronous `ForbiddenException` as a rejected promise. | Those integration assertions failed after the actor guard itself passed its checks. | Updated the fixture count and assertion shape; final tenancy integration suite passed 20/20. | Resolved |
| The owner-create revocation test initially supplied an incomplete synthetic request context without the identity/access versions produced by the guard. | The current-access recheck correctly failed closed, but the test observed a 503 from its invalid fixture instead of exercising version drift. | Seeded the verified server-side context, revoked access after guard evaluation, and verified the create was denied with no tenant row added. | Resolved |
| The first Segment 02 role-aware navigation build hit Next.js cache-components restrictions on `dynamic = 'force-dynamic'`, then reported uncached cookie/param reads outside Suspense on protected routes. | Workspace production build failed before route verification. | Removed unsupported route config, added Suspense boundaries and moved private owner screen implementation into a shared component. Final `pnpm build:workspace` passed. | Resolved |
| Initial task 019 browser run found that `/gyms/:slug/owner` validated the owner session but returned only a placeholder. | Existing owner member dashboard was not rendered on the canonical route; two browser assertions failed. | Reused the existing owner dashboard component behind the role-verified route. Final E2E rerun passed 3/3, including owner flow and responsive branding. | Resolved |
| Docker socket was denied for first task 019 E2E and API integration attempts; one API command also initially omitted required `GYMOS_TEST_ALLOW_DOCKER=1`. | The first runs stopped before useful integration coverage. | Re-ran with explicit opt-in and approved local Docker access. Final browser 3/3, identity 9/9, tenancy 20/20; owned disposable DBs/container reported cleanup. | Resolved |

Evidence: [GYMOS-MIG-016](evidence/GYMOS-MIG-016.md), [GYMOS-MIG-017](evidence/GYMOS-MIG-017.md), [GYMOS-MIG-018](evidence/GYMOS-MIG-018.md), [GYMOS-MIG-019](evidence/GYMOS-MIG-019.md), [Segment 02 execution record](segments/02_IDENTITY_AUTH_AND_APPLICATION_SHELL.md). Remaining tasks: 013 and 020; DEC-11 remains the gate for final session/logout policy in task 020.

## Segment 03 — 2026-10-26

| Issue | Impact | Resolution / next action | Status |
| --- | --- | --- | --- |
| Segment 03 execution checkpoint requires approved DEC-03, but `MIGRATION_DECISIONS.md` still lists DEC-03 as open/resolution task GYMOS-MIG-079 and no `decisions/DEC-03.md` approval record exists. | Segment instructions require stopping before implementation; support scope, expiry, permitted read fields and lifecycle are not settled. | Obtain and record the DEC-03 decision through GYMOS-MIG-079, then resume Segment 03. No task implementation was started in this run. | Open |
| GYMOS-MIG-021 requires provisioning currency and timezone, while DEC-01 (configuration ownership) and DEC-06 (supported currency rules) remain unresolved in the decision register. | Even after DEC-03, the required provisioning fields/defaults cannot be implemented without inventing product policy. | Resolve the required DEC-01/06 inputs or explicitly narrow/sequence GYMOS-MIG-021 through approved change control before claiming it complete. | Open |

Evidence: [Segment 03 execution record](segments/03_PLATFORM_ADMIN_AND_TENANT_LIFECYCLE.md), [decision register](MIGRATION_DECISIONS.md), [GYMOS-MIG-021 specification](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-021). No Segment 03 implementation tasks were run; all six remain Not Started.
