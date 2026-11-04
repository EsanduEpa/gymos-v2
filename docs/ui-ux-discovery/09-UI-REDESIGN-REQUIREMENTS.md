# UI redesign requirements

Audit date: 5 November 2026 (Asia/Colombo). Scope: current `gymos-v2` working tree. Discovery only; implementation status means source-connected, not a fresh runtime certification.

## Product scope and handoff contract

Design the **current V2 system** represented by39 routes and46 feature groups. Preserve connected F01–F45 behavior, marking partial/backend-only workflow completion separately. F46 billing remains an honest placeholder until an approved product/backend scope exists. V1 reference images are visual inspiration only. Do not infer payments, physical attendance, payouts, exercise completion/progress or ratings from familiar gym software conventions.

The designer should deliver role-specific information architecture, responsive screen/state designs, reusable component/token specifications and explicit behavior for every catalogued form/panel/dialog. Map each deliverable to S/F/UX IDs. No implementation, schema change or deployment is authorized by this audit.

## Required information architecture

1. Platform: registry/health/freshness, creation/status/retry/handoff, reasoned read-only support, lifecycle confirmation/recovery. Owner consent page and worker deployment are known dependencies, not invented completed features.
2. Owner: operational home, member directory/registration/profile/status/history/packs, trainer roster/registration/profile/shift/status, PT oversight/direct booking, six financial regions, analytics, five configuration tabs, audit and explicit subscription availability state.
3. Trainer: coherent selected landing, own schedule/request decisions, dynamic confirmed clients/profile, workout/meal creation and own earnings. Plan builders remain discoverable from client context.
4. Member: sanitized trainer directory/request, own sessions/credits/status counts, PT+meal calendar, read-only workout/meal plans. No current standalone member dashboard or membership self-service page.
5. Cross-role: login/password gate, no access/chooser, role correction/denial, gym-level loading/error/404, notification popover, mobile drawer and support context. Maintain authorized direct/deep links to hidden nested routes.

See [screens](02-COMPLETE-SCREEN-INVENTORY.md) and [roles](01-ROLES-AND-PERMISSIONS.md). Coherent landing/label priorities require user testing; current different trainer landings should not be accidentally preserved as a requirement.

## Functional preservation and acceptance matrix

| ID | Must preserve / required design behavior | Acceptance evidence to plan |
|---|---|---|
| R01 | All39 routes represented; redirects and test-only routes explicitly separate; nested builders/consents/booking/profile states covered | Reconcile against file02 route ledger; no role feature replaced with empty placeholder |
| R02 | Four working roles, global USER distinction, one role per gym, multi-gym switching | Correct role nav/access matrix; wrong role redirects; missing/foreign gym denied uniformly |
| R03 | Server auth/tenant/schema/actor/relationship isolation | Server tests and browser negative cases; hiding controls never grants authorization |
| R04 | Identity-wide logout/version revocation,15m session,24h temporary credential and forced password change | Expired/stale/BFCache/cross-tab/private-context cases; browser no token persistence |
| R05 | Complete registration/consent/one-time handoff branches | New/existing identity, accepted/declined/pending, copy failure, lost-response/secret unavailable, ack/reissue/recovery |
| R06 | Directory fields/filters/search/server totals and pages | BASIC/operational/historical, active/inactive, no results, empty tenant, large tenant, no hidden later pages |
| R07 | Status/lifecycle reason/version/key/confirmation and original-operation recovery | Pending vs complete, future appointments cancelled/holds released, active/history retained, no automatic restoration |
| R08 | Membership/pack semantics | Agreed value≠payment; end exclusive; available/held/consumed/expired accurate; renewal API-only explicitly scoped |
| R09 | Direct confirmed owner booking vs pending member request | Correct credit hold timing, selected-date eligibility, collisions,365day horizon, duration/DST/type/notes and stale options |
| R10 | Session state machine | Only valid actions shown; start timing, actual clock, booked minimum complete duration; completed-only member-visible notes; no arbitrary status setter |
| R11 | Server policy quote/acknowledgment | Quote consequence/cutoff/value/ordinal,2min expiry, correct role/state/version, late/no-show acknowledgment and stale re-review |
| R12 | Coaching relationship/private-field rules | Current qualifying clients only,90day window, server recheck; member reads own assigned plans; no unauthorized preview fields |
| R13 | Workout/meal create-read workflows |1–100 rows, units/bounds/optional zero/null, explicit member assignment; no implicit default prescription or fictional edit/delete |
| R14 | Finance method and precision | Operational earning/deferred/expenses/payroll/P&L/cash distinctions, exact decimals, SALARIES exclusion, current-source snapshots and readable date/currency/zone |
| R15 | Payroll OPEN→CLOSED→APPROVED | Review total/version/key, correction provenance and immutable approved history; no payout implication |
| R16 | CSV and audit scope | Authenticated POST;5000 cap; formula escaping; selected filtered audit page only; no secrets/private transition metadata |
| R17 | Notifications | Own latest state, safe role destination mapping, unread count/read-through snapshot, stale/error; accessible dismissal/focus |
| R18 | Appearance/configuration | Master name/theme vs tenant settings version domains, fixed currency/zone, future policy snapshots, blank fallback vs zero, validated color/logo |
| R19 | Honest aggregate/estimate/freshness states | Null not0; partial counts withheld; PT metrics labeled as PT, method-specific range/estimate/asOf, no inferred billing state |
| R20 | Resilient forms and async feedback | Pending prevents duplication; field+summary errors; retry only correct key/intent; keep drafts across safe refresh, clear secrets/context on exit |

