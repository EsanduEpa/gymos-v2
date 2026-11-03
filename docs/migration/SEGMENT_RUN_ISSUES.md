# Migration segment run issues

> **Segment 02 verification — 30 October 2026 at `367bdf8`:** Segment 01 remains completed (23/23), Segment 02 completed (6/6), overall 29/88 tasks completed. All 11 hosted checks passed in [run 41042328353](https://github.com/EsanduEpa/gymos-v2/actions/runs/41042328353). Historical entries retain their original checkpoint context; [current handoff](SEGMENT_02_HANDOFF.md).

Use this shared log for issues discovered while executing migration segment files. Add one dated section per segment run. Record symptoms, impact, resolution or next action, and evidence links. Keep credentials, customer data, and other secrets out of this file.

## Segment 06 — 2026-11-03

| Issue | Impact | Resolution / next action | Status |
| --- | --- | --- | --- |
| Creating a task branch and fetching remote state initially failed because `.git` was read-only in the sandbox. | Branch and remote status were initially unavailable. | With approved elevated Git access, fetched `origin/main`, created `codex/segment-06-trainer-enrollment`, pushed it, and merged PR #7 at `8c01842` after 11/11 hosted checks. | Resolved |
| Guarded disposable tenancy and Chromium harnesses initially failed before setup because Docker API socket access was denied. | Runtime checks could not initially re-establish current-checkout evidence. | Reran with approved local Docker access: tenancy 31/31, identity credential 13/13, Chromium 1/1; all owned databases, containers and browser manifest reported cleanup. | Resolved |
| New concurrency test initially relied on an OWNER fixture created by a different test; after isolation it exposed the expected lease conflict for the overlapping caller. | Standalone concurrency coverage was initially unreliable and clarified retry semantics. | Made the fixture self-contained; asserted one concurrent winner, safe rejected overlap, same-key retry recovery and exactly one persisted actor/receipt/audit/operation/access link. Focused test and full 31/31 tenancy file pass. | Resolved |
| Segment 06 prose/evidence named 040/043 as Task 036 dependency closure despite authoritative task spec and dependency table excluding them. | Could incorrectly block registration or pull downstream session work into 036. | Reconciled segment, evidence, tracker and coverage: 039 owns directory consumer verification, 041 owns booking eligibility; 040/043 remain later session/lifecycle prerequisites. | Resolved |
| Task 036 evidence and status tables still showed hosted checks and owner-directed browser acceptance as pending after PR #7 merged. | Could leave the accepted task incorrectly marked In Progress. | Recorded owner-directed visible Chrome acceptance, 11/11 hosted checks, merge commit `8c01842`, and Task 036 Completed. Segment 06 remains In Progress with six tasks outstanding. | Resolved |
| Segment 06 task 037 profile summaries have no session read model; task 039 request links have no request destination yet. | Marking either task complete would imply missing session/booking behavior is usable. | Implemented roster/profile/shift and safe directory slices; kept both In Progress. Task 037 needs Segment 07 session records; Task 039 needs Task 042's selected-gym request route. | Open |

Evidence: [GYMOS-MIG-036](evidence/GYMOS-MIG-036.md), [Segment 06](segments/06_TRAINER_MANAGEMENT_AND_COACHING.md), [coverage matrix](segments/MIGRATION_COVERAGE_MATRIX.md).

## Segment 07 — 2026-11-03

| Issue | Impact | Resolution / next action | Status |
| --- | --- | --- | --- |
| `.git/index` is not writable in the current workspace sandbox; no `.git/index.lock` exists. The index contents, branch and dirty tree were readable and preserved. | Git operations that need to update the index (including commit/staging) cannot run from this sandbox. Hosted checks are unavailable for the uncommitted working tree. | No lock was deleted and no commit/branch mutation was attempted. Continue with read-only Git inspection and keep changes in the existing branch; handle staging/commit from an environment with authorized `.git` write access when requested. | Open |
| Task 034 had no pack command or ledger-backed owner profile projection; an initial headed run also exposed stale built API output, and the member form initially reused its request key after success. | Pack issuance, accurate expired-unused balance, and a reusable owner workflow were unavailable; early browser checks could not verify same-revision behavior. | Added owner-only receipt/audit/ISSUE command, exact zero-price contract and form, derived available/held/consumed/expired projection, concurrent same-key replay, expired GET purity, and a fresh post-success key. Rebuilt artifacts; guarded pack integration 1/1, pack contracts, and final headed Chrome profile/pack group 2/2 passed. Task 034 remains In Progress for pack-specific injected rollback/conflicting-key checks and incomplete Task 040 dependency. See [034 evidence](evidence/GYMOS-MIG-034.md). | Partially resolved |
| Gym-time display used UTC for trainer session timestamps; a first correction combined Intl dateStyle/timeStyle with timeZoneName, which throws during server rendering. | Trainer profile failed to render, preventing Task 037 visible acceptance. | API exposes the configured gym IANA time zone; formatter now uses explicit date/time fields with zone label. Final headed Chrome group passed 2/2 and screenshot shows 9:30 AM GMT+5:30 for 04:00Z. CUA bridge exposed the existing GitHub window, so automated headed capture was reviewed but not recorded as owner-observed manual acceptance. See [037 evidence](evidence/GYMOS-MIG-037.md). | Resolved locally; hosted checks pending |
| Task 038 could not safely reuse the existing `CHANGE_ACCESS` gym suspension workflow for trainer deactivation; booking/acceptance also needed to serialize with trainer access changes. | Deactivation could expose partial state, fail to recover after interruption, or race an accepted/new session. | Added a trainer-specific typed Master lifecycle intent, owner status/recovery endpoints, tenant status receipt/audit and resumable per-session future cancellation/hold release; added a shared Master Gym/GymAccess row-lock fence and verified a deactivation-vs-active-fence barrier, interrupted recovery, retry, reactivation and cross-gym isolation in the guarded disposable integration suite. Booking/request fence consumers remain in progress. See [GYMOS-MIG-038 evidence](evidence/GYMOS-MIG-038.md). | Partially resolved |

Evidence: [GYMOS-MIG-040](evidence/GYMOS-MIG-040.md), [GYMOS-MIG-043](evidence/GYMOS-MIG-043.md), [Task 038 spec](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-038).

## Entry template

### Segment NN — YYYY-MM-DD

| Issue | Impact | Resolution / next action | Status |
| --- | --- | --- | --- |
| Describe what happened without including secret values. | Which checks or decisions are affected. | Fix, retry, or owner needed. | Resolved / Open / External |

Evidence: link to segment evidence and any relevant task IDs.

## Segment 01 — 2026-10-25 (historical checkpoint; superseded)

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

## Segment 03 — 2026-10-26 (historical checkpoint; decision gates since approved)

| Issue | Impact | Resolution / next action | Status |
| --- | --- | --- | --- |
| Segment 03 execution checkpoint requires approved DEC-03. | Segment instructions require stopping before implementation; support scope, expiry, permitted read fields and lifecycle are not settled. | [DEC-03](decisions/DEC-03.md) is now a concrete proposal with task evidence; project-owner approval is required before implementation resumes. | Awaiting approval |
| GYMOS-MIG-021 requires provisioning currency and timezone while DEC-01 and DEC-06 are unresolved. | The required provisioning fields/defaults cannot be implemented without approved product policy. | [DEC-01](decisions/DEC-01.md) and [DEC-06](decisions/DEC-06.md) are now concrete proposals; approve or revise them, then re-evaluate task 021 sequencing. | Awaiting approval |

Evidence: [Segment 03 execution record](segments/03_PLATFORM_ADMIN_AND_TENANT_LIFECYCLE.md), [decision register](MIGRATION_DECISIONS.md), [GYMOS-MIG-021 specification](MIGRATION_TASK_SPECS.md#task-id-gymos-mig-021). No Segment 03 implementation tasks were run; all six remain Not Started.

## Segment 04 — 2026-10-26 (historical checkpoint; decision gates since approved)

| Issue | Impact | Resolution / next action | Status |
| --- | --- | --- | --- |
| Segment 04 depends on Segment 03, which remains blocked before implementation by DEC-03. GYMOS-MIG-027 also depends on GYMOS-MIG-023 and decision task 077, none completed; 013 is also not completed. | No Segment 04 task has its required implementation dependencies. GYMOS-MIG-015 additionally depends on GYMOS-MIG-024 and 027. | Resume after Segment 03 and the listed prerequisites are completed with evidence. No application implementation was started. | Open |
| Segment 04 requires approved DEC-01/06/07/08; GYMOS-MIG-027 specifically requires 077/082/083 and forbids configuration fields before approval. | Ownership, currency precision/set, date/time boundaries, settlement/pay policy and cross-plane profile recovery are not yet approved. | Concrete proposals now exist for [DEC-01](decisions/DEC-01.md), [DEC-06](decisions/DEC-06.md), [DEC-07](decisions/DEC-07.md) and [DEC-08](decisions/DEC-08.md). Project-owner approval or revisions are required. | Awaiting approval |

Evidence: [Segment 04 execution record](segments/04_GYM_CONFIGURATION_AND_MEMBERSHIP_RULES.md), [decision register](MIGRATION_DECISIONS.md), [Segment 03 run issues](SEGMENT_RUN_ISSUES.md#segment-03--2026-10-26-historical-checkpoint-decision-gates-since-approved). No Segment 04 implementation tasks were run; 015 and 027–030 remain Not Started. Current blockers are upstream tasks 013 and Segment 03 implementation prerequisites, not the now-approved DEC-01/06/07/08 gates.

## Segment 01 — 2026-10-30 continuation (historical checkpoint; superseded)

| Issue | Impact | Resolution / next action | Status |
|---|---|---|---|
| GYMOS-MIG-085 lacked a concrete DEC-09 record for coaching privacy, metric definitions, export limits and freshness behavior. | Coaching, analytics, export and selected-gym refresh implementation cannot safely choose relationship states, numeric bounds, day mapping, scope or caps by inference. | Prepared [DEC-09](decisions/DEC-09.md) and [task evidence](evidence/GYMOS-MIG-085.md) with explicit proposed defaults and expected tests. Project owner and Coaching/Privacy, Finance, Frontend reviewers must approve or revise before affected feature work. | Awaiting approval |
| Segment 01 status summaries predated completed identity/authentication tasks 016–019 and the new DEC-09 proposal. | Segment totals and handoff did not match current task evidence. | Updated segment progress to 19/88 completed overall (15 in Segment 01, 4 in Segment 02); kept GYMOS-MIG-085 Blocked because proposal preparation is not approval. | Resynchronized |

No application code, database, hosted workflow or V1 file was changed in this historical continuation. The no-remote/no-hosted-run and pending-owner-evidence statements were superseded by the final reconciliation below.

## Segment 01 — 2026-10-30 final reconciliation

| Issue | Impact | Resolution / next action | Status |
|---|---|---|---|
| Historical run entries said no remote, hosted checks, or owner approval were available. | Those entries conflicted with current task/evidence records. | PR #1 is open and draft. Authenticated Chrome verified run 41011340034 at `49217dd`; all 11 checks passed. Owner-approved decisions and credential closure are in the linked records. Earlier dated entries remain historical. | Resolved |
| Evidence used different status language for credential containment and Segment 01 completion. | Risk R18 and task 010 could be read as still open or as independently provider-verified. | Tracker, evidence and risk register now record owner-attested provider remediation plus independent local checks, retaining uncertainty about provider logs and historical access. No provider was contacted and V1 was not run or edited. | Resolved |
| Run 41013007595 failed the browser isolation test because a streamed unauthenticated redirect to `/login` overlapped the next login navigation. | Hosted browser verification was incomplete at that documentation revision. | Added an explicit URL wait after navigating to `/`; the focused owned browser test passed locally, and authenticated Chrome verified all 11 jobs passed at `d26beb4` in [run 41013926983](https://github.com/EsanduEpa/gymos-v2/actions/runs/41013926983). | Resolved |

Evidence: [finalization](SEGMENT_01_FINALIZATION.md), [GYMOS-MIG-008](evidence/GYMOS-MIG-008.md), [GYMOS-MIG-010](evidence/GYMOS-MIG-010.md), [risk register](MIGRATION_RISK_REGISTER.md). The prior run 41011340034 at `49217dd` remains a historical passing checkpoint; run 41013926983 is the latest verified revision.

## Segment 02 — 2026-10-30 continuation

| Issue | Impact | Resolution / next action | Status |
|---|---|---|---|
| DEC-11 did not exist. | Final session transport policy was unavailable. | Owner approved the limited web-session proposal; recorded DEC-11. Provider/capacity/release decisions remain task 087. | Session policy resolved; provider scope open |
| Bare owner gym route did not canonicalize. | Shell test remained on the legacy entry URL. | Redirect to the approved role route, preserving safe form feedback. | Resolved |
| Browser trainer/member fixtures lacked committed registration operations/tenant receipts. | Role-entry tests correctly failed task 018 authorization; previous roster denial did not prove a usable trainer shell. | Completed only the owned fixtures; guard unchanged. Successful trainer/member shell entry now tested. | Resolved |
| Initial integration/browser commands lacked Docker socket access. | Setup could not start. | Explicitly owned disposable runs passed with authorized access and cleanup. | Resolved |
| Identity integration ran concurrently with a build replacing API dist files. | CLI test could not import its generated runtime module. | Completed build, then reran integration: 10/10 passed. No product assertion changed. | Resolved |
| Chromium adjusted cookie Expires slightly past the signed JWT expiry using the HTTP Date header. | Strict cookie lifetime assertion failed by a fraction of a second. | Expire the cookie two seconds early; same assertion passes. Real authentication checks use the actual browser clock. | Resolved |
| Concurrent session validation could race logout's cookie-deletion response; unrelated Next route announcer also matched generic alert test selectors. | Another tab could show an expiry message; logout response could be interrupted. | Suspend local checks on logout and discard stale results; use the actual feedback selector. Focus-during-logout test and cookie deletion pass. | Resolved |
| Existing visual tests wrote task 011's historical PNGs. | New shell captures would overwrite old evidence. | Restored original task 011 artifacts and directed new branding captures into task 013. | Resolved |

Local evidence: [013](evidence/GYMOS-MIG-013.md), [020](evidence/GYMOS-MIG-020.md). Hosted gate remains pending at this checkpoint. No V1 code/database was run or modified; no shared/production data used.

### Hosted browser follow-up — 30 October 2026

Run [41021183510](https://github.com/EsanduEpa/gymos-v2/actions/runs/41021183510) passed ten jobs, including identity 10/10 and tenant 20/20, but exposed a real navigation race in the stale-chooser case: the browser session monitor redirected a server not-found response to root before it could be inspected. The monitor now applies live gym invalidation only to a rendered authorized shell; uniform denied/unknown-gym responses remain in place. The original not-found assertion remains, with an added assertion that the denied URL stays canonical. Completion remains pending a passing hosted run.

The final local role/session/logout follow-up passed 3/3. Its synthetic 401 now starts only after the logout POST: focusing the tab before submission must still perform a real valid-session check. Assertions are unchanged. Desktop sidebar scrolling was also aligned with V1's static full-content-height column, rather than introducing sticky positioning.

Hosted follow-up resolved: [run 41042328353](https://github.com/EsanduEpa/gymos-v2/actions/runs/41042328353) passed all 11 jobs at `367bdf8`, including all six browser scenarios and the strengthened canonical denial assertion. [PR #2](https://github.com/EsanduEpa/gymos-v2/pull/2) remains draft/unmerged. Provider/release scope remains task 087.


## Segment 03 dependency-review follow-up — 31 October 2026

[Run 41172077267](https://github.com/EsanduEpa/gymos-v2/actions/runs/41172077267) at `5052c7a` passed 10/11; dependency review failed closed on a valid base JSON audit (moderate 2/high 0/critical 0). Local reproduction initially required specific owner approval to transmit committed dependency names/versions to npm; approval was received before retry. pnpm 9.15 JSON mode returns1 for any severity before applying `--audit-level`, confirmed in installed primary source. The corrected validator requires all five nonnegative safe integer counts and consistent exit0/1, rejects unavailable/malformed/error/signal/process-failure responses, and retains the high/critical proposed-revision gate. Eight focused tests pass, including high/critical blocking and failure handling; tests are added to the existing unit job. Base/proposed live audits pass the unchanged threshold. No dependency update, ignored advisory, disabled check or policy exception was introduced. Final hosted recheck follows.

Follow-up verified: corrected revision `0b7c909` passed all 11 jobs in [run 41172437503](https://github.com/EsanduEpa/gymos-v2/actions/runs/41172437503). The audit-parser issue is resolved; moderate advisories remain reported under the unchanged high/critical gate.


## Documentation-head browser synchronization follow-up — 31 October 2026

Run 41172783755 passed10/11; the browser suite passed9/10. In the scoped support exit journey, the browser correctly navigated to `/admin` when support expired/was removed; an immediately subsequent `page.goto` on that same still-navigating document was aborted. Preserve the protected-navigation assertion and cookie-clear assertion while issuing the negative navigation in a fresh tab. This removes only cross-document navigation interference; no assertion, route guard or support boundary is relaxed. Focused production-browser verification and a new all-11 latest revision are required.


## Segment 03 browser synchronization follow-up resolved — 31 October 2026

The fresh-tab protected-navigation check passed locally (browser 10/10) and in [latest code run 41173208643](https://github.com/EsanduEpa/gymos-v2/actions/runs/41173208643) at `95c4919`; all 11 hosted jobs passed, including owned disposable databases, browser isolation, secret scan, dependency review and lockfile audit. No assertion or security boundary was weakened. The documentation revision records this exact run and still requires its own all-11 latest-head result.

## Segment 06/07 integration — 3 November 2026

| Issue | Impact | Resolution / next action | Status |
| --- | --- | --- | --- |
| Task048 depends on Task049, but Segment 07 §1 assigns Task049 to the finance/operational value segment. | Implementing Task049 here would cross the segment's explicit ownership boundary; without it, Task048's dependency gate cannot close. | Asked the owner; on 3 November they explicitly chose to preserve the boundary. Keep Task049 unimplemented in this run and Task048 gated on its Segment 08 owner. | Resolved scope; dependency remains |
| CUA could not inspect the intended Chrome window for owner-visible review. | Headed Playwright and screenshots do not satisfy the owner's requested visible, owner-observed Chrome review. | Rechecked CUA: browser access host unavailable; selecting the running Chrome app returns `cgWindowNotFound`. Owner must restore/enable the browser-control host and open the intended Chrome test window; continue automated and repository work meanwhile. | External blocker |
| Default sandbox denied Docker socket when rerunning the focused directory/request browser flow. | The two-gym browser scenario could not start before assertions in default sandbox. | Reran through reviewed Docker escalation with `GYMOS_TEST_ALLOW_DOCKER=1`; final 1/1 passed, including directory→request, pending-without-hold, acceptance/one hold, decline/member-visible reason. Cleanup removed six databases, container and manifest. | Resolved |
