# GymOS V1 → V2: API Migration Map

## 1. Scope and authority

**Planning map, 23 October 2026.** This document links the [V1 UI inventory](UI_MIGRATION_MAP.md), [functionality contracts](FUNCTIONALITY_MIGRATION_MAP.md) and [data ownership map](DATABASE_MIGRATION_MAP.md). It does not claim these proposed routes exist. Only E01–E08 below were found in the V2 controllers; their behavior was inspected in source, not run. C01–C63 are contract IDs from the functionality map, including expansions of existing endpoints. No application, schema or database was changed for this map.

**MVP authority:** V1 visual screens and interactions are the target. Current V2 screens are test scaffolding. Next.js keeps server-side session/token handling, page reads, thin Server Actions and same-origin download/poll routes; NestJS owns identity, authorization, tenant selection, validation, booking, money and transactions. The user's settled choices are in functionality §14.1 and database §14.1. Where an older proposal says a choice is open, those approved choices control. Payment recording/refunds/receipts and subscription billing are future scope; O14 and cash controls are hidden in MVP. V1 source observations remain evidence, not V2 behavior rules.

All paths are proposed **NestJS API paths** unless marked E (existing); web page paths live under `/gyms/[slug]/...`. A slash between stage numbers means an initial usable contract followed by a richer screen, not two APIs. `later` and `future` are outside MVP. Every C ID has one primary entry below; a row may contain a resource variant or start/end method described in functionality §§10–11.

## 2. Existing V2 API surface and reuse decision

| ID | Existing endpoint | MVP use and gap |
|---|---|---|
| E01 | POST `/auth/login` | Keep credential validation/token service; expand session/forced-change, role/gym selection (C01/C03). Current web redirects to first gym. |
| E02 | GET `/admin/gyms` | Expand to authorized paged registry and true totals (C07). |
| E03 | POST `/admin/gyms` | Keep provisioning foundation; add idempotent recovery, currency/time-zone choice and one-role access rules. No database provisioning was run for this document. |
| E04 | GET `/gyms/:slug/theme` | Reuse primary color/HTTPS logo read; apply V1 screen design (C05). |
| E05 | PATCH `/gyms/:slug/theme` | Reuse primary color/HTTPS logo validation; add version/audit/web editor (C05). Extended presets are future. |
| E06 | GET `/gyms/:slug/access` | Reuse active gym-access check; richer role-safe shell/actor projection is C06. |
| E07 | GET `/gyms/:slug/members` | Replace capped 100-row basic list with authorized page/filter/total (C09); trainer client roster uses C30. |
| E08 | POST `/gyms/:slug/members` | Basic tenant contact record only; **does not** enroll a member or create access. Full registration is C12. Do not wire V1 registration form to E08. |

The diagnostic GET `/` greeting has no UI migration responsibility. Current V2 controller route declarations and limitations are detailed in functionality §3.

## 3. End-to-end boundary for a migrated interaction

1. A V1-derived page renders through a Next.js server read adapter, which obtains the HttpOnly session and calls an authorized NestJS GET. It receives a sanitized view model, not raw Prisma or a browser token.
2. A form/control calls a **thin Next.js Server Action**. It checks form shape, sends an idempotency key/expected version where required, and calls the corresponding NestJS command. NestJS rechecks role, selected gym, actor relationship and current state. The action maps safe errors and refreshes the reviewed page scopes from functionality §12.
3. A CSV button uses a same-origin authenticated **web GET** that streams NestJS C62. Bell polling uses a same-origin web GET backed by C59. Read/mark controls use C60/C61 Server Actions. Neither exposes the bearer token or changes state on a GET.
4. Resource ownership is explicit: master identity/access/theme/support/subscription versus one gym's tenant data. A master operation plus tenant receipt is used for cross-database enrollment; a local tenant transaction handles holds, session settlement, earned value, pay, audit and notifications. There is no assumed distributed transaction.

