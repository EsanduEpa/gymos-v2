# GymOS client demo review

## Route inventory

| Route | Audience or purpose |
|---|---|
| `/account/email-correction` | Shared navigation or account flow, subject to session and gym access |
| `/account/notifications` | Shared navigation or account flow, subject to session and gym access |
| `/account/profile` | Shared navigation or account flow, subject to session and gym access |
| `/admin/account-recovery` | Super Admin, excluded from walkthrough |
| `/admin/email-correction-requests` | Super Admin, excluded from walkthrough |
| `/admin` | Super Admin, excluded from walkthrough |
| `/api/gyms/[slug]/financials/export` | Technical endpoint, authorization depends on handler |
| `/api/gyms/[slug]/profile-photo` | Technical endpoint, authorization depends on handler |
| `/api/gyms/[slug]/progress-photos/[photoId]` | Technical endpoint, authorization depends on handler |
| `/api/health` | Technical endpoint, authorization depends on handler |
| `/api/session/renew` | Technical endpoint, authorization depends on handler |
| `/api/session` | Technical endpoint, authorization depends on handler |
| `/applications` | Public entry or account flow |
| `/apply/[slug]` | Public entry or account flow |
| `/apply` | Public entry or account flow |
| `/change-password` | Shared navigation or account flow, subject to session and gym access |
| `/gym-account/setup` | Public entry or account flow |
| `/gyms/[slug]/apply` | Public entry or account flow |
| `/gyms/[slug]/enrollment-consent/[operationId]` | Invited participant |
| `/gyms/[slug]/member/calendar` | Member |
| `/gyms/[slug]/member/meal-plans` | Member |
| `/gyms/[slug]/member/membership` | Member |
| `/gyms/[slug]/member/membership/payments/[orderId]` | Member |
| `/gyms/[slug]/member/membership/payments` | Member |
| `/gyms/[slug]/member` | Member |
| `/gyms/[slug]/member/progress` | Member |
| `/gyms/[slug]/member/sessions` | Member |
| `/gyms/[slug]/member/trainers/[trainerId]/book` | Member |
| `/gyms/[slug]/member/trainers/[trainerId]` | Member |
| `/gyms/[slug]/member/trainers` | Member |
| `/gyms/[slug]/member/training-journal` | Member |
| `/gyms/[slug]/member/workout-plans` | Member |
| `/gyms/[slug]/notifications` | Shared navigation or account flow, subject to session and gym access |
| `/gyms/[slug]/owner/account-recovery` | Owner |
| `/gyms/[slug]/owner/analytics` | Owner |
| `/gyms/[slug]/owner/applications` | Owner |
| `/gyms/[slug]/owner/audit` | Owner |
| `/gyms/[slug]/owner/financials` | Owner |
| `/gyms/[slug]/owner/financials/payments/[orderId]` | Owner |
| `/gyms/[slug]/owner/financials/payments` | Owner |
| `/gyms/[slug]/owner/gym-config` | Owner |
| `/gyms/[slug]/owner/members/[memberId]` | Owner |
| `/gyms/[slug]/owner/members/new` | Owner |
| `/gyms/[slug]/owner/members` | Owner |
| `/gyms/[slug]/owner` | Owner |
| `/gyms/[slug]/owner/sessions/book` | Owner |
| `/gyms/[slug]/owner/sessions` | Owner |
| `/gyms/[slug]/owner/subscription` | Owner |
| `/gyms/[slug]/owner/trainers/[trainerId]` | Owner |
| `/gyms/[slug]/owner/trainers/new` | Owner |
| `/gyms/[slug]/owner/trainers` | Owner |
| `/gyms/[slug]` | Shared navigation or account flow, subject to session and gym access |
| `/gyms/[slug]/profile` | Shared navigation or account flow, subject to session and gym access |
| `/gyms/[slug]/sessions/[sessionId]` | Shared navigation or account flow, subject to session and gym access |
| `/gyms/[slug]/trainer/availability` | Trainer |
| `/gyms/[slug]/trainer/calendar` | Trainer |
| `/gyms/[slug]/trainer/clients/[memberId]` | Trainer |
| `/gyms/[slug]/trainer/clients/[memberId]/plans/meal` | Trainer |
| `/gyms/[slug]/trainer/clients/[memberId]/plans/workout` | Trainer |
| `/gyms/[slug]/trainer/clients/[memberId]/progress` | Trainer |
| `/gyms/[slug]/trainer/clients` | Trainer |
| `/gyms/[slug]/trainer/earnings` | Trainer |
| `/gyms/[slug]/trainer` | Trainer |
| `/gyms/[slug]/trainer/plans/meal/[planId]/edit` | Trainer |
| `/gyms/[slug]/trainer/plans/meal/new` | Trainer |
| `/gyms/[slug]/trainer/plans/workout/[planId]/edit` | Trainer |
| `/gyms/[slug]/trainer/plans/workout/new` | Trainer |
| `/gyms/[slug]/trainer/requests` | Trainer |
| `/gyms/[slug]/trainer/schedule` | Trainer |
| `/gyms/[slug]/trainer-enrollment-consent/[operationId]` | Invited trainer |
| `/gyms/select` | Shared navigation or account flow, subject to session and gym access |
| `/help` | Public entry or account flow |
| `/login` | Public entry or account flow |
| `/no-access` | Shared navigation or account flow, subject to session and gym access |
| `/` | Shared navigation or account flow, subject to session and gym access |
| `/recover` | Public entry or account flow |
| `/security` | Shared navigation or account flow, subject to session and gym access |
| `/test-ui` | Test harness |

