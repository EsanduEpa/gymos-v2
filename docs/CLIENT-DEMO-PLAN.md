# Client demo readiness plan

Prepared: 6 November 2026 (Asia/Colombo).

## Current assessment

GymOS V2 has substantial implementation across Super Admin, Owner, Trainer and Member workspaces. The next priority is to make the existing workflows reliable, prepare representative demo data, and rehearse the complete client journey.

**Current local prototype:** the isolated synthetic app is served at `http://localhost:3000` when the local demo server is running. The earlier `pnpm manual:check` pass predates a synthetic approved applicant added during the Chrome walkthrough; treat it as historical, not a current fixture check. Focused owned direct-approval, Trainer-profile, public-application and mobile booking checks passed. The latest complete Playwright run recorded 34 passes and 3 failures; each failure subsequently passed in a focused rerun, but no uninterrupted full green run is recorded. Use the separate [prototype follow-up list](common-foundation/PROTOTYPE-DEFERRED-ISSUES.md) after the client demonstration.

This plan is based on current routes/components, implementation progress and evidence records. It does not claim a fresh runtime verification. Existing uncommitted work is in progress and must be preserved. No deadline has been supplied; the sequence below uses readiness gates rather than promised dates.

## 1. What we have built and must demonstrate

“Implemented” means present in the app and/or supported by recorded implementation evidence. Every row still needs a successful rehearsal on the exact demo build. Assign a presenter and record pass/fail evidence for each row before sign-off.

