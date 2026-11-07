# PT implementation guide: PT-01 through PT-07

Status: implementation specification; no milestone is complete merely because this document exists.

Audience: implementation agents, reviewers, and the gym owner.

Scope: finish the one-to-one personal-training journey in the existing GymOS V2 application. This guide supersedes earlier PT planning suggestions where they differ from the confirmed rules below. It does not authorize a redesign, a new architecture, or unrelated product work.

## 1. Required outcome

A trainer publishes availability; a member selects a valid slot and requests a session; the trainer accepts or declines; the owner can book directly. Confirmed sessions reserve one credit, appear consistently across roles, support delivery and cancellation, and settle credits and trainer earnings correctly. Owners can resolve mistakes without database editing. Relevant changes and 24-hour/one-hour reminders appear in the existing in-app notification system.

Success means all seven milestones are implemented, verified, and supported by evidence. Routes, buttons, passing unit tests, and merged changes alone do not prove the journey works.

## 2. Confirmed product rules — do not reinterpret these

| ID | Rule |
| --- | --- |
| R01 | New PT bookings are in-person, 60 minutes, costing exactly one PT credit. |
| R02 | Virtual and introductory sessions are excluded from new booking/request flows until their rules are separately approved. There is no introductory-session eligibility exception in this release. |
| R03 | Member requests require acceptance by the assigned trainer. Owner bookings are confirmed directly, with notifications. |
| R04 | Trainers manage their own availability; owners can manage trainer availability too. Changes affecting bookings require explicit resolution. |
| R05 | New requests, owner bookings, and replacement slots can be booked up to 14 days ahead and at least two hours before starting. No mandatory gap is required between sessions. |
| R06 | Each member may have at most two live pending requests in this gym. A pending request blocks the member's and trainer's time but does not reserve a credit. |
| R07 | A pending request expires at the earlier of creation + 12 hours or scheduled start − 1 hour. |
| R08 | Member cancellation is free until 24 hours before starting, inclusive at the cutoff. Late cancellation and no-show consume one credit. Withdrawing an unconfirmed request consumes no credit. |
| R09 | Trainer/gym cancellation must not penalize the member. Restore usable value, including an owner-approved expiry remedy when needed. |
| R10 | Rescheduling is owner-assisted initially. Corrections are owner-only, require a reason, and preserve history. |
| R11 | Both membership and an eligible PT pack must cover the session's gym-local date. Recheck credit availability when confirmation reserves a credit. |
| R12 | Notifications are in-app only. Provide reminders at 24 hours and one hour before confirmed sessions, plus relevant PT lifecycle notifications. No email, SMS, WhatsApp, web push, or provider integration in this scope. |
| R13 | Retain the existing UI theme and follow the existing application architecture. |

### 2.1 Boundary interpretations for consistent implementation

The following are implementation defaults to make the confirmed rules executable. Record any necessary deviation in this document before using it; do not silently change a confirmed product rule.

- Use authoritative database time. Display dates/times in the configured gym timezone, not the browser timezone.
- Interpret the booking window as `now + 2 hours <= start <= now + 14 days`, where a day in this rolling window is 24 elapsed hours. Calendar queries can cover whole dates, but returned slots must pass these instant comparisons.
- Generate candidate starts on a 15-minute gym-local grid; each appointment lasts 60 elapsed minutes. This is a slot-generation default, not a new selectable duration or a compulsory gap.
- Adjacent half-open appointments do not overlap: 10:00–11:00 and 11:00–12:00 are valid.
- Exactly two hours' notice and exactly the horizon boundary are allowed. A request cannot be accepted at or after its expiry instant.
- The two-hour notice rule applies when creating a request, owner booking, or replacement slot. Do not reapply it to acceptance of an existing request: acceptance remains possible strictly before request expiry, including between two hours and one hour before starting.
- All normal owner bookings use the same availability and eligibility rules. Direct confirmation does not grant an implicit off-hours, credit, membership, or timing override.
- Pending limits are per member per gym, not global across identities/gyms. Expired pending requests must not count or block time even if a background sweep is delayed.
- Accepting one request can leave another request without a usable credit. That second request remains unconfirmed, shows an actionable eligibility reason, and expires normally; no negative balance or automatic credit purchase is allowed.
- Retain the existing 15-minute no-show grace and existing ordinary start/completion timing safeguards unless separately changed through an explicit decision. A 60-minute booked service is distinct from the existing minimum elapsed time for ordinary completion. Display that distinction accurately; do not automatically mark completion from a timer.
- Show a clear warning that requests made within 24 hours of starting will already be inside the late-cancellation window if accepted.
- For availability, no configured windows means not bookable. Do not interpret missing availability as always available.

## 3. Scope limits and launch dependencies

### Included

- PT policy enforcement, trainer availability, gym closures, slot discovery, requests/expiry, direct owner booking, confirmation, details/calendar, session delivery, cancellation/no-show, owner rescheduling/corrections, member-safe expiry remedies, in-app events/reminders, role dashboards relevant to PT, and verification.

### Excluded

- Group classes, capacity greater than one, waitlists, recurring bookings, payment gateways, payment/receipt ledgers, membership redesign/freezes, general gym attendance, reception-role design, new coaching features, SaaS billing, and native mobile applications.
- Authentication redesign or refresh-token implementation. Existing session expiry remains a dependency; PT forms must handle it safely without expanding this work into a new identity system.

### Dependencies to verify, not assume

