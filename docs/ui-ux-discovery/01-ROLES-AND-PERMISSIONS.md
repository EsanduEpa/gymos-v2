# Roles and permissions

Audit date: 5 November 2026 (Asia/Colombo). Scope: current `gymos-v2` working tree. Discovery only; implementation status means source-connected, not a fresh runtime certification.

## Actual role model

`GlobalRole.USER` and `GlobalRole.SUPER_ADMIN` live on master User; `GymRole.OWNER`, `TRAINER`, `MEMBER` live on master GymAccess. One `GymAccess` row per `(userId,gymId)` means no multi-role selection inside one gym. Levels `LEVEL_1`/`LEVEL_2` are trainer compensation/profile attributes, not authorization roles. Actor kind, registration state, account status and access-link status are separate concepts. Evidence: [packages/database-master/prisma/schema.prisma:11](../../packages/database-master/prisma/schema.prisma#L11), [packages/database-master/prisma/schema.prisma:86](../../packages/database-master/prisma/schema.prisma#L86), [packages/database-tenant/prisma/schema.prisma:35](../../packages/database-tenant/prisma/schema.prisma#L35).

| Capability | Super admin | Owner | Trainer | Member |
|---|---|---|---|---|
| Platform registry/provision/suspend/reactivate | Yes | No | No | No |
| Scoped platform support summary | Explicit 15-minute context | Normal owner data instead | No | No |
| Whole-gym members and private profile fields | No automatic access | Yes | Confirmed clients only | No general roster |
| Enrollment, credential handoff, member/trainer status | Platform owner handoff only | Yes | No | Own consent only |
| Plans/configuration/theme | Summary only in support | Read/write | No configuration read | No configuration read |
| Gym-wide session ledger and owner booking | No | Yes | Own sessions | Own sessions and requests |
| Accept/decline member session request | No | No trainer-response UI/API | Assigned trainer | No |
| Start/complete/notes | No | API supports lifecycle; UI largely absent | Assigned session UI | No |
| Cancel/no-show | No | Gym session controls | Own session controls | Cancel/withdraw own; no no-show |
| Workout/meal creation | No | No coaching screen | Current confirmed client | Read assigned plans only |
| Expenses/budgets/P&L/exports/audit | No | Yes | No | No |
| Own trainer earnings/payroll projection | No | Whole payroll | Own records | No |
| Notifications | Not mounted in platform/support | Own | Own | Own |

Controller permissions are documented in the endpoint ledger in file 11. A button being absent is never the security boundary.

## Super admin — platform operator

**Purpose:** create and maintain gym workspaces, follow durable provisioning and owner credential handoff, inspect sanitized health/count summaries, suspend/reactivate gyms and diagnose via scoped support.

**Screens/nav:** `/admin` (S02), support mode on `/gyms/[slug]/owner` and `/owner/members` (S10/S11 contextual variant). Sidebar is All Gyms; support shell adds Owner summary and All Gyms, plus Exit support banner. Sign out remains available. There is no independent platform analytics, user administration, subscription, schema rollout or support-history page. Source: [apps/web/src/components/navigation/dashboard-chrome.tsx:47](../../apps/web/src/components/navigation/dashboard-chrome.tsx#L47), [apps/web/src/app/admin/page.tsx:18](../../apps/web/src/app/admin/page.tsx#L18).

**Dashboard:** total/active gyms; verified/stale/unavailable aggregate counts; bounded summary refresh; gym registry with owner name, member count, lifecycle/provisioning state and actions; create-gym form. Counts can be unavailable and totals can be withheld when partial. Registry has cursor pagination, no search/sort/filter UI. Provisioning operation controls include retry, status/step, owner consent warning, initial credential issue, lost/expired replacement confirmation and acknowledgment. [apps/web/src/components/platform/registry.tsx:16](../../apps/web/src/components/platform/registry.tsx#L16), [apps/web/src/components/platform/provisioning-form.tsx:1](../../apps/web/src/components/platform/provisioning-form.tsx#L1).

**Visibility/restrictions:** normal gym guards do not translate global privilege into owner access. Support requires reason code, explanation and server-held opaque context tied to the current actor/auth version/gym. It is fixed to `GYM_SUMMARY_READ`; tenant response includes counts/currency/timezone, not member rosters, health notes, finance or tenant mutation tools. A displayed owner-role shell is presentation of support summary, not impersonation. Expiry is 15 minutes and entering a context replaces the previous one. [apps/api/src/platform/support-session.service.ts:27](../../apps/api/src/platform/support-session.service.ts#L27), [apps/api/src/platform/support-scope.guard.ts:1](../../apps/api/src/platform/support-scope.guard.ts#L1), [apps/web/src/components/platform/support-owner-page.tsx:1](../../apps/web/src/components/platform/support-owner-page.tsx#L1).

**Daily workflows:** review registry → refresh stale counts → inspect provisioning; create gym → follow operation → deliver temporary owner credential; choose gym → enter support with reason → inspect summary → exit; suspend/reactivate with reason and current version. Limitations: existing-owner private consent has an API but no web page; worker deployment unverified; long mobile page and dense technical metadata; current “View dashboard” first selects support and requires a separate form below.

## Owner — gym administrator

**Purpose:** manage tenant operations and people, establish entitlements, schedule PT, configure policy, track operational finance and audit changes. The actual role string is `OWNER`, not `ADMIN`.

**Screens/nav:** Dashboard; Members; Trainers; Sessions; Financials; Analytics; Gym Configuration; Audit Log; Subscription. Nested links lead to member registration/profile, trainer registration/profile and owner session booking. Switch gym appears only with multiple gym memberships. Profile overview/history/attendance and configuration/finance tabs are significant subviews, not independent routes. Source: [apps/web/src/components/navigation/dashboard-chrome.tsx:54](../../apps/web/src/components/navigation/dashboard-chrome.tsx#L54), [full screen catalog](02-COMPLETE-SCREEN-INVENTORY.md).

**Dashboard:** four visible KPIs (Members in Gym, Active Sessions, Today’s Revenue, Trainers on Floor), two-hour earnings chart, first ten scheduled session records today, trainer floor cards, refresh and all-sessions link. These are PT-record projections; “Members in Gym” is not attendance and “Trainers on Floor” is not physical presence. Dashboard does not include daily membership earning in its RevenueRecord query. [apps/api/src/dashboard/dashboard.service.ts:71](../../apps/api/src/dashboard/dashboard.service.ts#L71), [apps/web/src/components/navigation/owner-dashboard-live.tsx:21](../../apps/web/src/components/navigation/owner-dashboard-live.tsx#L21).

**Actions:** full registration/consent recovery and credential handoff; inspect member private fields and membership history; issue pack; suspend/inactivate/reactivate member; register/deactivate/reactivate trainer; approve shift; add membership plans; edit gym name/contact/appearance/fees/pay rates/cancellation policy; book PT; list/cancel/no-show sessions; log expenses/set budgets/close and approve payroll; read reports/audit/download CSV. Renewal is API only. Member/trainer general profile editing, plan edit/delete, collecting cash, payouts and subscription billing have no connected UI.

**Visibility/restrictions:** current gym only. Private DOB/emergency/health fields visible in member profile. BASIC contacts are distinct from operational accounts; registered identities need completed reciprocal operation/receipt bindings. Owners cannot use a trainer's session-response endpoint. Owner session read affords some backend commands that its present view does not mount. Status changes preserve history, cancel future pending/confirmed appointments and release holds; active/past appointments are retained. [apps/api/src/gyms.controller.ts:270](../../apps/api/src/gyms.controller.ts#L270), [apps/api/src/member-lifecycle.service.ts:1](../../apps/api/src/member-lifecycle.service.ts#L1), [apps/api/src/trainer-lifecycle.service.ts:1](../../apps/api/src/trainer-lifecycle.service.ts#L1).

**Daily workflows:** register member + membership → securely hand off credentials → issue PT pack → book/manage session → review earnings/expenses and payroll. Alternate trainer-led request route remains valid. Limitations: misleading attendance and dashboard labels; no member-profile renewal form; booking options bounded at 100 without visible search/paging; session list URLs lose list mode; form feedback styles and navigation patterns vary.

## Trainer — personal training professional

**Purpose:** review hire requests, manage own sessions, read relevant clients and create assigned coaching plans; inspect own calculated earnings.

**Screens/nav:** Schedule; Hire Requests; Clients; Earnings. Deep links: client profile; new workout plan and new meal plan, both requiring a `memberId` query. `/trainer` redirects to schedule, but root/login/gym chooser use `gymRoleLandingPath` → earnings; role switching helpers differ. There is no generic trainer dashboard, self-profile edit screen, class calendar or schedule availability editor. [apps/web/src/lib/gymos.ts:34](../../apps/web/src/lib/gymos.ts#L34), [apps/web/src/app/gyms/[slug]/trainer/page.tsx:1](../../apps/web/src/app/gyms/[slug]/trainer/page.tsx#L1).

**Dashboard equivalent:** schedule day/month navigation, filters, pending request cards, upcoming/active/history cards, start/complete/notes and cancellation/no-show controls, active-session elapsed timer. Earnings page has total, session count, average, current payroll-period information, itemized records, month filter and pagination.

**Actions/visibility:** accept/decline own pending requests; optional decline message; start/complete own booked sessions; write member-visible notes; cancel or mark eligible no-show with quote acknowledgment. Client roster is not a permanent assignment table: active registered member plus an ACTIVE session, future confirmed SCHEDULED session, or COMPLETED session ended within the previous 90 days. Both identities/bindings are rechecked. Client profile exposes private contact/DOB/emergency/health data, balances, latest two own workout/meal plans and latest ten related sessions. Plan creation explicitly assigns to that client; no edit/delete/complete endpoints. [apps/api/src/coaching/coaching.service.ts:34](../../apps/api/src/coaching/coaching.service.ts#L34), [apps/web/src/app/gyms/[slug]/trainer/clients/[memberId]/page.tsx:27](../../apps/web/src/app/gyms/[slug]/trainer/clients/[memberId]/page.tsx#L27).

**Restrictions:** no general tenant member roster; no other trainer client relationship or earnings; no membership, packs, settings, whole-gym finance, audit or platform administration. Relationship expiry can remove profile access; historic member plan reads use own identity and do not require an ongoing trainer relationship. [apps/api/src/coaching/coaching.service.ts:272](../../apps/api/src/coaching/coaching.service.ts#L272).

**Daily workflows:** schedule → review requests → accept → start/record notes/complete → client profile → create plan → earnings. Limitations: profile “tabs” are anchors with incomplete tab semantics; old plan previews have no browse route; no body-metric progress despite “progress” copy; auto reload can discard notes; new workout form contains real-looking default exercise values.

## Member — gym customer

**Purpose:** find a trainer, request PT, see own sessions/credits/calendar and read assigned coaching.

**Screens/nav:** Trainers; My PT Sessions; Calendar; Workout plans; Meal plans. `/member` redirects to trainer directory. Deep link to selected trainer request form. Own enrollment-consent page is independent of the standard tenant shell because a gym link does not yet exist.

**Home/dashboard behavior:** trainer directory, not a metrics dashboard. Sessions view provides monthly state counts and lifetime pack totals, day/month navigation and own status cards; calendar combines monthly PT events with repeating weekday entries from assigned meal plans. There is no dedicated “today’s workout,” membership card, profile/settings or progress dashboard.

**Actions/data:** browse active trainer names/levels/specialisations/bio/shifts; request session using gym-local date/time/type/duration/note; withdraw pending request; cancel scheduled session after server quote review; read own notes and decline message; read workouts/meal totals; mark own notifications read. No self-registration/payment/renewal/pack purchase/workout completion/body-measurement entry or ratings. Request does not reserve a credit until trainer accepts. [apps/web/src/app/gyms/[slug]/member/trainers/[trainerId]/book/page.tsx:1](../../apps/web/src/app/gyms/[slug]/member/trainers/[trainerId]/book/page.tsx#L1), [apps/api/src/sessions/session-requests.service.ts:225](../../apps/api/src/sessions/session-requests.service.ts#L225).

**Visibility/restrictions:** directory omits trainer contact details; own actor ID comes from backend gym binding. No foreign member/trainer private profiles, whole-gym finance or settings. No marking no-show/start/complete. Existing consent uses current password with explicit accept/decline, never shares that password with owner.

**Daily workflows:** sign in → trainer directory → request → wait for accept/decline notification → sessions/calendar → attend PT → read coaching notes/plans. Limitations: no visible membership self-service summary beyond request eligibility; calendar uses first 100 PT sessions/plans with truncation notices and repeats all loaded meal plans; notification history only latest five; consent login return path is lost.

## Other identities/states, not extra roles

Anonymous users see login (and `/test-ui` only if enabled) and the public theme JSON endpoint, not a public gym directory. Authenticated USER without active links gets `/no-access`. Password-change-required identities can access the password operation but operational endpoints deny them. BASIC members have tenant contact/history only and no credentials/role. Pending or failed registration actors are not published operational accounts. Suspended/inactive members and deactivated trainers lose operational access; history remains visible to authorized owners. `READ-ONLY SUPPORT` is a context label, not a stored GymRole. None of these warrants an invented role-specific dashboard.