| ID | Area / role | Implemented functionality | Demo acceptance / remaining work |
| --- | --- | --- | --- |
| D01 | Shared access | Sign-in, first-password change, role landing, gym selection/switching, logout | Log in normally as all four roles; switch gyms without carrying data across; verify direct wrong-role access is denied. |
| D02 | Platform overview | Gym totals, registry, summary freshness/health, bounded refresh, paging | Show real counts and status; explain unavailable/stale data accurately. |
| D03 | Platform onboarding | Gym creation, owner onboarding/consent, asynchronous provisioning, status/retry, one-time credentials and acknowledgment | Create a disposable gym through to usable Owner access; confirm the provisioning worker is running. Use a separate example for existing-owner consent. |
| D04 | Platform operations | Suspend/reactivate/resume gym, reasoned read-only support, support expiry/exit | Use a secondary demo gym; verify suspended access and reactivation; confirm support cannot mutate. |
| D05 | Owner dashboard | Daily PT activity, all-date active count, operational earnings, trainer schedule, refresh, shortcuts | Match displayed metrics to fixtures; demonstrate stale-read recovery. Current daily preview is limited; it is not an all-dates active-session list. |
| D06 | Gym settings | Public profile/branding, membership plans, PT fees, trainer pay rates, cancellation policy | Save one representative change per settings section; confirm selected-gym scope. Existing sessions retain their historical terms. |
| D07 | Member administration | Registration, existing-identity consent, one-time handoff, directory search/filter/paging, member profile and lifecycle | Complete new-member onboarding and existing-identity consent separately; demonstrate lifecycle changes on a spare account. |
| D08 | Applications | Public self-application, authenticated existing-account application, own status/withdraw/reapply, Owner queue/approve/reject, outcome notices | The synthetic Chrome walkthrough completed Owner approval, applicant outcome and Member access under the earlier second-consent flow. Current code uses application consent and direct Owner approval; focused owned integration passed, while manual acceptance of that revised flow remains pending. |
| D09 | Membership and PT value | Membership assignment/renewal, PT pack issuance, credit balances/expiry and history | Issue/renew on synthetic records; show available, held, consumed and expired value with expected figures. Rehearse pack issuance after earlier browser errors. |
| D10 | Trainer administration | Registration, consent/credentials, directory/profile, level/status/shift and lifecycle controls | Rehearse enrollment and appropriate profile/shift/lifecycle actions; show availability separately from staff shifts. |
| D11 | PT availability | Trainer/Owner weekly availability, dated replacements, breaks/blocks, gym closures, eligible slots | Publish availability and show the resulting slots; verify a block/closure removes availability and existing bookings are protected. |
| D12 | Owner booking | Member/trainer selection, available slot, credit eligibility, direct confirmed booking | Fix sandbox booking-options 503; confirm booking creates one credit hold and member/trainer notices; reject an overlap. |
| D13 | Member request | Trainer search, available-slot request, pending status, withdrawal | Fix the outstanding expired-login browser journey. Verify pending request has no credit hold; withdrawal removes it. |
| D14 | Trainer decision | Incoming requests, accept/decline and reasons | Accept one request and verify a hold; decline a separate request and verify no hold. |
| D15 | PT reads | Owner sessions/attention queue, Trainer daily schedule/calendar, Member sessions/calendar, shared session detail and event history | Show each role's permitted view of the same session, date filters, paging and gym-local times. |
| D16 | PT delivery | Eligible start, timed completion, completed-session notes, credit consumption, earnings | Use an eligible synthetic appointment and a separate completion-ready appointment. Never shorten timing rules for the demo. Check Member-visible notes and settlement. |
| D17 | PT exceptions | Policy quotes, early/late cancellation, no-show, Owner reschedule/correction, source-credit expiry remedy | Prepare a separate record for each outcome. Review consequences before committing; verify linked history and credit/pay effects. |
| D18 | PT automation | Pending-request expiry, 24-hour/one-hour in-app reminders, owner scheduled-work health | Confirm runner startup/health; use controlled synthetic due records. Verify no duplicate/stale reminders after cancellation/reschedule. |
| D19 | Coaching | Trainer relationship-scoped client roster/profile; workout and meal builders/assignment | Create and assign one workout and one meal plan; verify Member reads the exact assigned content. |
| D20 | Member workspace | Home, next booking, request deadline, credit/expiry information, workouts/meals, trainer directory | Verify populated and empty states; explain PT completion counts accurately. Workout completion/progress tracking is separate work. |
| D21 | Financials | Operational revenue, deferred value, expenses, budgets/variance, P&L, CSV export | Show populated periods, create one expense and budget, export/open a CSV; reconcile example figures. Operational value is not cash received. |
| D22 | Trainer pay | Own earnings/history, pay-period status, Owner payroll close/approve, signed corrections | Use a dedicated synthetic pay period; show close/approval and distinguish accrual from payout. |
| D23 | Reporting / audit | Owner analytics windows, audit filters/export, operational history | Rehearse available filters and exports; use existing measured data and explain reporting bounds. |
| D24 | Profile / identity | Global account name, self-editable gym profiles, reasoned Owner Member corrections, login-email correction request/withdrawal and platform closure | Verify name/contact ownership, correct-role editing and correction notice. Email correction records follow-up; it does not change the login address. |
| D25 | Security / help | Personal/shared-device sessions, renewal, device list/revocation, current/all-device logout, password change, staff-assisted recovery, security history, help | Use dedicated accounts for revocation/password changes. Recovery needs an eligible single-gym ordinary identity; the shared three-gym main demo accounts are unsuitable for that recovery path. |
| D26 | Notifications | Bell, separate Account/Gym history, paging, unread counts, mark-one/mark-all, typed destination links | Focused bell regression now passes. Verify session/application/profile/security destinations with normal login on the final build. |
| D27 | Appearance / usability | Atlas Light/Midnight Blue, persistent theme/sidebar choice, responsive navigation, keyboard controls | Rehearse desktop and mobile for every role; verify focus, dialogs, loading, empty, validation and retry states on key journeys. |

## 2. What to do next, in order

### P0 — Remove demo blockers

- [ ] Diagnose the member request server-action redirect to `/login?error=expired`, using normal login and the current durable sessions. Record whether it is a product issue, fixture issue, or both; fix without weakening authentication.
- [ ] Diagnose the manual sandbox's Owner booking-options 503. Check current Master/tenant migrations, tenant schema readiness, configuration and API diagnostics; do not assume the cause from the status code alone.
- [ ] Recheck pack issuance, trainer request decisions, enrollment and two-gym journeys against the latest changes. Focused successes do not replace a complete rerun.
- [ ] Run the complete browser suite on the final build and resolve every failure. Record exact totals and remaining limitations; do not drop business assertions to obtain a pass.

