# Component reusability assessment

Audit date: 5 November 2026 (Asia/Colombo). Scope: current `gymos-v2` working tree. Discovery only; implementation status means source-connected, not a fresh runtime certification.

## Decision basis

Reuse business contracts and interaction safeguards before reusing appearance. “Refactor” below means future design/implementation work; this audit made no changes. Page usage was inspected through imports/routes, not inferred from exported component names. Sources and full fields appear in file02; exact dependencies are indexed in file11.

| Component/group | Current consumers/function | Disposition | Requirements to preserve or improve |
|---|---|---|---|
| DashboardChrome | Every active tenant role and platform/support shells | Reuse behavior, refactor presentation | Identity/context attributes, role links, drawer focus/scroll lock, skip link, sign-out, support banner/exit, conditional gym switching; avoid hardcoded Classic accent |
| SessionLifecycle | Root layout | Reuse security behavior | No token browser storage, expiry/revocation/role invalidation, broadcast and BFCache conceal; separate from domain auto-reload |
| Button | Shared and domain forms | Reuse/extend | Three semantic variants, native disabled, pending spinner/aria-busy, full-width; unify handwritten variants and async labels |
| Field | Auth/config/platform; many forms handwrite equivalents | Refactor into consistent control family | Input label/autocomplete/hint/error; add select/textarea/checkbox/radio wrappers and error-summary focus; preserve exact parsing/units |
| Card/CardHeader/PageHeader | Platform/config/domain | Reuse with type/spacing tokens | Heading hierarchy and action slot; consolidate owner/trainer custom banners and generic header sizing |
| StatCard | Platform/support; owner duplicates dashboard metrics | Refactor semantic metrics | Definition, scope, unit, currency, asOf, unavailable and estimate labels; no unsupported trend invention |
| Tabs | Member profile/config/test | Reuse with namespaced IDs | Keyboard roving/Home/End/disabled/aria wiring; replace pseudo-tabs in client profile or use ordinary anchors; finance links are route navigation, not necessarily same widget |
| DataTable | Gated test harness; real lists mostly hand-built | Refactor/adapt, do not blindly substitute | Existing client-only slicing unsuitable for server datasets. Add explicit remote paging/filter state/total/error/loading and accessible headers; no invented sorting/bulk action |
| Feedback/EmptyState/LoadingState | Many routes, plus duplicates | Reuse and consolidate | Distinguish no records vs no match vs unavailable vs forbidden vs stale vs unknown outcome; preserve statuses/alerts and retry context |
| StatusBadge | Person/session/platform states | Refactor domain label mapping | Raw ACTIVE has different meanings; support deactivated/missed/cancelled/repair states, text+color; avoid status inferred from color |
| ConfirmDialog | Platform lifecycle/credential replacement/test | Reuse | Native modal semantics, focus trap/return, pending dismissal lock, explicit consequences; replace native completion confirm with equivalent secure pattern if changed |
| SessionPolicyControls | Owner/trainer/member session list | Reuse domain logic, unify dialog base | Fresh server quote,2min expiry, consequence/value/ack/token/version/key, stale re-quote, unknown replay; never calculate eligibility in presentation alone |
| SessionLifecycleControls | Trainer cards only | Reuse trainer controls, refactor command shell | Version-keyed forms, start/complete, member-visible completed-session notes, exact counters; preserve drafts against reload; owner API/UI gap explicit |
| SessionReadView/loadSessionReadPage | Owner ledger, trainer schedule, member sessions | Reuse projections, refactor URL/state/performance | Role scoping, day/month/state/search, total vs filter count, pagination, asOf; preserve owner view=list; optimize count fan-out only with backend equivalence |
| SessionReadRefresh | Active session views | Replace full document reload behavior | Preserve freshness/authorization checks without wiping editors/quotes or shifting focus |
| OwnerMonthOverview | Owner monthly list | Reuse fields/semantics | Whole member list, monthly state counts vs lifetime packs, membership dates, distinct paging/drilldown; preserve list mode |
| Owner/MemberSessionCalendar | Owner month and member PT+meal calendar | Refactor shared date utilities/event presentation | Respect different use cases, timezone, legend/text alternatives, partial/truncated loads. Confirm week-start product choice before unifying |
| ElapsedSessionClock | Trainer ACTIVE card | Reuse | Actual startedAt elapsed duration; do not imply it unlocks completion before server booked minimum |
| OwnerDashboardLive | Owner home | Refactor metrics/chart/cards | Correct PT-only proxy naming, stale/error/asOf, readable ranges, return all-sessions path; chart text values retained |
| MemberRegistrationForm / TrainerRegistrationForm | Owner new-person pages | Refactor shared enrollment state machine/shell | Person-specific fields; immutable retry intent, existing-identity consent, one-time credential, copy/manual fallback, delivery version/ack, private password handling |
| EnrollmentConsent forms | Private subject pages | Reuse/refactor common credential-confirm flow | Identity/operation/gym-specific accept/decline, return-path continuity, subject password never available to owner |
| MemberLifecycleForm / TrainerLifecycleForm | Owner profiles | Refactor shared lifecycle pattern | Different target statuses, required reason/ack, future-session effects, immutable recovery/version/key; no deletion implication |
| SessionPackPanel | Member profile | Reuse | Four ledger balances, exclusive expiry, exact agreed value/no-payment meaning, current currency/status gating |
| TrainerShiftForm | Owner trainer profile | Reuse | Explicit overnight, duration bounds, version conflict and future-confirmation snapshot semantics |
| OwnerSessionBookingForm / SessionRequestForm | Owner direct booking/member pending request | Refactor shared slot input only | Distinct instant-confirmed vs pending/credit-held semantics; gym-local date/DST/duration/type/note; remote options; keep role-specific commands |
| SessionRequestDecisionForm | Schedule and Hire Requests | Reuse; consolidate card layouts | Assigned trainer, expected version/key, optional decline message, acceptance holds credit; no arbitrary trainer assignment |
| Workout/MealPlanBuilder | Trainer client plan creation | Reuse domain fields; refactor repeater/drafts |1–100 rows, ordered persistence, explicit assignment, bounds/null vs zero/key; remove implicit prescription defaults; no unsupported update/delete |
| Finance Expense/Budget/Payroll forms | Financial tabs | Reuse exact contracts; refactor review/state | Money/currency/period scope, version/key, unknown outcomes, no payment/payout; payroll review and visible pagination |
| OwnerGymConfiguration | Five tabs/saved settings | Refactor unit-aware forms | Independent master/tenant versions, blank fallback vs zero, snapshots, read-only currency/zone, fix exact ratio conversion/read precision |
| Registry / Provisioning / Lifecycle / Support summary | Platform | Reuse scope/state boundaries, refactor readable hierarchy | Cached freshness/null counts, bounded pagination, reasoned support/expiry, durable operation recovery/handoff; missing consent/worker dependencies explicit |
| NotificationsBell | Tenant header | Refactor accessible popover/history strategy | Recipient/gym/identity keys, visible20s polling, snapshot read-all, stale values, safe deep-link mapping, cleanup/dismiss/focus |
| GymLogo | Only unmounted GymRolePage | Reuse fallback after deliberate mounting | HTTPS URL, reserved aspect/geometry, safe initials and load failure; no promise of upload |
| ChartFrame | Exported generic frame; domain charts bypass | Reuse frame idea, consolidate chart alternatives | Title/method/range/data table/empty state; use current values, no fabricated trend |
| GymRolePage / landing CSS | Unmounted legacy placeholder / leftover styles | Retire after implementation dependency check | Not current role functionality; do not reintroduce “No tools yet” in place of real trainer/member pages |
| UiTestHarness | Flag-gated synthetic primitives | Keep test-only | No business feature claim or navigation entry |

