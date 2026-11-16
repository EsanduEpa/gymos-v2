# GymOS V2 developer review

Use synthetic data for this review. Record the commit or build identifier, tenant schema version, browser version and test date so results can be reproduced.

## Review status as of 16 November 2026

| Area | Evidence so far | Next check |
| --- | --- | --- |
| Original audit defects | The earlier local build passed 40 browser regression tests. The local header and health fixes and trainer-pay migration have separate evidence in the [remediation record](QA-AUDIT-PRIORITIZED-REMEDIATION-PLAN.md#12-evidence-and-completion-record). | Repeat the critical workflows on the review build. Record deployed headers, health and latency when a hosted target is available. |
| Membership dashboard | The local browser test verified the expiry warning, including an already-renewed membership and the 30-day boundary. | Reconcile counts and expiry dates against the review fixture. |
| Workout scheduling and completion | Local database tests passed for dated and weekly assignment, rest times, completion and authorization. | In Chrome, verify assignment, same-client copying, the home page, and persistence after refresh in separate trainer and member sessions. |
| Dated meals | The API and web production builds passed with the change. | Apply the latest tenant migration and verify assignment, editing, and exact-day calendar behavior. |

The local source contains the changes. A release commit or source bundle for the client and a current remote review URL are pending. The temporary hosted rehearsal was stopped.

## Start the review

1. Obtain the exact review commit or source bundle from the project owner. It must include the trainer-pay, workout-scheduling and dated-meal migrations. The current tenant manifest is `tenant-2026-11-15.2`.
2. For a local review, use Node.js 24, pnpm and Docker. Follow the [manual testing guide](manual-testing.md#start-or-resume) to build the API and web app and create or update the dedicated synthetic databases. A fresh checkout needs the synthetic setup; an existing fixture needs a sync. Open `http://localhost:3002/login` on the machine running the test app.
3. For a remote review, obtain the restricted HTTPS address and test sign-ins privately. The hosting operator verifies the deployment matches the review commit and confirms anonymous access is blocked before sharing the address.
4. Use separate Chrome profiles for the Owner, Trainer, and Member so their sessions stay separate. Use an equivalent account in a second gym for isolation checks. Never include passwords or access tokens in a test result.

## Workflows to test

| Reference | Steps | Expected result |
| --- | --- | --- |
| RPT-01, RPT-07 | Sign in as the gym owner and open **Live Gym Operations**. Check the **Memberships** section against the member list and open an expiring member’s profile. If testing a renewal, extend a membership that falls within the warning window past the 30-day boundary and refresh. | Active memberships are counted for the gym’s current date. The warning list excludes inactive members, displays the first day without coverage and reflects a renewal that extends coverage. |
| WRK-01, WRK-02, WRK-04 | As the trainer, open a confirmed client and assign a workout. Enter a rest time for an exercise and choose **Specific date** for today. As the member, open the home page and then **Workout plans → Today’s workouts**. | The assignment shows on the member’s home and in the date filter. The exercise shows its rest time in seconds. |
| WRK-02, WRK-05 | Assign another plan using **Repeat weekly** and select today’s weekday. As the member, check today, the same weekday next week, and a different weekday using the date filter. Mark an exercise complete, refresh, then clear it. | Weekly workouts appear on the chosen weekdays. Completion persists for the current day following a refresh. Future occurrences have their own completion state. |
| WRK-03 | On the confirmed client’s full workout history, choose **Copy workout plan**, review the populated fields, and save it with a new title and schedule. | A separate assignment is created. The source plan and its completion records are preserved. |
| MEL-02 | As trainer, assign a meal plan for a specific date. As member, open **Meal plans** and select that date in **Calendar**. Check the same weekday a week later. | The meal plan shows its date. Its meals appear only on that date. A meal plan saved with the date field blank continues to repeat weekly. |
| NFR-05 | Sign in with the equivalent account for the other synthetic gym. Try opening the first gym’s owner page, a member profile, or a trainer’s workout URL. | Access is denied. The browser does not show the first gym’s records. |
| BUG-001 | As owner, register one synthetic member and one trainer. Test a rapid repeat submit. Sign in with each temporary credential in a separate profile and complete the required password change. | Each account is created once. The first login requires a password change, and the replacement password works. |
| BUG-003 | In owner account recovery, try an incorrect current password, then use the correct password to issue a link for an eligible synthetic member. Redeem the link, sign in with the new password, and try reusing the link. | Incorrect reauthentication is denied. The link works once. An owner from the second gym cannot recover the first gym’s account. |
| BUG-004, BUG-011 | Open the owner’s PT history for a member with recorded sessions, then open the member’s calendar for a month containing a declined request. | Recorded history appears. Declined requests are excluded from calendar totals and remain available in session history. |
| BUG-005 | Edit a membership plan that already has a term, create a new term at the edited price and duration, then archive the plan. Try deleting a referenced plan. | Earlier terms retain their agreed values. New terms use the new values. Archived plans leave the active picker, and referenced plans cannot be deleted. |
| BUG-002, BUG-007, BUG-009 | On a trainer request with a long note, check the actions at desktop and mobile widths. Save an invalid and a valid trainer-pay override. On synthetic bookings, compare zero-price and paid pack credits, then reconcile completed sessions against earnings, payroll and CSV. | Actions stay visible and operable. Invalid pay has a readable field error. New confirmations hold the configured trainer pay, including when the pack credit allocation is zero. Historical pay stays tied to its recorded terms. |
| BUG-008, BUG-010, BUG-013 | Verify the synthetic gym’s owner in the platform registry. Check secondary text in Applications, Expenses and Security in both themes. Review timestamps and single-item labels. | The registry shows the owner name or the expected fallback. Secondary text and focus indicators are legible. Dates, singular labels and the dark background render consistently. |
| BUG-012 | Try an application with a mixed-case gym code, then submit invalid form values and retry. Open an unknown gym on the public application route. | Valid codes are normalized. Retry keeps contact fields and consent and clears the password. The unknown code shows a friendly missing-gym screen. Record the HTTP status separately if the client requires a literal 404. |

## Work still open

### 1. Core application features

| PDF reference | Development work | Developer acceptance |
| --- | --- | --- |
| MEL-04, PRG-01–06, RPT-06 | Add dietary restrictions and allergies, body measurement history, trend charts, member progress reports, and private progress photo upload and comparison. | Authorized members and staff see the right records. Updates appear in chronological order with the correct units. Photo access is limited to authorized users and expires as designed. |
| WRK-03–04, D1-1.1, D1-1.4 | Add reusable workout templates across clients, member goals and solo workout logs. Connect workouts to physical check-in after door attendance exists. | A trainer can assign a template independently to two eligible clients. Editing one assignment preserves the other. Goal and solo log entries are private to the defined roles. |
| RPT-01, RPT-03–05, D1-3.5–3.6 | Add month-to-date owner totals, trainer activity and retention, member funnel and churn metrics, revenue by plan tier and first term versus renewal, and PDF/Excel exports. Define cash projections before implementing them. | Screen totals and exports reconcile against dated source records, including renewals, empty ranges and month boundaries. |
| D1-1.6–1.7, D1-2.1–2.6, WF-O4 | Build member–trainer messaging, verified-session ratings, additional trainer profile and marketplace controls, virtual-session rules, challenges, streaks and re-engagement. | Eligible users can complete each flow. Unrelated users and the second gym cannot see private content or submit ratings for someone else’s session. |
| D3-1.3, D1-3.9 | Define Manager and Front Desk permissions and implement the agreed roles and subscription lifecycle. | Test an action-by-action role matrix in two gyms. Test subscription transitions against the agreed definition of what is billed. |

### 2. Integrations and expanded scope

| PDF reference | Dependency | Developer acceptance |
| --- | --- | --- |
| AUTH-03, MEM-02–08, D1-1.9, D1-2.7 | Choose a payment sandbox and external delivery providers. Confirm receipt, retry, refund, reconciliation, email OTP and notification rules. | Exercise synthetic checkout, failed payment, duplicate webhook, manual cash, receipt, recovery and notification opt-out paths. |
| BIO-01–07, D1-1.3, D1-2.2, D1-3.8 | Obtain the selected ZKTeco device or simulator and define fingerprint enrollment, QR fallback, manual attendance, and the proposed PT timer changes. | Time valid scans, verify denial and fallback, reconcile entry/exit records, and check that proposed PT timing does not double-spend credits. |
| D1-1.5, D1-2.3, D1-3.5, D1-3.7 | Define consent and provider test access for AI, wearables and accounting exports to Xero or QuickBooks. Use free test resources where available. | Verify data permissions, authorized imports and exports, failure handling, and review of flagged AI interactions. |
| NFR-06 | Obtain the detailed requirements for POS, equipment maintenance, multi-branch support, native/white-label apps, and Sinhala and Tamil. | Validate each agreed workflow and its permissions against the signed-off specification. |

### 3. Hosted technical verification

| PDF reference | Evidence to collect |
| --- | --- |
| BUG-006, NFR-01, NFR-03 | Check production-style HTTPS, security headers, foreign-origin requests, redirect and error responses, and web/API health. Time warm and first-after-idle requests against the PDF’s API p95 target of under 300 ms. Record results by endpoint, including finance. |
| NFR-02 | Verify backup schedule and retention, point-in-time recovery, database and PII encryption and key handling. Rehearse restore to an isolated target and time recovery. Measure scheduled-work recovery, uptime, and stability under the agreed 500+ user workload. |
| BUG-007, platform provisioning | Provision a synthetic gym, observe the worker complete it, and validate the owner credential handoff. Verify the installed migrations, seeded trainer-pay defaults and confirmed amounts before exercising payroll. |

The full requirements baseline depends on the original documents and traceability file referenced by the PDF. Keep items with unresolved behavior or absent test infrastructure marked as pending until the specification or environment is available.

## Report a result

Record each case as **Pass**, **Fail**, **Blocked** or **Pending implementation**. Include the requirement or bug ID, build, role, synthetic gym, page or endpoint, reproduction steps, expected and actual results, browser version, viewport and evidence. For timing issues, include whether the service was warm or waking up. Keep passwords, recovery links and session cookies out of reports.

Keep the client’s results with the reviewed build and [capability backlog](V2-FUTURE-CAPABILITIES.md). Treat client acceptance and production readiness as separate decisions with their own evidence.