Common proposed transport: `{data,meta:{requestId,asOf,gymSlug?,currency?,timeZone?}}` for reads; paged collections include full-filter totalCount; commands return `operationId`, resource/version and safe `refreshScopes`; failure distinguishes 401/403/404/409/422/429/503 and unknown outcome. Money is a decimal string plus currency. Cross-gym IDs return safe 404; no client-supplied database name or recipient ID is trusted. See functionality §§2,10–12 for the field-level DTOs, validation and refresh matrix.

## 4. Complete UI → web → NestJS contract register

`R` denotes a server read adapter, `A` a thin Server Action. The binding is conceptual, not an already created source file. The UI IDs identify V1 screens or shared controls. Stage numbering follows functionality §13 with MVP corrections in this map.

| ID | V1 UI/control | Stage | Next.js binding | NestJS method/path | Data owner |
|---|---|---|---|---|---|
| C01 | A01/A02/R00/L02 | 1 | server read adapter | GET `/auth/session` | master + context |
| C02 | A01 | later | web sign-out; API optional | POST `/auth/logout` | master + context |
| C03 | A02 | 1 | thin Server Action | POST `/auth/password/change` | master + context |
| C04 | S01 | 2 | start/end Server Actions | POST `/admin/support-sessions` | master + context |
| C05 | O12/L02 | 1/10 | server read + theme Server Action | GET/PATCH `/gyms/:slug/theme` | master theme |
| C06 | L02/R00 | 1 | server read adapter | GET `/gyms/:slug/context` | master + context |
| C07 | S01 | 2 | server read adapter | GET `/admin/gyms` | master + context |
| C08 | O01 | 9 | server read adapter | GET `/gyms/:slug/dashboard` | tenant |
| C09 | O02 | 4 | server read adapter | GET `/gyms/:slug/members` | tenant |
| C10 | O04 | 4 | server read adapter | GET `/gyms/:slug/members/:memberId` | tenant |
| C11 | O03/O12 | 3 | server read adapter | GET `/gyms/:slug/membership-plans` | tenant |
| C12 | O03 | 3 | thin Server Action | POST `/gyms/:slug/member-registrations` | master access + tenant actor |
| C13 | O06 | 3 | thin Server Action | POST `/gyms/:slug/trainer-registrations` | master access + tenant actor |
| C14 | O04 | 4 | thin Server Action | POST `/gyms/:slug/members/:memberId/status` | master access + tenant actor |
| C15 | O05/O09 | 4 | server read adapter | GET `/gyms/:slug/trainers` | tenant |
| C16 | O07 | 4 | server read adapter | GET `/gyms/:slug/trainers/:trainerId` | tenant |
| C17 | O07 | 4 | thin Server Action | POST `/gyms/:slug/trainers/:trainerId/status` | master access + tenant actor |
| C18 | O07 | 4 | thin Server Action | PUT `/gyms/:slug/trainers/:trainerId/shift` | tenant |
| C19 | O04 | 4 | thin Server Action | POST `/gyms/:slug/members/:memberId/session-packs` | tenant |
| C20 | O08 | 5 | server read adapter | GET `/gyms/:slug/sessions` | tenant |
| C21 | O09 | 5 | server read adapter | GET `/gyms/:slug/session-booking-options` | tenant |
| C22 | O09 | 5 | thin Server Action | POST `/gyms/:slug/sessions/bookings` | tenant |
| C23 | M02 | 5 | thin Server Action | POST `/gyms/:slug/me/session-requests` | tenant |
| C24 | T01 | 5 | thin Server Action | POST `/gyms/:slug/sessions/:id/respond` | tenant |
| C25 | T01/O08 | 6 | thin Server Action | POST `/gyms/:slug/sessions/:id/start` | tenant |
| C26 | T01/O08 | 6 | thin Server Action | POST `/gyms/:slug/sessions/:id/complete` | tenant |
| C27 | T01/O08 | 6 | thin Server Action | POST `/gyms/:slug/sessions/:id/no-show` | tenant |
| C28 | M03/O08/T01 | 6 | thin Server Action | POST `/gyms/:slug/sessions/:id/cancel` | tenant |
| C29 | T01/O08 | 6 | thin Server Action | PATCH `/gyms/:slug/sessions/:id/notes` | tenant |
| C30 | T02/T04/T05 | 4/7 | server read adapter | GET `/gyms/:slug/me/clients` | tenant |
| C31 | T03 | 4/7 | server read adapter | GET `/gyms/:slug/me/clients/:memberId` | tenant |
| C32 | T04 | 7 | thin Server Action | POST `/gyms/:slug/me/clients/:memberId/workout-plans` | tenant |
| C33 | T05 | 7 | thin Server Action | POST `/gyms/:slug/me/clients/:memberId/meal-plans` | tenant |
| C34 | T06 | 6 | server read adapter | GET `/gyms/:slug/me/earnings` | tenant |
| C35 | M01 | 4 | server read adapter | GET `/gyms/:slug/me/trainer-directory` | tenant |
| C36 | M02 | 5 | server read adapter | GET `/gyms/:slug/me/session-request-options` | tenant |
| C37 | T01/M03 | 5 | server read adapter | GET `/gyms/:slug/me/sessions` | tenant |
| C38 | O12 | 3 | server read adapter | GET `/gyms/:slug/configuration` | tenant |
| C39 | O12 | 3 | thin Server Action | PATCH `/gyms/:slug/configuration/profile` | master access + tenant actor |
| C40 | O12 | 3 | thin Server Action | POST `/gyms/:slug/membership-plans` | tenant |
| C41 | O12 | 3 | thin Server Action | PUT `/gyms/:slug/configuration/session-rates` | tenant |
| C42 | O12 | 3 | thin Server Action | PUT `/gyms/:slug/configuration/pay-rates` | tenant |
| C43 | O12 | 3 | thin Server Action | PUT `/gyms/:slug/configuration/session-policy` | tenant |
| C44 | O12 | 4 read | refresh derived expiry; retire mutation | Legacy POST `/gyms/:slug/memberships/check-expiries` withdrawn for MVP | tenant |
| C45 | O10/O01 | 6/8 | server read adapter | GET `/gyms/:slug/financials/revenue` | tenant |
| C46 | O10 | 8 | server read adapter | GET `/gyms/:slug/financials/expenses` | tenant |
| C47 | O10 | 8 | server read adapter | GET `/gyms/:slug/financials/budgets` | tenant |
| C48 | O10/O04 | 6/8 | server read adapter | GET `/gyms/:slug/financials/deferred-revenue` | tenant |
| C49 | O10 | 6 | server read adapter | GET `/gyms/:slug/payroll/current` | tenant |
| C50 | O10 | 8 | server read adapter | GET `/gyms/:slug/financials/profit-and-loss` | tenant |
| C51 | O10 | 8 | thin Server Action | POST `/gyms/:slug/financials/expenses` | tenant |
| C52 | O10 | 8 | thin Server Action | PUT `/gyms/:slug/financials/budgets/:category` | tenant |
| C53 | O04 future | future | future only; hidden in MVP | Earlier POST `/gyms/:slug/members/:memberId/desk-payments` shape withdrawn; linked-payment contract TBD | tenant |
| C54 | O10 | 8 | thin Server Action | POST `/gyms/:slug/payroll/periods/:id/close` | tenant |
| C55 | O10 | 8 | thin Server Action | POST `/gyms/:slug/payroll/periods/:id/approve` | tenant |
| C56 | O11 | 9 | server read adapter | GET `/gyms/:slug/analytics` | tenant |
| C57 | O13/S01 support | 5/9 | server read adapter | GET `/gyms/:slug/audit` | tenant |
| C58 | O14 future | future | future only; hidden in MVP | GET `/gyms/:slug/subscription` | master billing |
| C59 | L02 | 5 | server read + same-origin bell GET | GET `/gyms/:slug/me/notifications` | tenant |
| C60 | L02 | 5 | thin Server Action | POST `/gyms/:slug/me/notifications/:id/read` | tenant |
| C61 | L02 | 5 | thin Server Action | POST `/gyms/:slug/me/notifications/read-all` | tenant |
| C62 | O10/O13 | 10 | authenticated web GET download | GET `/gyms/:slug/exports/:kind` | tenant |
| C63 | O08 | 5 | server read adapter | GET `/gyms/:slug/member-session-overview` | tenant |

