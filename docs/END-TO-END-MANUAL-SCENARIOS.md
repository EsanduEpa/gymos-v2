# Whole-system browser acceptance scenarios

Use this runbook for a human or computer-use agent to exercise the current GymOS application end to end. The browser target is **http://localhost:3002**. The development instance on port 3000 and its databases are outside this run.

## Prepare and record the run

1. Read [manual-testing.md](manual-testing.md) and `AGENTS.md`. Build the current API and web code, run `pnpm manual:sync`, and start `pnpm manual:start`. If Docker Desktop has restarted, follow the documented `manual:rebind` procedure first. Check that the login page on port 3002 loads and the API on port 3003 responds.
2. Record the Git commit, date/time and timezone, browser and viewport, and the test gym/database fixture. Use only the synthetic accounts and password in the ignored `.env.manual-test.json`; do not copy credentials into screenshots, notes, chat or Git.
3. Use `test-alpha` for normal journeys, `test-beta` for isolation and lifecycle checks, and `test-gamma` as a spare. The seed provides admin, owner, trainer and member accounts for each gym; account names and fixture details are in [manual-testing.md](manual-testing.md). Create separate disposable identities for password changes, enrollment, recovery and destructive lifecycle checks.
4. Treat seed counts and dates as starting clues. This is a persistent, mutable testing database; record the actual starting counts, credit balances and session dates before making changes. `pnpm manual:check` can confirm connectivity, but its baseline values may change after intentional actions.
5. For every scenario, record **Pass / Fail / Blocked**, the account and gym, the visible result, the relevant record or count before and after, and a screenshot for a failure. Redact passwords, one-time credentials, session tokens and personal data. A scenario passes only when the user-visible action and its downstream effect both match.

## Execution rule for future agents

Keep the port 3002 testing web app and port 3003 API running in a background terminal throughout the manual testing campaign, including pauses to fix issues. Do not stop them after a scenario or fix; stop them only when the user explicitly says to stop. If a code or schema change requires a restart, restart the test services in the background and confirm they are available before reporting the fix.

Run **one scenario at a time, in strict ID order**: E01, then E02, and so on. Complete and record the current scenario before opening the next one. Use a fresh browser context when switching accounts unless the scenario explicitly tests switching or logout. Keep each test identity and idempotency reference unique.

If any issue occurs, record the failed step, expected and actual result, and relevant evidence in [CHROME-MANUAL-ISSUES.md](CHROME-MANUAL-ISSUES.md). Mark that scenario failed or partial. The user has asked to collect issues across a few Chrome scenarios before fixing them together. Continue to the next scenario in ID order only when the user asks to continue; do not silently treat a failed step as passed. After the collection phase, investigate and fix the logged issues, report the fixes and focused checks, and resume manual testing when the user asks.

While fixing an issue, run only the checks needed to confirm that specific fix. Avoid repeated browser attempts, broad suites and unrelated retries. Leave the end-to-end acceptance decision to the resumed manual run on port 3002.

## 1. Access and platform operations

| ID | Browser journey | Pass conditions |
| --- | --- | --- |
| E01 | Sign in normally as platform admin, Alpha owner, Alpha trainer and Alpha member. Visit each landing page, sign out, and sign in again. Use a new disposable account to exercise first-login password change. | Each role reaches its own workspace; signed-out pages require login; the temporary password stops working after change. |
| E02 | Open a wrong-role route directly, then try a Beta route while signed in to Alpha. Sign in to the shared member identity through the separate Alpha and Beta gym accounts. | Direct navigation denies access without exposing another role's or gym's data. Each scoped login shows only that gym; switching accounts does not carry records or actions across gyms. |
| E03 | As admin, inspect dashboard totals, registry paging/filtering, gym status and data freshness. Refresh the summary. | Displayed counts/status match the visible registry and refresh reports success or a truthful unavailable state. |
| E04 | Create a disposable gym and new owner through the platform form. Follow pending provisioning, retry/status, owner credential handoff and acknowledgment, then sign in as owner. Separately exercise the existing-identity consent path. | One gym and owner access are created; pending states are truthful; retries do not duplicate the gym or credentials; owner reaches only the new gym after required consent. |
| E05 | On a spare gym, enter reasoned read-only support, inspect the owner view, exit support, then suspend and reactivate the gym with reasons. | Support has no write access and expires/exits correctly. Suspension removes ordinary access; reactivation restores it and keeps an audit trail. |

## 2. Owner setup, people and applications

| ID | Browser journey | Pass conditions |
| --- | --- | --- |
| E06 | As Alpha owner, inspect dashboard metrics and shortcuts. Change public gym profile/branding, a membership plan, PT fee/pay settings and cancellation policy; reload. | Saved values persist in Alpha and are absent from Beta. Dashboard metrics and freshness labels agree with the records used in the run. |
| E07 | Register a new member, complete the one-time credential handoff and first login. Search/filter/page the directory and open the profile. Register an existing identity separately and complete its consent. | The new account has one gym membership, correct role and one credential handoff. Existing identity retains its password until its required consent; no duplicate enrollment appears after retry. |
| E08 | From the public application page, submit a new application. From an existing account, apply to another gym, inspect own status, withdraw/reapply where allowed, then have the owner approve one and reject another. | Applicants cannot enter operational pages while pending or rejected. Status and notices update; approval gives exactly one member enrollment in the selected gym and follows the current consent rules. |
| E09 | On disposable member records, assign/renew membership and issue a PT pack. Inspect available, held, consumed and expired credits and history. Change a member's lifecycle state and restore where supported. | Effective dates and balances are consistent; access and booking eligibility follow lifecycle state; Beta is unaffected. |
| E10 | Register a trainer, complete credential/consent steps, then inspect directory/profile. Change level, status and shift on a spare trainer; exercise deactivation/reactivation where supported. | Trainer sees only assigned gym and permitted clients. Changes persist, appear in the owner view and affect new availability/booking eligibility as designed. |