- Working owner/trainer/member accounts, enrollment bindings, active gym access, schema compatibility, currency/timezone configuration, memberships, packs, and established trainer rates.
- A safe account-recovery/support procedure and an honest expired-session experience.
- Existing trainer-pay correction capabilities and exact money/credit allocation rules.
- A deployed server-side PT scheduled-work runner for expiry and reminders, with health visibility. Browser timers and the notification poll are not a scheduler.
- Backup/restore, production configuration, and deployment ownership are broader launch gates. PT verification alone is not a declaration of whole-product production readiness.

If a dependency fails, record its evidence and impact. Do not invent data, bypass eligibility, weaken guards, or silently expand scope to claim the PT milestone passed.

## 4. Mandatory architecture and UI constraints

### 4.1 Source-of-truth reading order

Before implementation, read the current versions of:

1. Applicable `AGENTS.md` files, including `apps/web/AGENTS.md`.
2. `docs/migration/NOTES.md`, especially architecture, validity, receipts, credit conservation, and payroll rules.
3. `docs/ui-ux-transformation/00-MASTER-UI-UX-PLAN.md` and the Owner, Trainer, and Member feature documents beside it.
4. This guide and the actual source files listed in section 5.
5. `docs/manual-testing.md` and each test harness before executing it.

Older migration notes refer to the V1 Classic visual baseline; the newer delivered UI documentation describes Atlas Light and Midnight Blue. For this approved PT upgrade, preserve the CURRENT delivered V2 theme/component system. Do not revert it to an older visual baseline. Preserve security/accounting architecture from the migration notes. Treat historical branch/status notes as evidence to recheck, not instructions to merge unrelated work.

Before writing Next.js code, follow `apps/web/AGENTS.md` and read the relevant locally installed Next.js guides. This planning document does not require a framework upgrade.

### 4.2 Architecture that must remain intact

- Web: Next.js App Router, existing server-page/server-action boundaries, established authenticated transport, and shared UI components.
- API: NestJS owns validation, authorization, policy, business commands, and operational persistence. Do not place authoritative eligibility or credit logic in React/server actions.
- Contracts: shared Zod schemas/types live in `packages/contracts`; update package exports, client transport, and consumers together. Follow established transport per surface; do not introduce a competing HTTP client framework.
- Data: Master owns identity/access/registry/branding; the gym tenant database owns availability, sessions, credits, notifications, and operational finance. Keep new PT operational records tenant-local.
- Access: preserve `GymAccessGuard`, current role/access checks, `TenantSchemaGateService`, physical database/gym binding, enrollment fences, and support-mode restrictions. New controllers must not create a support-mode write bypass.
- Commands: reuse scoped idempotency keys, durable receipts, version checks, state events, transactionally coupled local audit and required notifications. Resolve unknown outcomes by reconciling/retrying the original command.
- Transactions: use existing retry/locking patterns and establish a consistent lock order across all new and existing interacting commands. Never retry an external side effect as though it were a rolled-back database transaction.
- Credits: preserve immutable credit allocations, earliest-eligible-pack selection, movement conservation, and exactly one settlement effect under retries/races. Never use a standalone mutable `remainingCredits` field as the authority.
- Money: keep exact decimal strings/minor units and existing earning/pay snapshots. Operational earning is not a payment; approved payroll history must not be rewritten.
- Schema: additive versioned Prisma/SQL migrations; update the tenant template manifest, checksums, postconditions, rollout verification, generated clients, and fixtures when required. Do not edit already-applied migration files, generated Prisma output, or bypass the schema gate.
- Scheduled work: use bounded tenant acquisition and verified registry/schema access. No unbounded pool/client per gym or new SaaS administration feature is needed.
- Never claim a Master/tenant cross-database operation is one atomic transaction. Reuse durable operation/reconciliation patterns when such work is actually necessary.

### 4.3 Preserve the current theme — binding requirement

- Use the existing Atlas Light/Midnight Blue appearances with the same geometry, typography, spacing, card/control treatment, icons, and role shell.
- Reuse `DashboardChrome`, current semantic tokens/compatibility aliases, shared `Button`, `Field`, `Card`, `Feedback`, `StatusBadge`, `ConfirmDialog`, and other existing primitives where appropriate.
- Relevant composition is in `platform.css`, `workspace.css`, `owner.css`, `trainer.css`, and `member.css`; use existing scoped styles/CSS modules rather than broad global overrides.
- No new palette, font, icon library, design system, hard-coded page palettes, duplicate light/dark page trees, or global theme rewrite.
- Preserve existing branding behavior and readable semantic success/warning/error/focus colors.
- New controls must work in both appearances, keyboard navigation, reduced motion, narrow screens, and zoom. Existing working non-PT features must remain usable.
- Capture safe synthetic before/after screenshots of affected screens in both appearances. Compare against current V2, not unverified historical fixtures.

## 5. Current implementation map

Paths below were inspected when preparing this guide. Re-read current source before editing; do not assume a path or capability remains unchanged.