## 5. MVP contract details that must remain consistent

### 5.1 Identity, selected gym and support

- **C01/C03/C06 + E01/E06:** Login selects an authorized gym/role, requires a temporary-password change at first login, and rejects inactive/suspended context API-side. One identity has one role in each gym but may be verified and reused in another gym without password reset. The one-time credential is shown to the owner only on the first successful handoff; reissue rotates and invalidates the prior secret. A lost response never replays plaintext.
- **C04:** Platform admin support begins read-only and preserves the original actor, selected gym, reason and expiry. A support context is not a global OWNER bypass and must not expose private health notes. Start/end operations are audited.
- **E03/C39:** Gym currency and IANA time zone are selected at creation; currency locks after financial activity. A gym profile update crossing master and tenant data has an explicit operation/recovery outcome, never an invented cross-database transaction.

### 5.2 Registration, entitlement and credit holds

- **C12/C13:** Owner registration links an existing verified V2 identity or creates a new one with a one-time temporary password. Same-gym role conflict is rejected. Master access is PENDING until tenant actor/receipt verification and final master activation. C12 creates membership entitlement with an agreed price and term; it does **not** create a cash payment or recognize the whole fee at registration.
- **C14/C17/C19/C44:** Membership expiry is derived from dates; active memberships never overlap. Suspension/deactivation revokes future eligibility, cancels affected future bookings and releases holds without a fee. C19 issues a priced pack without recording payment. C44 must become a derived status refresh/no-op or be removed from MVP as a mutation; it must not mark the identity EXPIRED from one term.
- **C21–C24/C36:** PT request requires active member, membership covering scheduled date, and an unexpired pack with an available credit. It creates **no hold**. Direct owner booking (C22) and trainer acceptance (C24) each atomically hold one credit with the SCHEDULED state, one hold per session. A held credit remains usable for its booking after pack expiry. Confirmation snapshots fee, trainer level/rate and shift. Current V2 has none of these session APIs.

