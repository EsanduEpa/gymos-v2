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