| Concern | Existing locations |
| --- | --- |
| Tenant models and migrations | `packages/database-tenant/prisma/schema.prisma`, its `migrations/` directory |
| Tenant schema compatibility | `apps/api/src/tenancy/tenant-template-manifest.ts`, `tenant-schema-gate.service.ts`, `tenant-schema-verifier.ts` |
| Booking/request contracts | `packages/contracts/src/session-booking.ts`, `session-requests.ts` |
| Reads/lifecycle/notifications contracts | `packages/contracts/src/session-reads.ts`, `session-lifecycle.ts`, `notifications.ts` |
| Client transport | matching files under `packages/api-client/src/` |
| Owner booking | `apps/api/src/sessions/booking.controller.ts`, `booking.service.ts` |
| Member request and trainer decision | `apps/api/src/sessions/session-requests.controller.ts`, `session-requests.service.ts` |
| State, commands, holds, retries | `apps/api/src/sessions/session-state.ts`, `session-commands.ts`, `credit-holds.ts`, `session-transactions.ts` |
| Lifecycle policy and execution | `apps/api/src/sessions/session-lifecycle.controller.ts`, `session-lifecycle.service.ts` |
| Schedule reads | `apps/api/src/sessions/session-reads.service.ts`, `member-session-overview.service.ts` |
| Trainer/member deactivation | `apps/api/src/trainer-lifecycle.service.ts`, `member-lifecycle.service.ts` |
| Earnings and pay | `apps/api/src/finance/finance.service.ts`, `payroll.service.ts` |
| Receipts/audit | `apps/api/src/operations/receipt.service.ts`, `transaction-audit.ts` |
| Notifications | `apps/api/src/notifications.service.ts`, `notifications.controller.ts` |
| API dependency registration | `apps/api/src/app.module.ts` |
| PT server actions | `apps/web/src/app/session-booking-actions.ts`, `session-request-actions.ts`, `session-lifecycle-actions.ts` |
| PT components | `apps/web/src/components/sessions/`, especially forms, lifecycle controls, policy controls, and read views |
| Trainer/member schedule surfaces | `apps/web/src/components/trainer/`, `components/member/member-home.tsx`, current role routes under `apps/web/src/app/gyms/[slug]/` |
| Shared shell and bell | `apps/web/src/components/navigation/dashboard-chrome.tsx`, `notifications-bell.tsx` |
| API integration coverage | `apps/api/test/sessions/`, `session-requests/`, `session-lifecycle/`, `session-reads/`, `notifications/`, `finance/` |
| Browser coverage | `apps/web/tests/owner-session-booking.e2e.spec.ts`, `trainer-workspace.e2e.spec.ts`, `member-workspace.e2e.spec.ts`, `session-reads.e2e.spec.ts`, `notifications-bell.e2e.spec.ts` |

Important current gaps to address, not rebuild blindly:

- New booking/request schemas currently permit multiple types, variable durations, and a much longer horizon.
- Trainers have shift fields, but these are not a complete bookable-availability model.
- Requests already block overlapping pending/scheduled/active intervals through application checks, and use member/trainer row locks.
- Existing SQL exclusion constraints cover scheduled/active intervals; pending-request protection must be explicitly maintained across every writer.
- Pending requests have no dedicated expiry lifecycle in the inspected state machine.
- Session cancellation already has consequence quotes; completion already affects credits and earnings. Extend those mechanisms.
- Notifications are already persisted tenant-locally, recipient-scoped, and deduplicated; the bell polls every 20 seconds. Time-based reminder production is separate new work.

## 6. Agent execution protocol

### 6.1 At the start of every work session

1. Read this guide, applicable instructions, `git status`, and the latest handoff/evidence.
2. Identify the first unverified milestone whose dependencies are satisfied. Do not restart completed work.
3. Inspect actual implementation and tests; record which capabilities already work and which need extension.
4. State the bounded task and its acceptance criteria. Preserve unrelated user changes.
5. Follow existing repository review/branch rules. Do not merge, deploy, migrate a shared database, or send external communications merely because this guide describes future release steps.

### 6.2 For each task

1. Define rules, edge cases, contract changes, authorization, transaction boundaries, and migration impact.
2. Add/extend meaningful policy or integration tests for business invariants and failures.
3. Implement tenant schema/manifest changes if needed, shared contracts, API command/read behavior, client transport, then web actions/components.
4. Verify the entire changed journey, including empty, loading, error, conflict, unknown-outcome, success, mobile, and both-theme states.
5. Update progress and evidence with exact checks and limitations. Distinguish code implemented from behavior verified.
6. Continue to the next ready task. Ask for clarification only when a materially unresolved business decision prevents a correct implementation; still complete independent work.

No agent may remove a failing check, weaken a constraint, fabricate evidence, or redefine an acceptance criterion simply to mark a milestone complete.

### 6.3 Required handoff record

Maintain `docs/pt-implementation/PROGRESS.md` and `docs/pt-implementation/EVIDENCE.md` when implementation begins. They do not need fabricated initial results.

For each milestone/task record:

```text
Task ID and status: Not started | In progress | Ready for review | Verified | Blocked
Requirement IDs covered:
Baseline inspected / current revision:
Changes and affected files:
Schema/contract and compatibility effects:
Checks run and actual results:
Browser/visual evidence locations:
Remaining risks or missing prerequisites:
Next exact action:
```

Use synthetic data and redact secrets/private fields from evidence. Do not store `.env` contents, temporary passwords, tokens, connection strings, or real health notes.

## 7. Shared data and command design checkpoint

Before coding new schema, write a short design entry covering the following. Names are proposals; fit final names to the current architecture rather than forcing these exact names.

| Capability | Required durable facts |
| --- | --- |
| Availability | Trainer, weekly window or dated override, local times, effective dates, timezone interpretation, revision/version, actor, audit/receipt |
| Closure | Gym-local closure date/range or interval, reason, revision, affected-session resolution |
| PT policy | Service/type/duration/credit cost, horizon/notice/expiry rules, version and snapshots required for existing sessions |
| Pending expiry | Absolute `requestExpiresAt`, explicit expiry outcome/event, safe lookup indexes |
| Booking details | Existing identity-bound session plus state/credit/policy projections and safe timeline |
| Reschedule | Original/replacement relationship or immutable schedule revisions, reason, actor, command receipt, preserved original terms |
| Correction | Target event/session, reason, actor, previous/current version, compensating movements and earning/pay references |
| Expiry remedy | Source session/credit allocation, owner-approved expiry decision, affected unit/value, reason, no new purchased value |
| Reminder work | Session, schedule revision, recipient, kind, due time, status, stable dedupe key, cancellation/supersession, retry/claim fields if needed |