### 5.3 Session transitions and money

| Command | Allowed MVP transition and atomic result |
|---|---|
| C25 Start | Confirmed SCHEDULED → ACTIVE, with `startedAt`. No earned value or pay yet. Server controls time/permission. |
| C26 Complete | Only ACTIVE with `startedAt` → COMPLETED; consume its held credit once, earn equal pack-price share, create one trainer pay record from confirmation snapshot and create the weekly/monthly period on the first completed pay. No direct SCHEDULED completion. |
| C27 No-show | Confirmed, not-started SCHEDULED after start plus 15 minutes → MISSED; consume held credit once, record distinct no-show earned value, no trainer pay. Duplicate intent cannot charge twice. |
| C28 Cancel | Pending withdrawal free. Confirmed at exact cutoff or earlier free and releases hold. Strictly inside window: consume held credit only when gym toggle enabled, record distinct late-cancel earned value, no trainer pay; otherwise release. Quote/acknowledgment and server clock govern. |
| C14/C17 status | Cancel affected future sessions and release active holds free when member is suspended/trainer deactivated. Preserve historical events/settlements. |

The tenant transaction enforces unique session hold/settlement/credit movement and pay origin, optimistic version and overlap protection. It commits required audit/notification evidence or returns a durable committed outcome if delivery is asynchronous. C29 notes never trigger financial settlement. Same idempotency key replays safely; a different key for an already terminal session fails without another effect.

