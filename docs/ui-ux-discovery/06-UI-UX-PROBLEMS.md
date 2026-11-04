# UI/UX problems and priorities

Audit date: 5 November 2026 (Asia/Colombo). Scope: current `gymos-v2` working tree. Discovery only; implementation status means source-connected, not a fresh runtime certification.

## Basis, severity and priority

This is an evidence-based source audit, supplemented by two saved V2 registry screenshots. **No Critical issue is claimed:** this audit did not demonstrate cross-tenant exposure, destructive data loss or a production outage. High = blocks common workflows or risks materially incorrect interpretation/financial settings; Medium = meaningful confusion, discoverability, accessibility or continuity problem; Low = localized consistency/efficiency opportunity. Priorities do not certify production exploitability. All recommendations are future work, not implemented fixes.

| ID | Severity | Affected screen/component | Finding |
|---|---|---|---|
| UX01 | High | S17 owner session list | Shared session links, retry/refresh hrefs, filters and monthly member drilldown omit view=list |
| UX02 | High | S13 Attendance History | Member detail returns recentSessions: [] unconditionally; profile renders it as no sessions recorded |
| UX03 | High | S21 trainer compensation | percentToRatio strips leading zero digits before positioning decimal by original whole length |
| UX04 | High | S14 owner trainer search | list where object sets OR to published bindings, then spreads q-specific OR at the same property, overwriting the binding restriction |
| UX05 | High | S31 trainer earnings | Page fetches GET configuration for timezone, but ConfigurationController |
| UX06 | High | S25/S35 session views and notes | SessionReadRefresh reloads entire visible page every30s and on regained focus |
| UX07 | High | S12/S15 consent and S03 login | Consent pages redirect signed-out people to /login?returnTo= |
| UX08 | High | S02 existing-owner provisioning | Owner consent endpoint exists, but there is no matching page/form/action/navigation in current web |
| UX09 | High | S19 revenue/expenses | Backend and page support page/pageSize and total counts, but neither revenue line list nor expense list renders next/previous navigation |
| UX10 | High | S18 owner booking | Option reads force memberPage1/trainerPage1 with100 rows |
| UX11 | High | S10 dashboard metric labels and finance | Members in Gym is active PT-session count; Trainers on Floor is trainers scheduled today, not presence |
| UX12 | Medium | S20 analytics selector | 30d/6m changes reported range metadata, but utilization always uses trailing30+future365, peak always trailing30, growth always6months |
| UX13 | Medium | S13 membership lifecycle | Renewal/eligibility API exists, but no renewal form/action/button is connected to member profile or configuration |
| UX14 | Medium | S21 theme and tenant shell | Logo URL can be saved, but current DashboardChrome never renders GymLogo |
| UX15 | Medium | S28 trainer client section navigation | Anchors use tablist/tab/tabpanel roles while all sections display and no aria-selected/roving focus or tab keyboard handler is implemented |
| UX16 | Medium | Global muted text/metadata | Muted #8B8E98 used for ordinary small text on white/page/muted surfaces |
| UX17 | Medium | S29 workout builder | New plan initially contains Bench Press4×10×60kg and Incline DB Flyes3×12×16kg as actual controlled values |
| UX18 | Medium | S36 meal activity and S38 totals | Calendar repeats weekday entries from all loaded plans on any matching month date; no effective/current plan dates |
| UX19 | Medium | S28/S16 bounded history | Trainer client profile shows latest 2 plans/latest 10 sessions with hasMore text but no older-plan/history link; owner trainer profile latest 10 likewise no pager |
| UX20 | Medium | S22 audit coverage | Audit read allow-list includes MEMBER_SESSION_PACK_ISSUED while pack controller emits SESSION_PACK_ISSUED |
| UX21 | Medium | S19/S25 error states | Finance configuration failure returns bare main without shell |
| UX22 | Medium | Shared notifications | Only latest 5 rendered, no inbox/history link; popover has Close button but no Escape/outside-click/focus restoration behavior |
| UX23 | Medium | S02 provisioning form | Provisioning fields are uncontrolled, submission action can reset them, and successful operation makes inputs readOnly |
| UX24 | Low | S02 registry mobile hierarchy | Saved320px registry screenshot stacks overview, registry cards and five-field creation form into a long page |
| UX25 | Low | Global UI consistency | Custom form controls/headers/metrics/tables coexist with shared primitives; enum badge text and display labels vary; native completion confirmation differs from shared dialogs |
| UX26 | Medium | S21 decimal rate contract boundary | Update controller accepts ratio values up to6 decimals, but gymConfigurationSchema uses moneyAmountSchema(max4 decimal fraction) for rate fields |