Never reduce a correction to overwriting a settled session's status. Existing settlement/hold/pay uniqueness may require additive correction structures and projections. Design and test those changes before exposing correction buttons.

Map conceptual operations to current REST conventions: availability read/update, slots, request/decision, session detail, cancel/no-show, reschedule quote/commit, correction quote/commit, and owner attention queues. Reuse existing endpoints where suitable. Introduce new public endpoints only with shared contracts, access rules, bounded reads, and matching tests. The worker must not rely on an unauthenticated public trigger endpoint.

## 8. PT-01 — Enforce one PT service and its rules

Dependencies: baseline discovery and section 7 design checkpoint.

### Steps

1. Inventory all creation paths: member request, owner booking, any alternate API/client routes, test seeds, and future replacement bookings.
2. Centralize the new-booking policy on the API side. Replace inconsistent 365-day/variable-duration behavior in options, validators, and command services.
3. Enforce `IN_PERSON`, 60 minutes, one credit, two-hour minimum notice, 14-day maximum horizon, active member/trainer bindings, membership and pack date coverage.
4. Separate policy for creating a booking from policy for accepting an existing pending request. Use authoritative clock values consistently within a command.
5. Keep historic virtual/introductory or non-60-minute records readable and maintainable under their stored terms. Restrict new writes; do not narrow historical read schemas or rewrite all old rows to the new service.
6. Version the applicable rules. Do not confuse the service's scheduled duration with the existing minimum elapsed completion rule or alter historical fee/pay snapshots.
7. Remove excluded choices from new booking forms. Explain one-credit cost and late-window implications plainly.
8. Introduce additive migration/backfill design for new fields. Produce a dry-run inventory of legacy pending and confirmed sessions needing owner review; do not silently cancel them or invent trainer availability from old pay shifts.

### Acceptance tests

- Direct API submissions for virtual/introductory/new non-60-minute bookings fail consistently.
- Exactly two-hour notice and exactly the 14-day boundary pass; one millisecond outside fails.
- Membership/pack validity is evaluated on the gym-local session date, including exclusive end dates and midnight boundaries.
- A valid historical record remains readable/actionable without being converted to new terms.
- Tampering with hidden form fields cannot bypass the API rules.

### Exit gate

One policy implementation governs new PT creation; contracts and UI agree; no unrelated finance or authentication behavior is changed.

## 9. PT-02 — Publish availability and generate real slots

Dependencies: PT-01.

### Steps

1. Implement weekly bookable windows with multiple windows per weekday and effective dates. Use separate windows for split days; split overnight windows at local midnight for an initially simpler editor.
2. Add dated replacement windows and unavailable periods. Define precedence: gym closure wins; dated replacement overrides that day's weekly windows; breaks/blocks subtract from the resulting intervals.
3. Allow a trainer to edit only their own availability; an owner can edit any trainer in the selected gym. Preserve optimistic version checks, receipts, and audit.
4. Build a shared server-side slot evaluator. Each 60-minute interval must fit wholly within an allowed window, avoid blocks/closures and existing member/trainer commitments, and satisfy creation timing rules.
5. Handle timezone resolution server-side. Reject nonexistent local starts; represent repeated times as distinguishable slots with unambiguous instants. Members never type UTC offsets.
6. Return bounded availability/slot data with `asOf`, timezone, policy/availability revision, duration, and explanatory empty states. Member data must not reveal other members or private appointment notes.
7. Before availability/closure changes, calculate affected live pending, confirmed, and active sessions. Show an owner/trainer review; recheck affected sessions at commit under the same locking protocol.
8. Preserve existing confirmed/active bookings until explicitly resolved. Apply an explicit dated exception for preserved appointments or require owner-assisted rescheduling/cancellation. Pending requests made invalid must be explicitly declined/withdrawn under an authorized flow with notifications. A blanket update must not silently discard them.
9. Add the availability editor inside current trainer scheduling and an owner access point inside existing trainer/session management. Preserve the current theme.

### Acceptance tests

- Weekly hours, split windows, breaks, dated overrides, closures, and leave produce the expected slots.
- The whole session must fit; a 10:30 start cannot fit an availability window ending at 11:00.
- Back-to-back appointments are allowed; overlapping pending/scheduled/active intervals are not.
- No availability produces a useful empty state, not unrestricted booking.
- An availability edit racing a booking cannot invalidate it silently.
- A trainer cannot edit another trainer's schedule; members cannot see private conflicts.
- Gym-local dates work when browser timezone differs and across DST transitions in synthetic fixtures.

### Exit gate

Trainers/owners can publish availability, members see correct candidate slots, and writes revalidate it. Client slot lists are never authoritative reservations.

## 10. PT-03 — Complete requests, expiry, and direct owner booking

Dependencies: PT-02.

### Steps

