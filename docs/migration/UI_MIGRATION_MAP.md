# GymOS V1 → V2: Complete UI Migration Map

## 1. Executive Summary

**Assessment and correction review date:** 22 October 2026. **Scope:** existing web interface, source analysis, and recommendations only. The entire report was reread and disputed behavior checked against current V1 source and V2 API/web source. No application implementation, dependency installation, database access, account creation, or migration was performed. Only this Markdown file is edited in this review.

The UI is largely reusable in structure. Preserve the compact green-and-charcoal dashboard, existing navigation, cards, forms, tables, and workflow order. Replace the integration boundaries and hard-coded branding; do not copy V1 authentication, Prisma access, or business Server Actions into the V2 presentation layer.

Verified inventory:

| Item | Count / finding |
|---|---|
| Page route files | **29**: root 1; authentication 2; Super Admin 1; owner 14; trainer 7; member 4 |
| Rendered page routes | **26**; `/`, `/trainer`, and `/member` redirect |
| Layouts | Root and shared dashboard; no auth-group or individual role layout |
| Special UI states | Dashboard error, dashboard not-found, owner loading skeleton |
| UI TSX files inspected | **74**: 29 pages, 2 layouts, 3 special states, 29 colocated feature component files, 11 shared/layout component files |
| Non-page HTTP interfaces | Auth.js handler and authenticated CSV downloads |
| Screenshots captured | **0**. All visual descriptions below are source-derived, not browser-verified |
| Theme system | Two global color variables; extensive fixed colors; no dark-mode implementation or theme editor |
| V2 starting point | Existing login, platform gym creation/list, and slug-based basic member-record workspace; member list capped at100, without pagination/profile contracts or V1 registration/credential handoff |

**Important distinctions:** Trainer and member “dashboards” are redirects. Payroll, P&L, exports, membership plans, rates, and policies are tabs, not independent routes. Workout and meal views exist inside the trainer's client profile, not a member portal. Community, gamification, member progress tracking, member membership self-service, and general gym check-in screens do not exist in the inspected web tree.

**Corrections and migration boundary:** V1's budget dialog already includes required category and amount fields; its optional action-level month defaults to the current month. Owner Mark Complete can complete a SCHEDULED session without starting it; only ACTIVE completion has a minimum-duration check. No-show action eligibility and repeat-call handling need functionality-map decisions. V2's unconditional member-list request is not compatible with every proposed role. This report guides UI reuse and visual/state coverage; the functionality map and approved decisions in its section 14.1 must settle lifecycle rules, financial side effects, role/access contracts, identity provisioning and API gaps before operational parity can be claimed.

### Evidence conventions and confidence

- `V1/` means the exact root `/Users/esanduepa/Desktop/Projects/gymos/`.
- `V2/` means `/Users/esanduepa/Desktop/Projects/gymos-v2/`.
- Paths followed by `:N` reference source line N at the inspected revision. All paths in inventories are relative to these explicitly defined roots.
- V1 HEAD: `058aa8532741c4cb84289589fd2cf89282882988`; V2 HEAD: `25546dec684382438416ecf22a65c0262bb0f558`, rechecked during correction review. Tracked application files were clean at review start; this report already existed as untracked documentation in V2.
- **Implemented** means JSX, state, handlers, and an integration exist in source; it does not claim live data or end-to-end behavior was tested. **Partial** means a known UI gap or inconsistent behavior. **Mock** means an alert, synthetic default, or inactive placeholder. **Absent** means no route/rendered workflow found. **Unused** means no rendered application consumer found.
- Recommendations and proposed paths/contracts are explicitly future work. No unimplemented V2 endpoint is represented as available. Backend names are included solely to identify frontend dependencies.
- **Source-verified behavior** describes branches, fields and calls inspected in code. **Application runtime verification:** none; no screenshots, API requests or end-to-end tests were performed. The optional-rate correction alone was checked with V1's installed Zod 3.25.76 in an isolated pure-validator/projection evaluation; no Server Action or database operation was invoked (functionality map EV01). **Proposals** describe future UI organization/adapters. **Unresolved product/functionality decisions** require the functionality map and approved decisions in its section 14.1; inferred risks are not tested outcomes.

## 2. Complete UI Route Inventory

Read the route registry together with the corresponding role dossier in sections 3–6: the registry gives source, role, layout, purpose, status, and recommendation; each dossier adds exact component/layout composition, displayed data, interactions, and integration dependencies. Sections 10, 14, and 16 provide states, complexity, and verification for each route ID.

Layout codes: **R** = `V1/app/layout.tsx` → page, without dashboard chrome; **D** = R → `V1/app/(dashboard)/layout.tsx` → `DashboardChrome` → Sidebar + optional banners + Header + padded main → page. There are no additional role-level layouts. All D pages inherit NotificationBell and sign-out.

Role codes: **A** Super Admin; **O** Gym Owner; **T** Personal Trainer; **M** Gym Member; **P** public. `A*` means selected-gym owner view. `A~` means proxy permits the path but page data/role checks do not provide a true trainer/member impersonation workflow.

| ID | Page / purpose | Existing URL | Exact V1 source | Role / layout | Source status | V2 recommendation |
|---|---|---|---|---|---|---|
| R00 | Role entry redirect | `/` | `app/page.tsx` | All / R | Implemented redirect | Adapt role + gym routing; reconcile V2 landing page |
| A01 | Sign in | `/login` | `app/(auth)/login/page.tsx` | P / R | Implemented | Adapt; preserve centered V1 form and feedback |
| A02 | Required/optional password change | `/change-password` | `app/(auth)/change-password/page.tsx` | Signed-in A/O/T/M / R | Implemented | Adapt credential flow and forced-change state |
| S01 | Platform gym registry and selection | `/admin` | `app/(dashboard)/admin/page.tsx` | A / D | Implemented registry; limited administration | Adapt to central platform data; reconcile existing V2 gym creation |
| O01 | Live operations dashboard | `/owner` | `app/(dashboard)/owner/page.tsx` | O, A* / D | Implemented; proxy metrics | Adapt data, refresh, theme |
| O02 | Member management | `/owner/members` | `app/(dashboard)/owner/members/page.tsx` | O, A* / D | Implemented | Copy and adapt |
| O03 | Register member | `/owner/members/new` | `app/(dashboard)/owner/members/new/page.tsx` | O, A* / D | Implemented | Adapt full registration and credential handoff |
| O04 | Member profile | `/owner/members/[id]` | `app/(dashboard)/owner/members/[id]/page.tsx` | O, A* / D | Partial billing/attendance semantics | Extract tabs/dialogs, retain structure |
| O05 | Trainer roster | `/owner/trainers` | `app/(dashboard)/owner/trainers/page.tsx` | O, A* / D | Implemented | Copy and adapt |
| O06 | Add trainer | `/owner/trainers/new` | `app/(dashboard)/owner/trainers/new/page.tsx` | O, A* / D | Implemented; page relies on proxy/action gate | Copy and adapt |
| O07 | Trainer profile and shifts | `/owner/trainers/[id]` | `app/(dashboard)/owner/trainers/[id]/page.tsx` | O, A* / D | Implemented; limited metric scope | Adapt status/shift handling and feedback |
| O08 | Session oversight | `/owner/sessions` | `app/(dashboard)/owner/sessions/page.tsx` | O, A* / D | Implemented daily/monthly; lifecycle decisions pending | Extract shared components first; map pre-start completion and no-show eligibility/retries |
| O09 | Staff-assisted booking | `/owner/sessions/book` | `app/(dashboard)/owner/sessions/book/page.tsx` | O, A* / D | Implemented | Copy and adapt |
| O10 | Finance, payroll, reports, export | `/owner/financials` | `app/(dashboard)/owner/financials/page.tsx` | O, A* / D | Implemented core; accounting sync placeholder | Extract tabs/dialogs/charts first |
| O11 | Operational analytics | `/owner/analytics` | `app/(dashboard)/owner/analytics/page.tsx` | O, A* / D | Implemented computed charts | Copy and adapt |
| O12 | Gym settings and plans | `/owner/gym-config` | `app/(dashboard)/owner/gym-config/page.tsx` | O, A* / D | Implemented five tabs; no branding settings | Extract tab forms; adapt |
| O13 | Security/audit records | `/owner/audit-log` | `app/(dashboard)/owner/audit-log/page.tsx` | O, A* / D | Implemented; export current page only | Adapt server filtering/pagination |
| O14 | Platform subscription | `/owner/subscription` | `app/(dashboard)/owner/subscription/page.tsx` | O, A* / D | Partial/mock billing controls | Future reference only; hide from MVP navigation and defer billing UI |
| T00 | Trainer entry redirect | `/trainer` | `app/(dashboard)/trainer/page.tsx` | T, A~ / D | Redirect to schedule | Retain gym-scoped redirect |
| T01 | Schedule and session requests | `/trainer/schedule` | `app/(dashboard)/trainer/schedule/page.tsx` | T, A~ / D | Implemented; mixed error feedback | Extract session cards/dialogs first |
| T02 | Assigned client roster | `/trainer/clients` | `app/(dashboard)/trainer/clients/page.tsx` | T only at page gate / D | Implemented | Copy and adapt |
| T03 | Client 360° overview | `/trainer/clients/[id]` | `app/(dashboard)/trainer/clients/[id]/page.tsx` | T only at page gate / D | Implemented; bounded history | Extract profile tabs, copy/adapt |
| T04 | Workout builder | `/trainer/plans/workout/new` | `app/(dashboard)/trainer/plans/workout/new/page.tsx` | T only at page gate / D | Implemented; seeded draft rows | Adapt dynamic form and return route |
| T05 | Meal builder | `/trainer/plans/meal/new` | `app/(dashboard)/trainer/plans/meal/new/page.tsx` | T only at page gate / D | Implemented; one-day-oriented draft | Adapt dynamic form and macro totals |
| T06 | Earnings | `/trainer/earnings` | `app/(dashboard)/trainer/earnings/page.tsx` | T, A~ / D | Implemented all-record summary | Copy and adapt |
| M00 | Member entry redirect | `/member` | `app/(dashboard)/member/page.tsx` | M, A~ / D | Redirect to trainer directory | Retain gym-scoped redirect |
| M01 | Trainer directory | `/member/trainers` | `app/(dashboard)/member/trainers/page.tsx` | M, A~ / D | Implemented | Copy and adapt |
| M02 | Request trainer session | `/member/trainers/[id]/book` | `app/(dashboard)/member/trainers/[id]/book/page.tsx` | M, A~ / D | Implemented | Copy and adapt |
| M03 | My session requests/history | `/member/sessions` | `app/(dashboard)/member/sessions/page.tsx` | M, A~ / D | Implemented; cancellation error gap | Copy and adapt |

### Layouts, small states, and additional interfaces

| ID | Source / trigger | Actual rendered structure / behavior | Dependencies and migration decision |
|---|---|---|---|
| L01 | `app/layout.tsx:1` | English HTML, antialiasing, system sans, min-height flex body, fixed pale canvas/dark text; static GymOS metadata | `app/globals.css`; adapt tokens, title and font; retain geometry |
| L02 | `app/(dashboard)/layout.tsx:14` | Auth redirect, effective gym lookup; passes role, full name, gym name, impersonation and lapsed subscription into shared chrome | `auth`, `getEffectiveGymId`; adapt to V2 identity/access/theme contracts |
| X01 | `app/(dashboard)/error.tsx:5` | White rounded/bordered card, 70vh, red icon, error message, green Try Again calling `reset()` | Dashboard error boundary; adapt tokens; preserve recoverability, review exposed error text |
| X02 | `app/(dashboard)/not-found.tsx:4` | Matching 70vh card, document/question icon, message, “Return to Dashboard” link fixed to `/owner` | Adapt return destination to effective role and gym |
| X03 | `app/(dashboard)/owner/loading.tsx:1` | Pulse heading; 1/2/4 stat skeletons; 2:1 chart/aside skeleton on lg; full-width table skeleton | Owner subtree loading only; direct geometry reuse with skeleton tokens |
| H01 | `app/api/auth/[...nextauth]/route.ts` | Auth.js HTTP handler; no authored page UI | `handlers` from `lib/auth.ts`; replace frontend integration, do not copy V1 auth implementation |
| H02 | `app/api/export/csv/route.ts:26` | Download response, not screen; `type=financials` / `payroll`, optional start/end date params; owner/admin authorization | Retain download affordances via V2 integration; no direct V1 CSV route dependency |

There is no `app/(auth)/layout.tsx`, per-role `layout.tsx`, root custom error/not-found/loading, trainer/member loading file, public self-registration route, forgot/reset-password route, independent reports/payroll/plans route, or additional authored user-facing route in the inspected app tree. Owner-assisted member/trainer registration routes O03/O06 do exist. Next framework defaults are not invented as custom screens. Several detail pages return plain “not found” text rather than invoking the custom not-found boundary; preserve their intended states but improve consistency only as explicit migration work.

## 3. Super Admin UI Map

### S01 — registry, gym selection, and owner-view context

**Evidence:** `V1/app/(dashboard)/admin/AdminClient.tsx:15`, `:31`, `:68`, `:106`; `V1/app/actions/admin.ts:9`, `:50`; `V1/components/layout/sidebar.tsx:74`.

**Exact composition:** D shell → `space-y-6` → responsive heading/switcher row → white rounded bordered tenant panel → panel heading with registry count → horizontally scrollable native table. Columns: Gym Name/address, Owner name/email, Tier, Members, Status, Action. No separate platform KPI dashboard, gym details page, creation/edit/deletion dialog, subscription administration form, search, sorting, or pagination exists in V1.

**Data:** `initialData.gyms[]` has id/name/address/ownerName/ownerEmail/tier/status/totalMembers/totalSessions; active impersonated gym ID is separate. `totalSessions` is fetched but not rendered. The “Members” value counts all gym users, not only members (`app/actions/admin.ts:22`, `:43`). Status badges are always green, irrespective of actual status.

**Workflows:** Select “Default (None)” or a gym; row action toggles selected gym. `setImpersonatedGym` is awaited, the select is disabled during the request, and `router.refresh()` updates chrome. The button named **View Dashboard does not navigate**; it only sets context. The user then uses sidebar **Owner View** to reach `/owner`. Selected row uses a green tint; button changes to Stop Impersonating. Row buttons themselves are not disabled by the loading flag and there is no inline request-error state.

**Access:** Admin page action requires A. Owner UI is accessible to A with selected gym; `superAdminGymId` is an HttpOnly context cookie honored only for A. Selecting a gym does not turn A into a trainer/member identity. Admin sidebar keeps All Gyms and conditionally Owner View, not the entire owner nav. Owner subpages remain reachable by direct links/URL, but no full owner-menu substitution exists.

**V2:** Keep registry and explicit context controls in central `/admin`. Obtain platform summaries through a platform-facing frontend adapter; do not rely on a shared cross-tenant Prisma include. Preserve the persistent “Viewing … as platform admin. Changes you make apply to that gym” banner and explicit exit. Existing V2 `/admin` already creates gyms; keep that capability while incorporating V1 registry/context design. A new detailed gym administration screen would be new scope, not V1 parity.

**Current V2 source limit:** `V2/apps/api/src/admin.controller.ts:28` returns only id/name/slug/status, not V1 owner/tier/member/session summaries. `V2/apps/api/src/gym-access.guard.ts:33` requires the user's own gym-access record and has no global Super Admin bypass. V1-style selected-gym support access and expanded registry data are proposed contracts, not current endpoints/capabilities. See section12 for the role-by-role gym-entry trace.

## 4. Gym Owner UI Map

All O routes use D and authorize O/A* unless noted. Component names below identify exact source files again in section 13. All include the global shell dependencies; feature-specific dependencies are listed individually.

### O01 — Live Gym Operations

**Source:** `app/(dashboard)/owner/components/OwnerDashboardClient.tsx:12`, `:55`, `:106`, `:172`, `:232`. **Integration:** `getOwnerDashboardData` (`app/actions/dashboard.ts:7`), `useRouter`, `useState/useEffect`, Recharts, Lucide.

