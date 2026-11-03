# GYMOS-MIG-036 — partial trainer enrollment evidence

Status: **In Progress; not Verified or Completed.** Verified source and test revision `9390772` on branch `codex/segment-05-member-enrollment`, based on `origin/main` at `97b16a7`. Hosted checks are being run against this revision.

## Implemented and locally checked

- Added the typed Trainer profile fields (email, phone, level, experience, specialisations, paired shift values and bio), strict contract/client, owner enrollment and consent API operations, durable operation/receipt and Master activation flow, explicit existing-identity consent, and owner enrollment/consent screens.
- Newly created identities receive the established one-time credential flow; existing identities preserve their credential and receive none.
- Added tenant constraints for complete trainer registration fields and paired/valid local shift times. Updated tenant template manifest and disposable fixtures accordingly.
- `pnpm typecheck:workspace` passed; `pnpm lint:workspace` passed; `pnpm build:workspace` passed. Exit code 0 for each combined command.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.tenancy-integration.ts --disableConsoleIntercept` passed **26/26** on 3 November 2026. Disposable harness cleaned 8 databases and its container. Coverage includes typed registration, replay without secret disclosure, identity consent/decline and password preservation, same-gym role conflict, second-gym isolation, rollback-before-tenant-commit retry, Master activation audit failure/retry after tenant receipt commit, and publication-policy denial until reciprocal Master activation.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web test:e2e --grep 'trainer registration hands off'` passed **1/1** in Chromium against guarded disposable databases. It covered owner creation, one-time credential, forced password change, login into the trainer route and unchanged second-gym trainer count. Harness cleaned 6 databases, its container and manifest. Captures/results remain under ignored `apps/web/test-results/`.
- The expanded Chromium scenario `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web test:e2e --grep 'trainer registration enforces owner'` passed **1/1** at `9390772`. OWNER access to the wrong gym and MEMBER access to trainer registration return403; malformed paired-shift input returns422; all rejected attempts leave Master identity/access/operation and both gyms' Trainer counts unchanged. The earlier full Chromium run passed13/13 before this scenario was expanded; the updated scenario itself was rerun directly.
- All database tests used disposable databases. The existing local demo database was not used.

## Remaining acceptance work

- Trainer directory and booking-option consumers do not yet exist under their owning downstream tasks, so their safe projections cannot be positively verified here. The pending-vs-active publication policy is covered, but consuming read acceptance remains open.
- Task 036 dependency closure is not verified: task 040 implementation/evidence is absent and task 043 evidence is absent. The refreshed remote has no pre-existing task-040/043 implementation to reuse.
- Trainer failure injection/retry at each saga checkpoint, concurrent idempotent commands, the complete consent replay/refusal and credential-delivery-loss/reissue cases, and API owner/foreign-gym negative matrix remain to be added or linked.
- Trainer availability/publication is not yet safe to claim: task 037 directory/profile reads and task 040 session eligibility/booking do not exist, so unpublished trainers have not been proven absent from those consumers.
- Required owner acceptance is **not recorded**. No Segment 06 or Segment 07 completion is claimed.

## Segment 06 continuation — 3 November 2026

Current checkout at start: clean `codex/segment-05-member-enrollment`, revision `eef5ab3`, tracking the matching local remote-tracking ref. `origin/main` locally resolves to Segment 05 merge `d256443`; a network fetch could not update `.git/FETCH_HEAD` because this workspace mounts `.git` read-only. Creating `codex/segment-06-trainer-enrollment` was likewise denied by the read-only git metadata. No commit or merge was made; scoped work remains on the existing branch.

### Dependency and publication ownership reconciliation

The authoritative Task 036 dependencies in `MIGRATION_TASK_SPECS.md`, `MIGRATION_DEPENDENCIES.md`, and the tracker are 017, 018, 023, 027, 078, 080, and 083. Task 036 Acceptance Criteria explicitly assigns positive directory publication verification to 039 and booking eligibility to 041. Tasks 040 and 043 are **not** Task 036 dependencies. They remain real prerequisites for Task 038 deactivation and for Segment 07 booking/lifecycle behavior (including 041), respectively. The older task evidence sentence saying 036 dependency closure requires 040/043 is stale and is superseded by this reconciliation. Task 036 must retain a publication-policy unit/integration check that pending/unactivated trainer access is non-operational; it does not claim that downstream read consumers have been verified. 039 owns directory consumer verification; 041 owns booking consumer verification.