## PT booking flow

1. A member opens a trainer profile and checks available slots. The Owner has a separate direct booking form with member and trainer selection. Slot queries use the gym time zone, availability rules and existing bookings.
2. The web form submits through a server action with a gym-scoped session token and idempotency key. The API validates the inputs, role and current gym access.
3. Member requests enter pending confirmation. Trainer acceptance rechecks the slot and membership, snapshots booking terms, and reserves a pack credit in the confirmation transaction. Owner direct bookings perform those checks and reserve the credit immediately.
4. Each role reads the resulting session through its workspace or the shared session detail route. Start, notes, completion and exception actions verify the role and session state. Settlement writes credit, revenue and pay effects under transactional rules.

## Walkthrough scenarios

1. An Owner opens the gym dashboard before the day begins and checks the schedule, pending work and member stats.
2. The Owner finds a member, reviews recent PT activity and opens the direct booking form to check the available choices.
3. A member compares trainers, picks a suitable time and requests PT. They check the result in their sessions list.
4. The assigned trainer opens their requests, accepts the booking and confirms it appears on the schedule.
5. The trainer opens an eligible session, records delivery and checks the resulting earnings.
6. The member reviews upcoming and completed PT activity, including how the app presents an empty or unavailable view.

## Issue log

### Observed issues

Scenario: An Owner reviews and books PT
Screen: Owner direct booking
Issue Type: Functional
Issue: With no published times, the time picker is disabled but Confirm and book is enabled. Clicking it shows a raw time validation pattern.
Severity: High

Scenario: A member requests PT with a trainer
Screen: Member request form
Issue Type: Functional
Issue: Request session is enabled when the trainer has no bookable times. Clicking it shows the same raw validation pattern.
Severity: High

Scenario: An Owner reviews and books PT
Screen: Owner direct booking
Issue Type: UI
Issue: The heading, participant labels and pricing panel use internal terms such as “trainer collision checking,” “eligible pack balance > 0” and “booking command.” A routine review panel uses success styling before any booking has happened.
Severity: Medium

### Hosted walkthrough coverage

- Owner login, dashboard, live schedule empty state, direct booking form, and empty-slot submission.
- Member login, dashboard, trainer directory and profile, request form, and empty-slot submission.
- Trainer login, daily schedule empty state, requests empty state, and earnings.
- The initial Owner and Member forms showed no bookable times for the default date. The assigned Trainer showed no pending requests. The walkthrough did not complete a hosted booking, acceptance or settlement. Existing hosted session records were preserved for the presentation. Member detail/history and a responsive visual pass also remain.

## Fixes and verification

- Both booking forms keep submission disabled until an available time is selected and clear the selection when the date or participants change. Out-of-order slot responses cannot replace the current results. Invalid time submissions now ask the user to choose an available start time.
- The Owner form uses short field labels, plain booking instructions, and a neutral booking summary.
- API and web production builds passed. Isolated Chromium verified Owner booking and credit reservation, Member request and withdrawal, and Trainer accept, decline, completion and notes. The Owner test initially timed out against its outdated selector. The rerun passed after updating the selector.
- Saved synthetic screenshots are in `apps/web/test-results/owner-session-booking/` and show the 390 px form before selecting a time and after the booking confirmation. Hosted baseline screens were captured during computer use.
- The changes are local. The hosted walkthrough reflects the deployed baseline.
- Three additional responsive Chromium scenarios passed across Member, Trainer and shared PT workspaces in both themes. Their screenshots are under `apps/web/test-results/ui-transformation/` and `apps/web/test-results/pt-workspaces/`.
- The standard local fixture health command also included a synthetic Super Admin login check. No Super Admin screens were opened in the hosted walkthrough.

## Loop #2

| Scenario | Screen | Issue Type | Issue | Severity |
|---|---|---|---|---|
| Check the gym schedule and pending work | Owner Sessions | UI | The review and scheduled work cards touch. Their borders merge at phone width. | Low |
| Check incoming requests | Trainer Schedule | UI | The requests card repeats its heading in an eyebrow directly above it. | Low |
| Review upcoming PT and empty states | Member Home | UI | The workout card says “Assigned by your trainer” even with no assigned workout. | Low |

Before screenshots are in `apps/web/test-results/demo-loop-evidence/`. The Chrome rerun covers the Owner dashboard and member detail, direct booking and confirmation, Member search and requests, Trainer decisions and settlement, session details, and responsive screens in both themes.

Loop #2 finished with three UI issues found and fixed. The six Chrome checks passed before the fixes.

## Loop #3

- Issues found this run: 0
- Issues fixed this run: 0
- Remaining open in the tested scenarios: 0
- Status: CLEAN — STOPPING

All six scenarios passed on the rebuilt app in Google Chrome, including Owner dashboard and member detail, Owner booking, Member requests and history, Trainer decisions and completion, and responsive PT screens in both themes from 320 to 1440 px. Owner, Trainer, and Member also signed in through the local login form on port 3002.

The Owner Sessions, Trainer Schedule, and Member Home screenshots each have a before and after pair under `apps/web/test-results/demo-loop-evidence/`. The refreshed screenshots show the card spacing, a single pending-request heading, and the empty workout state without an assignment badge. The final rerun used synthetic data. The hosted demo still serves the earlier build.