**Layout/data:** Header/manual refresh → four stat cards (Members in Gym, Active Sessions, Today's Revenue, Trainers On Floor) in 1/2/4 columns → lg three-column grid with revenue area chart occupying two columns and alerts occupying one → today's session native table (time/member/trainer/status/fee) → trainer floor-status cards in 1/2/3 columns with avatar/level/status/today/week/revenue. Chart height 256px; cumulative two-hour revenue points. Alerts show low packs and no-shows, with green normal state. Sessions and chart have empty states; trainer grid has no explicit empty message.

**Interactions/states:** Manual router refresh spins for 500ms independently of request completion; automatic refresh every 30s; new props synchronize into state. Recharts tooltip. No card drilldown or check-in control. Highlight active rows and pulse session indicators. Labels are proxies: Members in Gym counts active PT sessions scheduled today; Trainers On Floor counts trainers with sessions today, not physical presence (`actions/dashboard.ts:21`, `:45`). Preserve chart/card design and clarify metric contracts before treating these as actual attendance.

### O02 — Member Management

**Source:** `owner/members/members-list-client.tsx:15` under `app/(dashboard)/`. **Integration:** page performs direct Prisma reads; no page Server Action; PageHeader, DataTable/Column, StatusBadge, Link, local state, Lucide.

**Layout/data:** PageHeader + Register New Member link → responsive search/status filter row → DataTable columns name/email, phone, Active Plan, status, expiry, View Profile. Membership display uses the latest-created membership, not an explicit active-record filter. `plans` prop is loaded but unused in the client.

**Interactions/states:** Search name/email case-insensitively or phone substring; All/ACTIVE/EXPIRED/SUSPENDED status filter. Filter uses member status, not membership status. Link to O03 and each O04. Default DataTable pagination 25 rows; no column sorting or edit dialog. Empty table gives search/filter/registration hint. No per-page mutation/pending state; owner skeleton/boundary applies. V2 nullable email must be normalized before copying `.email.toLowerCase()`.

**Current V2 gap:** GET `/gyms/:slug/members` returns the newest **100** records as a bare array of id/fullName/email/status, without total/cursor/page controls (`V2/apps/api/src/gyms.controller.ts:105`). The current web renders that array without pagination and counts only returned rows. Phone, latest plan, expiry and profile/history fields required by O02/O04 are absent, as is a member-detail endpoint. Local pagination of those100 cannot expose older records or provide full-directory search/filter parity. Agree list/detail contracts in the functionality map rather than treating this as a DTO rename.

### O03 — Register New Member and credential handoff

**Source:** `owner/members/new/new-member-form.tsx:21`, `:49`, `:90`. **Integration:** `createMember`; PageHeader, TemporaryPasswordNotice, Link, local state.

**Layout/data:** max-w-2xl wrapper → back link/header → inline red error → white p-6 card with vertical form. Fields: full name*, email*, phone*, date of birth* (default `1998-01-01`), emergency contact, membership plan* (name/price/days), health notes. Email/phone and DOB/emergency pairs use unconditional two-column grids. Footer Cancel and Complete Member Registration.

**Interactions/states:** HTML required/email checks plus first returned action validation error; loading disables submit and changes text to Registering. Success replaces the form with “Member registered” and one-time email/temporary-password handoff, Copy/Copied state for 2s, warning that credentials cannot be retrieved again, Continue to O04. No add-member modal, edit profile route, email delivery, reset-issued-password UI, or automatic success redirect. Keep the handoff and forced password-change dependency; existing V2 simple name/email create form does not cover this flow.

V2 POST `/gyms/:slug/members` creates a **tenant member record only**, accepts strictly fullName/optional email, and returns id/fullName/email/status/createdAt (`V2/apps/api/src/gyms.controller.ts:22`, `:129`). That path does not provision a login identity/gym access, assign membership, return temporary credentials or set up forced password change. Sending V1's additional registration fields to the current strict input is not supported. V1's complete flow is evidenced by `V1/app/actions/members.ts:11`, `:60`, `:66`, `:109`; its functionality mapping is required before O03 can be operationally migrated.

### O04 — Member profile, tabs, status, pack issue, desk payment

**Source:** `owner/members/[id]/member-profile-client.tsx:17`, `:113`, `:147`, `:216`, `:241`, `:334`, `:346`. **Integration:** direct page reads; `updateMemberStatus`, `issueSessionPack`, `recordManualPayment`; StatusBadge, ConfirmDialog, cross-feature RecordDeskPaymentDialog, Link, state.

**Layout/data:** back link → white responsive banner with 64px initial avatar, name/status/email/phone and actions → three visible underline tabs. The state union contains `progress` but there is no progress tab or rendered panel.

| Subview / workflow | Actual content and behavior | Completeness |
|---|---|---|
| Overview | Two cards at md: current membership name/price/start/expiry; PT pack total/remaining/status with Issue New Pack | Reads first membership/pack sorted newest, not necessarily active despite labels |
| Attendance History | Recent Sessions History rows: timestamp, trainer, duration, status; empty copy | Last **5 PT sessions**, not gym attendance/check-in history |
| Billing History | Table Date, Item/Description, Status, Amount, Receipt; latest membership and all packs; hard-coded PAID; Record Desk Payment | Derived billing display, not a real transaction ledger |
| Status confirmation | Active → Suspend or Deactivate; other states → Reactivate; ConfirmDialog names target and gym-access consequence | Loading shown; returned error ignored and dialog closes |
| Issue pack modal | Total sessions 10, total price 450, validity 90 days defaults; cancel/confirm; inline action error; pending submit | Implemented; default price is fixed, not derived from configured session rate |
| Desk payment modal | Member select limited to this member but still requires selection; membership/add-on type, amount, note; close on success | Implemented record operation; billing table does not query manual payments |
| Download Receipt | Membership/pack-specific browser alert text | **Mock**; no document/download |

Extract tabs and dialogs without changing their arrangement. Preserve status guard/confirmation and pack form, but specify explicit success/error invalidation. Treat billing/attendance names and receipt output as open parity decisions rather than silently claiming full history/download support.

### O05 — Trainer Roster Management

**Source:** `owner/trainers/trainers-list-client.tsx:14`, `:23`, `:96`. **Integration:** direct page reads; PageHeader, DataTable, StatusBadge, Link, local state.

**Layout/data:** Header/Add New Trainer → max-w-md search → table name/email, level, specialisations (first two + remaining count), shift hours, status, View Trainer. Level 2 uses blue, Level 1 gray. Specialisations accept either array or JSON string; defaults shift 08:00–17:00.

**Interactions/states:** Search name/email; O06 registration and O07 detail navigation; 25-row client pagination; empty roster hint. No status dropdown, sorting, inline edit, or add dialog.

### O06 — Add Personal Trainer and credential handoff

**Source:** `owner/trainers/new/new-trainer-form.tsx:17`, `:44`, `:85`. **Integration:** `createTrainer`; PageHeader, TemporaryPasswordNotice, Link, state.

**Layout/data:** max-w-2xl back/header/error/form card. Fields full name*, email*, phone*, trainer level* (Level 1 default/Level 2), years experience, comma-separated specialisations, shift start/end text inputs (08:00/17:00), biography. Paired fields use fixed two columns; Cancel/Create footer.

**Interactions/states:** Required/email and action errors, creating/pending disabled submit; success replaces form with one-time credentials and View Trainer Profile (O07). The route wrapper itself has no explicit auth call; proxy, shared layout, and action enforce access. Do not copy page-only access assumptions into V2.

### O07 — Trainer profile, performance, shift approval

**Source:** `owner/trainers/[id]/trainer-profile-client.tsx:15`, `:101`, `:125`, `:198`. **Integration:** direct page reads; `updateTrainerStatus`, `approveShiftHours`; StatCard, StatusBadge, ConfirmDialog, state.

**Layout/data:** Back → responsive avatar/name/level/status/contact/experience banner + deactivate/reactivate → four stats in 1/2/4 columns (completed sessions, active clients, years, rating) → md two columns with shift form and specialisations/bio. Rating falls back to 5.0; completed-session count is calculated over the fetched last **10** sessions, while distinct related clients is a separate query.

**Interactions/states:** Deactivation confirmation switches ACTIVE/DEACTIVATED; action errors ignored. Shift text inputs and approval submit share loading; error/success text exists but both render green success styling (`:132`). No general trainer editing, photo upload, rating submission, or shift-request inbox. Adapt error style and explicit response handling; preserve the form and confirmation design.

### O08 — Session oversight: Daily Schedule / Monthly Member Overview

**Source:** `owner/sessions/sessions-client.tsx:17`; `daily-view.tsx:22`; `monthly-view.tsx:17`. **Integration:** direct page reads; `overrideSessionStatus`; PageHeader, StatCard, DataTable, StatusBadge, ConfirmDialog, local state.

**Common layout/data:** PageHeader/Book PT Session → three stats (total logged, missed/no-shows, no-show rate) → two underline tabs → selected view. Aggregates cover all fetched sessions and are not tied to selected date/month. “High Miss Rate” is passed to StatCard without `trendPositive=false`, so still appears green.

| Subview | Layout / data | Interactions and states |
|---|---|---|
| Daily Schedule | Date navigation/filter toolbar → search/trainer/status filters → DataTable time, member/email, trainer/shift, type, status/live dot, fee, owner actions | Previous/next day, native date, Today; search member/trainer name; trainer filter; all/pending/scheduled/active/completed/missed/cancelled/declined status; rows sorted ascending time; 25-row pagination and empty day |
| Override confirmation | Mark Complete and No-Show for SCHEDULED or ACTIVE rows; otherwise Locked | ConfirmDialog warns about billing; pending disables confirm/cancel; returned action errors ignored |
| Daily CSV | Downloads all filtered rows, not only visible pagination slice | Client-generated filename includes selected day; simple quoting differs from server CSV helper |
| Monthly Member Overview | Month toolbar/search → DataTable member/email, subscription/plan/status, purchased, used, available, booked sessions | Previous/next/native month/This Month; search name/email; 25-row pagination; empty search |
| More sessions overlay | max-w-lg, max-height 80vh, scrollable list with date/time/trainer/type/status | Shows selected month's SCHEDULED/PENDING_CONFIRMATION sessions; X and backdrop close |

Monthly pack totals are lifetime purchased/used with active remaining; only booked-session column is month-filtered. “Next” is earliest booked session in that month, without requiring future date. O09 is a separate page, not a dialog.

**Source-verified completion behavior:** Mark Complete is exposed for SCHEDULED and ACTIVE; `overrideSessionStatus` delegates to `endSession`. That action accepts **both** statuses (`V1/app/actions/sessions.ts:529`) and applies minimum duration **only to ACTIVE** (`:538`). It does not require a SCHEDULED session to have started or reached its scheduled time. The completion path attempts credit consumption, revenue recognition and trainer-pay creation (`:549` onward). **Unresolved functionality decision:** should V2 permit completion before start, with these effects, and what eligibility, confirmation wording and result states should the owner see? Do not convert current scheduled completion into a supposed rejection or silently change it during UI copying.

**Source-verified no-show behavior:** Owner UI exposes No-Show for SCHEDULED/ACTIVE, whereas trainer UI exposes it only for SCHEDULED. `handleNoShow` (`V1/app/actions/sessions.ts:623`) checks sign-in, record existence and authorized trainer/owner actor, but **has no status, scheduled-time or already-noShow guard**. Each authorized invocation reaches the same transaction path, sets MISSED/noShow and calls `consumePackCredit`; that helper decrements an available active positive-balance pack if found and always attempts a revenue record (`:133`). The no-show path creates no trainer pay and does not reverse an existing pay record. An already-MISSED call has no early return/deduplication in these functions. **Inferred risk, not runtime outcome:** invalid-state or repeated/retried calls may reapply effects; exact database/concurrency outcomes were not exercised. Eligibility, terminal-state handling, retries/idempotency and policy-toggle semantics belong in the functionality map and approved decisions in its section 14.1. The UI's hiding/locking of buttons is not an action-level repeat-call guarantee.

### O09 — Book Personal Training Session

**Source:** `owner/sessions/book/book-session-form.tsx:15`, `:61`; page `:11`. **Integration:** `bookSession`; direct eligible-member/active-trainer reads; PageHeader, Link, router/state.

**Layout/data:** max-w-2xl back/header/error/form card; member select only for active packs >0 (first matching pack remaining shown); active trainer select with shifts; paired date/time; paired session type/duration; notes; Cancel/Confirm footer. Types IN_PERSON, VIRTUAL, INTRODUCTORY; date UTC-derived today; time 10:00; duration 60.

**Interactions/states:** Required selects/date/time/type; no-members red guidance to issue a pack and disabled submit; booking/error feedback; success navigates to O08. No slots calendar, trainer availability API picker, recurring booking, or rescheduling UI. Owner date has no `min`, unlike member request. Trainer collision/eligibility failures are action-returned messages. No explicit no-trainers warning; empty select blocks required validation.

### O10 — Financial Management (six workflows)

**Source:** `owner/financials/financials-client.tsx:90`, `:144`; `components/financial-modals.tsx`; `components/charts.tsx`. **Integration:** initial `getRevenueOverview`, `getExpenses`, `getBudgetVsActual`, `getDeferredRevenue`, `getCurrentPayPeriodInfo`, `generatePnL`; mutations `createExpense`, `setCategoryBudget`, `closePayPeriod`, `approvePayPeriod`; CSV H02. Recharts, Lucide, local state; does not use shared DataTable.

**Common layout:** Header/title/description, Log Expense and Export Financials → horizontally scrollable six-tab strip → selected panel. Finance uses gray utility colors, 14px body text, and some larger heading/stat sizes than other pages. No rendered date-range/category-filter controls despite optional loader arguments.

| Workflow | Exact layout/data | Actions/states and dependencies |
|---|---|---|
| Revenue Overview (`:208`) | Four revenue cards → lg 2:1 trend area chart/revenue donut → three trainer-level/off-shift breakdown blocks | Chart tooltips/legend; empty trend/donut; fixed 40%/50%/10% explanatory copy; read loaders only |
| Expense Management (`:300`) | Heading/Set Monthly Budgets → budget-v-actual grouped bar chart → category budget/actual/variance/status table → expense history date/category/description/recurring/amount | Over-budget red/within-limit green; empty expense message; tables lack sorting/pagination; createExpense + setCategoryBudget dialogs |
| Deferred Revenue (`:424`) | Three cards (deferred, recognized, utilization) → pack ledger with ID/member/total/used/remaining/value/recognized/deferred | Empty packs message; no editing, filtering, pagination; `getDeferredRevenue` |
| Trainer Payroll (`:509`) | Current period/status/date banner and conditional actions → trainer/level/completed/in-shift/off-shift/gross table | OPEN: Close Pay Period; CLOSED: Approve Payroll; other status: neither. Native `confirm()` dialogs; shared pending disables buttons. Returned errors ignored; Payroll CSV |
| P&L Report (`:610`) | Centered max-w-4xl statement with comparison → revenue lines/total → expense categories/total → net profit/loss | Positive/negative color and trend icon; no print/PDF/date picker; `generatePnL` |
| Export Data (`:691`) | Three md columns: financial CSV, payroll CSV, muted locked accounting integration | Both CSV links wired; Xero/QuickBooks sync explicitly Coming Soon + disabled |
| Log Expense dialog | Centered max-w-md overlay with close X, amount*, seven-category select*, date* (today), description, recurring checkbox | Required/email-independent native validation + action positive amount validation; error panel; Saving; cancel/close; success closes |
| Set Category Budget dialog | Same overlay; required seven-category selector (Rent, Utilities, Equipment, Marketing, Salaries, Maintenance, Other) and required decimal amount input | Implemented source wiring to `setCategoryBudget`; pending/error and close-on-success. Action accepts optional month and defaults to first day of current month when omitted; no month picker is rendered |

`TrainerPayChart` is imported but never rendered. RecordDeskPaymentDialog is exported from this feature but consumed by O04, not O10. `getCurrentPayPeriodInfo` can create a pay period during page rendering (`actions/financials.ts:345`); capture against disposable fixtures only. Future integration must provide pending/errors and refresh affected views without requiring V1 revalidation.

Budget evidence: `V1/app/(dashboard)/owner/financials/components/financial-modals.tsx:166`–`:193` contains category and amount; `V1/app/actions/financials.ts:21`, `:183`–`:198` requires category/nonnegative amount and accepts optional month. The absent month picker is a current-month UI choice supported by the action default, not a missing required field or evidence of broken entry. Runtime save behavior remains unverified.

### O11 — Operational Analytics

**Source:** `owner/analytics/AnalyticsClient.tsx:13`. **Integration:** `getAnalyticsData`; Recharts BarChart/LineChart/Tooltip/Legend.

**Layout/data:** Header → two lg side-by-side white p-5 chart cards, each 256px tall (trainer scheduled vs idle hours; peak-hour bookings) → full-width signup trend line chart (six months). Tooltip interactions only; no filters, exports, drilldowns, or special empty panels.

The series are computed from data, not hard-coded mock charts. Utilization estimates capacity using shift length ×22 days; “attendance” is based on PT bookings, not attendance scanning (`actions/analytics.ts:35`, `:70`). Source lower-bound time queries do not uniformly limit future records. Confirm the desired labels/data meaning; preserve plot geometry/legends and empty/zero rendering.

### O12 — Gym Configuration (five tabs and expiry command)

**Source:** `owner/gym-config/gym-config-client.tsx:19`, `:135`. **Integration:** direct page gym/plan read; `updateGymProfile`, `createMembershipPlan`, `updateSessionRates`, `updateTrainerPayRates`, `updateCancellationPolicy`, `checkMembershipExpiries`; PageHeader, state.

**Common layout:** Header with Run Membership Expiry Check → shared success/error banner → underline tab strip. Each tab resets message, not a URL. Single loading flag shared by forms; forms are max-w-2xl except add-plan max-w-lg; fixed paired grids recur. Tab strip lacks horizontal-scroll class.

| Workflow | Fields / displayed data | Interactions/states |
|---|---|---|
| Gym Profile (`:203`) | Name*, address, phone, contact email, WEEKLY/MONTHLY pay period | Save Profile Settings; required/email/action errors; pending; success |
| Membership Plans (`:275`) | Count and table name/duration/price/description; all fetched plans, labelled Active | Toggle inline Add New Plan/Cancel; form name*, description, price*, days*; create and close on success; no edit/delete/archive |
| PT Session Rates (`:374`) | Standard required price ≥0; optional Level 2 and intro price ≥0; explanation that prior sales/bookings keep prices | Save session rates; **V1 blank optional parses to 0**, despite standard-fallback copy (installed Zod 3.25.76, isolated validator check). **Intended V2 behavior change:** blank→null→standard fallback; explicit intro 0 stays free; pending/errors/success |
| Trainer Pay Rates (`:455`) | Level 1 base %, Level 2 base %, off-shift premium %; future-sessions warning | Form displays stored fractions ×100; submit percentage values; pending/errors/success |
| Cancellation Policy (`:529`) | Cancellation window hours*, minimum duration minutes*, no-show deduction and late cancellation deduction checkboxes | Save policy; pending/errors/success; labels refer to QR end scans, but web has no QR scanner |
| Run Expiry Check (`:96`) | No modal; click immediately invokes command | Count/success or returned error banner; no pending disable/confirmation |

No primary/secondary/accent pickers, logo upload, font selector, theme presets, or dark-mode toggle exists. Those are V2 requirements, not missing copied V1 screens. Policy checkboxes are persisted/displayed, but inspected no-show/late-cancel action paths do not consult them; flag the user-facing contract mismatch for later behavior review, without migrating business logic.

### O13 — Security & Audit Logs

**Source:** `owner/audit-log/AuditLogClient.tsx:28`, `:54`, `:115`, `:165`. **Integration:** `getAuditLogs({actionType,page})`; state; browser download.

**Layout/data:** Header/Export CSV → filter/count white card → horizontal table timestamp, user/name/email, action badge, affected ID, truncated details → Previous/Page/Next footer when >1 page. Action choices are a fixed subset: ALL, MEMBER_CREATED, MEMBER_UPDATED, MEMBER_SUSPENDED, TRAINER_CREATED, SESSION_CREATED, SESSION_OVERRIDDEN, EXPENSE_CREATED, PAY_PERIOD_CLOSED.

**Interactions/states:** Filter resets page to 1; server pages of **20**; loading row replaces data; no-record row; boundary-aware pagination disabled. Requests lack an inline error result or stale-request guard. Export is client-generated **current loaded page only**, irrespective of totalCount; no details expand. Keep table/filter placement and define export scope truthfully. Do not call this a platform-wide admin audit interface.

### O14 — Subscription & Billing

**Source:** `owner/subscription/SubscriptionClient.tsx:9`, `:37`, `:90`; `actions/subscription.ts:7`. **Integration:** `getGymSubscription`; static tier array; browser alerts; Lucide.

**Layout/data:** Header → current-plan white responsive banner (tier/status/cycle/next date/masked last4/payment button) → four tier cards in 1/2/4 columns. STARTER $49, GROWTH $99, PRO $199, ENTERPRISE Custom; listed capacities/features are static marketing content, not verified entitlement enforcement. Current tier has border/ring and disabled Active Plan; Growth popular badge if not current.

**Interactions/states:** Update Payment Method only alerts “Redirecting …”; Switch Plan only alerts contact support. No billing portal navigation, payment form, checkout, invoicing, or actual tier switching. Loader creates a GROWTH/ACTIVE subscription with 4242 fallback if missing: this is synthetic default behavior and a write on view, not proof of a configured payment card. Adapt platform subscription read contract, retain design, and keep unimplemented billing behavior explicitly deferred.

## 5. Personal Trainer UI Map

### T00 / T01 — Entry and schedule

`trainer/page.tsx:3` redirects to `/trainer/schedule`. The schedule page reads sessions for the signed-in user's ID, ascending scheduled time; it does not restrict to today despite “Daily” title. Super Admin proxy permission is not trainer impersonation: it queries the admin's user ID.

**Source:** `trainer/schedule/schedule-client.tsx:25`, `:113`, `:171`, `:206`, `:283`, `:323`. **Dependencies:** PageHeader, StatusBadge, Lucide, state/effects; `startSession`, `endSession`, `handleNoShow`, `updateSessionNotes`, `respondToSessionRequest`.

**Composition:** Header → conditional pending-request panel with blue heading/count and responsive request rows → conditional green active-session banner with timer and Complete Session (Manual Fallback) → vertical session cards → conditional notes or decline modal. Cards show client/status, timestamp tile, type/duration/shift, notes, and status-specific controls. All non-pending statuses are included in the list, including active and terminal statuses; active session also appears in the banner. No calendar, date navigation, search, pagination, QR camera, or request-only route exists.

| Workflow | UI behavior / states |
|---|---|
| Accept request | Pending row Accept calls respond action; shared loading disables action buttons; errors use native alert |
| Decline request | Opens optional reason textarea modal; Cancel clears reason; Confirm calls respond action; error alert keeps dialog, success closes |
| Start session | Only SCHEDULED card exposes Start; shared loading; returned error ignored |
| No-show | Only SCHEDULED card exposes action; no confirmation; shared loading; returned error ignored. Action itself has no status/time/already-noShow guard; see O08's source trace and functionality decisions |
| Active timer | Finds first ACTIVE session; ticks each second from startedAt, mm:ss; timer initializes at 0 and is not explicitly reset when active target disappears |
| Complete | Active-session banner calls endSession; native alert on error including ACTIVE minimum-duration failure; shared loading; no client-side minimum-time disable. Action also accepts SCHEDULED, although trainer UI exposes completion only for ACTIVE |
| Add/Edit notes | Only COMPLETED card; prefilled required textarea; Save/Cancel; action response error ignored and modal closes |
| Empty | No sessions and no pending requests → white centered empty card; pending-only screen omits normal empty card |

Preserve the session-state affordances and distinction between request acceptance and staff-assisted booking. Improve only integration/error robustness and accessible dialog mechanics while preserving appearance. No autonomous trainer session creation screen is present.

### T02 — Assigned Client Roster

**Source:** `trainer/clients/clients-client.tsx:14`; page `:7`, `:15`. **Dependencies:** direct page data read; `authorize`, `trainerClientWhere` source authorization assumptions; PageHeader, DataTable, StatusBadge, Link, state.

**Composition/data:** Header → max-w-md name/email search → table name/email, member status, pack balance, last session, View 360° Profile. Pack balance is first active pack; zero red, ≤2 orange, other green. “Last Session” is latest scheduled timestamp, not necessarily completed/past. 25-row pagination; empty roster explains a member becomes a client after accepting a request.

**Role relationship:** Only T at page level. Roster, profile, and builders share confirmed/active/completed session relationship, within gym (`lib/authz.ts:141` onward). A pending request deliberately does not grant full health/profile access. Preserve that distinction in frontend access contracts; a generic all-gym member dropdown would change the UX/privacy boundary.

### T03 — Client 360° Profile

**Source:** `trainer/clients/[id]/client-360-client.tsx:13`, `:94`, `:138`, `:172`, `:213`, `:250`. **Dependencies:** direct page reads and relationship gate; StatusBadge, StatCard, Link, state. No mutation on this page itself; links launch builders.

**Composition/data:** Back → client avatar/status/contact banner with Create Workout Plan and Create Meal Plan → three stats (remaining sessions, completed sessions/last date, latest workout name) → four underline tabs. Data fetch caps history at **10 sessions**, workout/meal plans at **2 each**, active pack at **1**. Body metrics are fetched (last 5) but never rendered.

| Tab | Actual rendering / interactions |
|---|---|
| Overview & Metrics | md two-column grid with only health/emergency card: DOB, emergency contact, health notes. No chart/body-metric editor/progress photos |
| Workout Plans | New builder link with `?clientId=…`; plan cards with created date and exercise name/sets/reps/optional kg; empty copy; no edit/delete/detail route |
| Meal Plans | New builder link with same query context; plan cards showing meal type, food item, calories; empty copy; no macro/day detail viewer |
| Session History | Timestamp/type/duration/notes/status rows; empty copy; no pagination |

Completed count is only within fetched recent sessions, not lifetime. “Active Workout Plan” uses newest plan without an explicit active filter. Preserve rendered content and query-prefill links, but make the bounded data scope explicit.

### T04 — Workout Plan Builder

**Source:** `trainer/plans/workout/new/workout-builder-form.tsx:24`, `:53`, `:116`, `:165`. **Dependencies:** `saveWorkoutPlan`, eligible-client page query, router/state, PageHeader/Link/Lucide.

**Composition:** max-w-3xl → back/header/error → client/title/description card → dynamic exercise card → footer Cancel/Assign. Exercise rows are one column then 12-column grid at sm: name 4, sets 2, reps 2, weight 3, delete 1. Starts with editable bench press/flyes examples; Add appends blank-name defaults sets3/reps10; remove by local ID.

**Interactions/states:** `clientId` query initializes selection; required client/title/exercise name/sets; explicit client/title/at-least-one validation; action error banner; saving disabled submit; success routes to client profile. Optional weight, no exposed exercise-duration or notes editor despite fields in payload types; no reorder, template library, edit-existing mode, day split, or preview. Retain seeded rows only if product owner confirms; these are initial draft values, not fetched assigned plans.

### T05 — Meal Plan Builder

**Source:** `trainer/plans/meal/new/meal-builder-form.tsx:26`, `:52`, `:121`, `:157`, `:177`. **Dependencies:** `saveMealPlan`, eligible-client query, router/state, PageHeader/Link/Lucide.

**Composition:** max-w-3xl → back/header/error → client/title card → green-tinted four-column live macro summary → dynamic meal entries card → Cancel/Assign. Each entry: sm 12-column type/food/remove row, then fixed four-column calories/protein/carbs/fats row. Breakfast/Lunch/Dinner/Snack/Pre-Workout/Post-Workout options. Initial breakfast and lunch examples; new entry Snack with default calories/macros.

**Interactions/states:** query-prefilled client, add/remove/edit entries; numeric totals update immediately; required client/title/food, at-least-one entry; pending/error; success to T03. `dayOfWeek` is always initialized to 1 and is included in payload but has **no visible day selector**; totals sum all entries, not grouped days. No edit-existing plan, recipe library, food lookup, meal ordering, or member viewer. Keep current design without implying a weekly planner.

### T06 — Earnings

**Source:** `trainer/earnings/earnings-client.tsx:12`. **Dependencies:** direct pay-record read for signed-in user; PageHeader, StatCard, DataTable, Lucide. No mutation action.

**Composition/data:** Header → three summary cards in 1/3 columns (sum of amounts, record count, average) → table date, client/Gym Commission fallback, session type, shift, amount. Data includes all pay records, descending creation, not a selected pay period. No date filter, payout-status filter, withdrawal, payslip, chart, or export. Default 25-row pagination; empty text says “this period” although query is unbounded. Adapt contract/labels deliberately; preserve layout.

## 6. Gym Member UI Map

### M00 / M01 — Entry and trainer directory

`member/page.tsx:3` redirects to `/member/trainers`; no standalone member dashboard. Member pages use session user's own gym/user ID, not admin's effective-gym resolver.

**Source:** `member/trainers/member-trainers-client.tsx:24`, `:52`. **Dependencies:** direct active-trainer page read; PageHeader, Link, state, Lucide.

**Composition/data:** Header → max-w-md trainer-name search → white card grid 1/sm2/lg3. Each card has initial avatar/name/level, shift/rating, first three specialisation chips, three-line bio, Request Session link. Fallbacks: shift 08:00–17:00, rating 5.0, no specialisations/bio copy. Years experience is fetched/type-defined but not displayed.

**Interactions/states:** Search name only; active trainers in own gym only; Request links M02; empty no-trainers card. No advanced filters, profile detail screen, reviews, hire dialog, or pagination. Super Admin normally has no own gym and gets “No gym assigned.” Do not represent this as working admin preview.

### M02 — Request a Session

**Source:** `member/trainers/[id]/book/request-session-form.tsx:15`, `:55`, `:69`; page `:17`, `:32`. **Dependencies:** `requestSession`, own-gym active trainer + active pack page reads; PageHeader, Link, router/state.

**Composition/data:** max-w-2xl → directory back link → trainer-specific header → no-credit and/or action-error banner → white form. Summary names trainer/shifts/remaining credits; date/time pair (today, 10:00), type/duration pair (IN_PERSON/VIRTUAL/INTRODUCTORY; duration60, min20, step5), goals/notes; Cancel/Send footer.

**Interactions/states:** No credits disables submit; date minimum is UTC-derived today; required native fields; pending “Sending Request…”; errors rendered; success to M03 with PENDING_CONFIRMATION expected. No slot browsing, live collision indicator, pack purchase, payment checkout, or immediate confirmed booking. Invalid trainer returns plain “Trainer not found”; missing own gym returns plain no-gym message. First active nonempty pack's balance is shown, not sum across all packs.

### M03 — My PT Sessions

**Source:** `member/sessions/member-sessions-client.tsx:25`, `:55`, `:106`. **Dependencies:** `cancelSession`, direct own-client session read; PageHeader, StatusBadge, ConfirmDialog, Link, state.

**Composition/data:** Header/Request a Session → vertical responsive white cards with timestamp tile, trainer, status, type/duration, notes, conditional Withdraw Request or Cancel Session → confirmation modal. Data sorted newest scheduled first, all statuses, no pagination/filter/tabs.

**Interactions/states:** PENDING_CONFIRMATION withdrawal dialog promises no credit deduction; SCHEDULED cancellation warns about gym cancellation window. Confirm pending disables dialog buttons, action called, modal closes; returned error is ignored. Other statuses show no cancel action. Empty card for no requests. Member can read trainer notes; no notes edit, rating, rescheduling, workouts, meals, membership summary, payment history, or attendance check-in UI.

### Requested feature categories that have no member web implementation

| Category | Evidence-based status / migration consequence |
|---|---|
| Workouts and meal plans | No member routes or navigation. Trainer assigned-plan viewers/builders exist only under T03–T05. No parity page to copy |
| Progress tracking/body metrics/photos | No member UI; trainer client source comments explicitly defer body metrics/photos to mobile. Fetching a model does not constitute a web screen |
| Membership information/payment self-service | No member screen. Owner profile shows membership/pack information; member request form shows only available pack balance |
| Attendance | No member check-in/history interface. Owner Attendance History is recent PT sessions |
| Gamification, community, messaging | No rendered member routes/components. Subscription tier marketing mentions messaging but that does not establish implemented web UI |

These categories require a later product scope decision, not silent creation or a “migrated” checkbox.

## 7. Shared Component Inventory

Reusability means presentation reuse: even **Direct reuse** requires V2 import resolution and agreed theme classes. No stateful business component is safe to copy with its old Server Action import intact. **Adapt** = theme/routing/auth/API adjustments; **Refactor** = extract structure while keeping design; **Rebuild** = recreate only if necessary; **Remove** = omit unused code from the migration, not delete V1 files.

### Existing shared/layout components (all 11 files)

| Component | Exact V1 source | Actual consumers | Responsibilities / important states | Reusability |
|---|---|---|---|---|
| DashboardChrome | `components/layout/dashboard-chrome.tsx:16` | Dashboard layout, all D routes | Mobile drawer state; close on path change/Escape; body scroll lock; impersonation and subscription alerts; main p-4/sm:p-6 | **Adapt** context/branding; retain behavior and ordering |
| Sidebar | `components/layout/sidebar.tsx:35` | DashboardChrome | Role nav, active nested route, initial logo/wordmark, sign-out, off-canvas/backdrop/X, aria-current | **Adapt** slug routes, role normalization, logo/theme and V2 logout |
| Header | `components/layout/header.tsx:13` | DashboardChrome only | 52px bar, mobile menu, NotificationBell, initial avatar/name/role; no profile dropdown/global search | **Adapt** session view model/theme |
| NotificationBell | `components/layout/NotificationBell.tsx:8` | Header | Fetch on mount/every20s; last5 rows; unread count; mark one/all; link navigation; backdrop close/empty state | **Adapt** API, tenant routes, errors and theme |
| PageHeader | `components/shared/page-header.tsx:9` | O02/03/05/06/08/09/12; T01/02/04/05/06; M01/02/03 | Responsive title/description/action row; no data/auth | **Direct reuse** geometry; replace fixed text tokens |
| StatCard | `components/shared/stat-card.tsx:11` | O07/O08/T03/T06; O01 duplicates its pattern manually | Label/value/icon/trend; trendPositive default true; white bordered p-5 card | **Adapt** distinguish brand icon from fixed positive/negative semantics |
| StatusBadge | `components/shared/status-badge.tsx:6` | O02/O04/O05/O07/O08/T01/T02/T03/M03 | Uppercase status; ACTIVE green; EXPIRED/DECLINED red; SUSPENDED/INACTIVE orange; pending blue; fallback gray | **Adapt** complete domain mapping and semantic tokens; preserve known colors |
| DataTable + Column<T> | `components/shared/data-table.tsx:5`, `:27` | O02/O05/O08 daily+monthly/T02/T06 | Generic cell renderers, scroll wrapper, empty Inbox+hint, client pagination25, aria label/scope/live counts, disabled page ends | **Adapt** tokens/types; keep client paging where contract permits; no sorting to preserve |
| ConfirmDialog | `components/shared/confirm-dialog.tsx:19` | O04/O07/O08 daily/M03 | Conditional overlay; icon/title/description; destructive/non-destructive colors; pending disables both buttons | **Refactor** accessible dialog mechanics without visual redesign; no built-in Escape/backdrop dismiss/focus management |
| TemporaryPasswordNotice | `components/shared/temporary-password-notice.tsx:15` | O03/O06 success | Email and one-time password, clipboard Copy/Copied2s, handoff warning, continue link | **Adapt** credential result type/theme/route; handle copy failure clearly |
| FormattedDate | `components/shared/formatted-date.tsx:9` | No rendered imports found | Locale date/time/datetime or em dash; suppressHydrationWarning | **Remove from initial copy** or **Adapt** into one agreed formatter after locale/timezone decision |

### Feature components (all 29 colocated files)

| Component(s) | V1 source under `app/` | Used by | Responsibilities | Reusability |
|---|---|---|---|---|
| LoginForm + LoginPage | `(auth)/login/page.tsx` | A01 | Credentials, safe callback, inline failures/loading, centered form | **Adapt** auth API; preserve UI |
| ChangePasswordForm | `(auth)/change-password/change-password-form.tsx` | A02 | Required/optional copy, inputs, result, delayed sign-out | **Adapt** |
| AdminClient | `(dashboard)/admin/AdminClient.tsx` | S01 | Registry + selected context | **Adapt** central control plane |
| OwnerDashboardClient | `(dashboard)/owner/components/OwnerDashboardClient.tsx` | O01 | Polling, stats, chart, alerts, table, trainer cards | **Refactor** extract repeated stats/status/card pieces |
| MembersListClient | `(dashboard)/owner/members/members-list-client.tsx` | O02 | Local search/filter and columns | **Adapt** |
| NewMemberForm | `(dashboard)/owner/members/new/new-member-form.tsx` | O03 | Registration + one-time handoff | **Adapt** |
| MemberProfileClient | `(dashboard)/owner/members/[id]/member-profile-client.tsx` | O04 | Status + three tabs + pack/desk dialogs | **Refactor** preserve subviews and fix result handling |
| TrainersListClient | `(dashboard)/owner/trainers/trainers-list-client.tsx` | O05 | Search, specialisation chips, roster columns | **Adapt** |
| NewTrainerForm | `(dashboard)/owner/trainers/new/new-trainer-form.tsx` | O06 | Trainer registration + handoff | **Adapt** |
| TrainerProfileClient | `(dashboard)/owner/trainers/[id]/trainer-profile-client.tsx` | O07 | Stats, shifts, bio/status | **Adapt** |
| OwnerSessionsClient | `(dashboard)/owner/sessions/sessions-client.tsx` | O08 | Statistics and daily/monthly switch | **Adapt** |
| DailySessionsView | `(dashboard)/owner/sessions/daily-view.tsx` | O08 | Date/filter/CSV/table/override | **Adapt** shared session view model |
| MonthlyMemberView | `(dashboard)/owner/sessions/monthly-view.tsx` | O08 | Month/search/balances/booked-session overlay | **Adapt** |
| BookSessionForm | `(dashboard)/owner/sessions/book/book-session-form.tsx` | O09 | Eligible booking form | **Adapt**; extract common field layout with M02 |
| FinancialsClient | `(dashboard)/owner/financials/financials-client.tsx` | O10 | Six tabs, native confirmations/downloads | **Refactor** separate tab panels |
| RevenueLineChart, RevenuePieChart, ExpenseBudgetChart, TrainerPayChart | `(dashboard)/owner/financials/components/charts.tsx` | O10 renders first3; last imported but unused | Area trend, donut, grouped budget bars, unused trainer-level bars | First3 **Adapt** tokens; last **Remove from initial migration** |
| LogExpenseDialog, SetBudgetDialog, RecordDeskPaymentDialog | `(dashboard)/owner/financials/components/financial-modals.tsx` | O10 first2; O04 last | Forms, pending/error, close-on-success; budget has required category/amount and current-month default via action | **Refactor** shared modal shell; **Adapt** existing fields/result contracts; preserve budget current-month behavior |
| AnalyticsClient | `(dashboard)/owner/analytics/AnalyticsClient.tsx` | O11 | Three chart panels | **Adapt** |
| GymConfigClient | `(dashboard)/owner/gym-config/gym-config-client.tsx` | O12 | Five forms/tab state/shared feedback/expiry command | **Refactor** extract tab forms; new branding controls separately scoped |
| AuditLogClient | `(dashboard)/owner/audit-log/AuditLogClient.tsx` | O13 | Server pages/filter/current-page CSV | **Adapt** |
| SubscriptionClient | `(dashboard)/owner/subscription/SubscriptionClient.tsx` | O14 | Static tiers, current-plan display, alert-only controls | **Future only**; retain V1 visual reference, hide mock controls in MVP |
| TrainerScheduleClient | `(dashboard)/trainer/schedule/schedule-client.tsx` | T01 | Pending requests, live timer, cards, notes/decline | **Refactor** cards/dialogs while retaining order |
| TrainerClientsClient | `(dashboard)/trainer/clients/clients-client.tsx` | T02 | Search, balance/status columns | **Adapt** |
| Client360Client | `(dashboard)/trainer/clients/[id]/client-360-client.tsx` | T03 | Banner/stats/four tabs/builder links | **Refactor** tab panels |
| WorkoutBuilderForm | `(dashboard)/trainer/plans/workout/new/workout-builder-form.tsx` | T04 | Dynamic exercise fields/payload | **Adapt** |
| MealBuilderForm | `(dashboard)/trainer/plans/meal/new/meal-builder-form.tsx` | T05 | Dynamic meals/macros/payload | **Adapt** |
| TrainerEarningsClient | `(dashboard)/trainer/earnings/earnings-client.tsx` | T06 | Read-only summaries/table | **Adapt** |
| MemberTrainersClient | `(dashboard)/member/trainers/member-trainers-client.tsx` | M01 | Search and trainer cards | **Adapt** |
| RequestSessionForm | `(dashboard)/member/trainers/[id]/book/request-session-form.tsx` | M02 | Trainer-bound request/credit warning | **Adapt** |
| MemberSessionsClient | `(dashboard)/member/sessions/member-sessions-client.tsx` | M03 | Session history/cancellation confirmation | **Adapt**; extract card pattern with T01 |

The first row is an embedded page-local component, included for completeness; it is not an extra colocated component file. The 29 colocated files comprise the remaining feature rows, with each charts/modals file exporting multiple components.

### Existing patterns to extract, without redesign

| Pattern | Current instances | Proposed shared responsibility |
|---|---|---|
| Primary/secondary/destructive buttons | Nearly all forms, tabs and dialogs | Preserve dimensions, icon gap, pending labels, hover/disabled/focus styling; use intent/theme tokens |
| FormField/Input/Select/Textarea | Auth, member/trainer registration, config, booking, finance, builders | Label/id association, required/helper/error text; keep compact spacing and native widgets |
| Card/CardHeading and InlineFeedback | All roles; multiple slightly different color/spacing variants | Preserve variants instead of forcing all screens into identical sizes |
| ProfileBanner / InitialAvatar / TrainerLevelBadge / SpecialisationChips | O04/O07/T03/M01/O05 | Shared presentation, optional action slot and identity label |
| Tabs | O04/O08/O10/O12/T03 | Underline variant, horizontal scrolling, aria semantics/keyboard; preserve selected/default tab |
| ModalShell | ConfirmDialog, financial dialogs, pack issue, More sessions, notes, decline | Overlay/padding/scroll/focus/restore; retain existing widths and intent copy |
| SessionCard / TimestampTile | T01/M03 | Date/time/type/status/notes with role-specific action slots; do not combine authorization logic |
| SearchField and FilterToolbar | O02/O05/O08/T02/M01 | Icon/label/spacing and responsive layout; feature predicates stay local |
| ChartFrame / chart palette / tooltips | O01/O10/O11 | Explicit height and responsive container; themed categorical series and neutral axes |
| CSV download adapter | Daily sessions and audit use data URIs; financials use HTTP | Preserve each dataset scope and filename; standard escaping and pending/error feedback |
| EmptyState / Skeleton | DataTable, card lists, owner loading | Existing icon/text/card patterns; state-specific copy |

There is no shared Button/Input/Tabs/Dropdown/Pagination/Toast provider, custom hook directory, notification center page, general edit modal, image upload component, or standalone chart library in V1. Dropdowns are native selects except the bell panel. Pagination is embedded in DataTable and AuditLogClient. Feedback uses inline banners, browser alerts, and native confirm; no toast library was found. `lib/utils.ts` exports unused `cn` (clsx/tailwind-merge); `lib/validations/auth.ts` exports an unused login schema. These utilities are optional candidates, not mandatory copied dependencies.

## 8. Current Design System

Actual source takes precedence over design/proposal documents. `V1/app/globals.css:1` imports Tailwind4; `@theme inline` maps only background/foreground and system sans. Styling is almost entirely inline utility classes, including arbitrary hex colors; financial pages additionally use standard gray/emerald/teal/amber/indigo palettes. No CSS modules or component stylesheet files are in the UI inventory.

### Palette and recurring appearance

| Role | Source colors / use |
|---|---|
| Main brand/action | `#007A35`; hover variants `#00622A`, `#00632B`, `#005c28`; focus accent `#45B472` |
| Page canvas / surfaces | `#F4F5F7`; white cards/header; inputs/tabs/tables `#F5F4F5`; secondary table headings `#F8F9FA`, `#FCFCFD`; row hover `#F9FAFB` |
| Text | Main `#171B28`; secondary `#4A4D58`; muted `#8B8E98` |
| Borders/dividers | `#E1E1E4`; light gray finance alternatives; hover gray `#EAEAEA` |
| Sidebar | `#171B28` background, `#777B87` idle text, `#202534` hover, `#232736` divider, active brand green/white |
| Positive | `#DDF5E7` background, `#BBEBD0` border, `#007A35` text; emerald utilities |
| Negative/destructive | `#D71920`, `#FDE4E4`, `#F8B4B4`, hover `#B5141A` / `#F8C4C4`; red utilities |
| Warning | `#F97316` / `#FFF0E0` / `#FFD8B3`; amber `#B45309`, `#FFF8E6`, `#FFE7B3` |
| Informational/category | Pending blue; Level2 blue; Level1 gray; recurring expenses indigo; financial categories teal/emerald/amber |
| Chart palette | `#007A35`, `#4C956C`, `#78AA8C`, `#A9C6B4`, `#C8DDD0`; grid `#F0F0F0`; axes muted |

A literal count over all 74 TSX files found `#007A35` 285 times, `#E1E1E4` 228, `#8B8E98` 192, `#171B28` 157, `#F5F4F5` 117, `#4A4D58` 116. These are source occurrences, not rendered-element counts; CSS files and standard utility palettes are excluded from these counts.

### Type, spacing, shapes, behavior

| Dimension | Verified convention / evidence |
|---|---|
| Font | System-ui/-apple-system/BlinkMacSystemFont/Segoe UI/Roboto/etc from globals; no V1 webfont loader. Mono for timer, passwords, audit IDs/timestamps |
| Typography | Page titles generally text-2xl 24px bold tracking-tight; profile titles20px; section titles12–16px bold; main compact body12px; helper9–11px uppercase/tracking-wider; finance often14px and 30px stat value |
| Weight | 500/600/700 common; 800 stats; 900 timer/net totals. Default scale verified in installed `node_modules/tailwindcss/theme.css:374` |
| Spacing | Tailwind quarter-rem unit; gap3/4/6 (12/16/24px), card p5/p6 (20/24px), page p4/sm:p6, vertical space-y4/6; form py2–2.5; consistent dense table px4/py3–3.5 |
| Corners | rounded-md6px, lg8px, xl12px from installed theme `:399`; rounded-full avatars/status pills; occasional default rounded4px categorical badges |
| Shadows | Cards shadow-sm, overlay shadow-lg/xl, active banner shadow-lg; installed defaults `theme.css:408` define sm layered 0 1px 3px / 0 1px 2px shadows |
| Cards | White, 1px border, 12px radius, restrained shadow; darker/colored blocks carry status meaning or highlighted statistics |
| Buttons | Compact green/white main, neutral light-gray secondary, red destructive, green/orange status intent; icon+text; rounded8px; variable 12/14px labels |
| Forms | Compact uppercase semibold labels, light-gray controls, border, green 1px/2px focus ring; some finance controls plain white. Native dates/times/selects/checks |
| Tables | White rounded shell, muted uppercase header, thin row dividers, hover pale gray; scroll wrapper in shared table and most manual tables; no sorting headers |
| Charts | Recharts responsive containers; area curves/gradients, donut inner50/outer80/padding5, rounded bar tops4px, lines2–3px, legend/tooltip; heights256/288px |
| Motion | Hover transitions100–200ms, spinner/pulse/ping; overlay classes animate-in/fade-in/zoom-in occur but no animation plugin/custom definitions were found—runtime appearance unverified |

### Responsive web and sidebar

Installed Tailwind defaults (`V1/node_modules/tailwindcss/theme.css:325`) are sm40rem/640px, md48rem/768px, lg64rem/1024px, xl80rem/1280px, 2xl96rem/1536px. UI source uses sm/md/lg only; no custom breakpoint overrides were found.

- Desktop md+: Sidebar is a static **224px** (`w-56`) column with vertical overflow. It is not a fixed floating/sticky desktop sidebar and header has no sticky positioning.
- Below md: Sidebar is a **256px** fixed off-canvas drawer (`w-64`, z40); black50% backdrop z30; Header menu button; close on X, backdrop, Escape, or navigation; body scroll locked while open. Root chrome flex/min-w-0 prevents table overflow from forcing width.
- Header is `h-13` (52px); user name/role hidden below sm, initial avatar remains. Main p16px, then24px at sm. Most card grids collapse to one column; list cards stack at sm/md.
- Known narrow-width risks from source: registration/booking pairs stay grid-cols-2; meal macro summary and nutrient rows stay grid-cols-4; O04/T03/O12 tabs lack scroll wrappers; profile name/status/action clusters may overflow with long content; NotificationBell fixed `w-80` needs checking at320px; config plans table lacks its own overflow wrapper. These are test targets, not claims of observed browser overflow.
- No V1 `dark:` styling, prefers-color-scheme query, mode toggle, theme persistence, font preset, logo upload, or raster illustration was found. Dark sidebar is a fixed design choice, not dark mode. `public/` is empty; `app/favicon.ico` is the only app image asset found. Brand mark is Lucide Dumbbell; user/trainer avatars are text initials; no V1 `<img>` or next/image rendering in inspected UI.

## 9. Dynamic Theming Migration Assessment

Theming should change values, not page structure. Start with a **V1 Classic** preset that exactly matches source colors, font, spacing, radius and chart geometry. A dark preset has no V1 visual baseline and needs a separate acceptance decision.

### Semantic token map (proposal, no implementation)

| Current styling / context | Proposed semantic styling | Initial V1-equivalent value | Change scope |
|---|---|---|---|
| `bg-[#007A35]` action/active nav | `bg-primary text-on-primary` | #007A35 / white | Sidebar, auth, buttons, banners; contrast-aware on-primary |
| Green action hover variants | `hover:bg-primary-hover` | Preserve per-variant baseline initially, then standardize deliberately | Forms, links, CTA |
| Green tint decorative avatars/icons | `bg-primary-soft text-primary border-primary-border` | 10%/20% green variants | Header, StatCard, profiles, directory |
| `focus:ring-[#007A35]` / #45B472 | `ring-focus` / `ring-focus-on-nav` | V1 green/focus variants | All keyboard controls |
| Neutral secondary buttons | `bg-secondary text-on-secondary border-border` | #F5F4F5 / #4A4D58 | Preserve contrast; secondary brand color may have separate soft variant |
| Highlight/popular/selected emphasis | `bg-accent text-on-accent` where intentionally decorative | V1 green, by preset | Tier badges and selected accents; do not overwrite warning colors |
| `bg-[#F4F5F7]` | `bg-background` | #F4F5F7 | Root/auth/chrome |
| White cards/modal/header | `bg-surface text-foreground` | white / #171B28 | All surfaces |
| Input and subpanel pale backgrounds | `bg-surface-muted` / `bg-input` | #F5F4F5 | Forms, tables, notes, lists |
| Main/secondary/muted text | `text-foreground`, `text-secondary-foreground`, `text-muted-foreground` | #171B28 / #4A4D58 / #8B8E98 | Every page and shared primitive |
| Dividers and hover | `border-border`, `bg-surface-hover` | #E1E1E4 / #F9FAFB | Tables, cards, panels |
| Sidebar dark fixed hexes | `bg-navigation`, `text-navigation-muted`, `bg-navigation-hover`, `border-navigation-border` | Existing charcoal palette | Dedicated navigation values per light/dark preset |
| Chart fills/strokes/stopColor/legend inline style | `chart-1…chart-5`, `chart-grid`, `chart-axis`, `chart-tooltip-*` | Existing green family, gray grid/axis | O01/O10/O11; JSX SVG attributes also need tokens |
| System sans | `font-preset` + fallback stack | V1 system stack | Root and auth explicit font classes; mono remains independent |
| Dumbbell + GymOS lockup | Theme logo/name with initial/default icon fallback | V1 mark/name | Sidebar, auth where gym identity known; favicon/metadata optional policy |
| Card shadows / controls | `shadow-card`, `shadow-overlay`, `input-*` semantic values | Existing shadows/control surfaces | Dark-mode surfaces need separate depth/border values |

**Do not mechanically replace every green with primary.** The same #007A35 serves both branding and success today. Keep fixed success/warning/error/info semantics regardless of a gym choosing red/purple as its primary. Use success/error/warning/info tokens with light/dark-appropriate surfaces and accessible foregrounds. Destructive confirmations, expired/declined states, failed billing banner, no-show alerts, low credits, over-budget variance, and negative P&L must retain their meanings. Positive financial results and within-limit badges should use success, not gym brand. Neutral statuses remain neutral; pending blue remains informational; categorical trainer levels/series need stable distinguishable palette tokens, not error colors.

### Per-surface branding changes and reuse

| Surface | Reusable unchanged in shape | Required adaptation |
|---|---|---|
| Global/auth | Centered auth card, label/input/error layout | Root body currently fixes colors directly; resolve gym context before showing a gym logo. Generic `/login` has no V1 tenant slug; use platform fallback when context unknown |
| Layout/chrome | Sidebar width/nav positions, header, alert ordering, mobile drawer | Logo/name/theme context; API-derived gym access/subscription; isolate platform palette from selected gym palette |
| Shared UI | Card/table/dialog structures, helper/cell renderers | Replace white/gray/fixed green text/borders/rings; semantic feedback stays independent |
| Owner features | All current page/tab arrangements | Theme every native/manual table and form, not just shared components; remove finance hard-coded neutral palette; chart attributes/gradients |
| Trainer/member features | Cards, plan rows, stats, field layout | Themed controls/highlights, readable fixed statuses, initials/logo fallback; supported font width regression |
| Theme configuration | No V1 controls to reuse | V2-only frontend requirement: primary/secondary/accent, canvas/surfaces/text, logo, light/dark, allowlisted fonts and presets; place as an explicit new settings tab/feature only after scope approval |

V2 currently exposes only `GymTheme.theme.primaryColor` and `logoUrl` in `apps/web/src/lib/gymos.ts`, and injects `--gym-color` on `src/app/gyms/[slug]/page.tsx`. This is insufficient for the full requested theme surface. Additional theme fields/contracts are **unavailable in the inspected frontend**, not implemented by this report. Agree frontend view-model/fallback/preset contracts before dependent pages; do not redesign schemas here.

Current API source also implements owner-only PATCH `/gyms/:slug/theme` for those two fields (`V2/apps/api/src/gyms.controller.ts:27`, `:68`); the web has no theme editor. Secondary/accent/surface/text/mode/font/preset settings remain proposed. Endpoint implementation is source-verified, not runtime-tested here.

Resolve theme server-side at the gym layout boundary, apply sanitized values to semantic CSS variables, then consume through Tailwind semantic classes. Ensure overlays inherit the current gym tokens even if later portal-mounted. Prevent theme flash and prior-gym theme leakage on navigation. Validate approved color/font/logo values, primary foreground contrast, dark tooltip/input states, and fallback when theme loading fails. Keep platform admin branding stable while making gym view context explicit. Brand-primary status confusion, long logo sizing, and unsupported fonts are visual acceptance cases, not reasons to redesign V1.

## 10. Navigation and User Interaction Map

### Role navigation and authorization assumptions

`V1/proxy.ts` gates login/change-password and all role prefixes. Root role routing is `app/page.tsx:10`; forced temporary-password redirect precedes role routing in proxy. Login callback permits only local slash paths (`login/page.tsx:14`) and success uses hard navigation. Change-password success displays confirmation then signs out after1600ms. There is no visible password-change sidebar link; direct URL/forced navigation makes it reachable.

| Role | Sidebar entries, in actual order | Entry and additional navigation |
|---|---|---|
| A | All Gyms; Owner View only when gym selected | `/`→`/admin`; selection updates context then Owner View opens O01; no automatic navigation on View Dashboard |
| O | Dashboard, Members, Trainers, Sessions, Financials, Analytics, Gym Config, Audit Log, Subscription | Lists→create/detail; details back to list; booking→sessions |
| T | Schedule, Clients, Earnings | `/trainer`→schedule; clients→360→workout/meal builders with clientId; builder success→360; cancel→roster |
| M | Trainers, My Sessions | `/member`→directory→trainer request→my sessions; request CTA on history→directory |

All roles can sign out from Sidebar. Bell rows mark read then optionally navigate to stored `linkUrl`; no central route builder currently rewrites those links. Sidebar nested active matching uses prefix checks; preserve intended active parent when route paths gain gym slugs. Header only replaces the first underscore in role text, so multiword roles can render imperfectly; normalize V2 display labels.

### Interaction/state matrix

“Action” refers to V1 names only. Read adapters/proposed V2 behavior belong to section12; no new endpoint names are assumed.

| Page / UI element | Trigger | Actual expected behavior from source | Pending / disabled / error / success | Current dependency |
|---|---|---|---|---|
| R00 role entry | Navigate `/` | Redirect login or role home | No custom loading/error | `auth`, `redirect` |
| A01 sign in | Submit credentials | Credentials sign-in; same-origin callback or proxy-driven role destination | Required/email; Signing in disabled; invalid/inactive/rate/unexpected inline errors | Auth.js `signIn` |
| A02 change password | Submit current/new/confirmation | Validate; success panel; sign-out/relogin | Required; ≥10, ≤200, number/symbol, no edge spaces, new≠old, confirmation; Saving disabled; inline errors | `changePassword`, Auth.js `signOut` |
| S01 gym select/row action | Change/click | Set/clear gym, refresh; selected row/Owner View update | Select disabled; row buttons not disabled; no inline failure | `setImpersonatedGym`, `getSuperAdminData` |
| O01 refresh/chart | Click /30s/hover | Refresh server data; chart tooltip | 500ms spinner only, empty session/chart states | `getOwnerDashboardData`, router |
| O02 roster controls | Type/select/page/click | Local name/email/phone+status filter; page; register/profile navigation | Empty hint, page-end disabled; no sorting | Direct page data, DataTable, Link |
| O03 registration | Submit/copy/continue | Create→credential handoff→profile | Pending; first validation error; one-time success; Copy feedback, copy error silent | `createMember`, clipboard |
| O04 status | Open/confirm dialog | Suspend/deactivate/reactivate | Dialog loading; returned error ignored; closes | `updateMemberStatus` |
| O04 tabs | Click | Overview / last5 PT sessions / derived billing | Empty session/pack copy; no progress view | Local state + page data |
| O04 pack | Open/submit/cancel | Issue pack and close | Required numeric fields; action min1/nonnegative validation; pending/error | `issueSessionPack` |
| O04 desk payment | Open/submit/cancel | Record membership/add-on payment; close | Required member/amount; positive validation; pending/error; no transaction list update visible | `recordManualPayment` |
| O04 receipt | Click Download Receipt | Browser text alert only | **Mock**, no downloaded file | `alert` |
| O05 roster | Type/page/click | Local search, register/detail | Empty roster; page ends disabled | Direct page data, DataTable |
| O06 create trainer | Submit/copy/continue | Create→one-time credentials→profile | Required/email; pending/error; success notice | `createTrainer`, clipboard |
| O07 trainer status | Confirm | Toggle ACTIVE/DEACTIVATED | Pending; error ignored; confirmation always destructive style | `updateTrainerStatus` |
| O07 shift form | Edit/submit | Update hours and show result | Pending; failure text rendered with success color | `approveShiftHours` |
| O08 tabs/stat cards | Click tab | Daily/monthly switch; stats stay all-session | Local state; stats not date-filtered | Page data |
| O08 daily filters | Date/arrows/Today/search/select | Date-filter and sort by time then name/trainer/status filters | Empty day; client pagination25 | Local state/DataTable |
| O08 override | Click Complete/No-Show, confirm | Complete accepts SCHEDULED/ACTIVE; minimum duration applies only to ACTIVE. No-show action has no status/time/repeat guard | Pending; returned error discarded. Pre-start completion and no-show eligibility/idempotency need functionality decisions | `overrideSessionStatus`, `endSession`, `handleNoShow`; O08 source trace |
| O08 daily export | Click | Download all currently filtered day rows | No pending/error feedback | Client data URI |
| O08 monthly | Month/search/More/close | Pack totals + selected-month pending/scheduled list | Empty search/list copy; overlay scroll; backdrop/X close | Local state/DataTable |
| O09 book | Submit/back/cancel | Eligible member+trainer booking→session overview | Required fields; no-credit warning/disable; pending/action errors | `bookSession` |
| O10 all tabs | Click | Six distinct read panels; no URL tab persistence | Local tab state; some empty panels only | Six initial actions listed in O10 |
| O10 expense | Open/submit/close | Save expense→close | Required fields; positive amount action error; Saving disabled | `createExpense` |
| O10 budget | Open/submit/close | Submit required category/amount; omitted optional month defaults to current month | Updating disabled submit; validation/action error panel; success closes; no month picker | `setCategoryBudget` |
| O10 payroll | Native confirm close/approve | Attempt current-period transition | Conditional OPEN/CLOSED; disabled pending; errors ignored | `closePayPeriod`, `approvePayPeriod` |
| O10 downloads | Click financial/payroll links | Authenticated CSV attachment | Browser download, no inline errors | `GET /api/export/csv` |
| O10 accounting | Disabled button | Coming Soon | Disabled/opacity; no integration | None |
| O11 charts | Hover | Tooltip/legend series view | No custom empty/error UI | `getAnalyticsData`, Recharts |
| O12 profile/plan/rates/policy | Tab/toggle/submit | Save form; display success/error; add-plan closes | Shared loading; native/action validation; banners; no edit/delete plans | Five config actions |
| O12 expiry | Click | Run immediate expiry check | No pending guard; count/error banner | `checkMembershipExpiries` |
| O13 filter/page | Select/Previous/Next | Server filter and pages20 | Loading row; empty; ends disabled; no caught inline errors | `getAuditLogs` |
| O13 export | Click | Download currently loaded logs only | No pending/error; manual data URI | Browser CSV |
| O14 billing/tier | Click | Alert for portal/support only | Current plan disabled; **mock mutations** | `getGymSubscription`, `alert` |
| T00 entry | Navigate | Redirect schedule | No standalone dashboard | `redirect` |
| T01 accept/decline | Click/submit reason | Confirm or decline member request | Shared pending; native alert errors; optional reason modal | `respondToSessionRequest` |
| T01 start/no-show | Click scheduled card | Attempt state update; no-show has authorization checks but no status/time/already-noShow guard | Pending; returned errors ignored; no no-show confirmation. Repeat-call effects are an untested functionality risk; see O08 | `startSession`, `handleNoShow` |
| T01 timer/complete | Tick/click active banner | Elapsed time and completion attempt | Shared pending; ACTIVE-only minimum-time/error alert; no client time lock. Action additionally accepts SCHEDULED | `endSession`, effect timer |
| T01 notes | Open/edit/submit/cancel | Edit completed-session notes | Required textarea; pending; returned error ignored, closes | `updateSessionNotes` |
| T02 search/page/profile | Type/click | Filter assigned clients and open360 | Empty; page ends disabled | Direct page data, DataTable |
| T03 tabs/create links | Click | Four panels; builder query-prefill | Empty plan/history states | Local data/state/Link |
| T04 exercises | Add/delete/edit/submit | Dynamic rows, validate, assign→client | Native required + at-least-one; pending/action error | `saveWorkoutPlan` |
| T05 meals/macros | Add/delete/edit/submit | Dynamic entries and aggregate totals; assign→client | Native required + at-least-one; pending/action error; no day picker | `saveMealPlan` |
| T06 pagination | Click | Page earnings records | Empty; 25 rows; no filters/export | Direct page data/DataTable |
| M00 entry | Navigate | Redirect directory | No standalone dashboard | `redirect` |
| M01 search/request | Type/click | Filter active trainer cards; open request route | Empty directory | Direct page data/Link |
| M02 request | Submit/cancel | Pending request→My Sessions | No credits disable; required/min date/min duration; pending/action errors | `requestSession` |
| M03 withdraw/cancel | Open/confirm | Withdraw pending or cancel scheduled, with different warning | Pending; returned error ignored; closes | `cancelSession` |
| All D mobile navigation | Menu/X/backdrop/Escape/link | Drawer open/close, body lock, active nav | Accessible labels/expanded; hidden visually when closed; focus/inert behavior needs verification | DashboardChrome/Sidebar |
| All D bell | Open/mark one/all/row link | Poll20s, count, last5, mark/read then navigate | Empty; no pending/error display; backdrop dismiss | Three notification actions |
| All D sign-out | Click | Session logout→login | No dedicated pending UI | Auth.js `signOut` |
| X01/X02 | Retry/return | Reset error or navigate `/owner` | Boundary display | Next reset/Link |

### V1 integration families to detach

| V1 dependency file | UI-facing exports actually used | Required V2 frontend boundary |
|---|---|---|
| `app/actions/admin.ts` | getSuperAdminData, setImpersonatedGym | Platform summaries and explicit selected-gym view context |
| `app/actions/account.ts` | changePassword | Account credential change + session transition |
| `app/actions/dashboard.ts` | getOwnerDashboardData | Owner dashboard read model + refresh |
| `app/actions/members.ts` | createMember, updateMemberStatus, checkMembershipExpiries | Registration/credentials, status result, expiry-command feedback |
| `app/actions/trainers.ts` | createTrainer, updateTrainerStatus, approveShiftHours | Trainer account/status/shift results |
| `app/actions/packs.ts` | issueSessionPack | Pack issue result and refreshed balances |
| `app/actions/sessions.ts` | bookSession, requestSession, respondToSessionRequest, startSession, endSession, handleNoShow, cancelSession, overrideSessionStatus, updateSessionNotes | Role-specific session commands with explicit result states |
| `app/actions/plans.ts` | saveWorkoutPlan, saveMealPlan | Plan form result and client-view refresh |
| `app/actions/financials.ts` | getRevenueOverview, getExpenses, getBudgetVsActual, getDeferredRevenue, getCurrentPayPeriodInfo, generatePnL, createExpense, setCategoryBudget, closePayPeriod, approvePayPeriod, recordManualPayment | Financial read models/command results/download integration |
| `app/actions/gym-config.ts` | updateGymProfile, createMembershipPlan, updateTrainerPayRates, updateSessionRates, updateCancellationPolicy | Settings tab form contracts |
| `app/actions/analytics.ts` | getAnalyticsData | Chart series read model |
| `app/actions/audit.ts` | getAuditLogs | Filter + server-page response |
| `app/actions/subscription.ts` | getGymSubscription | Platform subscription display |
| `app/actions/notifications.ts` | getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead | Notification read/mark result and link mapping |

Many page loaders directly read Prisma rather than calling one of these actions: member/trainer rosters/detail/create pickers, session oversight/booking, trainer schedule/clients/client360/earnings/builders, member directory/request/history, gym config, and dashboard layout. Section2's exact page file is the evidence for each. Removing only action imports would leave V1 integration dependencies. Also detach `@prisma/client` UI role/status/type imports; use frontend-owned types. `revalidatePath` currently drives many post-mutation updates; V2 needs explicit frontend refresh/invalidation of affected lists/profiles/balances/charts, scoped by gym and role.

## 11. Visual Reference/Screenshot Inventory

**Actual V1 captures completed by GYMOS-MIG-014.** The [verified evidence](evidence/GYMOS-MIG-014.md) contains 369 synthetic references, including all 26 rendered screens and 104 required baselines at the four target widths. Capture ran from a disposable copy and owned database; preservation evidence proves the original V1 checkout remained unchanged. These are V1 references for later comparison, not V2 parity evidence.

Suggested capture standard: desktop1440×1000, tablet768×1024, mobile390×844, plus320px stress width. Capture selected states at the same viewport/browser/font/device scale/timezone and deterministic fixture time in both versions. Include full-page and focused overlay/chart crops; name by `<ID>-<state>-<width>.png`. Use redacted fixture identities and placeholder credentials. Freeze/mask refresh indicators, timers and chart animation consistently; do not mask content differences. URLs containing IDs use fixture IDs. Store images only when actually captured.

| Capture ID / route | Desktop + mobile required reference states | Capture status |
|---|---|---|
| A01 `/login` | Empty form, invalid credentials, inactive/rate feedback, submitting, platform/gym fallback branding | Captured |
| A02 `/change-password` | Required and optional variants, validation, pending, updated confirmation | Captured with disposable identity |
| S01 `/admin` | Registry, none/selected gym, stop view, narrow table, selected context banner/nav | Captured |
| O01 `/owner` | Four stats/chart/alerts/table/trainer cards; active session; low-credit/no-show/normal; zeros | Captured |
| O02 `/owner/members` | Populated/empty/filtered/no matches, pagination >25, long names | Captured |
| O03 `/owner/members/new` | Full form, invalid, pending, one-time handoff + Copy | Captured; credential masked |
| O04 `/owner/members/[id]` | Overview with/without pack, all3 tabs, status confirm, pack form/error, desk payment, receipt alert | Captured; payment reference only |
| O05 `/owner/trainers` | Both levels/statuses/specialisation chips, search/empty/pagination | Captured |
| O06 `/owner/trainers/new` | Full form, error, pending, one-time credentials | Captured; credential masked |
| O07 `/owner/trainers/[id]` | Banner/stats/bio/shift form, status confirm, success/failure | Captured |
| O08 `/owner/sessions` | Daily filters/all statuses/empty/pagination, override dialog; monthly balances/More overlay | Captured |
| O09 `/owner/sessions/book` | Eligible selectors, no packs, validation/collision, submitting | Captured |
| O10 `/owner/financials` | **All6 tabs**, chart tooltips/empty, expense/budget dialogs/errors, payroll OPEN/CLOSED/APPROVED/native confirm | Captured |
| O11 `/owner/analytics` | Three charts, legends/tooltips, empty/zero and long trainer labels | Captured |
| O12 `/owner/gym-config` | **All5 tabs**, inline add-plan, error/success, checkbox state | Captured |
| O13 `/owner/audit-log` | Filter, loading, populated/empty, pages, truncated details | Captured |
| O14 `/owner/subscription` | Current plan/status/last4, all4 cards, current/popular badges, alert-only controls | Captured; reference only |
| T01 `/trainer/schedule` | Pending requests, decline modal, SCHEDULED/ACTIVE/COMPLETED/DECLINED/CANCELLED, timer, notes, empty | Captured |
| T02 `/trainer/clients` | Balance0/1–2/>2, search/pagination/empty | Captured |
| T03 `/trainer/clients/[id]` | Banner/stats + **all4 tabs**, empty plans/history, long health text | Captured |
| T04 `/trainer/plans/workout/new` | Prefilled client, default examples, add/remove, empty validation, mobile row stacking | Captured |
| T05 `/trainer/plans/meal/new` | Default examples, totals after edits/add/remove, numeric/empty validation, narrow4-column rows | Captured |
| T06 `/trainer/earnings` | Stats/table/zero/commission fallback/pagination | Captured |
| M01 `/member/trainers` | Active cards, both levels, long bio/search/empty | Captured |
| M02 `/member/trainers/[id]/book` | Credits/no credits, form/collision/pending; missing trainer/no gym messages | Captured |
| M03 `/member/sessions` | All statuses, notes, withdrawal/cancellation warning variants, empty | Captured |
| R00/T00/M00 redirects | Record destination + role/nav after redirect; no standalone screen image | Verified in manifest; no image by design |
| L01/L02 and X01–03 | Desktop/mobile drawer open/closed, bell open/empty/unread, admin/subscription banners, loading skeleton, error/retry, missing resource/return | Captured |

Before captures, use a disposable non-production fixture environment with all4 roles, two gyms/themes, ≥26 list rows, ≥21 audit rows, representative plan/session/payroll states, and precreated subscription/pay period. Avoid live-data state changes. Opening bell is read-only until a row/read-all is clicked; those clicks write read state. Credential screenshots must contain fixture secrets only. Capture states through safe test fixtures or mocked frontend adapters; do not force production mutations for screenshots.

## 12. Proposed V2 Frontend Structure

**Recommendation, not created:** retain the existing `apps/web/src/` convention. The brief's `apps/web/app/` example is not the current repo's source layout. Preserve feature URL suffixes under an explicit gym slug to make gym identity stable across links, queries, and theme resolution.

```text
apps/web/
  src/
    app/
      layout.tsx                    # platform defaults, metadata, fonts
      globals.css                   # semantic tokens + V1 Classic preset mapping
      page.tsx                      # V1-style auth/role redirect; current V2 home is test scaffolding
      (auth)/
        login/page.tsx
        change-password/page.tsx
      (platform)/
        admin/page.tsx              # registry/context + existing V2 gym creation
      gyms/[slug]/
        layout.tsx                 # gym access/theme context; shared shell boundary
        page.tsx                   # role entry; reconcile existing member workspace
        error.tsx
        not-found.tsx
        owner/
          page.tsx
          loading.tsx
          members/{page,new/page,[id]/page}.tsx
          trainers/{page,new/page,[id]/page}.tsx
          sessions/{page,book/page}.tsx
          financials/page.tsx
          analytics/page.tsx
          gym-config/page.tsx
          audit-log/page.tsx
          subscription/page.tsx       # future only; not in MVP navigation
        trainer/
          page.tsx
          schedule/page.tsx
          clients/{page,[id]/page}.tsx
          plans/workout/new/page.tsx
          plans/meal/new/page.tsx
          earnings/page.tsx
        member/
          page.tsx
          trainers/{page,[id]/book/page}.tsx
          sessions/page.tsx
    components/
      layout/                       # DashboardChrome, Sidebar, Header, Bell
      ui/                           # form/button/dialog/card/tabs/feedback primitives
      shared/                       # DataTable, StatCard, StatusBadge, PageHeader...
    features/
      auth/                         # login/password forms and frontend validation
      platform/                     # registry/context/create-gym UI
      owner/                        # dashboard, member/trainer management
      sessions/                     # owner/trainer/member session presentations
      financials/                   # tabs, charts, dialogs, download adapter
      gym-config/                   # five existing forms + separately scoped theme UI
      analytics/
      audit/
      subscription/
      trainer/                      # roster/client360/plans/earnings
      member/                       # directory/request/history
      notifications/
    theme/                          # types, presets, semantic token map, resolution
    lib/
      gymos.ts                      # reconcile existing API URL/session constants
      api/                          # request/result normalization, feature adapters
      auth/                         # web session and access-facing view model
      routes.ts                     # role+gym URL builders and legacy link mapping
      format.ts                     # agreed currency/date/time display
    types/                          # frontend-owned DTO/view models; no Prisma UI imports
    hooks/                          # only needed shared state/queries; tenant-scoped keys
```

Braces in this diagram abbreviate directories; section13 provides exact per-file paths. Group names `(auth)` / `(platform)` do not enter URLs. Proposed gym routes are `/gyms/[slug]/owner/...`, `/gyms/[slug]/trainer/...`, `/gyms/[slug]/member/...`. Do not introduce nonexistent feature pages merely because a folder could accommodate them. Admin stays central; selected-gym preview navigates through the explicit slug with authorized context. Preserve existing tab workflows at the same suffixes.

### Existing V2 reconciliation and frontend dependency gaps

| Existing V2 source | Verified current behavior | Migration recommendation |
|---|---|---|
| `apps/web/src/app/page.tsx` | Public marketing landing, not V1 role redirect | Replace its MVP presentation with V1-style authenticated role entry; current public marketing screen was test scaffolding |
| `apps/web/src/app/login/page.tsx` | Split illustration/form, owner/admin copy, action-based errors | Deliberately restore V1 centered design if V1 parity is priority; retain API-backed login and V2 error handling |
| `apps/web/src/app/admin/page.tsx` | Creates gym/owner, lists name/slug/status, no V1 impersonation | Combine existing creation capability with V1 registry/context presentation; no feature deletion |
| `apps/web/src/app/gyms/[slug]/page.tsx` | Unconditional parallel theme/access/members requests; renders returned member count/list; basic-record form only for OWNER | Rebuild V1 role-specific screens and interactions on the V2 architecture; the basic-record screen was test scaffolding. MEMBER list denial and admin access still require explicit handling |
| `apps/web/src/app/actions.ts` | Login/logout/createGym/createMember are web Server Actions calling REST | Can retain thin server-facing REST adapters; **prohibit direct V1 business actions/Prisma**, not all Next Server Actions |
| `apps/web/src/lib/gymos.ts` | Session cookie/API URL, theme with primary/logo, Member limited to id/fullName/nullable email/status | List/detail/pagination and identity-registration contracts are not present; tenant member record is not a sign-in identity |
| `apps/web/src/app/layout.tsx`, `globals.css` | Geist + different global design and `--brand` | Preserve default V1 system font for parity preset; reconcile shared CSS rather than appending conflicting global systems |
| `apps/web/package.json` | Next16/React19/Tailwind4; no V1 Lucide/Recharts/date-fns/Zod/clsx/tailwind-merge packages | Inventory required imports per batch; dependencies must be reviewed/added in a later implementation task, never installed here |

### Current V2 endpoints — source-verified, runtime-unverified

API controller registration was checked in `V2/apps/api/src/app.module.ts:19`; route declarations and web consumers were inspected, not executed. These **eight UI-related method/path pairs exist now**. The separate API GET `/` greeting has no migrated UI responsibility. Paths listed elsewhere under `/gyms/[slug]/{owner,trainer,member}` are proposed **web routes**, not new API endpoints.

| Current API endpoint | Current source / access | Present web usage and UI limits |
|---|---|---|
| POST `/auth/login` | `apps/api/src/auth.controller.ts:23`; email/password; returns token, expiresIn900, globalRole and active gyms including gym roles | `apps/web/src/app/actions.ts:17`; Super Admin→`/admin`, others→first gym. No gym chooser/role destination or forced-change flow |
| GET `/admin/gyms` | `apps/api/src/admin.controller.ts:28`; SuperAdminGuard | Admin list only id/name/slug/status. No V1 owner/contact/tier/member/session summary |
| POST `/admin/gyms` | Same controller`:37`; SuperAdminGuard; gym name/slug/owner email/explicit owner password | Admin creation form is wired; distinct from member registration or one-time credential generation |
| GET `/gyms/:slug/theme` | `apps/api/src/gyms.controller.ts:48`; public, active gym | Gym banner/primary color/logo; no broader semantic theme fields |
| PATCH `/gyms/:slug/theme` | Same controller`:68`; GymAccessGuard then OWNER-only | Implemented API for optional primaryColor and nullable HTTPS logoUrl; no web editor/action consumer |
| GET `/gyms/:slug/access` | Same controller`:94`; user's explicit active-gym access | Returns gymId/slug/role; gym page uses role to hide/show create form |
| GET `/gyms/:slug/members` | Same controller`:105`; OWNER or TRAINER only | Newest100, bare array id/fullName/email/status; no total, cursor/page/limit contract, search/filter parameters or detail fields; web has no pagination |
| POST `/gyms/:slug/members` | Same controller`:129`; OWNER-only; strict fullName/optional email | Creates tenant record and returns id/fullName/email/status/createdAt. No identity/access/membership/temporary-password handoff; web redirects to gym page success notice |

The current registered API controllers do not declare session, workout/meal plan, finance/payroll, analytics, audit, trainer management, notification, member-detail/full-registration or password-change endpoints. Their frontend contracts in this map are **proposed integration needs**, with URLs and business semantics to be defined by the functionality map. Existing endpoint code is not evidence that a deployed service or an end-to-end workflow was verified.

### Current gym entry by role — source trace, not a runtime test

`V2/apps/web/src/app/gyms/[slug]/page.tsx:32` requests theme, access and the member list in parallel **before any role-specific rendering**. At`:45` a401 redirects to login; at`:46` theme404/access403 invokes not-found; at`:47` any remaining non-OK response shows “Could not load this gym right now.” `GymAccessGuard` requires an explicit user/gym access record (`apps/api/src/gym-access.guard.ts:33`); global Super Admin status alone is not a gym-access override.

| Proposed user role / existing V2 access | Result implied by current API/web branches | Mapping consequence |
|---|---|---|
| Owner with active OWNER gym access | Access/list permitted, assuming valid token and successful requests; add-member form shown | Current foundation slice is basic record management, not O02–O04/full registration parity |
| Trainer with active TRAINER access | Access/list permitted; form hidden; same all-gym basic list is rendered | Not a trainer schedule or relationship-scoped client roster; T01/T02 remain proposed interfaces |
| Member with active MEMBER access | Access permitted but member-list handler returns403; page follows generic load-error branch | Cannot use this page unchanged as member role entry. Role-aware fetch/destination must avoid a forbidden all-member list request |
| Super Admin without explicit access for that gym | GymAccessGuard denies access403; page takes not-found branch | Existing `/admin` does not provide V1 support-view bypass. Authorized context/access mechanism remains a functionality decision |
| Super Admin with explicit gym access | Uses that gym access role for member-list/create permissions | Global role does not substitute for OWNER/TRAINER/MEMBER checks; do not assume unrestricted preview |

V2 defines gym roles **OWNER/TRAINER/MEMBER** (`packages/database-master/prisma/schema.prisma:16`) and global SUPER_ADMIN separately. A proposed frontend correspondence is V1 GYM_OWNER→OWNER, PERSONAL_TRAINER→TRAINER, GYM_MEMBER→MEMBER, with Super Admin global context kept distinct. The login API already returns each gym role (`apps/api/src/auth.controller.ts:63`); the web login's response type/redirect currently uses only each slug (`apps/web/src/app/actions.ts:40`). Role-specific navigation, multi-gym choice, forced password change and support access are not achieved simply by renaming enums. Current token expiry is15min in API source; refresh/session-renewal behavior is not implemented by these controllers.

### Member UI contract boundary

V1 registration creates a sign-in user with required email/phone/DOB/plan, membership association and forced-change credential handoff. V2 member POST strictly accepts only name/optional email and creates no sign-in identity or gym access. Current V2 Member IDs therefore must not be treated as V1 user/credential IDs. Current list fields cannot populate V1 membership, expiry, phone, DOB, health/emergency details, packs, attendance/session history or billing views. A capped basic list is neither a complete directory nor a detail contract; its displayed `members.length` is a returned-row count, not a gym total. Its status pill also always uses the `active` style (`apps/web/src/app/gyms/[slug]/page.tsx:86`), independently of status text.

The existing basic add-record screen is test scaffolding, not the UI target. V1 registration and one-time handoff are the UI target. Full registration, identity linking, safe profile data, list/search/pagination, trainer-client scope and role entry require the functionality map and approved decisions in its section 14.1; no API URLs for these additions are invented here.

### UI data integration rules for later batches

1. Route pages load serializable frontend view models; feature clients consume props/adapters and explicit result objects. Do not pass raw database user records into migrated UI.
2. Preserve each form's visible fields/validation/success transition. Current V2 createMember is strict basic tenant-record creation only; V1 full registration additionally needs phone/DOB/plan/health, identity/access provisioning and a one-time credential/forced-change result. The functionality map must define these contracts before operational migration; current POST cannot accept the extra fields.
3. Use stable string IDs and ISO timestamps, explicit money numbers/formatting, status union mapping, and null-safe names/email. Normalize specialisations once; avoid repeated JSON parse in three renderers.
4. Scope reads, cache keys and mutation invalidation to gym slug/access context and role; reset state on gym change. V1 IDs/session cookies are not a tenant selector in V2.
5. Preserve the difference between client-side DataTable25 and server audit20 pagination. Current V2 members GET caps results at100 with no pagination metadata/controls; client paging/search of those100 cannot represent the full directory. Agree list/search/filter/page/total and detail contracts first; never present a capped or paged subset as all records.
6. After session commands, update owner oversight, trainer schedule/earnings, member sessions and balances as applicable; after plan assignment update T03; after settings/status changes update relevant pickers and chrome. Exact data correctness belongs to the later backend migration stage.
7. Downloads need authenticated browser-safe delivery, consistent errors/filenames and same visible data scope. Notification URLs and legacy stored links require role/gym-aware rewriting.
8. Test presentation against explicit fixture adapters before backend endpoints exist. Clearly label that stage as frontend parity only; do not mark backend-enabled functionality complete.
9. Make gym-entry fetching conditional on actual access and intended role destination; MEMBER must not depend on the currently forbidden member-list request. Do not assume global Super Admin bypass or all-gym trainer lists satisfy V1 client relationships.
10. Preserve source-observed budget category/amount and current-month default. For completion/no-show controls, carry the O08 functionality questions forward: pre-start completion and financial effects; allowed no-show statuses/time; retry/idempotency and feedback. UI fixture tests cannot establish financial correctness or settle those rules.


## 13. V1-to-V2 File Mapping

Every inspected TSX file is mapped below: **74/74**. Paths in the first column are relative to V1; destinations relative to V2. These are documentation proposals only; target files have not been created. Shared behavior and page-level requirements remain authoritative in sections3–12. Do not copy business actions as part of these moves.

| V1 source | Proposed V2 source | Required change |
|---|---|---|
| `app/(auth)/change-password/change-password-form.tsx` | `apps/web/src/features/auth/change-password-form.tsx` | Adapt account command/session reset; retain required/optional modes and success panel. |
| `app/(auth)/change-password/page.tsx` | `apps/web/src/app/(auth)/change-password/page.tsx` | Proposed new V2 web route; no current password-change endpoint. Preserve V1 centered form/modes after functionality contract is agreed. |
| `app/(auth)/login/page.tsx` | `apps/web/src/app/(auth)/login/page.tsx` | Adapt existing V2 auth route; preserve V1 centered layout/validation/feedback and API-backed session. |
| `app/(dashboard)/admin/AdminClient.tsx` | `apps/web/src/features/platform/admin-client.tsx` | Copy JSX and state; adapt semantic tokens, frontend types, gym links and API/result integration as described in the role dossier. |
| `app/(dashboard)/admin/page.tsx` | `apps/web/src/app/(platform)/admin/page.tsx` | Reconcile existing /admin gym creation; platform summaries/context adapter replaces V1 action. |
| `app/(dashboard)/error.tsx` | `apps/web/src/app/gyms/[slug]/error.tsx` | Preserve error card/reset; reuse presentation for platform boundary via shared component. |
| `app/(dashboard)/layout.tsx` | `apps/web/src/app/gyms/[slug]/layout.tsx` | Split gym shell from central admin shell; new (platform)/layout.tsx composes same chrome. Replace auth/Prisma/context. |
| `app/(dashboard)/member/page.tsx` | `apps/web/src/app/gyms/[slug]/member/page.tsx` | Retain entry redirect, now using gym-scoped route builder. |
| `app/(dashboard)/member/sessions/member-sessions-client.tsx` | `apps/web/src/features/sessions/member/member-sessions-client.tsx` | Copy JSX and state; adapt semantic tokens, frontend types, gym links and API/result integration as described in the role dossier. |
| `app/(dashboard)/member/sessions/page.tsx` | `apps/web/src/app/gyms/[slug]/member/sessions/page.tsx` | Retain page/wrapper geometry; load frontend view model through REST-facing adapter; replace V1 auth/Prisma/actions and imports. |
| `app/(dashboard)/member/trainers/[id]/book/page.tsx` | `apps/web/src/app/gyms/[slug]/member/trainers/[id]/book/page.tsx` | Retain page/wrapper geometry; load frontend view model through REST-facing adapter; replace V1 auth/Prisma/actions and imports. |
| `app/(dashboard)/member/trainers/[id]/book/request-session-form.tsx` | `apps/web/src/features/sessions/member/request-session-form.tsx` | Copy JSX and state; adapt semantic tokens, frontend types, gym links and API/result integration as described in the role dossier. |
| `app/(dashboard)/member/trainers/member-trainers-client.tsx` | `apps/web/src/features/member/trainers/member-trainers-client.tsx` | Copy JSX and state; adapt semantic tokens, frontend types, gym links and API/result integration as described in the role dossier. |
| `app/(dashboard)/member/trainers/page.tsx` | `apps/web/src/app/gyms/[slug]/member/trainers/page.tsx` | Retain page/wrapper geometry; load frontend view model through REST-facing adapter; replace V1 auth/Prisma/actions and imports. |
| `app/(dashboard)/not-found.tsx` | `apps/web/src/app/gyms/[slug]/not-found.tsx` | Preserve missing card; role/gym-aware return. Platform boundary also needs this presentation. |
| `app/(dashboard)/owner/analytics/AnalyticsClient.tsx` | `apps/web/src/features/analytics/analytics-client.tsx` | Copy JSX and state; adapt semantic tokens, frontend types, gym links and API/result integration as described in the role dossier. |
| `app/(dashboard)/owner/analytics/page.tsx` | `apps/web/src/app/gyms/[slug]/owner/analytics/page.tsx` | Retain page/wrapper geometry; load frontend view model through REST-facing adapter; replace V1 auth/Prisma/actions and imports. |
| `app/(dashboard)/owner/audit-log/AuditLogClient.tsx` | `apps/web/src/features/audit/audit-log-client.tsx` | Copy JSX and state; adapt semantic tokens, frontend types, gym links and API/result integration as described in the role dossier. |
| `app/(dashboard)/owner/audit-log/page.tsx` | `apps/web/src/app/gyms/[slug]/owner/audit-log/page.tsx` | Retain page/wrapper geometry; load frontend view model through REST-facing adapter; replace V1 auth/Prisma/actions and imports. |
| `app/(dashboard)/owner/components/OwnerDashboardClient.tsx` | `apps/web/src/features/owner/dashboard/owner-dashboard-client.tsx` | Copy JSX and state; adapt semantic tokens, frontend types, gym links and API/result integration as described in the role dossier. |
| `app/(dashboard)/owner/financials/components/charts.tsx` | `apps/web/src/features/financials/components/charts.tsx` | Adapt three rendered charts to tokens; omit unrendered TrainerPayChart. |
| `app/(dashboard)/owner/financials/components/financial-modals.tsx` | `apps/web/src/features/financials/components/financial-modals.tsx` | Refactor three modal forms; preserve existing required budget category/amount and optional-month current-month default; desk payment shared with member feature. |
| `app/(dashboard)/owner/financials/financials-client.tsx` | `apps/web/src/features/financials/financials-client.tsx` | Extract six panels; retain downloads and payroll states; replace actions; account for native confirm. |
| `app/(dashboard)/owner/financials/page.tsx` | `apps/web/src/app/gyms/[slug]/owner/financials/page.tsx` | Retain page/wrapper geometry; load frontend view model through REST-facing adapter; replace V1 auth/Prisma/actions and imports. |
| `app/(dashboard)/owner/gym-config/gym-config-client.tsx` | `apps/web/src/features/gym-config/gym-config-client.tsx` | Extract five tab forms; replace actions; branding editor is separate new UI scope. |
| `app/(dashboard)/owner/gym-config/page.tsx` | `apps/web/src/app/gyms/[slug]/owner/gym-config/page.tsx` | Retain page/wrapper geometry; load frontend view model through REST-facing adapter; replace V1 auth/Prisma/actions and imports. |
| `app/(dashboard)/owner/loading.tsx` | `apps/web/src/app/gyms/[slug]/owner/loading.tsx` | Direct skeleton geometry reuse; semantic skeleton surface tokens. |
| `app/(dashboard)/owner/members/[id]/member-profile-client.tsx` | `apps/web/src/features/owner/members/member-profile-client.tsx` | Refactor tabs/dialogs; fix result handling; MVP entitlement/pack history has no PAID/receipt/cash assertion; future linked payment UI expands this area. |
| `app/(dashboard)/owner/members/[id]/page.tsx` | `apps/web/src/app/gyms/[slug]/owner/members/[id]/page.tsx` | Retain page/wrapper geometry; load frontend view model through REST-facing adapter; replace V1 auth/Prisma/actions and imports. |
| `app/(dashboard)/owner/members/members-list-client.tsx` | `apps/web/src/features/owner/members/members-list-client.tsx` | Preserve table/filter geometry; current V2 GET returns newest100 basic rows only. Full directory pagination/search, phone/plan/expiry and profile contracts are pending. |
| `app/(dashboard)/owner/members/new/new-member-form.tsx` | `apps/web/src/features/owner/members/new-member-form.tsx` | Preserve full registration/handoff UI; current V2 POST creates only a basic tenant record. Identity/access/membership/credential result needs functionality mapping first. |
| `app/(dashboard)/owner/members/new/page.tsx` | `apps/web/src/app/gyms/[slug]/owner/members/new/page.tsx` | Retain page/wrapper geometry; load frontend view model through REST-facing adapter; replace V1 auth/Prisma/actions and imports. |
| `app/(dashboard)/owner/members/page.tsx` | `apps/web/src/app/gyms/[slug]/owner/members/page.tsx` | Retain page/wrapper geometry; load frontend view model through REST-facing adapter; replace V1 auth/Prisma/actions and imports. |
| `app/(dashboard)/owner/page.tsx` | `apps/web/src/app/gyms/[slug]/owner/page.tsx` | Retain page/wrapper geometry; load frontend view model through REST-facing adapter; replace V1 auth/Prisma/actions and imports. |
| `app/(dashboard)/owner/sessions/book/book-session-form.tsx` | `apps/web/src/features/sessions/owner/book-session-form.tsx` | Copy JSX and state; adapt semantic tokens, frontend types, gym links and API/result integration as described in the role dossier. |
| `app/(dashboard)/owner/sessions/book/page.tsx` | `apps/web/src/app/gyms/[slug]/owner/sessions/book/page.tsx` | Retain page/wrapper geometry; load frontend view model through REST-facing adapter; replace V1 auth/Prisma/actions and imports. |
| `app/(dashboard)/owner/sessions/daily-view.tsx` | `apps/web/src/features/sessions/owner/daily-view.tsx` | Preserve filters/table/confirmation. Completion accepts SCHEDULED/ACTIVE with ACTIVE-only duration check; map pre-start completion and no-show eligibility/idempotency before V2 commands. |
| `app/(dashboard)/owner/sessions/monthly-view.tsx` | `apps/web/src/features/sessions/owner/monthly-view.tsx` | Copy JSX and state; adapt semantic tokens, frontend types, gym links and API/result integration as described in the role dossier. |
| `app/(dashboard)/owner/sessions/page.tsx` | `apps/web/src/app/gyms/[slug]/owner/sessions/page.tsx` | Retain page/wrapper geometry; load frontend view model through REST-facing adapter; replace V1 auth/Prisma/actions and imports. |
| `app/(dashboard)/owner/sessions/sessions-client.tsx` | `apps/web/src/features/sessions/owner/sessions-client.tsx` | Copy JSX and state; adapt semantic tokens, frontend types, gym links and API/result integration as described in the role dossier. |
| `app/(dashboard)/owner/subscription/SubscriptionClient.tsx` | `apps/web/src/features/subscription/subscription-client.tsx` | Future only: keep V1 screen reference in the map, hide from MVP navigation and do not surface mock billing controls. |
| `app/(dashboard)/owner/subscription/page.tsx` | `apps/web/src/app/gyms/[slug]/owner/subscription/page.tsx` | Future only: retain source reference, hide from MVP navigation; commission backend read before implementation. |
| `app/(dashboard)/owner/trainers/[id]/page.tsx` | `apps/web/src/app/gyms/[slug]/owner/trainers/[id]/page.tsx` | Retain page/wrapper geometry; load frontend view model through REST-facing adapter; replace V1 auth/Prisma/actions and imports. |
| `app/(dashboard)/owner/trainers/[id]/trainer-profile-client.tsx` | `apps/web/src/features/owner/trainers/trainer-profile-client.tsx` | Copy JSX and state; adapt semantic tokens, frontend types, gym links and API/result integration as described in the role dossier. |
| `app/(dashboard)/owner/trainers/new/new-trainer-form.tsx` | `apps/web/src/features/owner/trainers/new-trainer-form.tsx` | Copy JSX and state; adapt semantic tokens, frontend types, gym links and API/result integration as described in the role dossier. |
| `app/(dashboard)/owner/trainers/new/page.tsx` | `apps/web/src/app/gyms/[slug]/owner/trainers/new/page.tsx` | Retain page/wrapper geometry; load frontend view model through REST-facing adapter; replace V1 auth/Prisma/actions and imports. |
| `app/(dashboard)/owner/trainers/page.tsx` | `apps/web/src/app/gyms/[slug]/owner/trainers/page.tsx` | Retain page/wrapper geometry; load frontend view model through REST-facing adapter; replace V1 auth/Prisma/actions and imports. |
| `app/(dashboard)/owner/trainers/trainers-list-client.tsx` | `apps/web/src/features/owner/trainers/trainers-list-client.tsx` | Copy JSX and state; adapt semantic tokens, frontend types, gym links and API/result integration as described in the role dossier. |
| `app/(dashboard)/trainer/clients/[id]/client-360-client.tsx` | `apps/web/src/features/trainer/clients/client-360-client.tsx` | Extract four panels; preserve related-client access and query-prefill links. |
| `app/(dashboard)/trainer/clients/[id]/page.tsx` | `apps/web/src/app/gyms/[slug]/trainer/clients/[id]/page.tsx` | Retain page/wrapper geometry; load frontend view model through REST-facing adapter; replace V1 auth/Prisma/actions and imports. |
| `app/(dashboard)/trainer/clients/clients-client.tsx` | `apps/web/src/features/trainer/clients/clients-client.tsx` | Copy JSX and state; adapt semantic tokens, frontend types, gym links and API/result integration as described in the role dossier. |
| `app/(dashboard)/trainer/clients/page.tsx` | `apps/web/src/app/gyms/[slug]/trainer/clients/page.tsx` | Retain page/wrapper geometry; load frontend view model through REST-facing adapter; replace V1 auth/Prisma/actions and imports. |
| `app/(dashboard)/trainer/earnings/earnings-client.tsx` | `apps/web/src/features/trainer/earnings/earnings-client.tsx` | Copy JSX and state; adapt semantic tokens, frontend types, gym links and API/result integration as described in the role dossier. |
| `app/(dashboard)/trainer/earnings/page.tsx` | `apps/web/src/app/gyms/[slug]/trainer/earnings/page.tsx` | Retain page/wrapper geometry; load frontend view model through REST-facing adapter; replace V1 auth/Prisma/actions and imports. |
| `app/(dashboard)/trainer/page.tsx` | `apps/web/src/app/gyms/[slug]/trainer/page.tsx` | Retain entry redirect, now using gym-scoped route builder. |
| `app/(dashboard)/trainer/plans/meal/new/meal-builder-form.tsx` | `apps/web/src/features/trainer/plans/meal-builder-form.tsx` | Copy JSX and state; adapt semantic tokens, frontend types, gym links and API/result integration as described in the role dossier. |
| `app/(dashboard)/trainer/plans/meal/new/page.tsx` | `apps/web/src/app/gyms/[slug]/trainer/plans/meal/new/page.tsx` | Retain page/wrapper geometry; load frontend view model through REST-facing adapter; replace V1 auth/Prisma/actions and imports. |
| `app/(dashboard)/trainer/plans/workout/new/page.tsx` | `apps/web/src/app/gyms/[slug]/trainer/plans/workout/new/page.tsx` | Retain page/wrapper geometry; load frontend view model through REST-facing adapter; replace V1 auth/Prisma/actions and imports. |
| `app/(dashboard)/trainer/plans/workout/new/workout-builder-form.tsx` | `apps/web/src/features/trainer/plans/workout-builder-form.tsx` | Copy JSX and state; adapt semantic tokens, frontend types, gym links and API/result integration as described in the role dossier. |
| `app/(dashboard)/trainer/schedule/page.tsx` | `apps/web/src/app/gyms/[slug]/trainer/schedule/page.tsx` | Retain page/wrapper geometry; load frontend view model through REST-facing adapter; replace V1 auth/Prisma/actions and imports. |
| `app/(dashboard)/trainer/schedule/schedule-client.tsx` | `apps/web/src/features/sessions/trainer/schedule-client.tsx` | Extract cards/dialogs; preserve ACTIVE banner completion/SCHEDULED no-show UI and errors; action has broader no-show eligibility/no repeat guard, requiring functionality decisions. |
| `app/layout.tsx` | `apps/web/src/app/layout.tsx` | Reconcile existing V2 layout; apply V1 Classic font/token defaults and metadata policy. |
| `app/page.tsx` | `apps/web/src/app/page.tsx` | Conflict: V2 landing exists. Keep landing provisionally; move V1 role redirect responsibility to gym entry/login destination. |
| `components/layout/NotificationBell.tsx` | `apps/web/src/components/layout/NotificationBell.tsx` | Adapt theme tokens and shared props; see component inventory for behavior/integration. |
| `components/layout/dashboard-chrome.tsx` | `apps/web/src/components/layout/dashboard-chrome.tsx` | Adapt theme tokens and shared props; see component inventory for behavior/integration. |
| `components/layout/header.tsx` | `apps/web/src/components/layout/header.tsx` | Adapt theme tokens and shared props; see component inventory for behavior/integration. |
| `components/layout/sidebar.tsx` | `apps/web/src/components/layout/sidebar.tsx` | Adapt theme tokens and shared props; see component inventory for behavior/integration. |
| `components/shared/confirm-dialog.tsx` | `apps/web/src/components/shared/confirm-dialog.tsx` | Refactor accessible shell while retaining dimensions, intent colors, text and pending states. |
| `components/shared/data-table.tsx` | `apps/web/src/components/shared/data-table.tsx` | Adapt theme tokens and shared props; see component inventory for behavior/integration. |
| `components/shared/formatted-date.tsx` | `(defer) apps/web/src/lib/format.ts` | Unused renderer; omit initial copy, consolidate after locale/timezone decision. |
| `components/shared/page-header.tsx` | `apps/web/src/components/shared/page-header.tsx` | Adapt theme tokens and shared props; see component inventory for behavior/integration. |
| `components/shared/stat-card.tsx` | `apps/web/src/components/shared/stat-card.tsx` | Adapt theme tokens and shared props; see component inventory for behavior/integration. |
| `components/shared/status-badge.tsx` | `apps/web/src/components/shared/status-badge.tsx` | Adapt theme tokens and shared props; see component inventory for behavior/integration. |
| `components/shared/temporary-password-notice.tsx` | `apps/web/src/components/shared/temporary-password-notice.tsx` | Adapt theme tokens and shared props; see component inventory for behavior/integration. |

### Supporting files and integration-only mapping

| V1 source | Proposed V2 responsibility | Decision |
|---|---|---|
| `app/globals.css` | `apps/web/src/app/globals.css + src/theme/` | Reconcile existing V2 stylesheet; semantic tokens + V1 Classic; preserve spacing/type. |
| `app/favicon.ico` | `apps/web/src/app/favicon.ico` | Compare actual icon asset before replacing V2; gym-specific favicon is optional branding scope. |
| `proxy.ts` | `apps/web/src/lib/auth/ + route-boundary access handling` | Map role/forced-change/navigation behavior; do not copy Auth.js token logic. |
| `lib/auth.ts + types/index.ts` | `apps/web/src/lib/auth/ + src/types/auth.ts` | Frontend identity/access view model; normalize actual V2 roles; no Prisma role imports. |
| `lib/authz.ts` | `apps/web/src/lib/auth/ and route/feature access contracts` | Preserve effective gym/support context and trainer-client relationship behavior; server authorization remains backend responsibility. |
| `lib/utils.ts` | `apps/web/src/lib/utils.ts (optional)` | cn unused in V1 UI; do not pull utility dependencies unless needed. |
| `lib/validations/auth.ts` | `apps/web/src/features/auth/validation.ts (if used)` | Unused V1 login schema; actual form/native and API feedback define parity. |
| `lib/csv.ts` | `apps/web/src/features/financials/downloads.ts or shared export utility` | Preserve safe CSV content/download UX; avoid direct Prisma endpoint dependency. |
| `app/api/export/csv/route.ts` | `apps/web/src/lib/api/exports.ts and optional authenticated web download adapter` | Preserve attachments/scope/error states; endpoint replacement contract must be agreed. |
| `app/api/auth/[...nextauth]/route.ts` | `Existing apps/web/src/app/actions.ts + src/lib/gymos.ts; proposed src/lib/auth/` | Do not copy V1 Auth.js route; src/lib/auth/ does not exist yet. Preserve visible session behavior after agreed role/forced-change contracts. |
| `app/actions/*.ts (all14 files)` | `Feature-facing adapters under apps/web/src/lib/api/` | Use exact action inventory in section10 as UI requirements; do not migrate business implementations. |
| `lib/pricing.ts, lib/prisma.ts, lib/audit.ts, lib/notifications.ts, lib/passwords.ts` | `No UI source destination` | Backend/server helpers are reference-only; frontend mirrors visible rules/messages through contracts, not copied implementation. |
| `package.json + postcss.config.mjs + tsconfig.json` | `Existing V2 web package/build configuration` | Dependency/import compatibility review in later batch; no installation or build changes in this analysis. |
| `public/ (empty)` | `No V1 assets to move` | Brand is Lucide + text initials; do not invent logo/photo assets. |

## 14. UI Migration Complexity Assessment

Common to every rendered page: preserve JSX hierarchy, compact spacing, responsive intent and component content; keep Tailwind4 classes for geometry; replace hard-coded branding with semantic tokens; move feature components using section13. Root/entry pages have no visual JSX to preserve. Authentication/routing and data integration must be adapted even on **Low** pages. Complexity measures frontend effort and number of UI contracts/states, not database/API development effort.

Method codes: **CA** Copy and adapt; **EX** Extract shared components first; **RF** Refactor existing design structure without visual redesign. No existing page needs a wholesale visual rebuild. Rebuilding unsupported billing integration is separate functionality, not a new appearance.

| ID / page | Complexity and reason | Method | V1 coupling / required frontend prerequisites | Specific verification gate |
|---|---|---|---|---|
| R00 root | Low; routing-only, but V2 root conflict | CA | Session + normalized role/gym destination; approved V1-style role redirect | Chosen root behavior documented, role destinations correct, no loop |
| A01 login | Medium; auth errors/callback/forced-change handoff | CA | Existing REST login adapter, identity/access result, gym fallback theme | Centered V1 geometry, errors/pending, safe callback, all roles |
| A02 password | Medium; required/optional modes and session reset | CA | changePassword replacement; forced-change state; sign-out contract | Same fields/rules/success delay and unskippable required flow |
| S01 admin | High; central/gym context split and existing V2 create flow | EX | Platform registry summary/access/context, shell, role routes | Registry columns/states, selection/exit/banner, no accidental auto-navigation claim |
| O01 dashboard | Medium; live refresh and three content groups | EX | Dashboard view model, Recharts, fixture time and tenant cache | Four cards, 2:1 chart/alerts, session table, roster; refresh data |
| O02 members | Medium; capped basic V2 list lacks full directory/detail data | CA | Current newest100 id/name/email/status list; proposed pagination/search/total, phone/plan/expiry/profile contracts; null-safe email | Search/status/25-page presentation and profile links against complete agreed data; cap not mistaken for gym total |
| O03 register member | High; full registration exceeds current V2 basic record POST | CA | Functionality map for identity/access/membership/credential result; eligible plans; A02 contract | Every V1 field and one-time handoff; existing name/email-only POST not accepted as full parity |
| O04 member profile | High; status/pack/payment/mocked billing entangled | EX | Profile/membership/packs/session data, three commands, modal shell | All3 tabs + status/pack/payment dialogs; explicit receipt limitation |
| O05 trainers | Low; read-only search/table | CA | Trainer summary/levels/specialisations, table/theme | Search/chips/shift/status/pages and create/detail links |
| O06 add trainer | Medium; account creation and one-time result | CA | Trainer create contract, handoff/A02, form primitives | Fields/level/shifts, errors/pending, credential success |
| O07 trainer profile | Medium; status and shift form plus bounded stats | CA | Trainer profile/metrics/status/shift contracts, confirm shell | Stats/bio/layout, confirmation, correct error intent |
| O08 oversight | High; two views, filters/exports/commands and unresolved lifecycle rules | EX | Session/member/pack DTOs; functionality decisions on pre-start completion effects and no-show eligibility/retries; modal/table/export | Daily/monthly/overlay/CSV fidelity; SCHEDULED/ACTIVE completion semantics explicit; errors visible; no untested idempotency claim |
| O09 staff booking | Medium; eligible pickers and booking feedback | CA | Eligible members/trainers, bookSession replacement, field components | No-credit disabled state, required/collision feedback, success destination |
| O10 finance | High; six panels, three charts, payroll and downloads | EX | Six read models; proposed expense/budget/payroll/export contracts; preserve existing category/amount/current-month budget UI | All6 tabs; modal forms; OPEN/CLOSED/APPROVED; budget fields/default/error/success; CSV |
| O11 analytics | Low; read-only series presentation | CA | Three series models + chart palette | Correct legends/axes/heights/tooltips/zero data |
| O12 config | High; five forms/shared state and new theme boundary | EX | Gym config/plan models, five save contracts, expiry command, form fields | All5 tabs, percentage conversion, optional rate semantics, feedback |
| O13 audit | Medium; server filtering/paging and export scope | CA | Audit page DTO, filter enum, request state, download utility | Page20, filter→page1, loading/empty, selected-page export |
| O14 subscription | Medium; read-only design with mock commands | CA | Future-only master subscription contract; no MVP route/navigation | Four tiers/current banner, disabled current, mock/deferred controls labelled |
| T00 trainer entry | Low; redirect-only | CA | Role/gym route builder | Redirect schedule once; correct nav active |
| T01 schedule | High; lifecycle/timer/two dialogs and action/UI eligibility differences | EX | Proposed schedule/five command contracts; functionality map for no-show status/time/retry behavior and completion effects | Pending/active/terminal/empty; ACTIVE banner duration feedback, SCHEDULED no-show visibility; explicit rejected results |
| T02 clients | Medium; relationship-scoped roster | CA | Assigned-client summaries/access, table | Search/balance colors/profile links; pending request grants no profile |
| T03 client360 | High; four views with relationship/bounded data | EX | Authorized profile/plans/history, formatter, route query contract | All4 tabs; caps/empty states; builder prefill; no phantom body metrics |
| T04 workout | Medium; dynamic controlled rows/payload | CA | Eligible-client options, saveWorkoutPlan replacement, shared fields | Prefill/add/remove/required/zero rows/action error/return profile |
| T05 meal | Medium; dynamic rows and live totals | CA | Eligible-client options, saveMealPlan replacement, numeric normalization | Totals/add/remove/one-day payload/mobile numeric layout |
| T06 earnings | Low; read-only totals/table | CA | Earnings record DTO/formatters/table | Summary totals/averages/zero data and25 pagination |
| M00 member entry | Low; redirect-only | CA | Role/gym routes | Directory destination/no loop |
| M01 directory | Low; read-only cards/search | CA | Active trainer DTO, specialization normalization/theme | 1/2/3 grid, name search, card fallback/prefilled request link |
| M02 request | Medium; credits, trainer context, validation | CA | Trainer detail/available credits, requestSession replacement | No-credit disabled, minimum date/duration, error/pending→history |
| M03 my sessions | Medium; status-dependent cancel dialog | CA | Own sessions + cancel result, shared card/confirm | Withdraw vs cancel warnings, terminal locked state, errors retained |
| L01/L02 | High; foundation across all routes | RF | V2 access/theme/session; role-aware requests/routes; proposed support context; MEMBER list403 handling | Responsive shell/context; no unconditional restricted member-list dependency for member entry |
| X01/X02/X03 | Low | CA | Shared tokens, role-aware return/reset | Error/retry, missing/return, owner skeleton match at two widths |

Dependencies are frontend contracts only. Never mark a page complete merely because its JSX compiles with fixture data. Record visual parity, frontend interaction parity with fixtures, and live API integration as distinct gates; backend behavior is verified in a later stage.

## 15. Recommended Migration Order

Make each batch reviewable with V1 Classic screenshots/fixtures, then add another gym palette. Do not move all pages at once. This is a **proposed UI sequence**, not a functionality specification or authorization to implement backend rules. The functionality and API maps must resolve registration/access/data coverage and session lifecycle decisions before dependent command integration. Source UI data-flow suggests plans before member registration, packs before booking, confirmed sessions before client relationships, and read displays before financial commands.

| Batch | Pages / workflows included | Required existing UI | New V2 frontend dependencies (future) | Complexity | Acceptance criteria |
|---|---|---|---|---|---|
| 0 — Baseline and decisions | All IDs as fixtures/capture manifest; resolve root/URL/role contracts | V1 UI and current V2 basic record slice | Functionality and API maps; source/API gap inventory; disposable fixtures/capture | Medium |26 rendered routes +3 redirects accounted for; current100-row cap/basic POST/role403 separated from proposals; lifecycle decisions recorded before command migration |
| 1 — Theme and shared presentation | L01, DataTable, PageHeader, StatCard, badges, fields/cards/dialog shell; X01/X02/X03 | All11 shared/layout files and repeated patterns | V1 Classic semantic tokens, formatters, accessibility primitives; dependency compatibility review | High | Geometry/default type/color parity; fixed success/error independent of brand; empty/pending/page states; no V1 backend imports |
| 2 — Identity and navigation shell | A01/A02/R00/T00/M00/L02; admin/gym shell; bell/logout | Sidebar/Header/Chrome/TemporaryPasswordNotice | Existing login/access/theme; proposed forced-change/notification/support contracts; role-aware fetch/route entry | High | Fixture role destinations and shell match; MEMBER does not depend on forbidden members GET; Super Admin bypass not assumed; unsupported API integration remains pending |
| 3 — Platform registry and gym entry | S01 and current V2 `/admin` gym-create/list capability | AdminClient + shared shell/table | Platform summary and authorized context adapter; reconcile V2 gym workspace entry | High | Select/clear context and banner, explicit owner entry, existing create-gym flow retained; central theme stable |
| 4 — Read-only operational pages | O05/O11/T06/M01/O13 display; O14 future reference | DataTable, chart frame, trainer cards, session summary cards | Read DTOs/formatters; server audit pagination; O14 hidden in MVP | Medium | Search/empty/pagination/charts match; ratings unavailable without input; correct export scope; O14 excluded from MVP |
| 5 — Configuration and people lifecycle | O12 all5 tabs; O02/O03/O04/O06/O07; pack workflow; desk payment future only | Forms/tabs/profile/confirmation/handoff and desk-payment dialog | Functionality-mapped full registration vs basic record, complete list/detail/pagination and identity/credential contracts; proposed config/status/pack/payment adapters | High | Fixture fields/handoff/profile/dialogs match; current100 rows do not imply complete directory; unsupported registration/profile APIs remain pending; receipts truthfully scoped |
| 6 — Session views before commands | O01/O08/T01/M03 read/empty/active views, all tab/overlay data | Stat cards, charts, Daily/Monthly view, session card/timestamp/timer | Consistent session/status/time/balance DTOs and tenant refresh model | High | Every displayed state/status and metric scope documented; daily/monthly filters/More overlay; frozen timer/chart references |
| 7 — Booking, requests and lifecycle | O09/M02; T01 accept/decline/start/end/no-show/notes; M03 withdraw/cancel; O08 overrides | Batch6 views + forms/dialogs | Functionality-map decisions on completion before start, credit/revenue/pay effects and no-show status/time/idempotency; proposed command/results | High | Source V1 scheduled completion documented; approved V2 rules reflected in controls/copy/fixtures; errors visible; repeat-call safety verified later, not assumed from UI locking |
| 8 — Client relationship and plans | T02/T03/T04/T05 | Client roster/profile tabs, builder fields/dynamic rows | Authorized client relationship/options, plan save/read DTOs | High | Accepted relationship unlocks profile;4 tabs; query-prefill links; dynamic validation/macros; no member viewer invented |
| 9 — Financial panels and commands | O10 all6 tabs; reconcile O04 billing dependencies | Charts/financial dialogs, budget/status tables, download adapter | Proposed read/expense/budget/payroll/export contracts; retain existing category/amount and optional-month default; agreed deferred-feature scope | High | Six panels/payroll states preserved; budget current-month submit/validation/result matches V1 source; CSV/errors covered; financial correctness deferred to functionality/integration stage |
| 10 — Whole-interface parity | Every row in section16; branding editor only if separately authorized | All prior batches | Safe comparison environment, second gym/theme, font/dark presets if agreed | Medium/High | Route coverage, screenshots and interactions signed off; migration fixes tracked; no direct V1 backend dependency |

O01 can follow batch6's shared session/metric models even if chart infrastructure is ready earlier. O13 current-page CSV and O08 filtered-day CSV should be verified alongside the shared export utility. Notification API availability may lag shell work: use explicit fixtures and keep API integration pending; do not silently hide the bell and declare parity. No batch authorizes backend implementation or production-data manipulation.

## 16. Feature Parity Checklists

All items below are **unchecked**; no V1 parity migration has been runtime-verified by this report. V2's existing basic-record slice is acknowledged in section12. Apply this common checklist to every rendered page, then the page-specific checklist. `V` = visual; `F` = frontend behavior; `I` = integration boundary. These are future checks, not test results. Behavioral changes beyond the V1 baseline require functionality-map decisions; backend correctness is a separate acceptance stage.

### Common checklist for every rendered page

- [ ] **V:** Compare V1 Classic at1440px and390px with identical fixture data, browser/device scale/font/timezone; include320px stress and768px breakpoint check. Preserve headings, order, spacing, card/table sizes, typography, borders, shadows, colors and icons.
- [ ] **V:** Capture populated, empty, loading, validation/error, disabled and success states wherever source provides them; explicitly mark missing V1 states rather than inventing a baseline.
- [ ] **V:** Compare all tabs/dialogs/tooltips and menu-open states; no clipped controls, unreadable text, obscured submit buttons or page-wide horizontal scrolling. Tables may scroll internally.
- [ ] **V:** Apply second-gym primary/secondary/accent/surface/text/logo settings; success/warning/error stay semantically correct. Font/dark presets need separate approval/baselines because V1 has none.
- [ ] **F:** Role/sidebar active state, links/back/cancel/success destinations and gym context work; keyboard focus/labels/dialog restore are usable; drawer closes on navigation/Escape/backdrop.
- [ ] **F:** Inputs preserve required/default/optional semantics; buttons disable during mutation; errors retain useful input; success updates the expected view; no duplicate UI submissions or silent rejected results.
- [ ] **I:** No imports from V1 `app/actions`, `lib/prisma`, Auth.js implementation, or Prisma-generated UI types; fixture/API adapter results drive UI. Tenant/role/date/null/status normalization is explicit.
- [ ] **I:** Record API integration status separately from screenshot/fixture interaction parity; no synthetic data presented as verified live business behavior.

### Entry, authentication, platform and shared states

**R00 — Root routing**

- [ ] **F:** Agreed V2 landing vs V1 redirect behavior is explicit; signed-out login and all4 role destinations have no loops; selected gym is preserved.

**A01 — Login**

- [ ] **V:** Centered max-w-md card, Dumbbell/wordmark, icon fields, red alert and footer match; gym fallback branding works.
- [ ] **F:** Required/email validation; invalid/inactive/rate/unexpected messages; pending label/disable; safe callback and forced-password destination; fresh session navigates correctly.

**A02 — Change password**

- [ ] **V:** Required/optional copy, three icon fields/rules, error and updated confirmation match.
- [ ] **F:** Current credential, new rules/confirmation/different-password feedback; pending; success delay/sign-out→login; required mode cannot skip to dashboard.

**S01 — Admin registry**

- [ ] **V:** Registry count, all6 columns, selected-row tint, gym select/default option and action labels; context banner and Owner View link.
- [ ] **F:** Select and clear context; error/pending handling; registry action does not falsely promise completed navigation; owner entry uses selected slug; existing V2 creation remains reachable and functional.

**T00 / M00 — Role home redirects**

- [ ] **F:** Trainer→gym schedule; member→gym directory; no phantom dashboard screenshot or cross-gym destination.

**L01/L02 — Shell, notification and special states**

- [ ] **V:**224px desktop/256px mobile sidebar,52px header, spacing/avatar visibility; normal/admin/lapsed banners; notification popover/badge/read/empty rows.
- [ ] **F:** Every role menu and nested active entry; drawer X/backdrop/Escape/navigation/body scroll; hidden-drawer focus; bell poll20s/mark/link/mark-all/error; logout and expired session behavior.
- [ ] **I:** Role-aware gym entry uses agreed access contracts: OWNER/TRAINER currently may list members, MEMBER may not, and Super Admin has no implicit gym bypass. Verify proposed entry/redirect UI against fixtures without making every role fetch the privileged list.
- [ ] **V/F:** X01 error card/message/retry; X02 missing card with correct role return; X03 owner pulse skeleton at desktop/mobile. Detail plain-text not-found states are also represented consistently.

### Owner pages

**O01 — Live operations**

- [ ] **V:** Four stats, chart/alert2:1 grid, session table, trainer grid; normal/low-pack/no-show/active/zero states.
- [ ] **F:** Manual and30s refresh replace data; visible refresh duration is tied to result in V2; tooltip works; metric proxy definitions are agreed and labels truthful.

**O02 — Members**

- [ ] **V:** Header/registration link, search/status toolbar, six table columns, status/expiry/plan labels and empty hint.
- [ ] **F:** Name/email/phone+status filter;26+ rows paginate25; reducing results clamps page; register/profile links and nullable email safe. Include101+ records in future fixtures: current V2 GET truncates at100 and supplies no total/page/detail fields; full-directory parity requires the agreed functionality contract.

**O03 — Register member**

- [ ] **V:** All personal/plan/health fields and paired-grid geometry; inline error; one-time credential card and warning.
- [ ] **F:** Full required/email/plan/action validation, pending, one-time credentials, Copy/Copied/failure and continue profile; no premature redirect. Current V2 basic tenant-record POST does not provision identity/membership/credentials; verify the future functionality contract separately.

**O04 — Member profile**

- [ ] **V:** Avatar/status/contact/action banner; Overview/Attendance/Billing tabs, membership/pack cards, session rows, billing table; all overlays at narrow width.
- [ ] **I:** O04 profile fields and detail endpoint are proposed; the current V2 member-list response cannot populate this profile. Do not mark a basic record row or placeholder profile as full profile parity.
- [ ] **F:** Status change confirm/cancel/error; pack issue defaults/validation/pending/error; MVP payment capture hidden; refreshed balances and profile; exact5-session history limit documented.
- [ ] **F:** Receipt control is explicitly still mock/deferred or separately implemented with approved scope; manual payment history and latest-vs-active labels are truthful; no unused progress tab introduced.

**O05 — Trainer roster**

- [ ] **V:** Name/email, level badges, specialisation truncation/+count, shifts/status and View Trainer; search/empty layout.
- [ ] **F:** Search case-insensitively,25-row pagination, create/detail links; normalized array/nullable email; level/shift fallbacks preserved deliberately.

**O06 — Add trainer**

- [ ] **V:** Full form, paired fields, levels/specialisations/shifts/bio, errors and one-time success card.
- [ ] **F:** Required/email/action feedback, Level1 default, pending disable, credentials copy/continue, forced-change next sign-in; access enforced beyond route visibility.

**O07 — Trainer profile**

- [ ] **V:** Banner/four stats/shift/bio cards; level/status/confirmation; failure text no longer styled as success.
- [ ] **F:** Deactivate/reactivate confirm and rejected result; shift save pending/success/error; completed count last10 and rating fallback treated explicitly.

**O08 — Session oversight**

- [ ] **V:** Three stats/two tabs; daily controls and table; monthly balances/table; More overlay; override intent colors.
- [ ] **F:** Day/month arrows/native input/Today/This Month; search/trainer/status filters; ascending day time; pages25; pack totals scope; monthly pending/scheduled drilldown; overlay X/backdrop.
- [ ] **F:** Preserve V1 owner Complete for SCHEDULED/ACTIVE and ACTIVE-only duration feedback in baseline fixtures; record whether V2 permits pre-start completion and credit/revenue/trainer-pay effects before changing controls. Confirm/cancel/pending and returned errors visible; filtered-day CSV scope correct.
- [ ] **I:** No-show UI is SCHEDULED/ACTIVE for owner and SCHEDULED for trainer; source action lacks status/time/already-noShow checks. Functionality map must define allowed transitions/retry/idempotency; fixture rendering is not proof of safe repeated commands.

**O09 — Owner booking**

- [ ] **V:** Eligible pickers, date/time/type/duration/notes and no-credit warning; full form stays usable on mobile.
- [ ] **F:** No packs disables submit; required selects; trainer collision/eligibility/error; pending; booking success goes to oversight; empty trainer state handled. Owner flow yields confirmed scheduling, not member pending request.

**O10 — Financials**

- [ ] **V:** Revenue four cards/trend/donut/breakdown; Expense chart and both tables; Deferred three cards/ledger; Payroll banner/table; P&L statement; Export three cards. All6 tabs and chart tooltips match.
- [ ] **F:** Log Expense fields/category/date/recurring/pending/error/close; Set Budget preserves existing required seven-category selector/amount, Updating/error/close-on-success. With no month picker, omitted optional month defaults to current month; no category-field repair is needed.
- [ ] **F:** OPEN→Close confirmation; CLOSED→Approve confirmation; APPROVED state; error visibility/pending; no false payout-success claim.
- [ ] **F:** Financial/payroll downloads have correct attachment/name/scope and errors; accounting sync remains clearly disabled/deferred unless separately authorized; no invented date filter or PDF.
- [ ] **I:** Capture/read does not create operational records in a non-disposable environment; backend results and calculation correctness assessed later.

**O11 — Analytics**

- [ ] **V:** Two upper cards and full-width signup chart;256px heights; scheduled/idle legend, axes/tooltips and zero data.
- [ ] **F:** Correct mapped series/period descriptions; no invented filter/export; bookings-based attendance label and utilization estimate agreed.

**O12 — Gym Configuration**

- [ ] **V:** All5 tabs, max-width form cards, add-plan inline toggle/table, warnings and shared feedback; narrow tab strip usable.
- [ ] **F:** Profile contact/pay-period save; plan required name/price/duration + list refresh; no edit/delete added as parity.
- [ ] **F:** Session rates explicitly implement the intended V2 blank→null→standard correction (V1 blank→0), preserving intentional numeric zero; pay percentages map fractions/display; policy checkbox values persist; pending/errors/success all styled correctly.
- [ ] **F:** Expiry command reports count/error and has a clear pending state; no production run for screenshots; theme editor tracked as new scope, not V1 parity.

**O13 — Audit log**

- [ ] **V:** Filter/count/table/long truncated details/pagination; loading/empty and mobile horizontal scroll.
- [ ] **F:** Every listed action filter resets to page1;20-row server pages; boundary disables; error/race handling; CSV current-page scope accurately described.

**O14 — Subscription**

- [ ] **V:** Current tier/status/billing date/masked card, four plans/prices/features/current/popular badges and responsive1/2/4 grid.
- [ ] **F:** Current tier disabled; billing/plan controls reflect actual API support; no alert mistaken for checkout; default4242/static marketing values labelled or removed only by agreed correction.

### Trainer pages

**T01 — Schedule and requests**

- [ ] **V:** Pending panel, request cards, active banner/timer, session status cards, notes/decline modals and empty state; both narrow and long notes.
- [ ] **F:** Accept/decline optional reason/error; SCHEDULED Start/No-Show; ACTIVE banner completion and ACTIVE-only duration feedback; COMPLETED Add/Edit notes; terminal controls absent. Action-level SCHEDULED completion acceptance and no-show lack of status/repeat guards stay explicit functionality decisions, not inferred guarantees from button visibility.
- [ ] **F:** All-date vs Daily label decision explicit; timer uses agreed fixture/timezone and resets correctly; no QR/camera feature invented.

**T02 — Clients**

- [ ] **V:** Table/status/pack0-red/≤2-orange/>2-green/last-session/profile link, search and empty hint.
- [ ] **F:** Assigned relationship only, pending request excluded; search/pages25; detail links scoped to same gym; count/date limitations documented.

**T03 — Client360**

- [ ] **V:** Banner/create links/three stats and all4 tabs; health fields, workout exercises, meal rows and session notes; no blank body-metrics promise added.
- [ ] **F:** Relationship-denied/missing state; query-prefill builder links; plan/history empty states;2-plan/10-session caps and latest-plan semantics explicit; no edit/delete invented.

**T04 — Workout builder**

- [ ] **V:** Client/title/description card, seeded rows, compact12-column exercise grid/delete, add/footer and mobile stack.
- [ ] **F:** Prefill/client options, add/edit/remove (including all rows), native required and at-least-one validation, optional weight, pending/error, save→same client, cancel→roster.

**T05 — Meal builder**

- [ ] **V:** Title/client card, green4-value macro summary, meal type/food row,4 nutrient inputs, delete/add/footer; narrow row usability.
- [ ] **F:** Prefill, all6 meal-type choices, add/remove/edit, live sum, empty/required/error/pending, numeric payload, save→client; no day selector implied by dayOfWeek payload.

**T06 — Earnings**

- [ ] **V:** Three stats and five table columns; zero data/commission fallback; status-free itemized amounts.
- [ ] **F:** Sum/count/average/zero division,25-page behavior, date/money formatting; all-record vs “this period”/“Paid” labels agreed; no payout/export invented.

### Member pages

**M01 — Trainer directory**

- [ ] **V:**1/2/3 card grid, initials/levels/shifts/rating/chips/clamped bio/request CTA; empty/no matches.
- [ ] **F:** Only own-gym active trainers; name search; correct trainer request URL; fallback rating/specs intentional; no fabricated reviews/hire flow.

**M02 — Request session**

- [ ] **V:** Trainer header/summary/credit/error warnings, all fields/defaults, disabled state and mobile layout.
- [ ] **F:** Missing trainer/no-gym, zero credits disable, required/min-date/min20/step5 duration, collision/past/error feedback, pending then history; request starts pending rather than confirmed.

**M03 — My sessions**

- [ ] **V:** Timestamp/trainer/status/type/duration/notes cards, pending/scheduled/terminal/empty, two confirmation messages.
- [ ] **F:** Pending Withdraw promises no deduction; confirmed Cancel warns about window; loading/cancel/error retention; refreshed result; terminal no action; Request CTA returns directory.

### Cross-page fixture journeys (frontend acceptance)

These journeys validate future UI transitions with fixture results after functionality decisions. They do not demonstrate existing V2 end-to-end support or verify financial/identity effects.

- [ ] Register member/trainer → one-time handoff → first sign-in → forced change → sign-in → correct gym role destination.
- [ ] Owner creates plan → member registration displays it → profile issues pack → member request enabled → trainer sees pending → accepts → member sees scheduled → trainer client roster/profile becomes reachable.
- [ ] Trainer starts/completes or marks no-show → role-specific views refresh consistently; owner overview and earnings use returned updated fixture models.
- [ ] Cover owner SCHEDULED completion before start as an explicit V1 source baseline and approved V2 decision, plus ACTIVE duration feedback. Model no-show invalid-state/repeat/error responses in UI fixtures after rules are agreed; actual retry/concurrency/financial effects require later functionality/integration verification.
- [ ] Client profile → workout/meal builder with clientId → save → same client plan tabs show result; denied client never appears as an eligible option.
- [ ] Owner status/shift/settings mutations update visible profile/pickers; rejected commands retain input/dialog and show feedback.
- [ ] Admin selects gym A → enters owner view → switches gym B → no cached A rows/theme/balances/notifications appear in B; clears support context cleanly.
- [ ] Financial expense/budget/payroll/download frontend states work against explicit fixture results; later backend-stage checks verify financial correctness.

## 17. Existing UI Issues and Incomplete Features

These findings distinguish **source-observed UI/code gaps**, **inferred functionality risks**, and **unresolved product decisions** in the row text. None is a browser/API test result. Preserve the interface baseline; do not silently turn a source behavior into a V2 business-rule requirement or present an inferred risk as a confirmed runtime defect. No budget-category defect exists in the inspected dialog.

| Finding | Evidence | UI consequence / migration handling |
|---|---|---|
| Completion before start — functionality decision | `owner/sessions/daily-view.tsx:136`; `app/actions/sessions.ts:529`, `:538`, `:549`, `:750` | Source accepts SCHEDULED/ACTIVE; duration check only ACTIVE. SCHEDULED completion does not require start/time and attempts credit/revenue/trainer-pay effects. Decide whether V2 should permit it and how to communicate consequences; no runtime execution claimed |
| No-show eligibility/repeat calls — inferred functionality risk | `app/actions/sessions.ts:623`–`:669`, helper`:133`; owner daily`:136`; trainer schedule`:241` | Action checks actor/record but no status/time/already-noShow guard or repeat short circuit; each authorized call attempts MISSED + credit/revenue effects, creates no pay and does not reverse prior pay. UI visibility is narrower. Invalid-state/retry/idempotency outcomes need functionality mapping and later tests, not a claimed observed duplicate charge |
| V2 member creation is not registration | `V2/apps/api/src/gyms.controller.ts:22`, `:129`; `V2/apps/web/src/app/actions.ts:71` | Basic tenant record only; no login/access/membership/credential result. Full O03/handoff cannot use this POST unchanged |
| V2 member directory/profile contract incomplete for V1 UI | Same controller`:105`; `V2/apps/web/src/lib/gymos.ts:14` | Newest100 basic fields only; no total/page/search/detail endpoint or profile data. Existing web count is returned rows; define complete-list/detail contracts before O02/O04 parity |
| V2 universal gym entry conflicts with role permissions | `V2/apps/web/src/app/gyms/[slug]/page.tsx:32`, `:45`; `V2/apps/api/src/gyms.controller.ts:113`; `gym-access.guard.ts:33` | Source trace: MEMBER access may pass but member list403 leads generic error; Super Admin without explicit gym access hits not-found. Proposed multi-role/support entry needs role-aware fetch/access; no runtime role test performed |
| Many mutations ignore returned error | Member profile`:29`, trainer profile`:25`, daily view`:52`, trainer schedule`:55`, `:70`, `:76`, member sessions`:31`, finance`:103` | Dialog can close without successful change; explicit pending/result/error state needed |
| Trainer shift failure styled success | `owner/trainers/[id]/trainer-profile-client.tsx:38`, `:132` | Green failure banner. Use intent-aware feedback |
| Download Receipt is alert only | `owner/members/[id]/member-profile-client.tsx:287`, `:314` | No receipt artifact; keep deferred or separately scope actual download |
| Billing list is derived and hard-coded PAID | Same file`:269`, `:296`; page has no transaction query | Latest membership/all packs shown; manual payments not displayed. Do not call this a complete payment ledger |
| Subscription mutations are alerts | `owner/subscription/SubscriptionClient.tsx:82`, `:136` | No payment portal or tier change; no false “working billing” acceptance |
| View loaders can write defaults | `actions/subscription.ts:14`; `actions/financials.ts:345` | Subscription/financial page render can create data; unsafe live capture, synthetic4242; frontend should consume explicit read result |
| Accounting integration disabled | `owner/financials/financials-client.tsx:721` | Coming Soon only; not feature parity implementation |
| Admin “Members” counts all users | `actions/admin.ts:22`, `:43` | Registry metric label mismatch; clarify member-summary contract |
| Admin View Dashboard changes context only | `admin/AdminClient.tsx:20`, `:106` | Separate Owner View click required; do not document automatic navigation |
| Admin registry status always green | Same file`:100` | Suspended/inactive status may look successful; semantic status presentation correction |
| Admin path permissions exceed actual role previews | `proxy.ts` role branches vs trainer/member page queries and trainer-only authorize calls | Owner support view works with selected gym; trainer/member identity previews do not. Do not advertise four-role impersonation |
| Not-found return fixed to owner | `app/(dashboard)/not-found.tsx:18` | Wrong home for trainer/member; role+gym-aware return |
| Detail missing states are plain text | O04/O07/T03/M02 page guards | Custom not-found component not automatically invoked; map missing-resource states deliberately |
| Attendance/floor metrics are proxies | `actions/dashboard.ts:21`, `:45`; O04 history; `actions/analytics.ts:70` | PT sessions/bookings, not check-in attendance; clarify labels and avoid inventing scanning UI |
| Bounded counts labelled broadly | O07 page`:26`; T03 page`:34`, `:40`, `:46` | Last10 sessions/two plans, not total history; data-contract/label decision |
| Latest membership/pack labelled active | O02 client`:49`; O04`:26` | Newest could be expired; T03 newest workout isn't explicitly active. Preserve ordering only with truthful active semantics |
| Earnings totals unbounded | `trainer/earnings/page.tsx:11`; earnings client`:91` | Empty copy says this period; record count called Paid PT Sessions without payout-status check |
| Trainer Daily Schedule includes all dates | `trainer/schedule/page.tsx:11` | No date constraint/calendar; preserve actual list or explicitly approve behavior change |
| Monthly totals not month-only | `owner/sessions/monthly-view.tsx:38` | Purchased/used lifetime; month filter only affects booked list; earliest is not necessarily future next |
| Static pricing/payout copy | Finance client`:277`, `:285`, `:293`, `:594`; subscription TIERS |40/50/10% and tier features may differ from configured values; use confirmed view-model content |
| Pack issue price fixed450 | Member profile`:384` | Not dynamic configured rate suggestion despite settings explanation; frontend contract to agree |
| Policy controls vs command behavior | Gym config checkboxes`:566`; `actions/sessions.ts:623`, `:693` | No-show/late-cancel inspected paths do not consult corresponding toggle values. Later behavior stage must resolve; no backend fix here |
| Meal day not editable | Meal builder`:30`, `:40`, `:78` | All default day1, aggregate totals; not weekly editor |
| Seeded workout/meal drafts | Workout builder`:29`; meal builder`:30` | Real form defaults, not loaded client plans; confirm intended retention |
| Audit export current page only | AuditLogClient`:54`; action pageSize20 | Export label may imply whole history; explicit scope required |
| Manual CSV implementations differ | Daily view`:66`; AuditLogClient`:54`; `lib/csv.ts` | Ad hoc escaping/data-URI paths vs server helper. Consolidate safe download behavior without changing intended dataset scope |
| Audit filter choices incomplete | AuditLogClient`:16` vs action names emitted by other UI commands | Fixed subset cannot select every action; ALL still displays records. Align filter contract in later work |
| Bell and async read error gaps | NotificationBell`:15`, `:31`; audit handlers`:33`; admin switch`:20` | No inline network-failure UI, potential stale async responses; add explicit result handling preserving visuals |
| Live refresh/timer cosmetic state | Dashboard client`:17`; schedule client`:37` | Spinner500ms not request-bound; active timer initially0/no explicit reset. Use deterministic states |
| Unused declarations/components | FormattedDate; TrainerPayChart import only; member profile progress union; fetched bodyMetrics; plans prop in MembersListClient | Omit dead UI paths from initial migration; no invented features |
| Accessibility gaps | ConfirmDialog/modal JSX; bell row clickable divs; some labels lack htmlFor; closed drawer lacks explicit inert/focus controls | Keep visual design, improve dialog roles/focus/keyboard and control naming; runtime keyboard audit still needed |
| Narrow-width risk | Fixed2/4-column fields, tab strips, bell w80, config table | Source-derived risk; needs screenshots and device/browser interaction before claiming actual clipping |
| Animation utility support unverified | animate-in/fade-in/zoom-in classes, no plugin/definitions in inspected CSS/config | Do not assume entrance animations render; compare actual generated CSS/browser later |
| No theme/dark/font/logo controls | Globals/root/shared components and config five-tab form | Requested white-label capabilities require new frontend tokens/contracts and separately scoped editor |

For pre-start completion, no-show eligibility/retries, policy toggles and billing-history semantics, record **rendered UI**, **source-observed action behavior**, **unresolved functionality decision**, and any later **approved change** separately. Budget category/amount are already implemented; optional month default is not a UI/action mismatch. Keep this report as UI inventory and hand the lifecycle/financial/access/identity decisions to the functionality map and approved decisions in its section 14.1 rather than prescribing backend changes here.

## 18. Missing Information and Open Questions

These do not block using this source inventory for UI planning and comparison fixtures. They do block claiming operational migration readiness or live parity. The functionality and API maps must resolve the decisions below; known current API facts are in section12 and should not be treated as unanswered questions.

| Needed information / decision | Why it matters | Safe next evidence |
|---|---|---|
| Disposable V1 runtime URL, fixture credentials and data setup | Zero browser captures; conditional states need real rendering | Capture manifest in section11 using non-production fixtures; precreate view-side-effect records |
| Intended V2 public root behavior | Existing V2 marketing landing conflicts with V1 root auth redirect | Approved: V1 authenticated role redirect; current V2 landing is test scaffolding. Design no-/multi-gym chooser |
| Canonical URL and legacy-link policy | Slug routes affect all links and stored notification targets | Confirm proposed `/gyms/:slug/{owner,trainer,member}`; decide old URL redirects/bookmarks |
| V2 role entry, access/session and multi-gym behavior | Source defines OWNER/TRAINER/MEMBER and login returns roles, but web chooses first slug; unconditional list request denies MEMBER; no automatic admin gym bypass | Functionality map for role-aware requests/destinations, selected gym, support context, expiry/renewal and forced change; do not claim enum names are unknown |
| Platform support-view capability | V1 context cookie supports owner view; new separated architecture needs explicit authorized UI context | Decide central registry summary fields and support entry/exit contract; no arbitrary tenant cookie copying |
| Full member registration/identity contract | Current V2 POST is strict name/optional email and creates tenant record only; V1 creates login/membership and credentials | Functionality map must define identity/access/member linkage, required profile/plan fields, one-time handoff and forced change; do not infer these from basic POST success |
| Complete member directory/detail contract | Current GET returns newest100 basic rows with no page/total/search controls or detail endpoint | Agree directory scope/pagination/search/status/total and missing phone/plan/expiry/profile data; current25-row client pager cannot fetch records beyond100 |
| Endpoint/DTO coverage for advanced features | Registered current controllers lack sessions/plans/finance/audit/trainer/notification/password-change/full-registration/detail endpoints | Mark proposed contracts separately from existing eight UI-related endpoints; functionality map defines semantics/URLs/fixtures; no services implemented here |
| Meaning of metrics/history labels | Attendance/floor/counts/paid/active/latest semantics differ | Agree labels and data scopes, including recent-history caps and month/lifetime totals |
| Currency, locale and gym timezone | V1 hard-codes dollar signs, mixes browser locale and en-US, UTC-derived dates and server local-day queries | Confirm currency/code and display timezone; include Colombo midnight/UTC-boundary fixture cases if relevant |
| Completion before session start | Source endSession permits SCHEDULED without ACTIVE duration check, attempting credit/revenue/pay effects | Decide V2 eligibility, authorization/time rules, confirmation and error states in functionality map; source permission is not a tested financial outcome |
| No-show eligibility and repeat-call semantics | Source action lacks status/time/already-noShow guards; repeated calls enter same effect path | Decide allowed states/timing, retry/idempotency, prior completion/pay handling and policy toggles; later test actual sequential/concurrent outcomes |
| Policy toggles and billing-history meaning | Persisted switches/derived history do not establish full intended operational behavior | Functionality map and owner-approved behavior decisions; preserve UI description independently. Budget category/amount/current-month default already established |
| Receipt/portal/tier-change/accounting scope | Existing controls are mock or disabled | Keep deferred or authorize new feature separately; no fabricated downloads/checkout |
| Subscription price/limits/entitlements | Static marketing is not proof of enforced product limits | Approved presentation values and source of current plan/status/payment metadata |
| Theme configuration contract and ownership | Current V2 theme only primary/logo | Confirm allowed values, secondary/accent/surfaces/text, fonts, mode/presets, fallback, logo delivery, platform vs gym branding policy |
| Dark-mode and custom-font baseline | V1 no dark/webfont system; V2 currently Geist | V1 Classic system font for baseline; separately accepted dark/font variants with contrast/reflow references |
| Mutation/refresh UX policy | V1 mixes banners/alerts/native confirms and silently discarded errors | Keep recognizable flows; standardize error handling without wholesale redesign |
| Target browser/device/accessibility support | Native date/time widgets and small text vary | Agree supported browsers/widths; run capture/keyboard checks before claiming usability |
| Retain seeded builder drafts? | Example foods/exercises become assignable content | Confirm templates/defaults vs blank new plans; keep current source baseline until decision |

Existing product/design/planning Markdown documents were not treated as implementation evidence. A requirement or schema field alone does not establish an existing screen. Runtime behavior, endpoint correctness, financial calculations, production readiness, and mobile UI are outside this assessment.

### Approved MVP presentation corrections

These user decisions control the **V2 target** wherever an older proposal in this map says to preserve V2 test screens or awaits a scope decision. Source descriptions of V1 and current V2 remain factual observations.

- **V1 is the UI target.** Rebuild its role layouts, screens, forms, states and navigation in V2. Existing V2 public home, basic member list/form and other current screens are test scaffolding. Keep V2 infrastructure only where it supports the new implementation. Root redirects by session and authorized gym role, as V1 does; the exact multi-gym chooser is a design task.
- **MVP screen set:** O14 Subscription stays in this inventory as a future reference and is hidden from navigation. O04’s historical Payments tab may show entitlement and pack history, but no PAID badge, receipt, cash total or live payment form without a real linked-payment API. A future payment screen expands this area for partial payments, balance and linked refunds. O10 finance must label operational earned values separately from cash; cash is unavailable until payment recording exists.
- **Session controls:** O09 direct booking and T01 acceptance show a held-credit result; M02 request shows eligibility without a hold. O08/T01 Complete appears only after Start, and No-Show only for confirmed not-started sessions after the 15-minute grace period. O08/M03 cancellation quotes the exact cutoff, gym toggle and one-credit consequence, with a free result at equality. Suspension/deactivation cancels future sessions and releases holds. Server response, not the browser clock, controls availability.
- **Coaching/privacy:** T04 workout and T05 meal builders remain MVP. T03 private health notes appear only for the owner and a trainer with a confirmed relationship. Do not expose them to pending-request trainers, members or read-only platform support.
- **Brand and shared UI:** MVP theme editor has primary color and HTTPS logo only. Bell reads and mark controls operate in the selected gym. Charts use session-based labels and show ratings as unavailable where no ratings were collected. Finance/payroll CSV exports all filtered rows up to a safety cap; audit exports the visible page.

See functionality section 14.1 and the API map for the accepted behavior and API boundary. Visual source evidence in sections 2–11 is unchanged.

## 19. Final UI Migration Readiness Summary

**This is a UI inventory and proposed reuse/visual-parity guide, not a complete functionality migration specification.** It can guide feature-by-feature JSX/component extraction, layout/theme adaptation, route organization proposals and visual/frontend-state fixtures. It inventories29 V1 routes/26 rendered pages, two layouts, three special states,11 shared/layout files and29 colocated feature files; maps74 TSX files; and identifies frontend integration touchpoints. This review changed documentation only; V2's existing basic-record slice remains distinct from a verified V1 parity migration.

The budget dialog is already wired for required category/amount with an optional-month current-month default. SCHEDULED completion is accepted by V1, with minimum duration checked only for ACTIVE. Whether V2 should allow completion before start, and how no-show eligibility/repeat calls should behave, remain functionality decisions because of credit, revenue and trainer-pay effects. No financial outcome or idempotency guarantee was runtime-tested here.

The functionality and API maps is required before operational integration: define registration vs basic member creation and identity/credential linkage; complete member list/detail/pagination beyond the current100-row cap; role-aware entry instead of unconditional restricted list requests; support-view access; lifecycle/state/financial rules; and missing API contracts. UI extraction or fixture parity alone cannot settle these or demonstrate working end-to-end migration. Use V1 layout as the visual target and V2 API/session infrastructure as the technical foundation; do not treat the V2 test screens as UI targets.

Readiness gates remaining:

- [ ] Capture and review V1 desktop/mobile/overlay references against safe fixtures.
- [ ] Finalize V1-style root/role/gym routes, access/session/theme/frontend DTO contracts.
- [ ] Complete the functionality map and approved decisions in its section 14.1 for registration/identity, full directory/detail data, role entry/support access, pre-start completion, no-show eligibility/idempotency and financial effects.
- [ ] Separate confirmed UI gaps, mock controls, inferred risks and product decisions; approve behavior changes independently of screenshot fidelity.
- [ ] Use batches1–10 as a proposed UI sequence; integrate dependent commands only after functionality contracts are agreed, with visual/fixture/API gates recorded separately.
- [ ] Verify actual runtime, sequential/retry/concurrent behavior and financial correctness in later integration testing. **No screenshots, API calls or end-to-end tests were performed for this review.**

Only this Markdown documentation is an intended repository change. No V1/V2 application source files, schemas, dependencies or business logic are changed by this analysis.
