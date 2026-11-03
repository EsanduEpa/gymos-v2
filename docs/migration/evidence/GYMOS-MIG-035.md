# GYMOS-MIG-035 — acceptance evidence

Status: **Completed** for Segment 05 at code revision `bab9b97`, with final documentation and hosted PR checks recorded in [Segment 05 handoff](../SEGMENT_05_HANDOFF.md). Earlier sections below preserve historical partial-revision findings; the final acceptance section supersedes them.

## Passing partial journey

- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test -g "full member enrollment hands off"` passed against the owned disposable two-gym fixture.
- The real browser registered a new member through the owner flow, displayed the one-time temporary password, opened the member profile, confirmed the identity was forced to change the password, completed that change, signed in with the replacement password, and reached the member workspace.
- The test verified exactly one matching tenant member, an unexpired forced-change credential state before login, no temporary plaintext password in Master operation or credential-delivery records, and no change to the other gym's member count. The disposable harness cleaned its databases, container and manifest.
- Full browser suite `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test` passed **12/12**; all routine screenshot output is under ignored `apps/web/test-results/`.

## Remaining acceptance

- Tasks 031 and 032 remain In Progress; task 034 and its task 040 prerequisite are not complete. The journey does not yet cover existing-identity consent through the browser, lost/reissued credential delivery, all operation checkpoint failures, concurrent retries, every two-gym failure path, or full role-specific session/pack projections.
- Task 035 remains In Progress. No owner acceptance is recorded.

## Follow-up verification — 3 November 2026

Browser tests added and locally passed on commit `41a6ad5` using disposable two-gym fixtures:

- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test -g "full member enrollment hands off|existing identity explicitly consents"` — **2/2 passed**. The new-member owner flow replaced a lost one-time credential, showed the replacement once, opened the correct member profile, paged membership history, rejected login with the revoked password, enforced first-login password change, and entered the correct member workspace. The second gym’s actor count remained unchanged and cross-gym access returned 403.
- The verified-existing-identity owner flow preserved the form values through pending consent, required private sign-in/current-password acceptance, created one member/term/active MEMBER link, created no credential delivery, preserved the existing password, and allowed explicit selection of Gym B as the member workspace.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.tenancy-integration.ts --disableConsoleIntercept` — **26/26 passed**, including persisted effect counts and 125-term profile paging. Identity integration — **10/10 passed**, including lost reissue-response recovery.
- Contract build, API/web typechecks, focused ESLint, API/web production builds, and `git diff --check` passed. Disposable browser cleanup removed 6 databases, container and manifest; tenant integration cleanup removed 8 databases and its container.

Still incomplete: browser-level injected tenant-commit/Master-activation response-loss recovery, all checkpoint/revocation/concurrency failure cases, pending-record roster suppression repeated-recovery effects, complete error/accessibility and role projection checks, and owner manual acceptance. Packs/session history are excluded and remain with Segment 07 tasks 034/044. Task 035 remains In Progress.

Commit `5d9cf8a` adds a separate Chromium case for acknowledging the original version-zero credential without reissue; that test passed **1/1** against disposable data. The lost-credential browser journey also passes with a deterministic forced-change password satisfying policy. Together with the existing-identity consent browser case, each of the three focused journeys passes individually; see Task031’s follow-up for command results. This still does not replace browser-injected operation recovery or owner acceptance.

The final combined current-code command was `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test -g "original version-zero|full member enrollment hands off|existing identity explicitly consents"` — **3/3 passed** on `5d9cf8a`, with six disposable databases/container/manifest cleaned. Hosted checks could not be verified from this session (private-repository API 404, no `gh`, browser host unavailable); owner acceptance remains pending.

## Final code-revision journey — 3 November 2026

Revision `bab9b9776ab5afa9dd4d192764b64a70636ba02c` completes the Segment 05 journey tests on PR [#6](https://github.com/EsanduEpa/gymos-v2/pull/6). `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web exec playwright test --config playwright.config.ts --reporter=line` passed **19/19, exit 0** with 7 owned databases/container/manifest removed. Production API and Next builds were used by the browser fixture. No existing local demo database was used.

The new-identity path records exactly one member/term/access and one-time credential, replaces a lost credential, denies the revoked password, enforces the first-login change and enters the selected gym. A distinct existing MEMBER identity in Gym A signs in, explicitly consents to Gym B, retains the same password and unchanged Gym A link, and enters Gym B through the chooser with a different actor ID. The owner roster/profile page beyond 100 rows and 125-term history page are exercised. The original version-zero handoff is acknowledged without replacement.

Injected Master activation failure after tenant commit leaves one member/term/receipt/audit with PENDING access, no credential delivery, and no roster/profile or member workspace publication. Repeated same-key recovery under the fault adds no effects; removal of the fault completes the original operation and issues one credential. Injected browser action response loss after a completed server action is recovered using the visible reference: no second actor/term/receipt and no plaintext replay. Explicit reissue rotates the credential. Clipboard denial remains visible, and acknowledgment removes the secret from the subsequent document. Direct owner/role/foreign-gym API and UI checks preserve 403/404 boundaries and unchanged second-gym counts. Roster/profile loading, empty/error, keyboard and 320px states pass; generated synthetic captures are local under ignored `apps/web/test-results/`.

**Manual acceptance record:** the project owner delegated manual-test execution to Codex and authorized merge in the current request. Codex visually inspected the synthetic roster/profile/error captures, corrected the clipped mobile profile tab, and reran the focused Chromium check **1/1, exit 0**. This is agent-executed review under owner delegation; no independent owner browser execution is asserted. Final hosted checks and review findings are recorded in the Segment 05 handoff after the latest-revision result.