Exit gate: normal sign-in → request → acceptance → detail works, direct Owner booking works, packs can be issued, and the full browser suite passes.

### P1 — Prepare one reliable demo environment

- [ ] Choose and record one demo URL, build/revision, database set and startup method. Match the configured web origin exactly; the recorded `127.0.0.1` versus `localhost` mismatch correctly rejected a form submission.
- [ ] Use synthetic data in an isolated local demo environment. The existing manual sandbox has three gyms, four main role accounts, member records, PT history, credits and assigned plans; verify its actual current contents before relying on original seed counts.
- [ ] Bring the selected demo environment to the current migrations and build through the owned setup process. Start/verify provisioning, expiry and reminder workers.
- [ ] Refresh date-sensitive availability, memberships, packs, requests and sessions relative to demo day in Asia/Colombo. Older relative seed dates can become ineligible.
- [ ] Add dedicated single-gym recovery accounts, pending/rejected applications, a spare onboarding gym, and independent cancellation/reschedule/correction/payroll examples.
- [ ] Prepare separate due-to-start, completion-ready and historical sessions. A newly booked future appointment cannot demonstrate immediate completion.
- [ ] Record expected before/after values for the live journey: pending request → no hold; accepted/direct booking → hold; completion → consume/earn; cancellation → quoted effect.
- [ ] Keep credentials private and out of screenshots/exports. Prepare separate browser profiles for each role so sign-out and device tests do not interrupt other presenters.
- [ ] Document an owned snapshot/reset procedure and backup captures of synthetic UI. Rehearse restoration; do not reset shared project data.

Exit gate: the environment starts predictably, all demo accounts work, workers are healthy, and every planned state is available without improvised data edits.

### P2 — Verify every implemented feature

- [ ] Complete D01–D27 above, recording build, fixture, presenter, result and evidence link. For write workflows, verify the result from the other affected role as well.
- [ ] Run workspace validation, type checks, lint, unit checks and both app builds; run owned application, identity, notification, PT, finance and recovery integrations appropriate to the final changes.
- [ ] Complete manual acceptance of public application → Owner decision → applicant result and activated access; rejection/withdrawal must leave access restricted.
- [ ] Complete eligible start/completion and lost-response/expired-auth retry checks. Confirm retry does not duplicate a booking, credit movement, plan or payment-related operational record.
- [ ] Verify wrong-role and wrong-gym access denial, safe support access, and private notes/financial fields remaining restricted.
- [ ] Check desktop, narrow mobile, both themes and keyboard navigation, with particular attention to request forms, calendars, dialogs, builders and account flows.

Exit gate: every inventory item has evidence or an explicitly agreed scope decision; no critical unexplained error remains on the demo build.

### P3 — Rehearse and freeze

- [ ] Run the presentation from the exact demo URL using ordinary sign-in, with one person presenting and another tracking D01–D27.
- [ ] Reconcile the live journey's membership, credit, session, notification and earning results across Member, Trainer and Owner.
- [ ] Time the walkthrough; adjust presentation length without silently removing feature coverage.
- [ ] Freeze the build after successful rehearsal. Any subsequent change reruns the affected checks and critical journey.
- [ ] Before the meeting, check startup, workers, accounts, current dates/slots, the export destination and the reset/backup procedure.

Exit gate: a complete rehearsal succeeds without developer intervention; the presenter can explain every unavailable capability accurately.

## 3. Suggested client walkthrough

Allow approximately **60 minutes plus questions** for broad functional coverage. This is a presentation target, not an engineering estimate. If the meeting is shorter, agree a core journey and schedule the remaining inventory as a separate deep dive.