1. Replace arbitrary date/time/duration entry with trainer → date → slot → review. Show next available time, selected-date eligibility, exact credit rules, and gym location.
2. Compute and persist `requestExpiresAt = min(createdAt + 12h, start − 1h)` using authoritative time. Snapshot the applicable rule version.
3. Serialize same-member requests, check the two-live-pending limit, validate trainer/member overlap and availability, then create the request, receipt, state event, audit, and required notifications atomically in the tenant.
4. Keep pending requests without a credit hold. Explain that a requested slot is not confirmed and credits remain usable until acceptance.
5. Add an explicit `EXPIRED` lifecycle outcome/state through additive schema/contract/read/state-machine changes, or a documented equally explicit terminal representation. Do not mislabel expiry as trainer decline. Historical reads must remain compatible.
6. Build an idempotent server-side expiry sweep using the worker foundation described in PT-06. Until PT-06 completes reminder delivery, expiry still needs a working runner, not a placeholder.
7. Expire stale requests at the start of conflicting request/booking/acceptance commands under the shared lock protocol. Read projections exclude logically expired requests immediately. Worker delays must not leave dead slots or inaccurate pending limits.
8. On acceptance, lock/recheck the pending session, expiry, roles/access, current membership/pack coverage, credits, commitments, and any unresolved availability change. Hold one eligible credit and confirm exactly once.
9. Do not reset the request lifetime or reapply the two-hour creation notice during acceptance. At expiry, expiration wins. If another request used the last credit, return an actionable error without confirming or consuming anything.
10. Keep trainer decline and member withdrawal idempotent and credit-free. Include optional safe decline text.
11. Update owner direct booking to use the same slots/policy and reserve one credit immediately. Notify member and trainer. Do not silently replace an existing pending request; either it is accepted by its trainer or explicitly resolved first.
12. Add deadline/pending states on member home and trainer schedule; route success to booking details from PT-04. Avoid duplicate free-form booking paths.

### Concurrency requirements

- Review the actual row/advisory lock order across request, booking, accept, cancellation, expiry, availability edit, deactivation, and later reschedule/correction commands. Document and reuse one compatible order; transaction retries do not excuse missing serialization.
- Evaluate whether pending intervals should join exclusion constraints. If they do, safely resolve/backfill legacy pending overlaps and expire stale rows before conflicting inserts; wall-clock predicates cannot simply be placed in an immutable partial index.
- If pending protection remains lock-based, prove every writer participates, including workers, owner routes, and lifecycle commands. Preserve existing database protection for scheduled/active rows.

### Acceptance tests

- First and second pending requests pass; a third concurrent request cannot bypass the limit.
- Pending creation does not reserve a credit; acceptance reserves exactly one.
- Requests expire at both formula branches and exactly at the cutoff.
- Acceptance versus expiry, two acceptances using one final credit, and owner booking versus member request produce one valid result without duplicate effects.
- Browser retries, network loss after commit, and page refresh reconcile the original command.
- Delayed worker execution does not keep expired slots blocked.

### Exit gate

Request → decision/withdrawal/expiry and direct owner booking work across roles with correct credit and notification effects.

## 11. PT-04 — Shared booking details and trainer delivery

Dependencies: PT-03.

### Steps

1. Add a shared authorized booking-detail read projection, fitting existing `/gyms/:slug` route conventions. Use role-specific server routes/components as needed without duplicating domain logic.
2. Show status, request deadline where applicable, member/trainer, start/end, gym-local date/time, location, one-credit entitlement, reservation/settlement state, cancellation deadline, permitted notes, and a sanitized timeline.
3. Compute command affordances on the server. Hide unauthorized actions and reject direct unauthorized requests. Do not show internal receipts, raw audit payloads, or unrelated payroll data to members.
4. Link calendars, lists, home previews, request outcomes, and notifications to the same session resource. Retain existing useful URLs or redirect them safely.
5. Make the trainer schedule the daily workspace: next client, today, pending requests, availability shortcut, start, complete, and notes.
6. Reuse existing start/completion commands and time safeguards. State clearly that notes are member-visible. Timer display must not settle credits automatically.
7. Refresh affected role reads after commands and on focus return using existing stale-response protection. Preserve scroll/filter context where practical.
8. Add an owner unresolved-session list for past scheduled sessions, long-running active sessions, and overdue pending requests. Link to PT-05 recovery, not a raw status dropdown.

### Acceptance tests

- Member sees only their booking; trainer sees only authorized assigned sessions; owner sees selected-gym sessions; foreign/unknown IDs fail consistently.
- Ordinary start → completion consumes one credit and produces one set of earning/pay effects under retries.
- Missing Start remains resolvable through owner correction, not a client-side bypass.
- Session details, role calendars, home previews, and credit summaries agree after a command.
- Details and daily actions work at 320/390px and desktop in both existing appearances.

### Exit gate

Each role can inspect the same authoritative booking and the trainer can deliver a normal session without navigating unrelated screens.

## 12. PT-05 — Cancellations, rescheduling, and owner corrections

Dependencies: PT-04. This milestone includes financial invariants even though payment collection is out of scope.

### Steps: cancellation and no-show

1. Extend existing consequence quote/acknowledgement commands. Return current session/policy version, exact cutoff, credit consequence, and quote validity; revalidate on commit.
2. Preserve free cancellation at exactly start − 24 hours. One millisecond later is late. Pending withdrawal/expiry/decline never consumes a credit.
3. Distinguish member cancellation from trainer/gym cancellation by authorized actor and reason. Trainer/gym cancellation releases value regardless of member late-cancellation rules.
4. Retain the 15-minute no-show grace and prohibit no-show on already-started sessions. Ordinary no-show marking is available to assigned trainers/owners; reversing it is owner-only.
5. Introduce an owner attention item when restored value would otherwise be unusable because the source pack expired. Show it to the member honestly as awaiting owner resolution, not immediately available.

### Steps: usable-credit remedy

1. Preview the source credit unit/value, original expiry, member impact, and proposed owner-selected new expiry before approval.
2. Restore at most the affected credit's conserved value. Do not automatically extend the whole pack or create a new paid purchase/earning.
3. Prefer a narrowly scoped, source-linked eligibility/expiry adjustment that preserves the original allocated unit and value. If the existing ledger cannot represent it, design additive adjustment records and revised projections before implementation; do not force unsupported negative balances into the current movement model.
4. Audit owner, reason, source session/allocation, old/new expiry, and resulting eligibility. A restored PT unit still requires valid membership on the replacement session date.
5. Reconcile any previously recognized expired-unused value using compensating records; do not double-count revenue or trainer earnings. Repeated approvals cannot create additional value.

