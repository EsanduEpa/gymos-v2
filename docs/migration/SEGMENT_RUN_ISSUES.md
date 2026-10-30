# Migration segment run issues

> **Final status — 30 October 2026:** Segment 01 is COMPLETED (23/23); overall 27/88 tasks completed. All 11 hosted checks passed at 9f1849a: [verified run](https://github.com/EsanduEpa/gymos-v2/actions/runs/41010929511). Decisions are owner-reviewed; external credential remediation is owner-attested with local cleanup/scanning verified. Historical checkpoints below are retained as history.

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
| Segment 03 execution checkpoint requires approved DEC-03. | Segment instructions require stopping before implementation; support scope, expiry, permitted read fields and lifecycle are not settled. | [DEC-03](decisions/DEC-03.md) is now a concrete proposal with task evidence; project-owner approval is required before implementation resumes. | Awaiting approval |
| GYMOS-MIG-021 requires provisioning currency and timezone while DEC-01 and DEC-06 are unresolved. | The required provisioning fields/defaults cannot be implemented without approved product policy. | [DEC-01](decisions/DEC-01.md) and [DEC-06](decisions/DEC-06.md) are now concrete proposals; approve or revise them, then re-evaluate task 021 sequencing. | Awaiting approval |

Evidence: [Segment 03 execution record](segments/03_PLATFORM_ADMIN_AND_TENANT_LIFECYCLE.md), [decision register](MIGRATION_DECISIONS.md), [GYMOS-MIG-021 specification](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-021). No Segment 03 implementation tasks were run; all six remain Not Started.

## Segment 04 — 2026-10-26

| Issue | Impact | Resolution / next action | Status |
| --- | --- | --- | --- |
| Segment 04 depends on Segment 03, which remains blocked before implementation by DEC-03. GYMOS-MIG-027 also depends on GYMOS-MIG-023 and decision task 077, none completed; 013 is also not completed. | No Segment 04 task has its required implementation dependencies. GYMOS-MIG-015 additionally depends on GYMOS-MIG-024 and 027. | Resume after Segment 03 and the listed prerequisites are completed with evidence. No application implementation was started. | Open |
| Segment 04 requires approved DEC-01/06/07/08; GYMOS-MIG-027 specifically requires 077/082/083 and forbids configuration fields before approval. | Ownership, currency precision/set, date/time boundaries, settlement/pay policy and cross-plane profile recovery are not yet approved. | Concrete proposals now exist for [DEC-01](decisions/DEC-01.md), [DEC-06](decisions/DEC-06.md), [DEC-07](decisions/DEC-07.md) and [DEC-08](decisions/DEC-08.md). Project-owner approval or revisions are required. | Awaiting approval |

Evidence: [Segment 04 execution record](segments/04_GYM_CONFIGURATION_AND_MEMBERSHIP_RULES.md), [decision register](MIGRATION_DECISIONS.md), [Segment 03 run issues](SEGMENT_RUN_ISSUES.md#segment-03--2026-10-26). No Segment 04 implementation tasks were run; 015 and 027–030 remain Not Started.

## Segment 01 — 2026-10-30 continuation

| Issue | Impact | Resolution / next action | Status |
|---|---|---|---|
| GYMOS-MIG-085 lacked a concrete DEC-09 record for coaching privacy, metric definitions, export limits and freshness behavior. | Coaching, analytics, export and selected-gym refresh implementation cannot safely choose relationship states, numeric bounds, day mapping, scope or caps by inference. | Prepared [DEC-09](decisions/DEC-09.md) and [task evidence](evidence/GYMOS-MIG-085.md) with explicit proposed defaults and expected tests. Project owner and Coaching/Privacy, Finance, Frontend reviewers must approve or revise before affected feature work. | Awaiting approval |
| Segment 01 status summaries predated completed identity/authentication tasks 016–019 and the new DEC-09 proposal. | Segment totals and handoff did not match current task evidence. | Updated segment progress to 19/88 completed overall (15 in Segment 01, 4 in Segment 02); kept GYMOS-MIG-085 Blocked because proposal preparation is not approval. | Resynchronized |

No application code, database, hosted workflow or V1 file was changed in this continuation. Task 008 remains in progress because there is no configured Git remote/hosted run and online lockfile audit could not be verified. Task 010 remains blocked pending credential-owner/provider containment and access/reuse review evidence.
