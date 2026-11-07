# Chrome manual test issues

This log records issues found while running [the ordered browser scenarios](END-TO-END-MANUAL-SCENARIOS.md) on the isolated test system at `http://localhost:3002`. Record each issue under its scenario ID. Keep credentials and session tokens out of this file.

## E18 — Trainer client profile could not load

- **Status:** Open; cause not established.
- **Steps:** Sign in as the Alpha test trainer, open Clients, and choose View 360° Profile for Test Member, who appears in the confirmed client roster.
- **Expected:** Client details and coaching plan controls load.
- **Actual:** The page displayed “This client profile could not be loaded. Refresh to retry.”
- **Impact:** Workout and meal plan creation/assignment could not be exercised for that client. Investigate the failed profile read before retesting.

## E11–E19 — Partial run (2026-11-07)

- **E11:** Published 08:00–18:00 weekly availability. A dated break was rejected with a warning that existing sessions would be affected; the break was not saved. Dated replacement, closure and slot removal remain unverified.
- **E12:** Owner booked E07 Synthetic Member with Test Trainer for 9 Nov at 17:00. Confirmation and detail showed a scheduled in-person session, LKR 2,600 and one held credit; member available credits fell from four to three. Collision, ineligible booking and notifications remain unverified.
- **E13:** Test Member submitted a 10 Nov request. Detail showed pending and no reservation; withdrawal showed cancelled, withdrawn and no credit used. A second request was accepted by Test Trainer and its detail showed scheduled with one held credit. Decline and request-limit checks remain unverified.
- **E14:** Owner viewed the E12 booking detail and trainer viewed the separately accepted E13 booking. The same session was not checked across all three roles.
- **E15–E17:** Delivery, exception outcomes, reminders and worker health were not exercised; they require appropriate prepared appointments or due records.
- **E18:** Client roster loaded, but Test Member's profile showed the error above. Plan creation and member verification remain untested.
- **E19:** Member home, trainer directory, existing workout/meal summaries and credit balance loaded. Other views and empty states remain untested.

## E07–E10 — Partial run (2026-11-07)

- **E07:** Created E07 Synthetic Member and reached the one-time credential screen. The member appeared active in the directory with the E06 plan and a COMPLETE registration profile. First-login password change, existing-identity consent, search/filter and paging remain unverified. The original credential handoff was left without acknowledgment; recovery/reissue may be needed.
- **E08:** The public Alpha application form opened. Submission and subsequent owner review remain untested because account creation requires a new password entered by the user.
- **E09:** Issued a synthetic four-credit pack at LKR 4,000 with 30-day validity; the page showed 4 available, 0 held, 0 consumed and 0 expired. Suspended and reactivated the new synthetic member; the profile showed each resulting status. Renewal and actual sign-in/booking eligibility were not checked.
- **E10:** Registered E10 Synthetic Trainer and reached the one-time credential screen. Credential acknowledgment/first login, existing-identity consent, profile, level, shift and lifecycle remain untested. The trainer handoff tab was left open for user action.
- No new application error was confirmed in these exercised steps. Password handoff is a computer-use requirement, not a product defect.

## E06 — Owner configuration observations (2026-11-07)

No new issue observed in the exercised steps. Alpha owner dashboard loaded and refresh completed; the listed four scheduled sessions belonged to one trainer, consistent with the dashboard's trainer count. Saved a synthetic address, brand color `#115E59`, 30-day plan at LKR 1,234, standard PT rate LKR 2,600, level-one pay rate 41%, and minimum session duration 21 minutes. The profile, plan, PT rate, pay rate and duration remained visible after reload; branding displayed its saved color immediately after save. Existing listed session fees remained LKR 2,500. The new values and plan remain in the persistent test fixture and affect future scenarios. Dashboard financial totals were not independently reconciled, and individual shortcut destinations were not all exercised.

## E01 — Member sign-out could not confirm server revocation

- **Status:** Open; cause not yet confirmed.
- **Seen in:** Separate Chrome test tab, Alpha member account, 2026-11-07.
- **Steps:** Sign in as `member.test-alpha@gymos.test`, confirm the member home at `/gyms/test-alpha/member`, then click **Sign out**.
- **Expected:** The browser returns to `/login` after the server confirms the current session was revoked.
- **Actual:** The browser went to `/login?error=logout-uncertain&scope=current` and displayed: “This browser is signed out locally, but the server could not confirm session revocation. Other sessions may still be active.”
- **Observed scope:** Admin and Alpha owner sign-out reached the ordinary login page. Alpha trainer sign-out also reached login. The Alpha member workspace loaded before the failure.
- **Impact:** Local browser session was cleared, but server-side revocation is unconfirmed. E01 is not fully passed.
- **Next investigation:** Determine whether the logout API returned an error, an invalid response, or exceeded the web action's five-second timeout. Inspect the test API/server logs and the member session state. Fix the verified cause, then run only focused checks before resuming manual E01.