| Order | Time | Story and coverage |
| --- | --- | --- |
| 1 | 6 min | Super Admin: overview → gym creation/status → registry/support → lifecycle on a spare gym. D02–D04. |
| 2 | 10 min | Owner setup and people: dashboard → settings → member/trainer onboarding → applications → membership/pack. D05–D10. |
| 3 | 16 min | PT across roles: publish availability → Member request → Trainer accept → Owner/detail/calendar → eligible delivery fixture → Member notes and credit result. D11–D16. |
| 4 | 8 min | Exceptions and automation: cancellation quote, no-show, reschedule/correction/remedy examples, expiry/reminders and worker health. D17–D18. |
| 5 | 6 min | Coaching: Trainer client → workout/meal assignment → Member home and plan reading. D19–D20. |
| 6 | 7 min | Business: finance, expense/budget, P&L, payroll review/approval, earnings, analytics/audit and export. D21–D23. |
| 7 | 7 min | Account controls: profile/corrections, notifications, device security, password/recovery, help, gym switching and mobile/theme. D01, D24–D27. |

Use one continuing Member/Trainer story for the main journey. Use clearly labeled independent examples for contradictory or time-dependent outcomes, such as decline, completion, expiry and no-show. Prepare the remaining edge cases in the checklist for questions.

## 4. Capability gaps and product decisions

These are separate from repairing existing functionality. Confirm with the client which, if any, are expected as new scope before promising delivery.

| Capability / decision | Current position | Next step |
| --- | --- | --- |
| Subscription billing, payment methods, invoices and plan changes | Subscription page explicitly reports unavailable | Agree billing requirements and implementation scope if needed. |
| Cash/payment collection, payouts and physical attendance | Operational finance, pay accrual and session activity exist; these capabilities are separate work | Clarify whether the client requires a payment or attendance workflow. |
| Email ownership verification / email password reset | Signup does not verify mailbox ownership; recovery is staff-assisted | Address the recorded identity-assurance finding before public onboarding. |
| Actual login-email change | Request/follow-up exists; no identity-email mutation | Define verified proof and reconciliation before implementation. |
| Workout adherence, body/progress tracking, health update review, avatar upload | Not delivered by the current workspace/profile scope | Prioritize only if required by the client. |
| All ongoing sessions together across dates | All-date active count exists; default Owner rows are a bounded daily preview | Add a dedicated all-date active list if the client needs it for operations. |
| External notification delivery / broad preferences | In-app notices/reminders exist | Define channels and preferences if required. |
| Recovery/session policy and trainer privacy | Several durations are proposed defaults; trainer access to sensitive client fields needs policy review | Confirm product rules before production commitments. |
| Public/production readiness | Security review findings, deployment monitoring, pilot and release acceptance remain | Track separately from controlled demo sign-off; a successful demo does not clear these gates. |

Before internet-exposed or real-client-data use, resolve the security review's email assurance, legacy session enforcement, rate limiting, privileged authentication, browser headers and production configuration findings, with appropriate verification. This plan does not authorize a deployment or a pilot.

## 5. Evidence and tracking

Use this as the demo coverage checklist; keep detailed results in the existing evidence records to avoid conflicting pass claims. The newest continuation entries take precedence over earlier “next task” notes.

- [Common foundation progress](common-foundation/PROGRESS.md) and [evidence](common-foundation/EVIDENCE.md): latest CF-08 failures, focused fixes, public application and sandbox observations.
- [PT progress](pt-implementation/PROGRESS.md), [evidence](pt-implementation/EVIDENCE.md) and [runbook](pt-implementation/RUNBOOK.md): availability, lifecycle, automation and remaining acceptance/release gates.
- [Manual sandbox instructions](manual-testing.md): isolated data, startup, accounts and fixture constraints.
- [UI plan](ui-ux-transformation/00-MASTER-UI-UX-PLAN.md) and its role mappings: delivered screens, appearance checks and capability limits.
- [Security review](security-review/2026-11-06-review.md): findings and production follow-up.

Immediate presenter step: run `pnpm manual:check`, then use the local app and the private synthetic accounts in ignored `.env.manual-test.json`. A complete Playwright rerun and manual acceptance remain after-demo work. No deployment, pilot, or external communication is authorized by this plan.