### Steps: owner-assisted rescheduling

1. Restrict normal rescheduling to future, confirmed, not-started sessions. Pending requests are withdrawn/declined and re-requested; active/settled sessions use correction flows.
2. Provide replacement-slot selection, eligibility checks, reason, and a quote showing old/new appointment, policy consequences, source/destination credit allocation, and notifications.
3. Member-requested changes follow the original cancellation deadline; changing the time cannot erase a late-cancellation charge. Trainer/gym-requested changes must not penalize the member. Record the initiating party accurately; only owners authorize gym-side remedies.
4. A late member reschedule can consume the original credit and reserve a separate eligible replacement credit. Preview that explicitly. If no replacement credit is available, keep the original unchanged.
5. Commit release/settlement of the old reservation, allocation of the replacement, schedule revision/history, audit, receipt, and required notifications in one tenant transaction. Revalidate both sides and roll everything back if the replacement cannot be secured.
6. Preserve original fee/pay/policy facts and capture applicable replacement terms explicitly. Never overwrite history in place without immutable revisions or linked replacement records.
7. Invalidate original reminder jobs and schedule new ones in the same transactional design.

### Steps: owner-only corrections

1. Implement bounded correction commands, not arbitrary state editing: record delivered training with missing start/completion, reverse an incorrect no-show, and correct a mistakenly settled outcome.
2. Require a reason, expected version, source event, permitted target outcome, and any actual-time evidence. Do not invent actual times or silently backdate system timestamps.
3. Preview effects on credits, member eligibility, operational earnings, trainer pay, and approved periods before confirmation.
4. Use immutable correction/state events and compensating credit/financial records. Preserve original settlements; extend uniqueness/projection design intentionally rather than deleting the original to insert another.
5. Do not mutate approved payroll facts. Use the existing correction-period rules and record any remaining owner resolution instead of falsely presenting a payout as made.
6. Notify affected people with concise outcomes, without leaking private reasons or financial details to unauthorized recipients.

### Acceptance tests

- Free/late cancellation boundaries, pending withdrawal, no-show grace, trainer cancellation, and expired-pack remedy match R08–R10.
- Repeated remedy/correction commands cannot mint credits, money, or pay.
- Failed rescheduling leaves original booking/reservation unchanged.
- A late member reschedule cannot evade the charge; a gym-initiated replacement does not double-charge.
- A mistaken no-show is corrected with original history retained and net effects reconciled.
- Closed/approved pay-period corrections preserve original approved facts.
- Cancellation, completion, deactivation, correction, and reschedule races yield consistent terminal outcomes.

### Exit gate

Owners resolve supported PT exceptions through the application; credit conservation, earning accuracy, and immutable history remain demonstrable.

## 13. PT-06 — In-app lifecycle events and timed reminders

Dependencies: PT-03 expiry runner, PT-04 details, PT-05 schedule/correction semantics.

### 13.1 Required event coverage

| Event | Recipients and behavior |
| --- | --- |
| Member requests | Assigned trainer; member receives a persisted pending acknowledgement in their PT view. |
| Trainer accepts | Member; trainer schedule refreshes. |
| Owner books directly | Member and assigned trainer. |
| Decline / withdrawal / expiry | Affected member/trainer as appropriate; expiry is distinct from decline. |
| Member cancellation | Trainer; member gets the confirmed cancellation outcome. |
| Trainer/gym cancellation | Member and affected trainer; owner attention when an expiry remedy is required. |
| Reschedule | Member and trainer, showing the new time and an accurate replacement link. |
| No-show / completion / owner correction | Affected member; trainer where their schedule/earning outcome changes. Preserve existing useful start/completion events. |
| Expiry remedy approved | Member, with usable credit/expiry information and no raw ledger details. |
| 24-hour and one-hour reminders | Member and assigned trainer, only for the current confirmed schedule revision. |

### 13.2 Steps

1. Extend existing notification event/link contracts, sanitized content, append/dedupe function, controller projections, and bell routing. Do not build a second inbox or introduce external channels.
2. Use concise useful content: trainer/member as permitted, local date/time, current status, and booking-detail link. No health notes, credential data, database references, raw operation payloads, or internal correction notes.
3. Persist required command notifications in the same tenant transaction as their business effects. Do not claim a notification exists if insertion failed.
4. Implement durable reminder work keyed by session, schedule revision, kind (`24H`/`1H`), and recipient. A notes/state version increment alone must not schedule duplicate reminders.
5. On confirmation/reschedule, create jobs only for reminder thresholds still in the future; if exactly due, enqueue for the current pass. If confirmed fewer than 24 hours ahead, skip the 24-hour reminder rather than sending a misleading immediate one. Do not send retroactive one-hour reminders for confirmations after that threshold.
6. Run a server-side due-work loop, targeting a maximum normal processing delay of 60 seconds. Use bounded batches, stable claim/lease or transaction locking, verified tenant access, retries/backoff, and graceful shutdown.
7. In one transaction per due item/batch, recheck state/current schedule revision and recipient access, append the uniquely keyed notification, and mark work complete. Multiple workers/restarts must produce one durable reminder per recipient/type/revision.
8. On cancellation/reschedule, invalidate obsolete work. Recheck at emission to close races. Historical notifications remain history; superseded reminders must not look like current instructions. Suppress or clearly mark unread stale reminders when the underlying appointment changes.
9. After an outage, emit a late 24-hour reminder only while the one-hour threshold has not yet been reached; emit a late one-hour reminder only before session start. Skip stale earlier reminders rather than sending both together. Record skipped/cancelled work for operational diagnosis.
10. Reuse the same server-side foundation for pending expiry, with separate handlers and dedupe rules. Expiry remains correct in foreground commands even if the runner is delayed.
11. Document runner startup/configuration, bounded tenant discovery, disable controls, last successful run, lag, failures, retry count, and recovery. A runner existing in code but absent from deployment is a failed gate.
12. Preserve the existing 20-second notification poll, focus refresh, selected-gym scoping, and stale-response discard. Explain to users that in-app reminders are visible when they open/use the app; no device notification is promised.