## UX01 — High — S17 owner session list

**Problem:** Shared session links, retry/refresh hrefs, filters and monthly member drilldown omit view=list. Owner page defaults to calendar whenever view is absent, so day/month/filter/paging interactions leave the intended list.

**Evidence:** [apps/web/src/app/gyms/[slug]/owner/sessions/page.tsx:20](../../apps/web/src/app/gyms/[slug]/owner/sessions/page.tsx#L20), [apps/web/src/components/sessions/read-views/session-read-view.tsx:46](../../apps/web/src/components/sessions/read-views/session-read-view.tsx#L46), [apps/web/src/components/sessions/read-views/owner-month-overview.tsx:8](../../apps/web/src/components/sessions/read-views/owner-month-overview.tsx#L8)

**User impact:** Owners lose filters/list context and cannot reliably browse history or monthly member drilldowns.

**Suggested improvement:** Centralize role-aware URL building and preserve view=list in every owner list link and GET form; verify all transitions including policy refresh.

**Confidence/verification:** Confirmed source behavior; not runtime replayed.

## UX02 — High — S13 Attendance History

**Problem:** Member detail returns recentSessions: [] unconditionally; profile renders it as no sessions recorded. Separate owner recent-sessions endpoint is never fetched here.

**Evidence:** [apps/api/src/gyms.controller.ts:325](../../apps/api/src/gyms.controller.ts#L325), [apps/web/src/components/members/member-profile-tabs.tsx:28](../../apps/web/src/components/members/member-profile-tabs.tsx#L28), [apps/api/src/sessions/session-reads.controller.ts:30](../../apps/api/src/sessions/session-reads.controller.ts#L30)

**User impact:** False absence of history can mislead owners and duplicate investigation; “attendance” also implies unsupported physical check-ins.

**Suggested improvement:** Connect authorized PT history with loading/error/empty and total/truncation; name it PT history unless actual attendance is built.

**Confidence/verification:** Confirmed source behavior; not runtime replayed.

## UX03 — High — S21 trainer compensation

**Problem:** percentToRatio strips leading zero digits before positioning decimal by original whole length. Input0.5 (%) computes0.05 (ratio), representing5% rather than0.5%.

**Evidence:** [apps/web/src/components/configuration/owner-gym-configuration.tsx:23](../../apps/web/src/components/configuration/owner-gym-configuration.tsx#L23)

**User impact:** Fractional rates below1% can save a materially different compensation setting. A read-only execution of the extracted conversion function with synthetic input confirmed this result; no account data used.

**Suggested improvement:** Use exact decimal-string percent conversion; review displayed round-trip values and boundary inputs before confirming money-affecting settings.

**Confidence/verification:** Confirmed source and read-only synthetic function execution; no application/database mutation.

## UX04 — High — S14 owner trainer search

**Problem:** list where object sets OR to published bindings, then spreads q-specific OR at the same property, overwriting the binding restriction.

**Evidence:** [apps/api/src/trainers.controller.ts:57](../../apps/api/src/trainers.controller.ts#L57)

**User impact:** Owner search can include tenant COMPLETE trainer rows without the same verified publication restriction used in unsearched roster; this is a backend correctness/privacy-boundary concern, not demonstrated cross-tenant access.

**Suggested improvement:** Combine publication and search as AND clauses and verify unpublished/foreign actor cases. A UI visibility filter cannot repair the backend predicate.

**Confidence/verification:** Confirmed source behavior; not runtime replayed.

## UX05 — High — S31 trainer earnings

**Problem:** Page fetches GET configuration for timezone, but ConfigurationController.read requires OWNER. Trainer silently falls back to UTC; default month also uses UTC.

**Evidence:** [apps/web/src/app/gyms/[slug]/trainer/earnings/page.tsx:39](../../apps/web/src/app/gyms/[slug]/trainer/earnings/page.tsx#L39), [apps/api/src/configuration.controller.ts:71](../../apps/api/src/configuration.controller.ts#L71), [apps/web/src/app/gyms/[slug]/trainer/earnings/page.tsx:9](../../apps/web/src/app/gyms/[slug]/trainer/earnings/page.tsx#L9)

**User impact:** Earnings timestamps/month defaults can disagree with gym-local sessions and finance, especially around day/month boundary.

**Suggested improvement:** Provide an authorized timezone field/projection in earnings or own context; derive month from gym-local server clock. Keep owner configuration private.

**Confidence/verification:** Confirmed source behavior; not runtime replayed.

## UX06 — High — S25/S35 session views and notes

**Problem:** SessionReadRefresh reloads entire visible page every30s and on regained focus. Notes are local state; forms reset/remount on lifecycle version changes.

**Evidence:** [apps/web/src/components/sessions/read-views/session-read-refresh.tsx:15](../../apps/web/src/components/sessions/read-views/session-read-refresh.tsx#L15), [apps/web/src/components/sessions/session-lifecycle-controls.tsx:31](../../apps/web/src/components/sessions/session-lifecycle-controls.tsx#L31)

**User impact:** Unsubmitted notes, filters or quote acknowledgment can be interrupted/lost. Severity is based on source mechanism; frequency not measured.

**Suggested improvement:** Refresh read projections without replacing active editors; preserve bounded nonsecret drafts, defer refresh during editing/modal commands, visibly mark freshness.

**Confidence/verification:** Confirmed source behavior; not runtime replayed.

## UX07 — High — S12/S15 consent and S03 login

**Problem:** Consent pages redirect signed-out people to /login?returnTo=..., but login/action does not accept or validate/use returnTo.

**Evidence:** [apps/web/src/app/gyms/[slug]/enrollment-consent/[operationId]/page.tsx:11](../../apps/web/src/app/gyms/[slug]/enrollment-consent/[operationId]/page.tsx#L11), [apps/web/src/app/gyms/[slug]/trainer-enrollment-consent/[operationId]/page.tsx:10](../../apps/web/src/app/gyms/[slug]/trainer-enrollment-consent/[operationId]/page.tsx#L10), [apps/web/src/app/actions.ts:22](../../apps/web/src/app/actions.ts#L22)

**User impact:** Recipient reaches unrelated landing after sign-in and must reopen a private link; enrollment depends on manual cross-person recovery.

**Suggested improvement:** Preserve only validated same-app consent destinations through login/password change, reauthorize final operation, explain owner-resume step.

**Confidence/verification:** Confirmed source behavior; not runtime replayed.

## UX08 — High — S02 existing-owner provisioning

**Problem:** Owner consent endpoint exists, but there is no matching page/form/action/navigation in current web. Provisioning only warns that owner must privately approve.

**Evidence:** [apps/api/src/platform/provisioning-owner.controller.ts:11](../../apps/api/src/platform/provisioning-owner.controller.ts#L11), [apps/web/src/components/platform/provisioning-form.tsx:43](../../apps/web/src/components/platform/provisioning-form.tsx#L43)

**User impact:** An existing identity owner cannot complete normal web onboarding unaided; successful creation also depends on externally run worker.

**Suggested improvement:** Design subject-specific consent and resumable status handoff; document worker ownership/deployment before promising an instant create-gym experience.

**Confidence/verification:** Confirmed source behavior; not runtime replayed.

## UX09 — High — S19 revenue/expenses

**Problem:** Backend and page support page/pageSize and total counts, but neither revenue line list nor expense list renders next/previous navigation.

**Evidence:** [apps/web/src/app/gyms/[slug]/owner/financials/page.tsx:83](../../apps/web/src/app/gyms/[slug]/owner/financials/page.tsx#L83), [apps/web/src/app/gyms/[slug]/owner/financials/page.tsx:104](../../apps/web/src/app/gyms/[slug]/owner/financials/page.tsx#L104), [apps/api/src/finance/finance.service.ts:328](../../apps/api/src/finance/finance.service.ts#L328)

**User impact:** Records after first 25 can be hidden even when totals are full-window, obstructing reconciliation.

**Suggested improvement:** Add query-preserving server pagination, current range/total and filtered export scope; avoid client-paging only the loaded page.

**Confidence/verification:** Confirmed source behavior; not runtime replayed.

## UX10 — High — S18 owner booking

**Problem:** Option reads force memberPage1/trainerPage1 with100 rows. Form exposes no search/paging and does not reload dated eligibility when date changes.

**Evidence:** [apps/web/src/app/gyms/[slug]/owner/sessions/book/page.tsx:18](../../apps/web/src/app/gyms/[slug]/owner/sessions/book/page.tsx#L18), [apps/web/src/components/sessions/owner-session-booking-form.tsx:15](../../apps/web/src/components/sessions/owner-session-booking-form.tsx#L15)

**User impact:** Large gyms cannot select records beyond100; a member eligible on a future date can remain disabled based on initial date. API remains authoritative but UI prevents reaching valid actions.

**Suggested improvement:** Use remote paginated/searchable selectors and fetch option eligibility for chosen date; show loading/empty/error and preserve explicit selection.

**Confidence/verification:** Confirmed source behavior; not runtime replayed.

## UX11 — High — S10 dashboard metric labels and finance

**Problem:** Members in Gym is active PT-session count; Trainers on Floor is trainers scheduled today, not presence. Dashboard daily earnings query only RevenueRecord; finance also projects daily membership.

**Evidence:** [apps/api/src/dashboard/dashboard.service.ts:71](../../apps/api/src/dashboard/dashboard.service.ts#L71), [apps/api/src/dashboard/dashboard.service.ts:45](../../apps/api/src/dashboard/dashboard.service.ts#L45), [apps/api/src/finance/finance.service.ts:213](../../apps/api/src/finance/finance.service.ts#L213)

**User impact:** Owners may interpret proxy data as attendance or expect revenue totals to reconcile across screens. Tooltip definitions are insufficient for primary meaning.

**Suggested improvement:** Rename visible labels to actual session/scheduling/earning scope and show scope/date/method directly; reconcile formulas or explicitly separate PT earnings from total operational earning.

**Confidence/verification:** Confirmed source behavior; not runtime replayed.

## UX12 — Medium — S20 analytics selector

**Problem:** 30d/6m changes reported range metadata, but utilization always uses trailing30+future365, peak always trailing30, growth always6months. Utilization denominator is current shift×22 and cap100.

**Evidence:** [apps/api/src/analytics/analytics.service.ts:49](../../apps/api/src/analytics/analytics.service.ts#L49), [apps/api/src/analytics/analytics.service.ts:80](../../apps/api/src/analytics/analytics.service.ts#L80)

**User impact:** Window selection suggests a comparison not reflected in series; capacity estimate can hide overloaded future scheduling.

**Suggested improvement:** Give each series its actual range/method or implement coherent period filtering; label estimate and over-capacity values rather than silently capping interpretation.

**Confidence/verification:** Confirmed source behavior; not runtime replayed.

## UX13 — Medium — S13 membership lifecycle

**Problem:** Renewal/eligibility API exists, but no renewal form/action/button is connected to member profile or configuration.

**Evidence:** [apps/api/src/configuration.controller.ts:170](../../apps/api/src/configuration.controller.ts#L170), [apps/web/src/components/members/member-profile-tabs.tsx:1](../../apps/web/src/components/members/member-profile-tabs.tsx#L1)

**User impact:** Owner cannot renew membership from ordinary UI, disrupting retention/booking eligibility workflow.

**Suggested improvement:** If feature completion is in scope, add versioned renewal review with plan/start policy/exclusive end and agreed value, preserving no-payment semantics.

**Confidence/verification:** Confirmed source behavior; not runtime replayed.

## UX14 — Medium — S21 theme and tenant shell

**Problem:** Logo URL can be saved, but current DashboardChrome never renders GymLogo. Only unmounted role-page uses it. Most owner/trainer active navigation/button styles remain Classic primary.

**Evidence:** [apps/web/src/components/navigation/dashboard-chrome.tsx:49](../../apps/web/src/components/navigation/dashboard-chrome.tsx#L49), [apps/web/src/app/gyms/[slug]/role-page.tsx:5](../../apps/web/src/app/gyms/[slug]/role-page.tsx#L5), [apps/web/src/app/globals.css:323](../../apps/web/src/app/globals.css#L323)

**User impact:** Appearance settings imply visible brand changes that are incomplete/inconsistent across roles.

**Suggested improvement:** Define allowed tenant accent/logo surfaces; mount validated logo with fixed sizing/fallback; generate consistent brand aliases and keep semantic colors independent.

**Confidence/verification:** Confirmed source behavior; not runtime replayed.

## UX15 — Medium — S28 trainer client section navigation

**Problem:** Anchors use tablist/tab/tabpanel roles while all sections display and no aria-selected/roving focus or tab keyboard handler is implemented.

**Evidence:** [apps/web/src/app/gyms/[slug]/trainer/clients/[memberId]/page.tsx:27](../../apps/web/src/app/gyms/[slug]/trainer/clients/[memberId]/page.tsx#L27)

**User impact:** Assistive-technology users receive a tab interaction model that these anchors do not fulfill.

**Suggested improvement:** Use ordinary in-page section navigation, or shared Tabs with correctly selected and keyboard-controlled panels.

**Confidence/verification:** Confirmed source behavior; not runtime replayed.

## UX16 — Medium — Global muted text/metadata

**Problem:** Muted #8B8E98 used for ordinary small text on white/page/muted surfaces. Static contrast calculation≈3.27/3.00/2.98. Many metadata/header labels are8–11px.

**Evidence:** [apps/web/src/app/globals.css:17](../../apps/web/src/app/globals.css#L17), [apps/web/src/app/globals.css:113](../../apps/web/src/app/globals.css#L113), [apps/web/src/app/globals.css:571](../../apps/web/src/app/globals.css#L571)

**User impact:** Low-contrast small text makes dates/status definitions/finance metadata harder to read. This confirms token risk, not whole-app accessibility failure.

**Suggested improvement:** Strengthen semantic text colors to chosen4.5 normal-text contrast target; establish readable type scale and verify actual rendered combinations/zoom.

**Confidence/verification:** Confirmed token values and local contrast computation; rendered cascade and user impact require visual/assistive testing.

## UX17 — Medium — S29 workout builder

**Problem:** New plan initially contains Bench Press4×10×60kg and Incline DB Flyes3×12×16kg as actual controlled values. Plan title/description are uncontrolled.

**Evidence:** [apps/web/src/components/coaching/workout-plan-builder.tsx:12](../../apps/web/src/components/coaching/workout-plan-builder.tsx#L12), [apps/web/src/components/coaching/workout-plan-builder.tsx:24](../../apps/web/src/components/coaching/workout-plan-builder.tsx#L24)

**User impact:** A trainer can inadvertently assign example prescription; server-action form reset can lose unsaved title/description after errors.

**Suggested improvement:** Use blank rows or an explicit opt-in template; preserve complete nonsecret plan draft on recoverable validation/transport errors.

**Confidence/verification:** Confirmed source behavior; not runtime replayed.

## UX18 — Medium — S36 meal activity and S38 totals

**Problem:** Calendar repeats weekday entries from all loaded plans on any matching month date; no effective/current plan dates. Nutrition totals render null macros as0.

**Evidence:** [apps/web/src/components/sessions/member-session-calendar.tsx:58](../../apps/web/src/components/sessions/member-session-calendar.tsx#L58), [apps/web/src/app/gyms/[slug]/member/meal-plans/page.tsx:30](../../apps/web/src/app/gyms/[slug]/member/meal-plans/page.tsx#L30)

**User impact:** Old plans can appear as simultaneous recurring activities; unknown macro values can appear measured zero.

**Suggested improvement:** Clearly identify plan/source and repeating reference status; display unknown as not provided. Current/archived/date scheduling needs explicit backend product scope.

**Confidence/verification:** Confirmed source behavior; not runtime replayed.

## UX19 — Medium — S28/S16 bounded history

**Problem:** Trainer client profile shows latest 2 plans/latest 10 sessions with hasMore text but no older-plan/history link; owner trainer profile latest 10 likewise no pager.

**Evidence:** [apps/web/src/app/gyms/[slug]/trainer/clients/[memberId]/page.tsx:42](../../apps/web/src/app/gyms/[slug]/trainer/clients/[memberId]/page.tsx#L42), [apps/web/src/app/gyms/[slug]/owner/trainers/[trainerId]/page.tsx:40](../../apps/web/src/app/gyms/[slug]/owner/trainers/[trainerId]/page.tsx#L40)

**User impact:** Users know older records exist but cannot retrieve them from the preview.

**Suggested improvement:** Link to an authorized paginated history or state this preview limit without implying older records are reachable here; preserve trainer relationship restrictions.

**Confidence/verification:** Confirmed source behavior; not runtime replayed.

## UX20 — Medium — S22 audit coverage

**Problem:** Audit read allow-list includes MEMBER_SESSION_PACK_ISSUED while pack controller emits SESSION_PACK_ISSUED. Several config/coaching/master events are persisted outside visible list scope.

**Evidence:** [apps/api/src/notifications.controller.ts:8](../../apps/api/src/notifications.controller.ts#L8), [apps/api/src/packs.controller.ts:68](../../apps/api/src/packs.controller.ts#L68), [apps/api/src/coaching/coaching.service.ts:246](../../apps/api/src/coaching/coaching.service.ts#L246)

**User impact:** Owners may assume Security & Audit Logs includes changes it omits; pack issue is absent from available event filtering.

**Suggested improvement:** Align event vocabulary and clearly label tenant event scope; add authorized event families deliberately, keeping sanitized transitions and platform/private logs separate.

**Confidence/verification:** Confirmed source behavior; not runtime replayed.

## UX21 — Medium — S19/S25 error states

**Problem:** Finance configuration failure returns bare main without shell. Trainer schedule sets requests=null for non-OK request fetch; unavailable request card only appears for parsed-but-invalid payload.

**Evidence:** [apps/web/src/app/gyms/[slug]/owner/financials/page.tsx:45](../../apps/web/src/app/gyms/[slug]/owner/financials/page.tsx#L45), [apps/web/src/app/gyms/[slug]/trainer/schedule/page.tsx:27](../../apps/web/src/app/gyms/[slug]/trainer/schedule/page.tsx#L27), [apps/web/src/app/gyms/[slug]/trainer/schedule/page.tsx:45](../../apps/web/src/app/gyms/[slug]/trainer/schedule/page.tsx#L45)

**User impact:** Navigation disappears on one dependency failure; request service outage can look like no pending requests.

**Suggested improvement:** Retain authorized shell and render dependency-specific failure/retry distinct from empty; model fetch status explicitly.

**Confidence/verification:** Confirmed source behavior; not runtime replayed.

## UX22 — Medium — Shared notifications

**Problem:** Only latest 5 rendered, no inbox/history link; popover has Close button but no Escape/outside-click/focus restoration behavior. Every trainer Request button has identical accessible label.

**Evidence:** [apps/web/src/components/navigation/notifications-bell.tsx:18](../../apps/web/src/components/navigation/notifications-bell.tsx#L18), [apps/web/src/app/gyms/[slug]/member/trainers/page.tsx:39](../../apps/web/src/app/gyms/[slug]/member/trainers/page.tsx#L39)

**User impact:** Older notices cannot be browsed; keyboard navigation/repeated actions lack context.

**Suggested improvement:** Add authorized history only if in scope; improve popover dismissal/focus and include trainer name in accessible action labels.

**Confidence/verification:** Confirmed source behavior; not runtime replayed.

## UX23 — Medium — S02 provisioning form

**Problem:** Provisioning fields are uncontrolled, submission action can reset them, and successful operation makes inputs readOnly. Warning asks same unchanged details for uncertain outcome without draft-state mechanism comparable to member/trainer enrollment.

**Evidence:** [apps/web/src/components/platform/provisioning-form.tsx:12](../../apps/web/src/components/platform/provisioning-form.tsx#L12), [apps/web/src/components/platform/provisioning-form.tsx:30](../../apps/web/src/components/platform/provisioning-form.tsx#L30)

**User impact:** Users may lose request details required for safe retry or see blank readonly fields after reservation. Reset behavior is source/framework risk and needs browser reproduction.

**Suggested improvement:** Capture immutable submitted intent in state and show operation summary independent of reset fields; keep original key/intent through uncertainty.

**Confidence/verification:** Confirmed uncontrolled form/immutable retry contract; exact post-submit rendering needs current browser verification.

## UX24 — Low — S02 registry mobile hierarchy

**Problem:** Saved320px registry screenshot stacks overview, registry cards and five-field creation form into a long page. Dense timestamp/raw state metadata competes with primary task.

**Evidence:** [apps/web/test-results/migration-evidence/GYMOS-MIG-024/registry-320.png](../../apps/web/test-results/migration-evidence/GYMOS-MIG-024/registry-320.png), [apps/web/src/components/platform/registry.tsx:1](../../apps/web/src/components/platform/registry.tsx#L1)

**User impact:** Potential scan/navigation burden and difficulty finding support form after selecting a row. No user task time or current-build overflow was measured.

**Suggested improvement:** Prioritize primary row actions, readable freshness, collapsible secondary metadata and a clearly located selection flow; user-test frequent vs occasional platform tasks.

**Confidence/verification:** Visual observation of saved V2 test capture; current source replay and task impact unverified.

## UX25 — Low — Global UI consistency

**Problem:** Custom form controls/headers/metrics/tables coexist with shared primitives; enum badge text and display labels vary; native completion confirmation differs from shared dialogs. Globals has layered role overrides and important rules.

**Evidence:** [apps/web/src/components/ui/index.ts:1](../../apps/web/src/components/ui/index.ts#L1), [apps/web/src/components/sessions/session-lifecycle-controls.tsx:24](../../apps/web/src/components/sessions/session-lifecycle-controls.tsx#L24), [apps/web/src/app/globals.css:457](../../apps/web/src/app/globals.css#L457)

**User impact:** Visual and behavior drift increases learning/review cost and makes responsive fixes fragile.

**Suggested improvement:** Consolidate controls/state semantics/tokens incrementally; retain server pagination, consequences and accessible modal behavior rather than changing appearance alone.

**Confidence/verification:** Confirmed source behavior; not runtime replayed.

## UX26 — Medium — S21 decimal rate contract boundary

**Problem:** Update controller accepts ratio values up to6 decimals, but gymConfigurationSchema uses moneyAmountSchema(max4 decimal fraction) for rate fields. Saved six-place ratios can fail subsequent parsed configuration reads.

**Evidence:** [apps/api/src/configuration.controller.ts:18](../../apps/api/src/configuration.controller.ts#L18), [packages/contracts/src/configuration.ts:8](../../packages/contracts/src/configuration.ts#L8), [packages/contracts/src/configuration.ts:15](../../packages/contracts/src/configuration.ts#L15)

**User impact:** A precision accepted on save can make settings/finance configuration unavailable afterward. Needs an isolated runtime reproduction before change.

**Suggested improvement:** Use a dedicated consistent ratio schema across read/write and exact UI conversion; distinguish money precision from compensation ratio precision.

**Confidence/verification:** Confirmed source behavior; not runtime replayed.

## Cross-cutting evaluation

| Criterion | Evidence-based assessment |
|---|---|
| Navigation clarity | Role-specific destinations exist and foreign roles redirect safely; owner list-mode loss, divergent trainer landing and support-selection label obscure transitions. |
| Hierarchy/information density | Saved registry1440/320 shows clear cards and narrow stacking, plus long mobile task surface. Other pages need current visual review; no blanket quality judgment. |
| Consistency | Shared primitives and Classic tokens exist; domain duplication and layered role CSS cause inconsistent labels/controls/state patterns. |
| Forms/error prevention | Contracts, required labels, expected versions, idempotency and consequence acknowledgment are strong; percent conversion, draft resets and static options undermine them. |
| Tables/search/filtering | Owner member/trainer server paging and useful filters exist; finance lacks visible paging; booking remote selection and full history gaps. No general sort or bulk selection found. |
| Feedback | Many explicit stale/unavailable/empty/unknown states; two confirmed omission paths and unmounted-shell failure need correction. |
| Mobile | Drawer, responsive grids, registry cards and custom calendar transformations are source-backed. Existing test widths include320px; current all-screen visual QA not performed. |
| Accessibility | Shared tab/dialog/focus/label/skip patterns support access; client-profile tab semantics and muted token contrast have concrete concerns. No fresh screen-reader/axe audit. |
| Task efficiency | Enrollment and PT have connected multi-actor flows; manual consent recovery, owner onboarding gap, hidden records and reload interruptions add avoidable work. |
| Overall quality | There is a coherent usable foundation with substantive backend workflow safeguards. Prioritize semantic accuracy and completion before premium visual polish. |

## Recommendations needing validation, not confirmed defects

User-test role landing priorities, preferred week start, list vs calendar default, owner mobile daily tasks, metric terminology, whether older notifications need full history, and desired plan archival/version behavior. Visually inspect every role at320/390/768/1440,200% zoom, long names, large values, high density, keyboard only and actual assistive technology. Measure request fan-out/latency before optimizing. No claims about low usability scores, task time, production performance or broad accessibility compliance were verified.