DEC-02/04/07 govern this task's identity, operation and scheduling inputs. DEC-09 is approved and informs safe projections and downstream coaching scope, but is not a Task 036 dependency. No decision conflict remains for trainer registration. No V1 source was modified.

### Changes on revision under review (uncommitted)

- Added a disposable tenancy integration scenario running two identical trainer enrollment commands concurrently and asserting persisted counts of one trainer, tenant receipt, registration audit, completed operation and reciprocal active Master access, plus zero second-gym trainers.
- Extended the trainer browser scenario to exercise a 320px validation-error state, reject negative experience, and assert zero changes to identity/access/operation records and both gym trainer counts before successful enrollment.
- Existing task tests already cover tenant actor rollback/recovery, activation-audit failure after tenant receipt commit/recovery, consent accept/refuse/wrong password, existing password preservation, role conflict, request replay without secret disclosure, forced password change, OWNER/MEMBER/wrong-gym 403, malformed shift 422 and second-gym isolation. Shared credential-service tests cover one-time issuance, lost response, version recovery, safe reissue, acknowledgement/reissue race and old-secret invalidation; these remain shared foundation evidence rather than trainer-specific browser evidence.

### Verification continuation — 3 November 2026, checkout `eef5ab3` plus uncommitted changes

The disposable test runs required elevated local Docker access. All successful harnesses cleaned up their owned databases/container (and browser manifest where applicable); no demo/shared database was used.

Successful (exit 0):

- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.tenancy-integration.ts --disableConsoleIntercept` — **31/31**. Includes typed trainer registration, consent accept/refuse/wrong-password, existing password preservation, same-gym role conflict, tenant insert rollback/retry, Master activation audit failure/retry, pending publication denial and the added concurrent same-key/retry persisted-effect assertion. Cleanup: 8 databases and container.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.identity.ts --disableConsoleIntercept` — **13/13** credential identity tests, including lost response/reissue, safe replay, acknowledgement/reissue concurrency and old-secret rejection. Cleanup: 4 databases and container.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web test:e2e --grep 'trainer registration enforces owner'` — **1/1** Chromium. Includes OWNER wrong-gym and MEMBER denial (403), paired-shift API rejection (422), 320px negative-experience native validation with zero persisted effects, successful one-time handoff, forced password change and two-gym isolation. Cleanup: 6 databases, container and manifest.
- `pnpm typecheck:workspace`; `pnpm --dir apps/api lint && pnpm --dir apps/web lint`; `pnpm build:workspace`; `git diff --check` — exit 0.

The responsive form was visually inspected during the browser run. A screenshot attempt included Playwright's full-page/fixed skip-link overlay and the browser's native validation bubble; it was removed as unsuitable evidence, and no screenshot is retained or claimed. This is agent-performed inspection, not owner review or an independent owner browser session. An initial isolated run exposed a fixture coupling in the new test; the fixture was made self-contained. The final 31/31 complete tenancy run and final 1/1 Chromium rerun passed.

### Status and remaining gates

On 3 November 2026, the project owner explicitly requested that Codex run the trainer acceptance journey in visible Google Chrome while the owner watched, then finish and merge the Segment 06 PR. Codex ran the same guarded two-gym Chromium acceptance journey with `channel: 'chrome'` and `headless: false`; it passed 1/1 and cleaned six disposable databases, its container and manifest. This is **owner-directed visible browser acceptance performed by Codex**; it is not described as an independently executed owner browser session. The visible test confirmed owner/role/gym denials, zero-effect invalid form, successful handoff, forced password change and second-gym isolation.

036 remains **In Progress** until the focused PR has current hosted checks. Runtime and static acceptance checks pass on the current checkout plus uncommitted changes. Directory/booking consumer verification remains with 039/041. Segment 06 remains **IN PROGRESS** because its other tasks are not complete. After 036 acceptance, the next scheduled implementation task is GYMOS-MIG-040 in Segment 07, before returning to member status/pack work; do not implement 040/043 under 036.