### Acceptance tests

- New owner bookings notify both people; accepted/declined/cancelled sessions route to valid authorized details.
- Controlled-clock tests verify 24-hour/one-hour thresholds, short-notice confirmation, exact due time, outages, and stale suppression without waiting real hours.
- Multiple workers, repeated ticks, and restart after commit do not duplicate reminder notifications.
- Notes updates do not reschedule reminders; actual schedule changes do.
- Cancellation/reschedule racing a worker does not emit an unqualified obsolete reminder.
- No reminder is emitted for pending, expired, cancelled, declined, completed, or missed sessions; active sessions do not receive a start reminder.
- Cross-gym/role switches cannot display another context's notification response.

### Exit gate

Lifecycle notifications and both timed reminders work with the browser closed, are deduplicated, and are visible safely through the current bell after sign-in. No external-delivery claim is made.

## 14. PT-07 — Cross-role UX, regression, rollout, and pilot verification

Dependencies: PT-01 through PT-06 verified individually.

### 14.1 Final interface work

1. Member Home prioritizes the next confirmed session, pending request/deadline, relevant credits and expiry, and Request PT action; retain existing workout/meal-plan features.
2. Trainer Schedule prioritizes today, next client, pending decisions, availability, and session actions.
3. Owner Sessions prioritizes today's bookings and an attention queue for pending expiry issues, uncompleted sessions, absences, and member remedies/corrections.
4. Consolidate PT list/calendar navigation within each role without breaking existing URLs or notification links. Do not redesign unrelated navigation.
5. Replace internal language such as end-date-exclusive, idempotency key, and unavailable command affordance with clear explanations and actions. Preserve the technical mechanism underneath.
6. Distinguish no results, unavailable data, stale data, expired access, validation, conflict, and unknown-save outcome. Never substitute zero for an unavailable balance/count.
7. Keep drafts on validation/network errors and prevent accidental duplicate submits. If access expires, explain reauthentication and recover/check any already-submitted command before starting a new one. Do not persist sensitive notes in browser storage.

### 14.2 Required verification matrix

| Area | Minimum evidence |
| --- | --- |
| Service policy | All creation paths reject excluded types/durations; exact boundary cases pass/fail consistently. |
| Availability | Weekly, dated, break, closure, no availability, concurrent edits, DST/timezone cases. |
| Request lifecycle | Limit two, no pending hold, both expiry branches, withdrawal, decline, acceptance, last-credit conflict. |
| Owner booking | Same slot/eligibility rules, direct confirmation, one hold, both notifications. |
| Normal delivery | Request → accept → start → notes → complete with one credit consumed and one net earning/pay outcome. |
| Exceptions | Cancellation boundaries, grace, trainer absence, expiry remedy, reschedule rollback, forgotten session actions, mistaken settlement correction. |
| Concurrency | Request/booking, accept/expiry, accept/accept, cancel/complete, reschedule/cancel, correction/retry, worker/cancel, availability/book. |
| Failure recovery | Response lost after commit, repeated same command, stale quote/version, worker crash/restart and unavailable database. |
| Permissions | Own versus unrelated trainer/member IDs, foreign gym IDs, revoked access, stale session, read-only support, direct API calls. |
| Notifications | Event recipients, detail links, 24H/1H timing, dedupe, skipped stale jobs, selected-gym isolation. |
| Theme/mobile | Current theme retained, both appearances, 320/390/768/1440 widths, long names, empty and error screens. |
| Accessibility | Keyboard order/focus, dialogs, labels, error announcements, contrast, zoom, touch targets, reduced motion. |
| Regression | Membership/pack summaries, trainer relationships/health access, coaching, dashboard reads, finance/pay corrections and audit remain correct. |
| Upgrade | Fresh tenant and existing-tenant upgrade, legacy session preservation, manifest verification, backfill/report review, recovery rehearsal. |

### 14.3 Existing verification commands and harness precautions

Run from the repository root. Check current scripts/configuration first; do not pretend a command was executed or passed. Changed business logic needs relevant unit/integration checks before final broad verification.

```sh
pnpm prepare:checks
pnpm check:workspace
pnpm typecheck:workspace
pnpm lint:workspace
pnpm test:unit
pnpm build:workspace
```

Relevant existing targeted API suites include:

```sh
pnpm --dir apps/api exec vitest run --config vitest.config.session-requests.ts
pnpm --dir apps/api exec vitest run --config vitest.config.sessions.ts
pnpm --dir apps/api exec vitest run --config vitest.config.session-lifecycle.ts
pnpm --dir apps/api exec vitest run --config vitest.config.session-cancel.ts
pnpm --dir apps/api exec vitest run --config vitest.config.session-reads.ts
pnpm --dir apps/api exec vitest run --config vitest.config.notifications.ts
pnpm test:finance:owned
```

Inspect fixtures and database ownership requirements before running integration suites. New availability, expiry, reminder, reschedule, and correction suites need explicit configuration/CI inclusion if existing patterns do not discover them. No required test may exist only as an unreferenced file.