## Concrete duplication/dependency evidence

- CSS duplicates token values from `classic.ts`, general `.ui-*` styles and later `.owner-dashboard`/`.trainer-dashboard`/`.member-dashboard` overrides; some rules use `!important`. Shared primary behavior mixes with raw Unicode and SVG icons. [apps/web/src/app/globals.css:1](../../apps/web/src/app/globals.css#L1), [packages/theme-tokens/src/classic.ts:1](../../packages/theme-tokens/src/classic.ts#L1).
- Member/trainer registration, consent and lifecycle forms each manage similar action/error/pending/recovery/handoff state. Trainer imports credential actions from member-actions; sharing should reflect enrollment rather than a misleading member-only domain name. [apps/web/src/components/trainers/trainer-registration-form.tsx:5](../../apps/web/src/components/trainers/trainer-registration-form.tsx#L5), [apps/web/src/components/members/member-registration-form.tsx:1](../../apps/web/src/components/members/member-registration-form.tsx#L1).
- Page components repeat context→theme→CSS vars→shell; API requests mostly repeat token/fetch/parse/status handling. The reusable `packages/api-client` exists but web has no dependency on it in its package manifest. A shared loader/transport is useful only if it retains redirects, unknown-outcome and scope semantics. [apps/web/src/lib/gym-context.ts:1](../../apps/web/src/lib/gym-context.ts#L1), [packages/api-client/src/index.ts:1](../../packages/api-client/src/index.ts#L1), [apps/web/package.json:1](../../apps/web/package.json#L1).
- Hand-built pagers exist for members/trainers/clients/sessions/earnings/audit/plans, while generic DataTable paginates only in-memory data; finance lacks controls despite server pages. Establish one remote-pagination contract instead of wrapping partial data as complete. [apps/web/src/components/ui/data-table.tsx:1](../../apps/web/src/components/ui/data-table.tsx#L1), [apps/web/src/app/gyms/[slug]/owner/financials/page.tsx:1](../../apps/web/src/app/gyms/[slug]/owner/financials/page.tsx#L1).

## Missing shared pieces worth designing

A namespaced page/header/metric system; domain status-label registry; server-paged directory/table toolbar; remote person selector; gym-local date/time/DST input; exact decimal money/percentage controls; reusable operation/retry/repair state panel; enrollment/credential handoff component; consequential quote review dialog; error summary with field focus; partial/stale data banner; bounded history preview with authorized browse link; accessible popover; reusable repeatable-field group with full draft state. These are recommendations, not existing components or extra backend capabilities.

## Refactor constraints

Keep contracts/services/state machines authoritative. Avoid moving secrets into generic form drafts, localStorage or browser logs. Do not convert server-scoped role/tenant queries to unbounded client-side datasets. Preserve safe operation replay, signed quote acknowledgment, exclusive dates and financial snapshots. Review product scope separately before adding billing, attendance, permanent trainer assignment, editing/deleting coaching plans or configurable roles.
