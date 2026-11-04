# Complete screen inventory

Audit date: 5 November 2026 (Asia/Colombo). Scope: current `gymos-v2` working tree. Discovery only; implementation status means source-connected, not a fresh runtime certification.

## Scope, counting and common behavior

**39 page routes: 35 content-bearing routes (one placeholder and one gated synthetic test page) and four redirect entry routes.** Conditional support renderings are contextual variants of S10/S11, not extra route files. Query tabs, overlays and loading/error/not-found boundaries follow the route catalog. All paths use symbolic `[slug]`, `[memberId]`, `[trainerId]`, `[operationId]`; no real identities or data are included.

Tenant routes use `DashboardChrome`: desktop sidebar; mobile modal drawer; gym-name/profile/notification header; skip link and main region; optional support banner. Unless explicitly stated, owner/trainer/member pages invoke `requireGymContext`, display role-specific shell, obtain server-held auth, parse a Zod response and fetch without caching. 401 returns to login; 403/404 commonly produce uniform not-found; dependency/contract failures are unavailable states rather than empty success. These checks also exist on the API. All tenant content inherits the gym Suspense/loading, error and not-found boundary; extra route Suspense may supply page-specific labels. [apps/web/src/lib/gym-context.ts:1](../../apps/web/src/lib/gym-context.ts#L1), [apps/web/src/components/navigation/dashboard-chrome.tsx:1](../../apps/web/src/components/navigation/dashboard-chrome.tsx#L1), [apps/web/src/app/gyms/[slug]/error.tsx:1](../../apps/web/src/app/gyms/[slug]/error.tsx#L1).

Read-only pages have no mutation success state. Form success/error/pending belongs to the named component or action. Unknown mutation outcome means reconcile/retry the same unchanged request key, not assume failure. Draft preservation varies by form and is identified where relevant. No new routes or UI are proposed as existing behavior.

## Page route index

| ID | Route | Screen | Role | Status |
|---|---|---|---|---|
| S01 | `/` | Workspace resolver | All | Routing |
| S02 | `/admin` | SuperAdmin Control Panel | SUPER_ADMIN | Implemented / provisioning dependencies partial |
| S03 | `/login` | Sign in | Anonymous / expired users | Implemented |
| S04 | `/change-password` | Choose your own password | Authenticated identity, including first login | Implemented |
| S05 | `/no-access` | No active gym access | Authenticated USER without active gym | Implemented |
| S06 | `/gyms/select` | Choose a gym | Multi-gym USER | Implemented |
| S07 | `/gyms/[slug]` | Gym role resolver | Authorized tenant identity | Routing |
| S08 | `/gyms/[slug]/enrollment-consent/[operationId]` | Review member enrollment | Existing identity before new gym link | Implemented / login-return gap |
| S09 | `/gyms/[slug]/trainer-enrollment-consent/[operationId]` | Review trainer enrollment | Existing identity before new gym link | Implemented / login-return gap |
| S10 | `/gyms/[slug]/owner` | Live Gym Operations | OWNER or explicit support summary | Implemented with metric semantics caveat |
| S11 | `/gyms/[slug]/owner/members` | Member Management | OWNER or explicit support summary | Implemented |
| S12 | `/gyms/[slug]/owner/members/new` | Register New Member | OWNER | Implemented |
| S13 | `/gyms/[slug]/owner/members/[memberId]` | Member profile | OWNER | Partial: history tab source gap |
| S14 | `/gyms/[slug]/owner/trainers` | Trainer Roster Management | OWNER | Implemented |
| S15 | `/gyms/[slug]/owner/trainers/new` | Add New Personal Trainer | OWNER | Implemented |
| S16 | `/gyms/[slug]/owner/trainers/[trainerId]` | Trainer profile | OWNER | Implemented, bounded history |
| S17 | `/gyms/[slug]/owner/sessions` | PT Session Oversight & Analytics | OWNER | Partial: list navigation drops mode |
| S18 | `/gyms/[slug]/owner/sessions/book` | Book Personal Training Session | OWNER | Implemented, bounded option UI |
| S19 | `/gyms/[slug]/owner/financials` | Financial Management | OWNER | Implemented with paging omissions |
| S20 | `/gyms/[slug]/owner/analytics` | Operational Analytics | OWNER | Implemented estimates, window-label caveat |
| S21 | `/gyms/[slug]/owner/gym-config` | Gym Configuration | OWNER | Implemented limited settings |
| S22 | `/gyms/[slug]/owner/audit` | Security & Audit Logs | OWNER | Implemented filtered projection |
| S23 | `/gyms/[slug]/owner/subscription` | Subscription & Billing | OWNER | Placeholder |
| S24 | `/gyms/[slug]/trainer` | Trainer workspace resolver | TRAINER | Routing |
| S25 | `/gyms/[slug]/trainer/schedule` | Trainer Daily Schedule | TRAINER | Implemented |
| S26 | `/gyms/[slug]/trainer/requests` | Client Hire Requests | TRAINER | Implemented |
| S27 | `/gyms/[slug]/trainer/clients` | Assigned Client Roster | TRAINER | Implemented relationship-derived roster |
| S28 | `/gyms/[slug]/trainer/clients/[memberId]` | Trainer client profile | TRAINER | Implemented bounded previews / partial tab semantics |
| S29 | `/gyms/[slug]/trainer/plans/workout/new` | Create and assign workout plan | TRAINER | Implemented create-only |
| S30 | `/gyms/[slug]/trainer/plans/meal/new` | Create and assign meal plan | TRAINER | Implemented create-only |
| S31 | `/gyms/[slug]/trainer/earnings` | Trainer Earnings Portal | TRAINER | Implemented, timezone lookup mismatch |
| S32 | `/gyms/[slug]/member` | Member workspace resolver | MEMBER | Routing |
| S33 | `/gyms/[slug]/member/trainers` | Find a trainer | MEMBER | Implemented |
| S34 | `/gyms/[slug]/member/trainers/[trainerId]/book` | Request a trainer | MEMBER | Implemented |
| S35 | `/gyms/[slug]/member/sessions` | My PT Sessions | MEMBER | Implemented |
| S36 | `/gyms/[slug]/member/calendar` | Calendar | MEMBER | Implemented bounded calendar |
| S37 | `/gyms/[slug]/member/workout-plans` | Workout plans | MEMBER | Implemented read-only |
| S38 | `/gyms/[slug]/member/meal-plans` | Meal plans | MEMBER | Implemented read-only |
| S39 | `/test-ui` | Shared interface checks | Only when GYMOS_UI_TEST_HARNESS=1 | Mocked / gated test-only |

## S01 — Workspace resolver

**Path/role/status:** `/` · All · Routing.

**Structure, data and interactions:** Full-page Suspense loading. Account/API unavailable text when resolution fails.

**Transport:** GET /auth/session; cookie-driven, no input form.

**Rules, permissions and states:** No cookie/401 → login; password restriction → change-password; admin → admin; zero gyms → no-access; one gym → role landing; several → chooser.

**Relationships/components/evidence:** Entry from brand, recovery and sign-in. Source: [apps/web/src/app/page.tsx:8](../../apps/web/src/app/page.tsx#L8).

## S02 — SuperAdmin Control Panel

**Path/role/status:** `/admin` · SUPER_ADMIN · Implemented / provisioning dependencies partial.

**Structure, data and interactions:** Platform shell, page heading/total gyms, Tenant overview aggregate card, registry table, support-entry form and Create a gym card. Registry columns: Gym name/public slug; Owner; Members; Lifecycle status; Provisioning; Action. No sorting/search. Cursor pages up to 25 with Next/First links.

**Transport:** GET /admin/gyms, /admin/analytics/summary; POST /admin/analytics/refresh, /admin/gyms; operation status/retry/credential and lifecycle/support APIs. Create fields: gym name, slug, owner email, currency, timezone. Controls: View dashboard (select), support reason code/explanation, Enter/Cancel, lifecycle confirmation, refresh, retry, issue/reissue/acknowledge credential.

**Rules, permissions and states:** Platform session rechecked. Name 2–100; slug lowercase kebab; LKR/USD; valid IANA zone. Stable request key; safe status, pending owner verification, retryable/repair/final states; missing/stale aggregates explicit. Empty registry and fetch error/retry exist. No owner-consent web destination or worker deployment proof.

**Relationships/components/evidence:** Login/root → this page; support enters S10; All Gyms/Exit returns here. Components: Registry, ProvisioningForm, LifecycleControl, RefreshSummaries, ConfirmDialog. [apps/web/src/app/admin/page.tsx:18](../../apps/web/src/app/admin/page.tsx#L18), [apps/web/src/components/platform/registry.tsx:1](../../apps/web/src/components/platform/registry.tsx#L1).

## S03 — Sign in

**Path/role/status:** `/login` · Anonymous / expired users · Implemented.

**Structure, data and interactions:** Two-column auth illustration and form; responsive collapse. Email, password, Sign in; no signup/reset link. Fifteen-minute session notice.

**Transport:** login server action → POST /auth/login; native email/required controls. Error query maps invalid/rate/unavailable/expired/logout-uncertain/access to feedback.

**Rules, permissions and states:** Email normalized; API five attempts/minute. Successful login creates server cookie and chooses role workspace or password change. No pending spinner tied to login form and no returnTo consumption.

**Relationships/components/evidence:** Entry to all role spaces through S01/S06; consent pages redirect here but their return path is lost. Field/Button/Feedback. [apps/web/src/app/login/page.tsx:6](../../apps/web/src/app/login/page.tsx#L6), [apps/web/src/app/actions.ts:22](../../apps/web/src/app/actions.ts#L22).

## S04 — Choose your own password

**Path/role/status:** `/change-password` · Authenticated identity, including first login · Implemented.

**Structure, data and interactions:** Auth shell, current password, new password, confirmation, submit; successful state offers sign-in completion.

**Transport:** changePasswordAction → POST /auth/change-password; finishPasswordChangeAction clears browser cookies and routes to login.

**Rules, permissions and states:** New password 10–200 characters, contains something other than letters, no outer whitespace, differs from current, confirmation matches. Inline first contract issue/current-password/rate/unavailable feedback; pending and success states. Screen cookie check is preliminary; API verifies actual identity.

**Relationships/components/evidence:** Forced from login/session checks; finish → S03. ChangePasswordForm. [apps/web/src/components/credentials/change-password-form.tsx:1](../../apps/web/src/components/credentials/change-password-form.tsx#L1), [packages/contracts/src/credentials.ts:3](../../packages/contracts/src/credentials.ts#L3).

## S05 — No active gym access

**Path/role/status:** `/no-access` · Authenticated USER without active gym · Implemented.

**Structure, data and interactions:** Auth card with explanatory text and Sign out; no request-access form.

**Transport:** GET /auth/session; POST /auth/logout through signOut.

**Rules, permissions and states:** Anonymous/expired → login; password restriction → password page; admin → admin; restored gym links → root. Account unavailable text is distinct from no access.

**Relationships/components/evidence:** Root/login → here; asks user to contact gym administrator. [apps/web/src/app/no-access/page.tsx:9](../../apps/web/src/app/no-access/page.tsx#L9).

## S06 — Choose a gym

**Path/role/status:** `/gyms/select` · Multi-gym USER · Implemented.

**Structure, data and interactions:** Auth card, one gym link per access with name and lowercase role, Sign out. No persisted “current gym” selector or search.

**Transport:** GET /auth/session; role-specific href from gymRoleLandingPath.

**Rules, permissions and states:** Zero/one/admin access redirect appropriately; loading and account-unavailable text. Trainer links land on earnings.

**Relationships/components/evidence:** Login/root/Switch gym → chooser → owner dashboard, trainer earnings, member directory via member redirect. [apps/web/src/app/gyms/select/page.tsx:9](../../apps/web/src/app/gyms/select/page.tsx#L9).

## S07 — Gym role resolver

**Path/role/status:** `/gyms/[slug]` · Authorized tenant identity · Routing.

**Structure, data and interactions:** Loading and API-unavailable text; no operational dashboard of its own.

**Transport:** GET /gyms/:slug/access.

**Rules, permissions and states:** Slug validation; 401 login; 403/404 uniform not-found; owner routes to owner with selected error/created queries; trainer to earnings; member to member root.

**Relationships/components/evidence:** Old gym entry links → current workspace. [apps/web/src/app/gyms/[slug]/page.tsx:8](../../apps/web/src/app/gyms/[slug]/page.tsx#L8).

## S08 — Review member enrollment

**Path/role/status:** `/gyms/[slug]/enrollment-consent/[operationId]` · Existing identity before new gym link · Implemented / login-return gap.

**Structure, data and interactions:** Standalone auth/card flow; purpose explanation, current-password input, Accept and Decline. No gym shell or existing membership required.

**Transport:** POST /gyms/:slug/member-enrollments/:operationId/consent via corresponding server action.

**Rules, permissions and states:** Route identifiers validated; missing cookie → login with returnTo query. Backend validates subject/current password/operation. CONSENT_RECORDED or CONSENT_DECLINED terminal feedback; owner must retry original unchanged enrollment after acceptance. No automatic owner completion.

**Relationships/components/evidence:** Private link from member registration pending state; login can lose path. MemberEnrollmentConsentForm. [apps/web/src/app/gyms/[slug]/enrollment-consent/[operationId]/page.tsx:1](../../apps/web/src/app/gyms/[slug]/enrollment-consent/[operationId]/page.tsx#L1)

## S09 — Review trainer enrollment

**Path/role/status:** `/gyms/[slug]/trainer-enrollment-consent/[operationId]` · Existing identity before new gym link · Implemented / login-return gap.

**Structure, data and interactions:** Standalone auth/card flow; purpose explanation, current-password input, Accept and Decline. No gym shell or existing membership required.

**Transport:** POST /gyms/:slug/trainer-enrollments/:operationId/consent via corresponding server action.

**Rules, permissions and states:** Route identifiers validated; missing cookie → login with returnTo query. Backend validates subject/current password/operation. CONSENT_RECORDED or CONSENT_DECLINED terminal feedback; owner must retry original unchanged enrollment after acceptance. No automatic owner completion.

**Relationships/components/evidence:** Private link from trainer registration pending state; login can lose path. TrainerEnrollmentConsentForm. [apps/web/src/app/gyms/[slug]/trainer-enrollment-consent/[operationId]/page.tsx:1](../../apps/web/src/app/gyms/[slug]/trainer-enrollment-consent/[operationId]/page.tsx#L1)

## S10 — Live Gym Operations

**Path/role/status:** `/gyms/[slug]/owner` · OWNER or explicit support summary · Implemented with metric semantics caveat.

**Structure, data and interactions:** Tenant shell; four KPI cards, eight two-hour earnings buckets (06–22), first ten today session records (Time, Member, Trainer, Status, Fee), trainer floor cards; refresh/all sessions.

**Transport:** GET /gyms/:slug/dashboard; dashboard server action every 30s. Support cookie switches to sanitized support-summary API instead of owner data.

**Rules, permissions and states:** Retains last data with stale notice; no-data message; empty schedule/roster text. KPI definitions are in tooltip titles. Pending request metric exists in DTO but is not rendered. Support mode displays expiry/status/binding/counts/currency/timezone and Exit, with no owner commands.

**Relationships/components/evidence:** Owner login/sidebar landing; sessions link → S17. Admin support → same route, visibly labeled read-only. OwnerDashboardLive / SupportOwnerPage / DashboardChrome. [apps/web/src/app/gyms/[slug]/owner/page.tsx:14](../../apps/web/src/app/gyms/[slug]/owner/page.tsx#L14), [apps/web/src/components/navigation/owner-dashboard-live.tsx:1](../../apps/web/src/components/navigation/owner-dashboard-live.tsx#L1).

## S11 — Member Management

**Path/role/status:** `/gyms/[slug]/owner/members` · OWNER or explicit support summary · Implemented.

**Structure, data and interactions:** Heading/Register New Member; search name/email and status ACTIVE/INACTIVE/SUSPENDED; table: Member name, Contact(email), Active plan, Status, Expiry date, Actions(View Profile); range count and Previous/Next, 25/page.

**Transport:** GET /gyms/:slug/members?q&status&page&pageSize. Search also matches phone in API. Support context renders same read-only summary as S10 instead of roster.

**Rules, permissions and states:** Only BASIC or published COMPLETE registrations returned; account state and pending summary returned but not surfaced. Loading/empty/no matches/error+retry. End date shown is exclusive without clarification in table.

**Relationships/components/evidence:** Sidebar → list → S12 registration / S13 profile; profile back → list. OwnerGymPage. [apps/web/src/components/navigation/owner-gym-page.tsx:1](../../apps/web/src/components/navigation/owner-gym-page.tsx#L1), [apps/web/src/app/gyms/[slug]/owner/members/page.tsx:1](../../apps/web/src/app/gyms/[slug]/owner/members/page.tsx#L1).

## S12 — Register New Member

**Path/role/status:** `/gyms/[slug]/owner/members/new` · OWNER · Implemented.

**Structure, data and interactions:** Back to list and registration card. Fields: name, required email/phone/DOB, optional emergency contact/health notes, initial active plan. Pending-consent panel and credential handoff replace/augment form.

**Transport:** GET configuration for active plans; POST member-registrations. Current password is never collected from another identity by owner. Credential acknowledge/reissue through enrollments API.

**Rules, permissions and states:** Name 2–120, email ≤254, phone ≤40, notes ≤4000, emergency ≤240; contract-valid DOB and plan. Empty active-plan list disables submit. Draft retained during pending consent/errors. New identity one-time password/copy/replacement/acknowledge; lost response can show completed without replayable secret. Registration creates agreed term, no cash.

**Relationships/components/evidence:** S11 → new → S08 consent if existing identity → original form retry → S13 profile after handoff. MemberRegistrationForm. [apps/web/src/app/gyms/[slug]/owner/members/new/page.tsx:1](../../apps/web/src/app/gyms/[slug]/owner/members/new/page.tsx#L1), [apps/web/src/components/members/member-registration-form.tsx:1](../../apps/web/src/components/members/member-registration-form.tsx#L1).

## S13 — Member profile

**Path/role/status:** `/gyms/[slug]/owner/members/[memberId]` · OWNER · Partial: history tab source gap.

**Structure, data and interactions:** Member name/contact/back; inner status and three tabs: Overview, Attendance History, Membership & Packs. Overview: account state, joined/email/phone/DOB/emergency, health, registration state, status-change form. History: plan/dates/agreed value, term pager; pack ledger and issue form.

**Transport:** GET members/:id with membership page/pageSize; status POST and operation resume; session pack issue POST. Attendance receives recentSessions: [] from detail endpoint; separate recent-sessions API exists but is not called.

**Rules, permissions and states:** Status form requires target, reason, acknowledgment, expectedVersion and stable key; future-session cancellation warning and recovery. Pack credits 1–1000, validity 1–3650, nonnegative price/currency. Disabled for non-ACTIVE member or absent currency. Empty states/errors/retry. No general profile edit or membership-renewal form.

**Relationships/components/evidence:** S11/S12 → profile; #history preserved for term paging; back to S11. MemberProfileTabs/MemberLifecycleForm/SessionPackPanel/Tabs. [apps/web/src/components/members/member-profile-tabs.tsx:1](../../apps/web/src/components/members/member-profile-tabs.tsx#L1), [apps/api/src/gyms.controller.ts:325](../../apps/api/src/gyms.controller.ts#L325).

## S14 — Trainer Roster Management

**Path/role/status:** `/gyms/[slug]/owner/trainers` · OWNER · Implemented.

**Structure, data and interactions:** Heading/Add New Trainer; roster count; search(name/email), status, level; table: Name(contact), Level and specialisations, Approved shift, Status, Profile; 25/page.

**Transport:** GET /gyms/:slug/trainers. Profile/registration links.

**Rules, permissions and states:** Published-registration bindings are intended; q branch overwrites binding OR predicate (audit finding). Error/empty/pagination states. No edit-level or bulk operation UI.

**Relationships/components/evidence:** Sidebar → S14 → S15/S16; profile back. [apps/web/src/app/gyms/[slug]/owner/trainers/page.tsx:1](../../apps/web/src/app/gyms/[slug]/owner/trainers/page.tsx#L1), [apps/api/src/trainers.controller.ts:57](../../apps/api/src/trainers.controller.ts#L57).

## S15 — Add New Personal Trainer

**Path/role/status:** `/gyms/[slug]/owner/trainers/new` · OWNER · Implemented.

**Structure, data and interactions:** Back to roster; registration fields fullName/email/phone/level/yearsExperience/comma-separated specialisations/shiftStart/shiftEnd/bio. Existing identity consent and new-credential handoff states.

**Transport:** POST trainer-registrations; credential acknowledge/reissue endpoints reused from member-actions; POST trainer enrollment consent in separate identity flow.

**Rules, permissions and states:** Name 2–120, email≤254, phone≤40, experience 0–80, specialisations parsed to array, paired optional shift times, bio≤2000. Draft retained. Pending/errors/success/copy failure; temporary credential requires own-password change. Acknowledge returns owner dashboard, not new trainer profile.

**Relationships/components/evidence:** S14 → S15; pending → S09; finished → S10. TrainerRegistrationForm. [apps/web/src/components/trainers/trainer-registration-form.tsx:1](../../apps/web/src/components/trainers/trainer-registration-form.tsx#L1).

## S16 — Trainer profile

**Path/role/status:** `/gyms/[slug]/owner/trainers/[trainerId]` · OWNER · Implemented, bounded history.

**Structure, data and interactions:** Name/contact/back; details(level, experience, specialisations, joined, biography/status); lifecycle card; approve recurring shift; performance metrics(related clients/completed/latest-ten completed), recent sessions and unavailable-ratings note.

**Transport:** GET trainers/:id; PUT trainers/:id/shift; POST status; lifecycle status/resume APIs.

**Rules, permissions and states:** Shift start/end required, overnight selection, 15min–16h duration; version conflicts and changed access. Status target active/deactivated, reason≤500 and confirmation, stable key/recovery. Profile errors+retry; no sessions feedback. Latest ten displayed with total/hasMore but no pager. Historical snapshots remain unchanged.

**Relationships/components/evidence:** S14 → profile → back; TrainerShiftForm/TrainerLifecycleForm. [apps/web/src/app/gyms/[slug]/owner/trainers/[trainerId]/page.tsx:1](../../apps/web/src/app/gyms/[slug]/owner/trainers/[trainerId]/page.tsx#L1), [apps/web/src/components/trainers/trainer-shift-form.tsx:1](../../apps/web/src/components/trainers/trainer-shift-form.tsx#L1).

## S17 — PT Session Oversight & Analytics

**Path/role/status:** `/gyms/[slug]/owner/sessions` · OWNER · Partial: list navigation drops mode.

**Structure, data and interactions:** Default monthly calendar, explicit Calendar/Session list route links and Book PT Session. Calendar month arrows/today and per-day/event links. List day/month/date/search/state/member/paging plus owner monthly member overview. Ledger: Session(time/duration/type), Member, Trainer, Status, Fee, Notes/actions. Overview: Member, Latest membership, lifetime Pack credits, monthly state counts, More.

**Transport:** GET sessions and member-session-overview; calendar sequentially fetches all 100-row pages; quote/cancel/no-show endpoints on list. Read-only calendar does not auto-poll like list.

**Rules, permissions and states:** Verified role and schema; partial calendar page failure is marked. Error/empty/full totals and separate overview error. Owner start/notes commands can be advertised but not mounted. Shared list links/filter GET omit view=list, causing default calendar on next transition.

**Relationships/components/evidence:** Sidebar/dashboard → calendar; day → list; S18 booking; policy dialogs from list. SessionReadView/OwnerMonthOverview/OwnerSessionCalendar. [apps/web/src/app/gyms/[slug]/owner/sessions/page.tsx:20](../../apps/web/src/app/gyms/[slug]/owner/sessions/page.tsx#L20), [apps/web/src/components/sessions/read-views/session-read-view.tsx:46](../../apps/web/src/components/sessions/read-views/session-read-view.tsx#L46).

## S18 — Book Personal Training Session

**Path/role/status:** `/gyms/[slug]/owner/sessions/book` · OWNER · Implemented, bounded option UI.

**Structure, data and interactions:** Back to oversight; member/trainer selects; local date/start time; optional UTC offset; type; duration; notes; server pricing/policy panel; Confirm and book; success links to oversight.

**Transport:** GET session-booking-options (first 100 members/trainers); POST sessions/bookings; fields include server timezone, idempotency key. URL qMembers/qTrainers/localDate/type can alter initial data, but there are no visible option search/pagers.

**Rules, permissions and states:** Future slot≤365 days; duration current minimum–480; active registered participants, selected-date membership/pack credit, trainer/member collision rechecked server-side; credit held on commit. No eligible options warning; server failures/409/422 and uncertain retry. Client date change does not reload option eligibility.

**Relationships/components/evidence:** S17 → book → S17; OwnerSessionBookingForm. [apps/web/src/components/sessions/owner-session-booking-form.tsx:1](../../apps/web/src/components/sessions/owner-session-booking-form.tsx#L1), [apps/web/src/app/session-booking-actions.ts:1](../../apps/web/src/app/session-booking-actions.ts#L1).

## S19 — Financial Management

**Path/role/status:** `/gyms/[slug]/owner/financials` · OWNER · Implemented with paging omissions.

**Structure, data and interactions:** Header Log Expense/Export; six URL tabs: Revenue, Expenses, Deferred, Payroll, P&L, Export. Revenue totals and lines(Date, Category, Source, Value); expenses list/category/date filters + log form; seven monthly category budget editors; payroll period list/commands; P&L totals + Category/Amount/Records expense mix; export type/date/audit page/action form.

**Transport:** Configuration first, then relevant revenue/expenses/budgets/payroll/pnl reads in parallel; expense/budget/close/approve POSTs; CSV POST through Next handler. Deferred tab reads revenue response.deferred rather than dedicated alias endpoint.

**Rules, permissions and states:** Finance is operational earning, not cash. LKR/USD, exact decimals, inclusive filter dates converted to exclusive bounds; expenses cannot be future; recurring flag is descriptive; payroll OPEN→CLOSED→APPROVED, approval not payout; SALARIES excluded from P&L expense deduction. Missing configuration renders bare main without shell. Per-section failure/empty/success; page query accepted but no revenue/expense page links.

**Relationships/components/evidence:** Sidebar → finance; tabs retain date/month/page mostly; Log Expense selects expenses tab; export failures return with flag. Finance forms detailed below. [apps/web/src/app/gyms/[slug]/owner/financials/page.tsx:1](../../apps/web/src/app/gyms/[slug]/owner/financials/page.tsx#L1), [apps/web/src/components/finance/finance-forms.tsx:1](../../apps/web/src/components/finance/finance-forms.tsx#L1).

## S20 — Operational Analytics

**Path/role/status:** `/gyms/[slug]/owner/analytics` · OWNER · Implemented estimates, window-label caveat.

**Structure, data and interactions:** 30 days/Six months links; trainer utilization bars with scheduled/idle/available hours; peak sessions by hour; member profile growth monthly bars, formulas and text alternatives.

**Transport:** GET analytics?window=30d|6m, backed by session/trainer/member records.

**Rules, permissions and states:** Not footfall, retention or measured attendance. Utilization uses trailing30+future365 scheduling divided by current shift×22 (8h fallback), caps 100%; peak fixed trailing30 by 06–20; growth fixed six months despite window choice. >100 trainers fails bound. Unavailable/empty trainers explicit.

**Relationships/components/evidence:** Sidebar → analytics; Card/CSS charts. [apps/api/src/analytics/analytics.service.ts:49](../../apps/api/src/analytics/analytics.service.ts#L49), [apps/web/src/app/gyms/[slug]/owner/analytics/page.tsx:1](../../apps/web/src/app/gyms/[slug]/owner/analytics/page.tsx#L1).

## S21 — Gym Configuration

**Path/role/status:** `/gyms/[slug]/owner/gym-config` · OWNER · Implemented limited settings.

**Structure, data and interactions:** Five client tabs: Gym Profile, Membership Plans, PT Session Rates, Trainer Pay Rates, Cancellation Policy. Profile contains separate operational contact/pay-period, public display name and appearance cards; currency/timezone read-only. Plan list and toggleable Add New Plan inline form.

**Transport:** GET configuration/theme settings/public profile; POST configuration/membership-plans; PATCH public-profile/theme. Each save has its own feedback/version domain.

**Rules, permissions and states:** Expected version required. Settings fields and constraints in panel catalog below. Price/rate/policy snapshots preserve past confirmations. Blank optional fees mean standard fallback, zero valid. No plan edit/deactivate, theme upload/font/layout control, currency/timezone change. Percent conversion needs correction for fractional values below1 (audit). Loading error/retry, empty plans, pending and per-form success.

**Relationships/components/evidence:** Sidebar → settings; new plan enables member registration options; appearance refreshes shell; Tabs/Field/FormCard. [apps/web/src/components/configuration/owner-gym-configuration.tsx:11](../../apps/web/src/components/configuration/owner-gym-configuration.tsx#L11).

## S22 — Security & Audit Logs

**Path/role/status:** `/gyms/[slug]/owner/audit` · OWNER · Implemented filtered projection.

**Structure, data and interactions:** Action dropdown and Filter; Export current page CSV; table: When(UTC), Action, Actor ID, Resource(type/ID), Transition(from/to/version). 20/page with Previous/Next.

**Transport:** GET audit?actionType&page&pageSize; POST financials/export kind=audit through authenticated handler.

**Rules, permissions and states:** Sanitized transitions only, fixed event allow-list, no private metadata. Invalid query→not-found; unavailable/empty/exportError. Some persisted event codes excluded/mismatched; not a comprehensive security event explorer.

**Relationships/components/evidence:** Sidebar → audit; export returns here on error preserving action/page. [apps/web/src/app/gyms/[slug]/owner/audit/page.tsx:1](../../apps/web/src/app/gyms/[slug]/owner/audit/page.tsx#L1), [apps/api/src/notifications.controller.ts:8](../../apps/api/src/notifications.controller.ts#L8).

## S23 — Subscription & Billing

**Path/role/status:** `/gyms/[slug]/owner/subscription` · OWNER · Placeholder.

**Structure, data and interactions:** Owner shell, heading, single info card explicitly saying billing unavailable in V2.

**Transport:** Only session/access/theme context; no billing API, model, payment method or mutation.

**Rules, permissions and states:** No billing status, payment, invoice or plan-change controls. Preserve honest status or reconsider navigation label; do not design a fictional connected billing flow.

**Relationships/components/evidence:** Sidebar → placeholder. [apps/web/src/app/gyms/[slug]/owner/subscription/page.tsx:1](../../apps/web/src/app/gyms/[slug]/owner/subscription/page.tsx#L1).

## S24 — Trainer workspace resolver

**Path/role/status:** `/gyms/[slug]/trainer` · TRAINER · Routing.

**Structure, data and interactions:** No content; redirects to schedule.

**Transport:** No page read before redirect; schedule authorizes.

**Rules, permissions and states:** Different from login/root/chooser trainer earnings landing.

**Relationships/components/evidence:** gymRoleUrl helper/switch role routes → S25. [apps/web/src/app/gyms/[slug]/trainer/page.tsx:1](../../apps/web/src/app/gyms/[slug]/trainer/page.tsx#L1).

## S25 — Trainer Daily Schedule

**Path/role/status:** `/gyms/[slug]/trainer/schedule` · TRAINER · Implemented.

**Structure, data and interactions:** Pending request cards with member/time/type/note and Accept/Decline forms; All hire requests link; shared day/month/search/state/pagination; cards show time/member/status/type/duration/pay/fee/notes, elapsed active clock and available lifecycle controls.

**Transport:** GET me/sessions plus me/session-requests; POST request respond/start/complete/cancel/no-show; PATCH notes; quote GET. Full-document session refresh every30s/focus.

**Rules, permissions and states:** Own actor only; accept reserves credit. Errors in main session read distinct from request read, but non-OK request fetch can be silently omitted because requests=null. Start/complete actions versioned; completion browser confirm; notes member-visible, max4000; available actions from server.

**Relationships/components/evidence:** Sidebar/trainer redirect → schedule → S26 / policy dialog / notes details. [apps/web/src/app/gyms/[slug]/trainer/schedule/page.tsx:1](../../apps/web/src/app/gyms/[slug]/trainer/schedule/page.tsx#L1), [apps/web/src/components/sessions/session-lifecycle-controls.tsx:1](../../apps/web/src/components/sessions/session-lifecycle-controls.tsx#L1).

## S26 — Client Hire Requests

**Path/role/status:** `/gyms/[slug]/trainer/requests` · TRAINER · Implemented.

**Structure, data and interactions:** Pending count KPI, list of member request cards: requested time, duration/type, goal/note, pending badge; Accept and reserve one credit; optional decline-message textarea and Decline.

**Transport:** GET me/session-requests; POST sessions/:id/respond with expectedVersion/decision/key/reason.

**Rules, permissions and states:** Only assigned active trainer; accept rechecks selected date, pack/membership/collisions/configuration; decline no hold. Error/empty/pending/success; no paging/search controls.

**Relationships/components/evidence:** Schedule/nav/notification → requests → schedule or client roster after confirmation. [apps/web/src/app/gyms/[slug]/trainer/requests/page.tsx:1](../../apps/web/src/app/gyms/[slug]/trainer/requests/page.tsx#L1), [apps/web/src/components/sessions/session-request-forms.tsx:26](../../apps/web/src/components/sessions/session-request-forms.tsx#L26).

## S27 — Assigned Client Roster

**Path/role/status:** `/gyms/[slug]/trainer/clients` · TRAINER · Implemented relationship-derived roster.

**Structure, data and interactions:** Search(name/email); table: Client name(email), Member status, Pack balance(available/held), Last session, Actions(View 360° Profile); 25/page navigation.

**Transport:** GET me/clients?projection=summary&q&page&pageSize.

**Rules, permissions and states:** Current confirmed relationship and operational identity required; not permanent owner assignment. Empty confirmed-clients message and errors; heading mentions progress but no measurement model/UI.

**Relationships/components/evidence:** Sidebar → roster → S28. [apps/web/src/app/gyms/[slug]/trainer/clients/page.tsx:1](../../apps/web/src/app/gyms/[slug]/trainer/clients/page.tsx#L1), [apps/api/src/coaching/coaching.service.ts:34](../../apps/api/src/coaching/coaching.service.ts#L34).

## S28 — Trainer client profile

**Path/role/status:** `/gyms/[slug]/trainer/clients/[memberId]` · TRAINER · Implemented bounded previews / partial tab semantics.

**Structure, data and interactions:** Overview, Workouts, Meal plans, Session history anchor sections. Contact/DOB/emergency/member status/pack balance/health; latest two own workout plans with exercise lists; latest two own meal plans with totals/entries; latest ten sessions(status/date/notes). Create workout/meal links.

**Transport:** GET me/clients/:id. All sections rendered together; anchors carry role=tab/tablist/tabpanel but no selected/keyboard state.

**Rules, permissions and states:** Current relationship revalidated; 401 login and 403/404 hidden; error feedback. Older plan/history totals and hasMore text but no browse control. Workout profile preview omits durationMinutes although member plan view includes it.

**Relationships/components/evidence:** S27→profile→S29/S30 with memberId; no explicit back-to-roster control in this page. [apps/web/src/app/gyms/[slug]/trainer/clients/[memberId]/page.tsx:1](../../apps/web/src/app/gyms/[slug]/trainer/clients/[memberId]/page.tsx#L1).

## S29 — Create and assign workout plan

**Path/role/status:** `/gyms/[slug]/trainer/plans/workout/new` · TRAINER · Implemented create-only.

**Structure, data and interactions:** Requires memberId query; validates client first. Plan title/optional description; 1–100 exercise fieldsets(name,sets,reps,kg,duration,notes); Add/Remove; Save and assign; success link back to profile. Starts with two prefilled example exercises.

**Transport:** GET client profile; POST me/clients/:memberId/workout-plans via saveWorkoutPlan.

**Rules, permissions and states:** Title≤120, description/notes≤4000; sets1–100; optional reps1–1000, kg0–1000 to3 decimal places, duration1–1440. Stable key and relationship recheck; pending/validation/unknown outcome/success. No draft persistence, reorder, edit/delete or completion.

**Relationships/components/evidence:** S28→builder→S28; member sees S37. [apps/web/src/components/coaching/workout-plan-builder.tsx:1](../../apps/web/src/components/coaching/workout-plan-builder.tsx#L1), [apps/web/src/app/workout-plan-actions.ts:1](../../apps/web/src/app/workout-plan-actions.ts#L1).

## S30 — Create and assign meal plan

**Path/role/status:** `/gyms/[slug]/trainer/plans/meal/new` · TRAINER · Implemented create-only.

**Structure, data and interactions:** Requires memberId; title, assigned-client text, live nutrition totals; 1–100 meal fieldsets(day,meal type,food,calories,protein,carbs,fat), Add/Remove, Save and assign.

**Transport:** GET client profile; POST me/clients/:memberId/meal-plans via saveMealPlan.

**Rules, permissions and states:** Day1–7 Monday-first; six meal types; title≤120, food≤500; optional calories0–100000 and macros0–10000 to2 decimals; empty versus zero preserved in payload. Relationship/key checks and pending/error/unknown/success. Live totals treat blank as0. No date range, edit/delete or current-plan selection.

**Relationships/components/evidence:** S28→builder; member S38 and S36 calendar. No dedicated back/success profile link in builder. [apps/web/src/components/coaching/meal-plan-builder.tsx:1](../../apps/web/src/components/coaching/meal-plan-builder.tsx#L1), [packages/contracts/src/coaching.ts:103](../../packages/contracts/src/coaching.ts#L103).

## S31 — Trainer Earnings Portal

**Path/role/status:** `/gyms/[slug]/trainer/earnings` · TRAINER · Implemented, timezone lookup mismatch.

**Structure, data and interactions:** Three KPIs total/count/average; month filter; total/period status summary and date/session ID/payroll-state/value rows; 25/page.

**Transport:** GET me/earnings by month date bounds; also GET configuration, which is owner-only and therefore denied for trainer. Page silently uses UTC if configuration fails.

**Rules, permissions and states:** Own trainer earnings only, no payout reporting. Default month from UTC rather than gym-local clock. Empty/no current period/unavailable feedback, query sanitization. Amounts formatted by Number(...).toFixed(2), distinct from exact server decimal calculations.

**Relationships/components/evidence:** Login/root/chooser trainer landing and sidebar Earnings; no route for payout. [apps/web/src/app/gyms/[slug]/trainer/earnings/page.tsx:39](../../apps/web/src/app/gyms/[slug]/trainer/earnings/page.tsx#L39), [apps/api/src/configuration.controller.ts:71](../../apps/api/src/configuration.controller.ts#L71).

## S32 — Member workspace resolver

**Path/role/status:** `/gyms/[slug]/member` · MEMBER · Routing.

**Structure, data and interactions:** Redirect only to trainers.

**Transport:** No data before redirect; directory authorizes.

**Rules, permissions and states:** No member metric home page.

**Relationships/components/evidence:** Login/root/chooser → S33. [apps/web/src/app/gyms/[slug]/member/page.tsx:1](../../apps/web/src/app/gyms/[slug]/member/page.tsx#L1).

## S33 — Find a trainer

**Path/role/status:** `/gyms/[slug]/member/trainers` · MEMBER · Implemented.

**Structure, data and interactions:** Search by trainer name; 24/page grid with initial avatar/name/level/shift/specialisations/bio, explicit rating unavailable and Request session button.

**Transport:** GET me/trainer-directory?q&page&pageSize.

**Rules, permissions and states:** Active published trainers only; no private email/phone. Empty/no match/error feedback; next/previous. Repeated request aria-label does not identify trainer individually.

**Relationships/components/evidence:** Member home/sidebar→directory→S34; sessions/calendar Find trainer links. [apps/web/src/app/gyms/[slug]/member/trainers/page.tsx:1](../../apps/web/src/app/gyms/[slug]/member/trainers/page.tsx#L1).

## S34 — Request a trainer

**Path/role/status:** `/gyms/[slug]/member/trainers/[trainerId]/book` · MEMBER · Implemented.

**Structure, data and interactions:** Selected trainer info/shift; available/held/expired today and active-membership hint; date/time/type/duration/notes/optional repeated-time UTC offset; Request session.

**Transport:** GET me/session-request-options?trainerId; POST me/session-requests.

**Rules, permissions and states:** Credit remains available until acceptance. API verifies selected-day membership/pack even when today unavailable. Current minimum duration–480 and future horizon enforced; pending/error/success+sessions link. Uncontrolled form fields may reset after action failures.

**Relationships/components/evidence:** S33→request→S35; trainer later sees S26. [apps/web/src/app/gyms/[slug]/member/trainers/[trainerId]/book/page.tsx:1](../../apps/web/src/app/gyms/[slug]/member/trainers/[trainerId]/book/page.tsx#L1), [apps/web/src/components/sessions/session-request-forms.tsx:1](../../apps/web/src/components/sessions/session-request-forms.tsx#L1).

## S35 — My PT Sessions

**Path/role/status:** `/gyms/[slug]/member/sessions` · MEMBER · Implemented.

**Structure, data and interactions:** Default month unless date specified; day/month/date/search/state navigation, seven monthly state counts, lifetime credit balance, own session cards(status/type/trainer/time/duration/fee/member-visible notes/decline reason), pagination, Find a trainer.

**Transport:** GET me/sessions plus seven state-specific count reads in month view; cancel/withdraw quote and POST. Session refresh every30s/focus.

**Rules, permissions and states:** Own identity/actor only. Pending withdrawal uses no credit; scheduled cancellation follows stored policy and acknowledgment. Loading/failure/retry/empty/partial-count states. No start/complete/no-show member actions.

**Relationships/components/evidence:** Sidebar/notifications/request success→S35; Find trainer→S33. SessionReadView/SessionPolicyControls. [apps/web/src/app/gyms/[slug]/member/sessions/page.tsx:1](../../apps/web/src/app/gyms/[slug]/member/sessions/page.tsx#L1), [apps/web/src/components/sessions/read-views/load-session-read-page.ts:76](../../apps/web/src/components/sessions/read-views/load-session-read-page.ts#L76).

## S36 — Calendar

**Path/role/status:** `/gyms/[slug]/member/calendar` · MEMBER · Implemented bounded calendar.

**Structure, data and interactions:** Monday-first month table, previous/next month links; pressed day buttons with item counts/dots; selected-day panel PT status/time/trainer/type/notes and repeating weekday meal entries; legend and Find trainer; My PT Sessions link.

**Transport:** Discover gym-local today via me/sessions; read first 100 month sessions and first 100 meal plans. No live mutation or auto-refresh control in calendar.

**Rules, permissions and states:** Own data; truncation notices for sessions/plans; session read failure alert and separate meal-load status. All loaded meal plans repeat weekly without effective-date/current-plan semantics. Selected day uses local React state and is not keyed on month change.

**Relationships/components/evidence:** Sidebar→calendar→S35/S33; MemberSessionCalendar. [apps/web/src/app/gyms/[slug]/member/calendar/page.tsx:1](../../apps/web/src/app/gyms/[slug]/member/calendar/page.tsx#L1), [apps/web/src/components/sessions/member-session-calendar.tsx:1](../../apps/web/src/components/sessions/member-session-calendar.tsx#L1).

## S37 — Workout plans

**Path/role/status:** `/gyms/[slug]/member/workout-plans` · MEMBER · Implemented read-only.

**Structure, data and interactions:** Assigned-plan count and 20/page articles: name/description/created date; ordered exercise name,sets,reps,kg,duration,notes; Previous/Next. No today filter/checklist.

**Transport:** GET me/workout-plans?page&pageSize=20.

**Rules, permissions and states:** Own registered active member, no edit/completion action. Empty/error feedback and pagination; 403/404 domain response becomes unavailable content rather than explicit not-found after initial context check.

**Relationships/components/evidence:** Sidebar→plans; trainer S29 creates content. Reuses trainer-client-profile CSS module. [apps/web/src/app/gyms/[slug]/member/workout-plans/page.tsx:1](../../apps/web/src/app/gyms/[slug]/member/workout-plans/page.tsx#L1).

## S38 — Meal plans

**Path/role/status:** `/gyms/[slug]/member/meal-plans` · MEMBER · Implemented read-only.

**Structure, data and interactions:** 20/page assigned plan articles with name/date; total calories/macros; weekday/meal type/food/calories entries; Previous/Next.

**Transport:** GET me/meal-plans?page&pageSize=20.

**Rules, permissions and states:** Own member only; no completion/edit/purchase. Unknown macro totals printed as0, so unknown and known zero are conflated. Empty/error states; same 403/404 handling as workouts.

**Relationships/components/evidence:** Sidebar→plans; trainer S30 creates; S36 projects weekday activities. [apps/web/src/app/gyms/[slug]/member/meal-plans/page.tsx:1](../../apps/web/src/app/gyms/[slug]/member/meal-plans/page.tsx#L1).

## S39 — Shared interface checks

**Path/role/status:** `/test-ui` · Only when GYMOS_UI_TEST_HARNESS=1 · Mocked / gated test-only.

**Structure, data and interactions:** Synthetic three-row table with two-row pagination, Members/disabled Billing/Activity tabs, confirmation dialog, member-name field, outside link and confirmation-attempt counter.

**Transport:** No domain API. Delayed local confirm deliberately reports error.

**Rules, permissions and states:** Flag off→not-found; tests keyboard/pending/error/narrow states. This is not member editing or billing implementation.

**Relationships/components/evidence:** Not in navigation. UiTestHarness/ConfirmDialog/DataTable/Tabs. [apps/web/src/app/test-ui/page.tsx:1](../../apps/web/src/app/test-ui/page.tsx#L1), [apps/web/src/app/test-ui/ui-test-harness.tsx:1](../../apps/web/src/app/test-ui/ui-test-harness.tsx#L1).

## Significant panels, overlays, forms and state families

These are distinct design surfaces even though they do not add page routes.

| Surface | Host | Exact content/actions and state requirements | Evidence |
|---|---|---|---|
| Mobile navigation drawer | All shells | `dialog.showModal`; same role links; Close, Escape/backdrop, body scroll lock, focus trap/return; responsive closes at768; Sign out | [apps/web/src/components/navigation/dashboard-chrome.tsx:40](../../apps/web/src/components/navigation/dashboard-chrome.tsx#L40) |
| Notification popover | Tenant header except support | Unread badge capped99+; latest 5 title/message/time/deep link; Mark read, Mark all read-through snapshot, Refresh, Close; loading/empty/stale/error/pending | [apps/web/src/components/navigation/notifications-bell.tsx:62](../../apps/web/src/components/navigation/notifications-bell.tsx#L62) |
| Support entry | S02 | Selected gym, one of three diagnosis reason codes, explanation10–500, Enter/Cancel, replaced-context/15-minute notice, pending/failure; support banner selected gym and expiry | [apps/web/src/components/platform/registry.tsx:19](../../apps/web/src/components/platform/registry.tsx#L19) |
| Suspend/reactivate/resume confirmation | S02 | Consequences, reason10–500, current version/stable request; Confirm/Cancel; immutable operation reference for recovery; pending/error | [apps/web/src/components/platform/lifecycle-control.tsx:1](../../apps/web/src/components/platform/lifecycle-control.tsx#L1) |
| Owner credential handoff + replacement confirmation | S02 registry row | One-time output, private-delivery notice, acknowledgment; lost/expired credential choices and destructive replacement dialog; already-issued/no-secret/error states | [apps/web/src/components/platform/registry.tsx:27](../../apps/web/src/components/platform/registry.tsx#L27) |
| Member credential handoff | S12 | Readonly temporary credential, Copy/manual fallback, replace, recorded/continue; pending consent, complete without password, missing handoff, ack failure; no persisted secret display | [apps/web/src/components/members/member-registration-form.tsx:66](../../apps/web/src/components/members/member-registration-form.tsx#L66) |
| Trainer credential handoff | S15 | Copy/manual fallback and recorded/continue; missing-secret replacement; pending consent link/reference; success after existing identity consent | [apps/web/src/components/trainers/trainer-registration-form.tsx:42](../../apps/web/src/components/trainers/trainer-registration-form.tsx#L42) |
| Member profile tabs | S13 | Overview/Attendance History/Membership & Packs; local state; #history recognized; keyboard arrow/Home/End supported by shared Tabs | [apps/web/src/components/members/member-profile-tabs.tsx:9](../../apps/web/src/components/members/member-profile-tabs.tsx#L9) |
| Member status form/recovery | S13 Overview | Target ACTIVE/INACTIVE/SUSPENDED excluding current; reason1–500; required consequence checkbox; hidden version/key; Resume original operation; outcome-unknown/recovery status | [apps/web/src/components/members/member-lifecycle-form.tsx:1](../../apps/web/src/components/members/member-lifecycle-form.tsx#L1) |
| Pack issue | S13 Membership & Packs | Credits1–1000, validity1–3650days, nonnegative price, current currency; ledger available/held/consumed/expired, exclusive expiry; pending/error/success | [apps/web/src/components/members/session-pack-panel.tsx:1](../../apps/web/src/components/members/session-pack-panel.tsx#L1) |
| Trainer status/recovery | S16 | Deactivate/reactivate target, reason1–500, consequence checkbox, version/key; original-operation recovery and status feedback | [apps/web/src/components/trainers/trainer-lifecycle-form.tsx:1](../../apps/web/src/components/trainers/trainer-lifecycle-form.tsx#L1) |
| Recurring trainer shift | S16 | Required start/end; explicit overnight yes/no; version, 15min–16h; stored snapshots unchanged; pending/error/success | [apps/web/src/components/trainers/trainer-shift-form.tsx:1](../../apps/web/src/components/trainers/trainer-shift-form.tsx#L1) |
| Client profile sections | S28 | Four anchors with tab roles; all panels visible, not shared Tabs; latest 2 plans/latest 10 sessions and health/private fields | [apps/web/src/app/gyms/[slug]/trainer/clients/[memberId]/page.tsx:27](../../apps/web/src/app/gyms/[slug]/trainer/clients/[memberId]/page.tsx#L27) |
| Start/complete commands | S25 cards | Server affordance controls; version/key; native `window.confirm` on completion mentions held-credit consumption and earning creation | [apps/web/src/components/sessions/session-lifecycle-controls.tsx:24](../../apps/web/src/components/sessions/session-lifecycle-controls.tsx#L24) |
| Notes editor | S25 card details | “Edit Notes” disclosure, explicitly member-visible textarea and Unicode character counter≤4000, Save, pending/error/success; version-keyed remount | [apps/web/src/components/sessions/session-lifecycle-controls.tsx:31](../../apps/web/src/components/sessions/session-lifecycle-controls.tsx#L31) |
| Cancel/withdraw/no-show policy dialog | S17/S25/S35 list/card | Current quote loading, consequence, cutoff/eligibleAt, allocated credit value/ordinal, acknowledgment checkbox when required; confirm/close/review-updated-quote; signed-token missing/expired/stale failures | [apps/web/src/components/sessions/read-views/session-policy-controls.tsx:1](../../apps/web/src/components/sessions/read-views/session-policy-controls.tsx#L1) |
| Owner monthly member More disclosure | S17 monthly list | Matching-session count and member-filtered drilldown; separate member pager vs session pager share page query | [apps/web/src/components/sessions/read-views/owner-month-overview.tsx:1](../../apps/web/src/components/sessions/read-views/owner-month-overview.tsx#L1) |
| Expense form | S19 Expenses | Category RENT/UTILITIES/EQUIPMENT/MARKETING/SALARIES/MAINTENANCE/OTHER; amount, accounting date(max gym today), description≤500, recurring-note checkbox; currency/key hidden; draft retained | [apps/web/src/components/finance/finance-forms.tsx:12](../../apps/web/src/components/finance/finance-forms.tsx#L12) |
| Budget editor row | S19 Expenses | One per seven categories; monthly amount, actual/variance/utilization, Set/Update; hidden category/month/currency/nullable version/key; pending/error/success. Month selection only via URL; no month input here | [apps/web/src/components/finance/finance-forms.tsx:34](../../apps/web/src/components/finance/finance-forms.tsx#L34) |
| Payroll close/approve | S19 Payroll | Cadence/start/endExclusive/zone/state/total/recordCount; Close when OPEN, Approve when CLOSED; expected version/total/key; state-specific feedback; no payout | [apps/web/src/components/finance/finance-forms.tsx:52](../../apps/web/src/components/finance/finance-forms.tsx#L52) |
| Configuration: Gym Profile | S21 | Operational card address≤300, optional phone≤40/email≤254, pay period WEEKLY/MONTHLY; read-only currency/timezone. Separate name2–120 card. Appearance: hex picker/text + optional HTTPS logo URL≤2048. Separate saves/version/feedback | [apps/web/src/components/configuration/owner-gym-configuration.tsx:67](../../apps/web/src/components/configuration/owner-gym-configuration.tsx#L67) |
| Configuration: Membership Plans | S21 | Name≤80, description≤500, exact price, duration1–3650; Add opens inline form, Create/Cancel; list name/description/days/price/status; empty/pending/conflict/success | [apps/web/src/components/configuration/owner-gym-configuration.tsx:95](../../apps/web/src/components/configuration/owner-gym-configuration.tsx#L95) |
| Configuration: PT Session Rates | S21 | Standard required; level2/intro optional; blank fallback vs zero free; exact money max2 decimal input precision; versioned save | [apps/web/src/components/configuration/owner-gym-configuration.tsx:112](../../apps/web/src/components/configuration/owner-gym-configuration.tsx#L112) |
| Configuration: Trainer Pay Rates | S21 | Level1/level2 base percentages and off-shift percentage; API ratios0–1 with≤6 fractional digits; future-confirmation snapshots; conversion caveat in audit | [apps/web/src/components/configuration/owner-gym-configuration.tsx:120](../../apps/web/src/components/configuration/owner-gym-configuration.tsx#L120) |
| Configuration: Cancellation Policy | S21 | Cancellation hours0–168 converted/rounded to minutes; minimum duration15–480; late deduction toggle; fixed no-show consumes held credit; cutoff equality free | [apps/web/src/components/configuration/owner-gym-configuration.tsx:130](../../apps/web/src/components/configuration/owner-gym-configuration.tsx#L130) |
| Finance date/export variants | S19 | Six query-linked regions, from/to window, separate budget month query; revenue/export/deferred/P&L share date control; Export kind=revenue/expenses/payroll/audit, dates, audit page and action; error return flag | [apps/web/src/app/gyms/[slug]/owner/financials/page.tsx:12](../../apps/web/src/app/gyms/[slug]/owner/financials/page.tsx#L12) |
| Member selected calendar day | S36 | Pressed date control updates live aside, PT and weekly meal activity; empty day, session/meal truncation, partial dependency state | [apps/web/src/components/sessions/member-session-calendar.tsx:56](../../apps/web/src/components/sessions/member-session-calendar.tsx#L56) |
| Shared confirmation test dialog | S39 | Synthetic rename member, delayed save failure, attempt counter; test only, not a real member edit workflow | [apps/web/src/app/test-ui/ui-test-harness.tsx:1](../../apps/web/src/app/test-ui/ui-test-harness.tsx#L1) |

## Loading/error/denial boundaries and unmounted leftovers

- Gym loading: `Loading gym workspace…` status; nested member profile `loading.tsx` uses profile-specific loading. Error boundary offers Try again, Return to Dashboard and Sign out. Not-found deliberately combines missing page/workspace/account denial, with Return to Dashboard. These are framework states, not additional business routes. [apps/web/src/app/gyms/[slug]/loading.tsx:1](../../apps/web/src/app/gyms/[slug]/loading.tsx#L1), [apps/web/src/app/gyms/[slug]/owner/members/[memberId]/loading.tsx:1](../../apps/web/src/app/gyms/[slug]/owner/members/[memberId]/loading.tsx#L1), [apps/web/src/app/gyms/[slug]/not-found.tsx:1](../../apps/web/src/app/gyms/[slug]/not-found.tsx#L1).
- Auth, root, chooser, admin, owner dashboard and member list also have Suspense/loading wrappers. Dependencies failing after context resolution typically render a card with Feedback or an alert. Several pages rely on “Reload/Refresh” text without a button; finance configuration failure drops shell entirely.
- `role-page.tsx` exports `GymRolePage` with logo and “No tools available yet” card, but no current page imports it. It is an **unmounted legacy component**, not another trainer/member home or a claim that role features are absent. `GymLogo` is used there; current shell ignores saved logo URL. [apps/web/src/app/gyms/[slug]/role-page.tsx:1](../../apps/web/src/app/gyms/[slug]/role-page.tsx#L1), [apps/web/src/components/navigation/gym-logo.tsx:1](../../apps/web/src/components/navigation/gym-logo.tsx#L1).
- `createMember` action and POST basic members remain as a backend/basic-contact path; current registration page uses `registerMemberAction`, not a separate basic-contact form. No independent notification inbox or session-detail page was found.
- Non-page web routes: GET `/api/session`; POST `/api/gyms/[slug]/financials/export`. Complete Nest endpoint ledger is in file11. Route reconciliation compares all 39 `page.tsx` files, including nested plan builders/consent/bookings and gated test route.