Sources: [apps/api/src/gym-access.guard.ts:1](../../apps/api/src/gym-access.guard.ts#L1), [apps/api/src/sessions/session-state.ts:1](../../apps/api/src/sessions/session-state.ts#L1), [apps/api/src/sessions/session-lifecycle.service.ts:1](../../apps/api/src/sessions/session-lifecycle.service.ts#L1), [apps/api/src/finance/finance.service.ts:1](../../apps/api/src/finance/finance.service.ts#L1), [apps/api/src/coaching/coaching.service.ts:1](../../apps/api/src/coaching/coaching.service.ts#L1), [packages/contracts/src/index.ts:1](../../packages/contracts/src/index.ts#L1).

## Required state taxonomy

For every server-backed collection: loading, loaded, initial empty, filtered empty, invalid query, denied/foreign scope, expired credential, unavailable dependency, malformed response, stale cached values, partially available projection, truncated dataset and paginated full totals. For mutations: draft, validating, submitting, committed success, rejected validation/permission, changed version/options, unknown outcome, original-key retry, pending durable operation, retryable/final/repair state and operation-specific resume. A blank screen or “0” is not a substitute for failed data.

For consent/handoff: no session, wrong subject, password gate, pending consent, accepted/declined, owner completion required, new-credential one-time display, already issued/no plaintext, manual copy failure, acknowledgment failure/success, expired credential and explicit replacement. Do not store credentials in reusable draft tooling.

## Data and wording requirements

- “Member status,” “membership eligibility,” “registration state,” “access-link status,” and “session state” must not collapse into one Active badge.
- Use PT session history rather than physical attendance; label dashboard proxies by actual definitions. Do not claim Trainers on Floor from scheduled records.
- Show term/pack coverage through the day before endDateExclusive, or clearly mark exclusive boundary. Use gym-local time for schedules/business periods and explicit UTC for audit when appropriate.
- Financial inputs use supported currency and exact decimal values; rates use percentages with exact conversion to ratios. Repair UX03/26 before redesigning compensation controls.
- Paid, cash received, invoice, payout, refund, subscription active/overdue, workout completed and rating require real supporting data/actions; currently absent.
- Display unknown nutrition as not provided, and explain repeating meal plan source/absence of effective dates. Preserve zero as a legitimate fee/weight/nutrition value.
- Show fresh/estimated/truncated/partial metadata close to the value; choose readable text over raw operation codes where possible, retaining diagnostic reference in secondary details.

## Visual system and responsiveness

Specify semantic palette aliases, tenant accent boundaries, typography/spacing/radius/elevation scales, control variants, icon family, grid/table/card behavior, diagram/chart text alternatives and domain badge labels. Primary tenant foreground must be derived/validated, not assumed white. Status/focus colors remain shared; logo loading/failure geometry fixed. Dark mode, uploads/arbitrary font/layout themes are additional scope.

Design and verify1440/768/390/320px plus intermediate breakpoints, keyboard drawer/dialog operation, long names/addresses, huge monetary values, thousands of records, absence of logo/biography/phone, slow/missing dependencies,100+ option datasets and multiple gyms. Do not erase context or drafts on periodic data refresh. Small-screen tables may use selected columns/cards or bounded scroll, but must retain essential values/actions and actual remote pagination.

Accessibility targets for the new design: normal-text contrast≥4.5, visible focus, complete input labels/errors, logical headings/landmarks, keyboard-operable dialogs/popovers/tabs, context-specific action names, meaningful status text beyond color, readable zoom and screen-reader chart/calendar alternatives. These are design acceptance targets, not a claim the current app passes. Confirm actual rendered behavior with keyboard and assistive technology.

## Recommended implementation/design order

**First: correctness and task continuity.** UX01 list URLs, UX02 false history, UX03/26 compensation units/contracts, UX04 publication predicate, UX05 earnings timezone, UX06 draft-disrupting reloads, UX07/08 consent continuity, UX09/10 hidden records/options and UX11 misleading metrics. These require functional changes in a future implementation; styling cannot fix them.

**Second: shared interaction system.** Forms/error summaries, server-paged tables/selection, status labels, operation/credential/quote panels, dialogs/popovers, exact money/time controls, page headings/metrics and semantic tokens. Keep backend contracts and boundaries intact.

**Third: responsive role polish and reporting clarity.** Owner daily operations, trainer request→execution→plan journey, member requests/calendar/plan reading, platform creation/support/lifecycle. Validate with role-specific representative tasks, then visual details.

**Separate product extensions:** renewal UI, existing-owner consent UI, fuller history/inbox, active meal plan/version semantics and richer brand application are completion opportunities; payment/billing/attendance/payout/progress/roles are new capabilities. Each needs explicit workflow/data/API scope, not a cosmetic promise.

## Questions needing stakeholder decisions

Which role/task should each landing prioritize? Who runs/owns provisioning worker and controlled repair? Should owner renewal be in this redesign scope? Is physical attendance a future product requirement? What payment/payout/accounting system, if any, is intended? What defines current coaching plan and archived history? Which tenant brand surfaces are customizable? Should calendars use locale/week-start preference? What accessibility/localization targets and role-specific success metrics apply? No product answers were invented during discovery.