### 5.4 Reporting, payroll and privacy

- **C45/C48/C50:** MVP reports show operational earned value: membership over active dates, equal pack-price share on consumed credits, separate completed/no-show/late-cancel lines, and expired unused value separate. An active hold is not earned. Cash received is unavailable without the future linked-payment ledger; do not present a zero as proof of no cash or call the operational result audited net profit. Early membership suspension/cancellation earning changes and recognition of expired unused value await Finance policy.
- **C49/C54/C55:** A GET does not create a pay period. The first completed-session pay creates its period. Weekly/monthly boundary and close/completion race rules need technical sign-off. Approval is not payout; corrections after approval are documented adjustments in a later open period.
- **C31/C32/C33:** Workout and meal builders are MVP. Private health notes are owner-only or related-trainer-only after a confirmed client relationship. Pending requests do not grant access. Scope read models accordingly, including support read-only view.
- **C56:** Attendance-like analytics are labeled as session-derived counts/proxies; ratings with no recorded input are unavailable. **C59–C61:** bell data and read state are selected-gym-only.
- **C62:** Finance/payroll CSV contains every filtered row up to a reviewed safety cap; audit CSV contains the visible page. Same authorization/filter semantics as on-screen reads, safe filenames, no token in URLs or output. Return a clear limit error instead of silently truncating.

### 5.5 Deferred contracts

**C53 payment capture and C58 subscription are outside MVP.** Hide their controls/navigation while preserving V1 screen source in the UI map. Future C53 must be redesigned from generic desk payment into linked payment allocation: attach each partial payment to one membership/pack, show remaining balance, reject overpayment, and record refund as a linked reversal. Payments and entitlement/earned-income records are distinct. The existing member Payments area is the future UI location. Future C58 is a pure master subscription read using real data or null, never a synthetic tier/card. A subscription change/payment portal needs separately commissioned commands, not mock alerts.

## 6. Stage gates and review checklist

| Stage | Buildable result | Gate |
|---|---|---|
| 0 | Freeze approved MVP behavior and precise DTO/error shapes | Review remaining precision/rounding, DST/overnight, pack selection, support expiry, payroll close race, export cap and measurable refresh bound. Payment accounting questions can wait. |
| 1–2 | Auth/role/gym shell, theme base, registry and read-only support | No forbidden member-list fetch for member entry; original support actor and active access checked. |
| 3–4 | Configuration, enrollment, people and entitlement | Full C12/C13 instead of E08; verified cross-gym login reuse, no false payment, derived expiry, role/health privacy. |
| 5 | Booking/request/accept and selected-gym bell | Collision-safe credit hold, membership scheduled-date gate, notification delivery/read/mark exactly once. |
| 6 | Start/complete/no-show/cancel and operational value/pay | Hold consume/release exactly once; no trainer pay for missed/cancelled; rate snapshot, period first pay; cross-role reads agree. |
| 7–8 | Coaching builders, expenses/budgets/payroll and earned-value reporting | Related-client privacy, bounded plan rows, no cash/paid claim, approved payroll separate from payout. |
| 9–10 | Honest dashboard/analytics/audit, CSV, basic brand editor | Correct filter totals and labels; filtered versus visible-page export behavior; O14 remains hidden. |
| Final | End-to-end disposable-gym evidence | Test two gyms, all roles, >100 members, last-credit/booking races, retries, exact cutoff, +15-minute no-show, expired pack held booking, approval/close race, CSV cap and absence of synthetic payment/rating data. |

**Readiness:** This map is a reviewable API blueprint, not an implemented API. Source verification was static. The exact DTO field schemas, monetary rounding, timezone ambiguity handling and payroll close concurrency policy still need implementation review. No production data migration is required: existing records were for development only.
