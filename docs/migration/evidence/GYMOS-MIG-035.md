# GYMOS-MIG-035 — partial journey evidence

Status: **In Progress; not Verified or Completed.** Working tree on branch `codex/segment-05-member-enrollment`, based on `origin/main` at `97b16a7`.

## Passing partial journey

- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test -g "full member enrollment hands off"` passed against the owned disposable two-gym fixture.
- The real browser registered a new member through the owner flow, displayed the one-time temporary password, opened the member profile, confirmed the identity was forced to change the password, completed that change, signed in with the replacement password, and reached the member workspace.
- The test verified exactly one matching tenant member, an unexpired forced-change credential state before login, no temporary plaintext password in Master operation or credential-delivery records, and no change to the other gym's member count. The disposable harness cleaned its databases, container and manifest.
- Full browser suite `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test` passed **12/12**; all routine screenshot output is under ignored `apps/web/test-results/`.

## Remaining acceptance

- Tasks 031 and 032 remain In Progress; task 034 and its task 040 prerequisite are not complete. The journey does not yet cover existing-identity consent through the browser, lost/reissued credential delivery, all operation checkpoint failures, concurrent retries, every two-gym failure path, or full role-specific session/pack projections.
- Task 035 remains In Progress. No owner acceptance is recorded.
