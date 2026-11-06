# Prototype follow-up issues

Updated: 6 November 2026. This is the separate backlog for work after the local, synthetic client demonstration. It does not authorize deployment or use of client data.

## Demo status and boundaries

- The local demo is running at `http://localhost:3000`. Its isolated synthetic credentials and database ownership details are in the ignored `.env.manual-test.json`. Use `pnpm manual:check` before presenting.
- The fresh demo fixture passed all four role logins, role access, eligible booking, credit balance, and three-gym isolation checks. The public application form was visually inspected in Chrome against the current local server. Automated role, booking, application, notification, and responsive/theme journeys have passed in focused runs.
- The complete Playwright run before the final fixes was **34 passed, 3 failed**. The three failed journeys passed in later focused runs. A complete uninterrupted rerun after those fixes has **not** been recorded. Do not describe the full suite as green.
- This is a local prototype, not a release sign-off. CF-01 and PT remain unverified until the required manual acceptance and release gates are complete.

## After-demo work

1. Run one uninterrupted complete Playwright suite on the final build, then update CF and PT evidence with the result. The preceding full run's three failures were mobile PT booking, owner live refresh assertion, and mobile owner tab click; focused reruns passed after fixes.
2. Complete manual owner application approval/rejection, applicant outcome, existing-account consent, pending-access, interruption and recovery acceptance on the current fixture. The public application page and pending/no-access outcome were previously inspected in Chrome; this does not cover every decision path.
3. Complete a structured visual and accessibility review of every route at desktop, 390px and 320px, in light and dark modes, including keyboard/focus and screen reader checks. Automated browser coverage and the Chrome application-page inspection are a representative prototype pass, not a route-by-route manual sign-off.
4. Review the notification integration flake: one full PT run returned one of two expected account notices, while a subsequent isolated rerun passed after removing concurrent queries on one transaction. Repeat under sustained load and investigate clock/snapshot behavior if it recurs.
5. Confirm production policies for account recovery durations, retention, identity assurance, email ownership/change, privacy, and notification delivery. The existing CF progress document distinguishes implemented defaults from confirmed choices.
6. Complete PT and CF release gates, upgrade/rollback rehearsal, production security review, and deployment/pilot planning separately. Do not use synthetic fixtures as proof for real data migration.

The earlier persistent manual fixture remains preserved in ignored `.env.manual-test.previous.json`; it should be cleaned only after verifying its ownership and that no one needs it. The new `.env.manual-test.json` is the demo fixture.

## Membership update after the demo walkthrough

- The application request itself now supplies applicant consent; Owner approval starts enrollment and ultimately adds the applicant to Members once reconciliation completes. A second applicant password step is no longer shown for new applications. Recheck interrupted operations that were created under the earlier two-step offer flow; they may require operator recovery.
- The synthetic Chrome walkthrough added an approved applicant to the persistent demo fixture. The earlier `pnpm manual:check` pass predates that change; its fixed baseline member counts may no longer match. Run an owned-fixture reset or adjust the check to tolerate the synthetic addition before claiming a fresh manual check pass.
- Complete route-by-route visual, mobile, keyboard and screen-reader acceptance, including the new two-column no-access/status pages, gym profile details, and Member Trainer profile. Focused automated theme and responsive checks passed, but manual acceptance remains pending.
- Rerun the uninterrupted full Playwright and PT suites after the direct-approval and Trainer-profile changes. Focused owned CF/Trainer integration and application/Trainer browser checks passed; they do not clear prior full-suite gaps.
- Trainer profile currently shows safe existing fields and aggregate completed sessions. Ratings and written reviews are outside the confirmed request to view a profile before booking.