## 3. PT booking, delivery and coaching

| ID | Browser journey | Pass conditions |
| --- | --- | --- |
| E11 | Publish a trainer's weekly availability; add a dated exception, break/block and gym closure. Inspect slots as owner and member. | Valid slots appear in gym-local time; blocked/closed slots disappear; existing bookings require the documented resolution before a conflicting change is saved. |
| E12 | As owner, book an eligible member with an available trainer within the 2-hour to 14-day window. Try the same slot again and an ineligible member/pack. | Booking confirms directly, holds exactly one credit and sends relevant in-app notices; overlap/ineligible attempts are rejected without another hold. |
| E13 | As member, request an available trainer slot; inspect the pending state, then withdraw it. Make a second request and have trainer accept it; make another and decline with a reason. | Pending request blocks time but holds no credit. Withdrawal/decline releases the slot without consuming credit; acceptance creates one confirmed session and one hold. The two-pending-request limit is enforced. |
| E14 | Open the same confirmed session from owner list/attention queue, trainer schedule/calendar and member sessions/calendar. Open its detail and event history; try date filters and paging. | Each role sees the same permitted status, local date/time and history; private data stays role scoped. |
| E15 | Use a session already eligible under real timing rules. Start it, complete it when eligible, add trainer notes and inspect member detail, credit history and earnings. | Session transitions and notes are visible to the proper roles; one held credit becomes one consumed credit; earnings/settlement appear once. |
| E16 | Use separate synthetic sessions for free early cancellation, late member cancellation, trainer/gym cancellation, no-show, owner reschedule and reasoned correction. Read each policy quote before confirming. | Each outcome matches its quote; history links original and corrected events; credit and pay effects are exact. A gym/trainer cancellation does not penalize the member, including an approved expiry remedy when needed. |
| E17 | On controlled due records, inspect pending-request expiry, 24-hour/one-hour reminders and scheduled-work health. Cancel or reschedule a reminder candidate. | Expiry and reminders appear once at the expected time; stale reminders do not appear after cancellation/reschedule. Record any worker or time-window limitation as Blocked rather than changing system time or business rules. |
| E18 | As trainer, open assigned client roster/profile. Create, edit and assign one workout plan and one meal plan; view both as member. Try another trainer's or gym's client URL. | Assigned content matches exactly in the member workspace; unauthorized client/plan access is denied. |
| E19 | As member, inspect home, next booking, deadline, pack balance/expiry, trainer directory, workout/meal plans and populated/empty states. | Links lead to the right records; counts and labels agree with the actions above; no other member's private information appears. |

## 4. Money, records and personal account

| ID | Browser journey | Pass conditions |
| --- | --- | --- |
| E20 | As owner, inspect financial periods, revenue/deferred value, expenses and P&L. Add an expense and budget, inspect variance, export CSV and open it. | Values recalculate once, the export matches the selected period/filters, and operational revenue is labeled distinctly from cash received. |
| E21 | As trainer, inspect own earnings/history. As owner, close and approve a dedicated pay period and apply a reasoned signed correction where permitted. | Trainer and owner totals reconcile; close/approval state and correction history persist; another trainer cannot see this trainer's private pay. |
| E22 | As owner, inspect analytics across windows, audit filters and export. Generate a new auditable action from an earlier journey and find it. | Window labels and counts are coherent; the action appears with actor, gym and reason; filtered export corresponds to the visible results. |
| E23 | Edit global account name and permitted gym profile fields. As owner, make a reasoned correction to a disposable member profile. Submit and withdraw a login-email correction request, then inspect platform closure workflow. | Field ownership and privacy are enforced. The request status/notice changes, while login email remains unchanged until the documented closure action. |
| E24 | With dedicated accounts, review personal/shared device sessions, renewal, device revocation, password change, current/all-device logout and security history. Exercise staff-assisted recovery on an eligible ordinary single-gym identity. | Revoked/expired sessions lose access; other intended sessions follow the selected action; password/recovery credentials are one-use and the event is audited. Do not use the shared three-gym main identities for recovery. |
| E25 | Trigger session, application, profile and security notifications. Open bell and separate account/gym histories, page, mark one/all read and follow destination links. | Counts, unread state and destinations agree with the underlying actions; Alpha gym notices do not appear in Beta. |
| E26 | Across admin, owner, trainer and member workspaces, switch light/dark mode, reload, use narrow mobile width and keyboard-only navigation. Check dialogs, validation, loading, empty and retry states on key forms. | Theme and sidebar choice persist; controls remain reachable/readable; focus is visible; errors explain a recoverable next step without losing entered data. |

## Close the run

Revisit Alpha and Beta after the journeys and compare membership, sessions, credits, financials and notifications for unexpected cross-gym changes. Confirm the created disposable records and any irreversible state changes are listed in the run log. Record every failed or blocked scenario with the exact screen, action, expected result, actual result and reproduction steps. A complete run requires every applicable E01–E26 scenario to have a recorded outcome; do not report the system as fully accepted while any critical journey is failed or untested.

The product feature inventory behind this runbook is [CLIENT-DEMO-PLAN.md](CLIENT-DEMO-PLAN.md), especially D01–D27. The PT timing and credit rules are in [PT-IMPLEMENTATION-GUIDE.md](PT-IMPLEMENTATION-GUIDE.md). Follow those documents when a scenario's expected result needs more precision.