## New issue template

For each additional finding, add a section `## E## — Short title` with **Status**, **Seen in**, **Steps**, **Expected**, **Actual**, **Impact**, and **Next investigation / fix**. Record a scenario as passed only after its browser journey and downstream result have been observed.

## E04 — New gym remains pending provisioning

- **Status:** Blocked; cause not established.
- **Seen in:** Chrome, port 3002, 2026-11-07.
- **Steps:** As admin create synthetic `e04-test-gym` with a new owner, then refresh status and return to the registry.
- **Expected:** Provisioning advances to owner onboarding and credential handoff when its worker is available.
- **Actual:** One gym was reserved and remained `PROVISIONING` / `PENDING` through the observed refresh. The worker's state has not been verified.
- **Impact:** Owner handoff, first login, retry behavior and existing-owner consent remain untested. Investigate the provisioning worker and operation status before concluding this is a product defect.
- **Follow-up:** The same gym remained `PROVISIONING` on the next Chrome run. No duplicate gym was created.

## E05 — Admin session expired after exiting support

- **Status:** Open; cause not established.
- **Seen in:** Chrome, port 3002, 2026-11-07.
- **Steps:** Sign in as admin, enter read-only Gamma support, attempt the gym configuration route (redirected to admin), click Exit support, reload admin, then click Gamma's Suspend gym.
- **Expected:** A confirmation dialog for suspension while the admin session remains valid.
- **Actual:** The browser redirected to `/login?error=expired` instead of showing the dialog. No suspension confirmation was submitted.
- **Impact:** Suspension, access denial and reactivation were not verified. Inspect session and support exit behavior before rerunning E05.
- **Follow-up:** After signing in again, Gamma was suspended and then reactivated successfully; the registry showed `ACTIVE` afterward. Access during suspension, restored owner access and audit history were not checked. The earlier unexpected expiry remains unexplained.
- **Second follow-up:** A Gamma owner signing in while Gamma was suspended reached `No active gym access`, so operational access was denied. Gamma was reactivated and the registry again showed `ACTIVE`. Restored owner access and audit history remain unverified.

## E05 — Suspended owner sees application guidance

- **Status:** Open, wording/UX.
- **Steps:** Suspend Gamma and sign in with its owner account.
- **Expected:** Explain that the gym is unavailable or suspended and give an appropriate support path.
- **Actual:** The `No active gym access` page told the owner that gym features appear after the owner approves their application and enrollment completes, and offered member application links.
- **Impact:** The owner receives misleading member onboarding instructions for a suspended gym. No operational access was shown.

## E02 — Browser observations (2026-11-07)

Alpha member opening the Alpha owner route was redirected to the member home. Alpha member opening the Beta member route received the unavailable/no-access page. After signing out and signing in as the Beta member, the Beta workspace loaded, and the Alpha member route received the unavailable/no-access page. The two gyms' seeded plan names and balances look alike, but their displayed plan links point to distinct gym records. No new issue was observed in these checks. Cross-gym write effects were not exercised, so the full scenario remains partial.

## Deployment-fix verification — 2026-11-07

These follow-ups supersede the earlier observations only within the exercised scope:

- E18: confirmed cause was the coaching profile's session-history contract accepting only SCHEDULED/ACTIVE/COMPLETED although the query includes every historical outcome. The contract now uses the shared full session-state enum. After rebuilding, normal Trainer login on port 3002 opened the original Test Member profile and displayed both workout and meal creation controls. Existing four coaching integration tests passed; the contract regression checks all eight states and rejects unknown values.
- E01: normal login/logout succeeded for all four roles in Chromium on port 3002. Member logout with the access cookie deliberately removed and the valid refresh cookie retained also returned to plain `/login`. The logout action now renews expired/missing access through the existing rotating refresh flow before requesting revocation; errors retain the honest uncertain outcome. No unsupported claim that the original intermittent failure was conclusively diagnosed is made.
- E04: the new opt-in ProvisioningRunner discovered the existing pending synthetic gym and reached COMPLETE through the existing worker. A separate disposable integration confirmed automatic discovery/activation and cleanup. Activation does not complete first-login/password handoff acceptance by itself.
- PT runner: the rebuilt API reports four gyms processed, zero skipped and zero failures. The previous three upgraded fixtures were skipped because rollout operations do not own the unique physical database name. Rollout execution now verifies the original completed provisioning owner and retains schema attestation checks.

The rehearsal used headless Chromium, normal sign-in and synthetic data on port 3002. It did not certify every manual scenario, a client presentation, or a production deployment. Full browser regression results are recorded in the deployment-fix evidence document.
