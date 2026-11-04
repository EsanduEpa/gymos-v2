# User journeys

Audit date: 5 November 2026 (Asia/Colombo). Scope: current `gymos-v2` working tree. Discovery only; implementation status means source-connected, not a fresh runtime certification.

## Reading these journeys

Steps are **major user interactions**, not field keystrokes or timed performance measurements. Counts exclude password typing, server retries and waiting for another person unless stated. Screen IDs refer to file02; features to file03. Outcomes are reconstructed from source and were not replayed against a live database. Empty/error/loading/pending variants must remain part of every future design.

## J01 — Sign in, select workspace and change first password

Start S03. (1) Enter email/password and Sign in. (2, conditional) If issued a temporary credential, enter current/new/confirm on S04 and submit; (3) Continue to sign in; (4) sign in with new password. (5, conditional) choose gym on S06. Standard one-gym existing-account path is1 interaction; first-login one-gym path4; chooser adds1. Owner reaches S10, trainer currently S31, member redirects S32→S33; admin S02, no active links S05.

Required: authorized account, unexpired credential, available API; new password requirements in F02. Invalid/rate/unavailable feedback stays at login. Missing/expired token redirects; password requirement blocks operations. No password reset or automatic session renewal exists. Journey issue: trainer login destination differs from `/trainer` schedule destination. Evidence: [apps/web/src/app/actions.ts:22](../../apps/web/src/app/actions.ts#L22), [apps/web/src/lib/gymos.ts:34](../../apps/web/src/lib/gymos.ts#L34), [apps/web/src/components/credentials/change-password-form.tsx:1](../../apps/web/src/components/credentials/change-password-form.tsx#L1).

## J02 — Switch gym and sign out

Start any authorized shell with multiple links. (1) Switch gym; (2) choose gym/role. Full document navigation drops role/router state; server checks the selected gym again. A missing role/link after refresh returns to resolver or denial. Switch is2 interactions, sign-out1. The browser hides sensitive content while exiting; other tabs receive logout/support broadcasts. If revocation fails, browser state is cleared and login displays uncertain cross-device sign-out. No client-selected gym ID authorizes a backend request. [apps/web/src/components/navigation/dashboard-chrome.tsx:75](../../apps/web/src/components/navigation/dashboard-chrome.tsx#L75), [apps/web/src/components/navigation/session-lifecycle.tsx:1](../../apps/web/src/components/navigation/session-lifecycle.tsx#L1), [apps/web/src/app/actions.ts:66](../../apps/web/src/app/actions.ts#L66).

## J03 — Owner adds a new member and initial membership

Start S11. (1) Register New Member→S12; (2) enter name/email/phone/DOB, optional emergency/health and an active plan, submit; (3) copy/securely record one-time temporary password; (4) acknowledge/continue→S13. Four interactions, or3 with manual credential recording and combined acknowledgment. Registration writes agreed term and access, **no cash payment**.

Requires owner/active gym/configured currency+zone/active plan and complete valid profile. Empty-plan state blocks registration and needs S21→plans first (add2–3 interactions). Backend publication can be pending, completed without replayable secret or unavailable. Same unchanged key resolves uncertain results; new identity gets24h forced-change credential. Copy failure permits manual selection; acknowledgment error does not imply failed enrollment; replacement revokes lost credential. [apps/web/src/components/members/member-registration-form.tsx:1](../../apps/web/src/components/members/member-registration-form.tsx#L1), [apps/api/src/member-enrollment.service.ts:1](../../apps/api/src/member-enrollment.service.ts#L1).

## J04 — Existing identity consents to member/trainer enrollment

Start S12 or S15 after original submit reports PENDING. (1) Owner shares private consent path/reference; (2) intended person opens S08/S09, signs in if needed; (3) enters own current password and accepts/declines; (4) owner retries original unchanged registration form to finish; (5) owner opens profile/workspace. Approximately4–5 interactions plus login, across two actors. No new password is issued or overwritten for existing identity.

Proof must match intended identity/gym/role/operation/current authVersion and expiry. Acceptance records consent, not completed enrollment; decline prevents linking through that request. Current login ignores supplied returnTo, so a signed-out recipient must reopen the private link. There is no owner-side automatic consent notification or completed-work handoff page. [apps/web/src/app/gyms/[slug]/enrollment-consent/[operationId]/page.tsx:1](../../apps/web/src/app/gyms/[slug]/enrollment-consent/[operationId]/page.tsx#L1), [apps/web/src/app/gyms/[slug]/trainer-enrollment-consent/[operationId]/page.tsx:1](../../apps/web/src/app/gyms/[slug]/trainer-enrollment-consent/[operationId]/page.tsx#L1), [apps/web/src/app/member-actions.ts:20](../../apps/web/src/app/member-actions.ts#L20).

## J05 — View member history, issue PT pack, manage status

Start S11. (1) View Profile→S13; (2) Membership & Packs; (3) enter credits/validity/price/currency and Issue pack. Three interactions; confirmed success shows entitlement balances, not payment. Requires ACTIVE member/current currency; ledger allocation is backend-owned. Membership terms page with Previous/Next under #history. Attendance History is1 extra tab interaction but is **partial**: source always supplies empty sessions, so it cannot currently verify actual PT history.

Status variation: profile Overview→choose different status, reason and required consequence acknowledgment→submit (2 major interactions from profile). Future pending/confirmed sessions cancel and held credits release; active/past sessions remain; reactivation does not recreate appointments. Unknown/pending status exposes original operation and Resume. [apps/web/src/components/members/member-profile-tabs.tsx:1](../../apps/web/src/components/members/member-profile-tabs.tsx#L1), [apps/web/src/components/members/session-pack-panel.tsx:1](../../apps/web/src/components/members/session-pack-panel.tsx#L1), [apps/web/src/components/members/member-lifecycle-form.tsx:1](../../apps/web/src/components/members/member-lifecycle-form.tsx#L1).

## J06 — Renew membership / collect payment / manage general attendance

**Renew: backend-only, no end-to-end UI journey.** Available API requires owner, active plan/member, current version/key and IMMEDIATE/NEXT_AVAILABLE policy. It creates a snapshot term starting today or latest available end; immediate overlap is rejected. No renewal form in S13 or S21. **Collect payment: Not Implemented. General gym attendance/check-in: Not Implemented.** Do not replace those gaps with invented buttons or conclude PT record counts prove physical presence. [apps/api/src/configuration.controller.ts:170](../../apps/api/src/configuration.controller.ts#L170), [apps/api/src/dashboard/dashboard.service.ts:71](../../apps/api/src/dashboard/dashboard.service.ts#L71).

## J07 — Owner registers trainer and approves shift

Start S14. (1) Add New Trainer→S15; (2) submit required name/email/phone/level plus optional experience/specialisations/paired shift/bio; (3) copy/record credential; (4) acknowledge→S10. Four interactions, existing identity branches through J04. User must later navigate S14→S16 to reach the new profile (1–2 more interactions).

Shift adjustment: open S16, enter start/end and overnight selection, Approve (1 interaction after page entry). Valid recurring duration15min–16h; version conflict requires refresh. Applies to future confirmations, not historic compensation. Trainer deactivation/reactivation: enter reason, confirm effects, submit; future pending/confirmed sessions release holds, active/history remain; interrupted operation can resume. [apps/web/src/components/trainers/trainer-registration-form.tsx:1](../../apps/web/src/components/trainers/trainer-registration-form.tsx#L1), [apps/web/src/components/trainers/trainer-shift-form.tsx:1](../../apps/web/src/components/trainers/trainer-shift-form.tsx#L1), [apps/web/src/components/trainers/trainer-lifecycle-form.tsx:1](../../apps/web/src/components/trainers/trainer-lifecycle-form.tsx#L1).

## J08 — Owner directly books PT

Start S17. (1) Book PT Session→S18; (2) choose member/trainer/type/date/time/duration/optional note/offset and Confirm and book; (3) Open session oversight. Three interactions after prerequisites. Must have operational participants, selected-date active membership and unheld pack credit, valid slot≤365days/duration/current policy; backend checks collisions and prices and holds one allocated credit. Result is SCHEDULED with notification.

No eligible member/trainer state blocks submission. Changed slot/options/version or invalid eligibility gives conflict/error. Uncertain result must retry same key/intent. Limits: selectors first 100 without visible paging/search; date changes leave eligibility stale until submit. Success URL supplies created session but calendar does not highlight it. [apps/web/src/components/sessions/owner-session-booking-form.tsx:1](../../apps/web/src/components/sessions/owner-session-booking-form.tsx#L1), [apps/api/src/sessions/booking.service.ts:1](../../apps/api/src/sessions/booking.service.ts#L1).

## J09 — Member requests trainer; trainer accepts/declines

Member starts S33. (1) Search optionally; (2) Request session→S34; (3) enter date/time/type/duration/note and submit; (4) View your sessions→S35. Three mandatory interactions; search adds1. Request stays PENDING_CONFIRMATION with credit available. Today’s no-membership/no-credit notice does not prevent eligible future selected dates.

Trainer opens S26 or sees pending cards in S25. (1) Review; (2) Accept and reserve one credit or supply optional decline message and Decline (one decision interaction). Acceptance revalidates current policy/slot/participants/selected-day membership/pack and holds credit; decline→DECLINED with member-readable message. Member receives in-app notice and checks S35. Missing/expired current role or time/credit collision produces error, not false success. No automatic email/SMS or permanent assignment UI. [apps/web/src/components/sessions/session-request-forms.tsx:1](../../apps/web/src/components/sessions/session-request-forms.tsx#L1), [apps/api/src/sessions/session-requests.service.ts:225](../../apps/api/src/sessions/session-requests.service.ts#L225).

## J10 — Trainer starts, completes and annotates PT

Start S25 matching own scheduled appointment. (1) Start session; server allows from15min before scheduled start through scheduled end, requires held credit and no simultaneous active trainer session. ACTIVE card shows elapsed time. Wait minimum **booked policy** duration. (2) Complete; (3) accept native confirmation. Backend consumes hold, creates completed settlement/operational earning/pay record (or correction if source payroll already closed), advances COMPLETED and notifies. (4) Edit Notes disclosure; (5) enter member-visible notes≤4000 and Save. Five interactions; notes are editable **only after completion**, not during ACTIVE.

Current session version/key, actor/access and stored compensation/policy checked. Premature complete, invalid state, stale version or missing hold fails. Retry same key when outcome unknown. Notes/completion forms may remount on version/reload; automatic30s/focus reload can discard drafts. Owner lifecycle API exists but owner view does not mount equivalent execution controls. [apps/api/src/sessions/session-state.ts:25](../../apps/api/src/sessions/session-state.ts#L25), [apps/api/src/sessions/session-lifecycle.service.ts:473](../../apps/api/src/sessions/session-lifecycle.service.ts#L473), [apps/web/src/components/sessions/session-lifecycle-controls.tsx:1](../../apps/web/src/components/sessions/session-lifecycle-controls.tsx#L1).

## J11 — Cancel/withdraw PT or mark no-show

Start own/member/owner session list. (1) Cancel session/Withdraw request/Mark no-show; (2) review freshly loaded server quote; (3, if required) acknowledge consequence; (4) confirm. Two mandatory interactions plus checkbox; review is counted as decision context, not a click. Close cancels UI without mutation.

Pending member withdrawal uses no credit. Scheduled free cancellation at/before cutoff releases hold; late deduction follows stored booking policy and signed acknowledgment. No-show only owner/assigned trainer, scheduled/unstarted at start+15min; always consumes held credit. Server quote expires in2min, bound to actor/gym/session version/policy/action/consequence/value; stale quote requires review again. This changes entitlements/operational earning, not cash refunds. Terminal states do not offer arbitrary reversal. [apps/api/src/sessions/session-lifecycle.service.ts:21](../../apps/api/src/sessions/session-lifecycle.service.ts#L21), [apps/web/src/components/sessions/read-views/session-policy-controls.tsx:1](../../apps/web/src/components/sessions/read-views/session-policy-controls.tsx#L1).

## J12 — Trainer accesses client and creates coaching

Start S27. (1) Search optional; (2) View360° Profile→S28; (3) Create workout/meal link→S29/S30 with memberId; (4) enter title and1–100 rows, add/remove as needed; (5) Save and assign. Three mandatory route/save interactions after roster entry, plus each added/removed row. Workout success links back to profile; meal builder only displays success. Both commands assign explicitly to chosen client.

Client must be active/published with ACTIVE, future confirmed or completed-within90days relationship; server rechecks on save/replay. Workout sets/reps/kg/duration/notes and meal weekday/type/food/macros limits are in file02. Zero and blank differ. Access loss/relationship expiry/validation/version/key conflicts or uncertain save produce feedback. No edit/delete/reorder or performance entry. Workout defaults are populated examples; replace with clearly intentional starter workflow in redesign. [apps/api/src/coaching/coaching.service.ts:34](../../apps/api/src/coaching/coaching.service.ts#L34), [apps/web/src/components/coaching/workout-plan-builder.tsx:1](../../apps/web/src/components/coaching/workout-plan-builder.tsx#L1), [apps/web/src/components/coaching/meal-plan-builder.tsx:1](../../apps/web/src/components/coaching/meal-plan-builder.tsx#L1).

## J13 — Member reads plans and calendar

Start tenant sidebar. (1) Workout plans or Meal plans→S37/S38; (2, optional) next/previous20-plan page. Read-only; no workout complete, adherence tracking or body-metric progress. Calendar variation: (1) Calendar→S36; (2) select day; (3, optional) previous/next month. Selected-day PT and meal entries are gym-local; all loaded meal-plan weekdays repeat. Large month shows truncation, with My PT Sessions for complete paginated history.

Requires own active actor; load failure is distinct from empty assignment; meal failure leaves PT available. No effective plan dates/current plan selection exists. A member membership-status page and self-service renewal are not implemented. [apps/web/src/app/gyms/[slug]/member/workout-plans/page.tsx:1](../../apps/web/src/app/gyms/[slug]/member/workout-plans/page.tsx#L1), [apps/web/src/app/gyms/[slug]/member/meal-plans/page.tsx:1](../../apps/web/src/app/gyms/[slug]/member/meal-plans/page.tsx#L1), [apps/web/src/components/sessions/member-session-calendar.tsx:1](../../apps/web/src/components/sessions/member-session-calendar.tsx#L1).

## J14 — Owner logs expense and sets budget

Start S19. (1) Log Expense selects Expenses tab; (2) enter category/amount/accounting date/description/optional recurring note and Save. Two interactions. Currency fixed to gym; date cannot exceed gym today; recurring is descriptive only. Exact decimal input and stable command key. Failed/unknown results remain explicit; expense form retains draft.

Budget variation: (1) select Expenses; (2) set/update amount for category and submit. Month is derived from URL/current window, with no visible month picker; this is a usability gap. Expected existing budget version or null required; changed version needs refresh. Compare actual/variance/utilization and totals; avoid interpreting salary expense twice in P&L. [apps/web/src/components/finance/finance-forms.tsx:12](../../apps/web/src/components/finance/finance-forms.tsx#L12), [apps/api/src/finance/finance.service.ts:420](../../apps/api/src/finance/finance.service.ts#L420).

## J15 — Owner reviews revenue, P&L, payroll and exports

Start S19. Revenue/Deferred/P&L: (1) choose tab; (2) apply date window; inspect full-window results. All figures are operational, not money received. Revenue/expense page parameter exists without visible pagination controls. Payroll: (1) Payroll tab; (2) Close OPEN period; (3) Approve CLOSED period after reviewing total. Three interactions, no payout. Expected version/total protects approval; completed sessions after closed source periods may add correction to an open later period, preserving source history.

Export: (1) Export tab; (2) choose kind/dates/audit scope and Download CSV; returns file or explicit error. Max5000 rows; audit only chosen page. S22 audit shortcut is1 export click after filtering. Source-window failures must not be replaced with zero/partial sums. CSV export itself has an audit side effect. [apps/api/src/finance/payroll.service.ts:98](../../apps/api/src/finance/payroll.service.ts#L98), [apps/api/src/finance/finance.service.ts:67](../../apps/api/src/finance/finance.service.ts#L67), [apps/web/src/app/gyms/[slug]/owner/financials/page.tsx:1](../../apps/web/src/app/gyms/[slug]/owner/financials/page.tsx#L1).

## J16 — Trainer reviews earnings

Start S31 via login/sidebar. (1) choose month and Apply; (2, optional) page records. Inspect total/count/average/current payroll state; no payout action. Own trainer projection only. Current page tries owner-only configuration and falls back to UTC; default month also UTC, requiring correction for gym-local reporting. No earnings in period differs from dependency unavailable. [apps/web/src/app/gyms/[slug]/trainer/earnings/page.tsx:1](../../apps/web/src/app/gyms/[slug]/trainer/earnings/page.tsx#L1), [apps/api/src/finance/finance.service.ts:450](../../apps/api/src/finance/finance.service.ts#L450).

## J17 — Owner configures gym, plans and policy

Start S21. (1) choose one of five tabs; (2) edit that form and Save; Add plan adds an extra reveal action. Profile contains three independently saved versioned resources: contact/cadence, public name, appearance. Other tabs cover fees, pay percentages and cancellation window/minimum duration/late deduction. Blank fallback and zero must remain distinct. Currency/timezone are read-only and not editable via current contract. Past sessions/terms retain saved snapshots. Current fractional-percent conversion is defective; do not carry that math into redesigned controls. [apps/web/src/components/configuration/owner-gym-configuration.tsx:1](../../apps/web/src/components/configuration/owner-gym-configuration.tsx#L1), [apps/api/src/configuration.controller.ts:87](../../apps/api/src/configuration.controller.ts#L87).

## J18 — Super admin provisions and hands off gym

Start S02. (1) fill name/slug/owner email/LKR or USD/IANA timezone and Create; (2) refresh operation until stable; (3) obtain owner credential when available; (4) privately deliver and acknowledge. Four major interactions plus repeated status checks/worker wait. Existing owner instead requires private consent via API; **no web consent journey exists**. Gym becomes operational only after durable verification; current HTTP app does not prove continuously running worker execution.

Slug/key conflict→retain original key/details; retryable→Retry operation; repair-required→controlled operator review outside normal UI. Lost/expired unacknowledged credential replacement requires confirmation; replay does not recover secret. No SaaS subscription purchase step exists. [apps/web/src/components/platform/provisioning-form.tsx:1](../../apps/web/src/components/platform/provisioning-form.tsx#L1), [apps/api/src/platform/provisioning-worker.ts:1](../../apps/api/src/platform/provisioning-worker.ts#L1), [apps/web/src/components/platform/registry.tsx:27](../../apps/web/src/components/platform/registry.tsx#L27).

## J19 — Platform support and gym lifecycle

Support: S02 (1) View dashboard selects row; (2) choose reason code/explanation and Enter support; (3) inspect S10 summary; (4) Exit support→registry. Three action clicks plus review. Session15m, fixed summary scope, no private roster/finance/mutation; new support context replaces prior. Error/expiry returns to registry via Exit. Current button label hides the selection-and-reason intermediate step.

Lifecycle: S02 (1) Suspend/Reactivate; (2) supply reason10–500 and Confirm. Two actions. Suspension drains ordinary tenant access but preserves records; reactivation verifies prerequisites. Interrupted intent retains operation reference/Resume; unknown outcome must not be treated as a completed transition. [apps/web/src/components/platform/lifecycle-control.tsx:1](../../apps/web/src/components/platform/lifecycle-control.tsx#L1), [apps/api/src/platform/support-session.service.ts:1](../../apps/api/src/platform/support-session.service.ts#L1), [apps/api/src/platform/gym-lifecycle.service.ts:1](../../apps/api/src/platform/gym-lifecycle.service.ts#L1).

## J20 — Read and manage notifications

Any operational tenant header: (1) bell opens latest 5; (2) open mapped destination or Mark read/Mark all read; Close/Refresh optional. No dedicated inbox or older-history paging exists. Mark-all is bounded through fetched asOf and must not mark later arrivals accidentally. Request/read failures retain last-known list with stale warning. Support/platform has no bell. [apps/web/src/components/navigation/notifications-bell.tsx:1](../../apps/web/src/components/navigation/notifications-bell.tsx#L1), [apps/api/src/notifications.controller.ts:66](../../apps/api/src/notifications.controller.ts#L66).

## Journey coverage not to invent

General attendance, payment collection/refund/receipt, SaaS subscription changes, payouts, trainer manual assignment, class creation, workout completion/progress, member self-registration, ratings and password reset have **no implemented end-to-end journey** in current V2. Backend renewal and existing-owner consent are partial journeys requiring explicit additional UI scope. A premium visual redesign must preserve operational state, privacy, quote acknowledgment and retry semantics before extending scope.
