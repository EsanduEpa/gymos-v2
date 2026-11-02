# GYMOS-MIG-036 — partial trainer enrollment evidence

Status: **In Progress; not Verified or Completed.** Local changes are based on branch `codex/segment-05-member-enrollment` at `701258e` (`origin/main` baseline `97b16a7`). Evidence below was captured from the uncommitted working tree; it must be re-recorded against the pushed revision before any task status advances beyond In Progress.

## Implemented and locally checked

- Added the typed Trainer profile fields (email, phone, level, experience, specialisations, paired shift values and bio), strict contract/client, owner enrollment and consent API operations, durable operation/receipt and Master activation flow, explicit existing-identity consent, and owner enrollment/consent screens.
- Newly created identities receive the established one-time credential flow; existing identities preserve their credential and receive none.
- Added tenant constraints for complete trainer registration fields and paired/valid local shift times. Updated tenant template manifest and disposable fixtures accordingly.
- `pnpm typecheck:workspace` passed; `pnpm lint:workspace` passed; `pnpm build:workspace` passed. Exit code 0 for each combined command.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.tenancy-integration.ts --disableConsoleIntercept` passed **24/24**. Disposable harness cleaned 8 databases and its container. Coverage includes typed registration, replay without secret disclosure, identity consent/password preservation, same-gym role conflict and second-gym isolation.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web test:e2e --grep 'trainer registration hands off'` passed **1/1** in Chromium against guarded disposable databases. It covered owner creation, one-time credential, forced password change, login into the trainer route and unchanged second-gym trainer count. Harness cleaned 6 databases, its container and manifest. Captures/results remain under ignored `apps/web/test-results/`.
- All database tests used disposable databases. The existing local demo database was not used.

## Remaining acceptance work

- Task 036 dependency closure is not verified: in particular task 040 remains unimplemented and task evidence for 043 remains absent. The remote repository has no task-036/040/043 evidence branch or commit to reuse.
- Trainer failure injection/retry at each saga checkpoint, concurrent idempotent commands, the complete consent replay/refusal and credential-delivery-loss/reissue cases, and API owner/foreign-gym negative matrix remain to be added or linked.
- Trainer availability/publication is not yet safe to claim: task 037 directory/profile reads and task 040 session eligibility/booking do not exist, so unpublished trainers have not been proven absent from those consumers.
- Required owner acceptance is **not recorded**. No Segment 06 or Segment 07 completion is claimed.
