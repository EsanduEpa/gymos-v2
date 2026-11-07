# Deployment fix evidence — 7 November 2026

## Implemented

- Access tokens require sub/iat/exp/sid, enforce at most 15 minutes, and every bearer session goes through durable revocation validation. Legacy sessions must sign in again. Expired/tampered/version checks are preserved; unit fixtures use current claims.
- Logout renews expired/missing access using its existing valid refresh credential before requesting revocation. Cookies are cleared even when the server is unavailable; the UI retains its uncertain-revocation message on failure.
- Opt-in provisioning discovery is registered in Nest, enabled for the isolated manual launcher, bounded to five operations every five seconds, and drains before pool teardown. It invokes the existing leased/ownership-verified worker and leaves failed/review states for explicit operator actions. See `../PROVISIONING-RUNTIME.md`.
- Trainer profiles accept the complete shared session-state contract. Their relationship/tenant/field authorization is unchanged. Historical cancelled/missed/declined/expired records no longer turn an otherwise eligible profile into a 500.
- PT runner accepts completed schema rollouts only after verifying the original completed provisioning operation owns the same gym/database. Installed migration evidence and current tenant binding remain required.

## Verification completed

- Production API/web build passed after all product fixes.
- Typecheck passed before final test-only additions; final repeat recorded below.
- Unit suite passed after current-claim fixture updates (68 contracts after profile fix; API/pool/client/theme results retained in local logs).
- Identity integration: 20 passed, owned resources cleaned up.
- Coaching integration: 4 passed, owned resources cleaned up.
- Provisioning dispatcher unit tests: 2 passed; discovery-to-activation integration: 1 passed (7 other cases excluded by the focused filter), owned cleanup confirmed.
- Schema-rollout reminder integration: 1 passed (7 cases excluded), owned cleanup confirmed. Two earlier fixture attempts failed because required completed-result/digest fields were omitted; corrected fixture preserves real database constraints.
- Port-3002 Chromium rehearsal: ordinary login and logout as Admin/Owner/Trainer/Member; original Test Member profile loads with coaching controls; Member refresh-only logout succeeds. Scheduled runner logs show four gyms/zero skipped/zero failures.

## Browser regression history

First run: 34 passed, 2 failed, 1 interrupted. It was superseded after the profile/worker fixes. Trainer failure expected a success card that disappears after revalidation despite the saved acceptance; assertions now inspect durable SCHEDULED/DECLINED state and card removal. This corrected journey passed its focused rerun, including completion, settlement, notes and eligible start. Owner appearance used an invalid one-hour access-token fixture; it now uses the actual 15-minute policy. The long obsolete run was interrupted gracefully with owned fixture cleanup, rather than waiting for its 480-second test timeout.

The enrollment activation-recovery failure and final full-suite totals are recorded below after verification.

## Boundaries

No deployment or merge. Development port 3000 and its databases were not used for acceptance. Persistent synthetic test migrations and the previously pending synthetic gym were advanced with the existing ownership checks. No real member data was copied. Earlier review findings about email ownership, abuse controls, privileged MFA and hosting configuration remain separate work; this change does not close them.

## Final build and rehearsal

- Final workspace production build passed (69 generated web routes); final workspace typecheck passed.
- Final unit command passed **186 tests**: 68 contracts, 14 API-client, 5 theme, 74 API, 25 pool tests. Lint passed with four existing unused-code/import warnings.
- Extended headless Chromium rehearsal at port 3002 passed **44 page visits**: Admin 7, Owner 17, Trainer 10, Member 10 (including repeated account/security/help destinations per role). Each role used normal login and confirmed logout. The Trainer opened the original Test Member profile with both coaching controls visible. The Member signed out with only a refresh cookie; the browser reached plain login.
- Scheduled-work logs on the rebuilt testing API confirm `gyms=4 expired=0 skipped=0 failures=0` after the rollout ownership fix. The previous pending synthetic gym's provisioning operation logged COMPLETE.
- Both failing browser cases passed a focused rerun on the final build (2/2). The enrollment case's first failure was not reproduced; do not assert a root cause without evidence. The last long-running obsolete fixture was corrected from a one-hour synthetic access token to the real fifteen-minute policy.
- `pnpm manual:check` passed on the final running test instance: all four synthetic role logins and all three original gyms' operational reads and PT credit conservation checked successfully.

## Account-version regression identified by full-suite ordering

The next complete browser run passed 36/37. The remaining enrollment failure occurred after a preceding session test incremented the Owner's GymAccount.authVersion. GymAccessGuard passed that scoped version as identityVersion, but enrollment/configuration/lifecycle identity fences compare identityVersion with User.authVersion. Those versions legitimately diverge after account-scoped revocation. The guard now passes User.authVersion to the downstream global identity fence while retaining its existing independent scoped account/session validation. No account-version or revocation checks were removed.

The enrollment-recovery browser regression now explicitly increments the scoped account version, installs a fresh session and exercises recovery/publication with the global version unchanged. It passed 1/1 in isolation on the corrected API. This explains the earlier run-order failure; a fresh fixture previously masked it. The full release rerun is recorded below.

## PR #15 CI follow-up — 8 November 2026

- Platform, finance and notification integration fixtures now issue required `iat` claims. Platform operator fixtures use real durable sessions through a shared test helper. Platform suite: 33/33 across seven files; affected finance/notification suites: 9/9. Type checking and focused lint passed.
- Member history pagination now selects the history tab from the server-visible membership-page query. It no longer initializes browser state from a hash that the server cannot render, avoiding hydration disagreement and a return to Overview.
- Browser session lifecycle shares concurrent renewal requests, checks validity on focus, and avoids renewing on the first click after every full document navigation. Existing expiry, revocation and logout checks remain enforced. A regression checks that fresh-session focus/activity does not request unnecessary renewal.
- Payroll content wraps within its grid. The visual walkthrough now creates a payroll period so this layout is exercised even when the test runs alone, and bounds individual actions to ten seconds instead of spending its entire eight-minute budget on a missing control.
- The cookie security journey uses a real password login. The synthetic browser helper retains the synthetic user's valid password hash when creating a scoped account, so earlier test setup does not break that subsequent login. A four-test ordered regression passed.
- Initial full reruns exposed these cookie-fixture assumptions (36/37); the final complete `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:isolated` run passed **37/37 in 5.1 minutes**, including the populated owner walkthrough. Owned fixtures reported database/container/manifest cleanup. This is a fresh complete pass, superseding the earlier incomplete browser release evidence.
- Production web build, API/web type checks, focused lint, whitespace validation and local secret scans passed. No live hosting deployment or production database changes were performed.