For browser checks, inspect the existing harness in each spec first:

```sh
pnpm --dir apps/web test:e2e
```

Read `docs/manual-testing.md` before `pnpm manual:start` or `pnpm manual:check`. The untouched-seed checker may legitimately stop matching after intentional test mutations; do not change its expected counts to hide a defect. Use a fresh owned fixture for reproducible acceptance.

- Use owned disposable databases/synthetic accounts, never `.env`/live demo credentials or real member data for destructive tests.
- Set harness-required flags only after verifying they target owned disposable resources. Do not point tests at an unknown database to make setup pass.
- Rebuild contracts/clients after schema changes; do not run consumers against stale package output.
- Use controlled clocks/injected time for policy/worker tests rather than changing the host clock or sleeping for hours.
- Preserve traces/screenshots for failures and record actual test environment limitations. Missing Docker, browser assets, or fixture images is a verification gap, not a product pass.

### 14.4 Migration and release rehearsal

1. Inventory existing future confirmed/pending sessions and unsupported legacy service types without changing them.
2. Apply additive migrations to an owned test tenant; update manifests/verification; verify a new tenant and an existing tenant upgrade.
3. Backfill request-expiry/policy fields with a documented rule. Report already-expired or conflicting legacy requests and resolve them through approved commands; do not conceal a mass cancellation in a schema migration.
4. Configure trainer availability explicitly. If using existing shifts as a suggested starting draft, require trainer/owner confirmation before publishing.
5. Rehearse compatibility and deploy order: schema support, API/worker capability, then new UI entry points. Do not activate member requests while expiry handling is unavailable.
6. Verify rollback/recovery compatibility with newly written states and adjustment records. An old binary may not understand `EXPIRED` or new ledger facts; a down-migration/data deletion is not a safe rollback plan. Prefer disabling new entry points and a compatible forward fix where required.
7. Restore a backup in an isolated environment and reconcile bookings, holds, credits, corrections, reminders, and net earnings.
8. Document how staff operate if the app or runner is unavailable, including supported owner reconciliation afterward.

### 14.5 Small pilot

Use an owner, one or two trainers, and approximately five to ten members for several operating days after technical checks pass. Production use/deployment still follows the project's authorization process.

Rehearse and observe:

1. Trainer publishes working hours, a break, and a day off.
2. Member requests a valid slot from a phone; trainer accepts; both views agree.
3. Another request is declined, withdrawn, or expires; its slot is released.
4. Owner directly books a session; both participants receive the in-app event.
5. Trainer starts/completes training; balance and earnings reconcile.
6. Early/late cancellations and a trainer absence receive the correct outcomes.
7. Owner reschedules and corrects a synthetic mistaken result; history and net amounts remain accurate.
8. Synthetic controlled-time fixtures demonstrate both reminders; actual runner operation is monitored during the pilot.

Record friction, failed commands, overdue requests, incorrect credits/earnings, stale reminders, and support interventions. Fix critical defects before wider use; do not expand scope during the pilot.

### Exit gate

All required matrix areas have evidence; no unresolved issue can cause unauthorized access, double booking, incorrect credit/earning settlement, misleading reminder behavior, or unrecoverable PT records. The owner reviews remaining minor limitations and explicitly approves wider launch.

## 15. Milestone dependency and progress tracker

Implementation order is PT-01 → PT-02 → PT-03 → PT-04 → PT-05 → PT-06 → PT-07. Establish the shared runner for expiry in PT-03 and extend it for reminders in PT-06. Apply UI and tests throughout, not only at PT-07.

| Milestone | Status at document creation | Required evidence before Verified |
| --- | --- | --- |
| PT-01: service/policy | Not started | All creation paths and historical compatibility checked. |
| PT-02: availability | Not started | Slot correctness, access, edit/book race, and both-theme editor. |
| PT-03: request/expiry/owner booking | Not started | Limits, expiry worker, races, credit reservation, direct-book notifications. |
| PT-04: details/delivery | Not started | Cross-role detail and normal delivery journey reconciled. |
| PT-05: exceptions/corrections | Not started | Policy boundaries, conserved values, rollback and approved-pay corrections. |
| PT-06: in-app notifications/reminders | Not started | Event matrix, durable runner, threshold/retry/race verification. |
| PT-07: final verification/pilot | Not started | Full matrix, migration/restore rehearsal, pilot and owner sign-off. |

“Not started” means this new upgrade has no verified delivery evidence yet; it does not mean existing PT functionality is absent. Update implementation progress in the companion records instead of erasing this specification's requirements.

## 16. Final PT completion checklist

- [ ] New sessions are in-person, 60 minutes, one credit; historical sessions remain intact.
- [ ] Trainer/owner availability, dated exceptions, closures, and slot discovery work.
- [ ] Creation notice/horizon and pending limit/deadline are enforced server-side.
- [ ] Pending requests block time without holding credits; expiry works with delayed workers.
- [ ] Acceptance/direct booking reserve exactly one eligible credit with current authorization.
- [ ] Booking details and all role views agree; ordinary session delivery settles once.
- [ ] Cancellation/no-show boundaries and trainer-cancellation remedies match the confirmed rules.
- [ ] Owner rescheduling/corrections preserve original history and net credit/financial conservation.
- [ ] Lifecycle notifications and both in-app reminders are durable, scoped, and deduplicated.
- [ ] Current UI theme and architecture are preserved; mobile/keyboard/both-theme evidence exists.
- [ ] Existing-tenant upgrades, worker deployment, monitoring, backup restoration, and recovery are rehearsed.
- [ ] PT-01 through PT-07 are Verified with evidence; remaining limitations are explicit.
- [ ] Owner approves wider launch after the controlled pilot.
