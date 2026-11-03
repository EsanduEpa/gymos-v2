# Segment 07 — PT Sessions, Notifications, and Lifecycle

## Execution instructions for AI agents

This is the highest-risk business segment. Read session-state tables, DEF-02–08, DEC-04/06/07/08/09 and all O08/O09/T01/M02/M03 sources. Build invariants and concurrency tests before wiring buttons. Never expose a generic status setter or trust client time/fee/credit.

## 1. Segment overview

- **Capability:** PT booking/request, member status/hold release, pack issuance/balances, credit holds, role views, start/notes/complete/no-show/cancel, notifications and audit.
- **Objective:** migrate the complete session lifecycle with exact-once financial effects and V1 UI parity.
- **Result:** owner/member/trainer workflows share one authoritative session aggregate; concurrent/repeated commands cannot overbook, overdraw, or double-settle.
- **Priority / complexity:** Critical / Large.
- **Dependencies:** segments 02,04–06; DEC-04/06/07/08/09.
- **In scope:** GYMOS-MIG-033, GYMOS-MIG-034 and GYMOS-MIG-040–048. Task049 remains owned by its finance/operational value segment.
- **Out of scope:** facility class scheduling/check-in, arbitrary status edits, payment capture/refunds, global inbox/push.

## 2. Current V1 implementation

Sources: O08 daily/monthly clients; O09 booking form; T01 schedule client; M02 request form; M03 session client; `app/actions/sessions.ts`; `actions/notifications.ts`; `lib/notifications.ts`; `PTSession/SessionPack/PayRecord/Notification/AuditLog`.

V1 supports owner direct booking, member pending request, trainer accept/decline, start, complete, notes, cancel/withdraw, owner complete/no-show override, daily filters/export and monthly member overview. Known defects include check-then-write collision races, arbitrary pack debit, repeat settlement/no-show, completion from SCHEDULED, ignored zero/policy settings, current-rate pay, ignored action errors, and incomplete refresh. V1 does not deduct at booking/acceptance; V2 must add durable holds, not reproduce or misstate a booking double-charge.

## 3. Target V2 implementation

Tenant session aggregate stores member/trainer, gym-local scheduled instant, duration/type, state/version, fee/pay/policy snapshots, held pack/credit, start/end, notes and terminal settlement origins. Database constraints/locks plus state/version CAS enforce collision and exactly-once effects. Owner booking reserves immediately; member request reserves/quotes according to approved contract and trainer acceptance finalizes eligibility. Only ACTIVE+started sessions complete. Cancellation/no-show uses server quote and equality rules. Notifications/audits commit locally with source event keys; delivery failure never rolls back the business fact.

## 4. V1 to V2 UI migration

- **O08:** preserve stats, Daily/Monthly tabs, date/month controls, search/status filters, table/cards, More overlay, and owner actions; show authoritative eligibility/errors; no silent close.
- **O09/M02:** preserve fields/back/cancel/no-credit warning and pending/errors; server quote/recheck is authoritative.
- **T01:** preserve request/live-session/upcoming/history order, elapsed timer, decline/notes dialogs, action buttons; client timer is display only.
- **M03:** preserve cards/history and distinct withdraw/cancel warning; show actual charge/credit result.
- **Bell:** preserve 20s selected-gym polling, last five, unread count, mark one/all and safe link; add error/pending and discard stale switched-gym response.

## 5. Backend and database migration

Proposed tenant models include Session, CreditHold/Pack ledger, unique Settlement/Origin records, notifications and audit relations, plus indexes/exclusion strategy approved by DEC-08. All commands require Idempotency-Key and request digest; local transaction order is fixed. DTOs use decimal strings and ISO instants/local-date context. Query APIs paginate and project by role. Master operation is used only where a cross-plane effect exists; ordinary session settlement remains one tenant transaction/receipt.

## 6. Detailed tasks

### 033 — member status lifecycle and future hold release (reassigned from Segment 05)

- **Prerequisites:** 004,018,031,032,040,043,078,080,084.
- **Instructions:** versioned/recoverable status command; release/cancel eligible future holds once; preserve settled history and recover cross-plane publication safely.
- **Acceptance/tests:** stale/repeat/concurrent commands, notification outage, foreign member, future/active/terminal sessions and no interim access; preserve dialog/error on failure. **[ ]**

### 034 — member session-pack issuance and balance projection (reassigned from Segment 05)

- **Prerequisites:** 018,030,031,032,040,082–084.
- **Instructions:** exact immutable issue values and receipt/audit; derive available/held/consumed/expired balances from credit movements and active holds; no payment receipt.
- **Acceptance/tests:** zero/negative/precision/expiry, concurrent last credit and duplicate issue, historical packs, owner-only/foreign member and conservation invariant. **[ ]**

### 040 — session aggregate, holds, transition constraints

- **Prerequisites:** 002,004,007,018,029,030,036,080,082–084.
- **Instructions:** add reviewed schema/constraints/indexes; explicit transition service; collision/eligibility/hold/reservation logic; snapshots and version; no generic setter.
- **Acceptance/tests:** state-table unit/property tests; overlapping duration and last-credit barrier races; invariant available+held+consumed; foreign actors; repeat/digest mismatch. **[ ]**

### 041 — owner booking with atomic reservation

- **Prerequisites:** 013,018,034,037,040,043,083,084. **Sources:** O09/bookSession.
- **Instructions:** quote eligible member/trainer/slot/pack; recheck and create SCHEDULED+hold atomically; UI real outcome.
- **Acceptance/tests:** no credit, inactive actor, overlap, DST/limits, concurrent same slot/credit, repeat and post-commit response loss, browser flow. **[ ]**

### 042 — member request and trainer accept/decline

- **Prerequisites:** 013,018,034,039,040,043,080,083,084. **Sources:** M02/T01 actions.
- **Instructions:** member creates PENDING_REQUEST with authoritative quote/hold behavior; assigned trainer accepts to SCHEDULED or declines with optional reason; notify/audit; revalidate slot/credit.
- **Acceptance/tests:** wrong trainer/member, inactive/expired, acceptance collision/last credit, repeat decisions, decline release, two-gym UI. **[ ]**

### 043 — selected-gym notifications and audit reads

- **Prerequisites:** 004,013,018,040,080,085. **Sources:** bell/notification/audit actions.
- **Instructions:** local source-stable event key; recipient/gym; paged sanitized reads; mark one/all owned recipient; polling asOf/version and cancellation; delivery is best-effort after durable fact.
- **Acceptance/tests:** wrong recipient/gym, duplicate event, mark idempotency, switched-gym stale response, delivery outage, no payload secrets/health. **[ ]**

### 044 — owner/trainer/member session read views

- **Prerequisites:** 013,018,041–043,083,085. **Sources:** O08/T01/M03.
- **Instructions:** role projections and date/month/status/page filters; truthful summary windows; bounded history; safe notes/fee/pay; frontend states and query refresh.
- **Acceptance/tests:** all role views over same fixture, >page, timezone boundaries, empty/error, unrelated trainer/member/foreign gym, no partial-page totals. **[ ]**

### 045 — Start and safe shared notes

- **Prerequisites:** 040,044,083,084. **Sources:** T01/start/update notes.
- **Instructions:** assigned trainer starts eligible SCHEDULED within tolerance using server time; versioned notes with approved visibility/limits; idempotent receipts.
- **Acceptance/tests:** early/late/wrong state/actor, repeat/concurrent start, stale version, note privacy/bounds, client timer non-authoritative. **[ ]**

### 046 — complete started session exactly once

- **Prerequisites:** 029,040,045,082–084. **Sources:** `endSession`, pay/revenue effects.
- **Instructions:** ACTIVE+started only; server minimum duration; atomic state CAS, hold consume, operational earning and pay snapshot/origins; audit/notify; safe repeated result.
- **Acceptance/tests:** direct SCHEDULED rejection zero effects, minimum equality, concurrent duplicate/different keys, config change after booking, response loss, conservation and one pay/earning/debit. **[ ]**

### 047 — no-show and quoted cancellation

- **Prerequisites:** 033,038,040,044,045,083,084. **Sources:** owner/member terminal actions.
- **Instructions:** no-show only scheduled+not-started at approved +15m boundary; cancellation quote exposes charge/release/version and command acknowledges it; transition/settle once.
- **Acceptance/tests:** before/equality/after cutoff, toggle/zero window, all states/roles, repeat/concurrent cancel/no-show/complete, stale quote, exact hold result. **[ ]**

### 048 — prove financial/concurrency invariants

- **Prerequisites:** 007,033,038,041–044,046,047,049.
- **Instructions:** barrier-synchronized integration and browser journeys across two gyms; verify persisted counts, receipts, audits, notifications and read convergence for every race/failure.
- **Acceptance/tests:** overlap/last credit/accept/complete/cancel/no-show/status deactivation/period interaction; other gym unchanged; no negative balance or duplicate origin. **[ ]**

## 7. Security and multi-tenancy checklist

- [ ] Role, selected gym, actor, relationship and resource enforced server-side.
- [ ] Fee/pay/clock/eligibility/credit/recipient never trusted from client.
- [ ] Foreign IDs return safe denial without existence leakage.
- [ ] Notes/financial projections are role-minimized.
- [ ] Every effect is idempotent, locally transactional, auditable and tenant-bound.

## 8. Testing and verification

Add unit/state/property tests, owned real-Postgres integration tests with barriers/fault injection, contract tests, and targeted O08/O09/T01/M02/M03/bell Playwright/visual/accessibility tests. Assert persisted row/effect counts, exact decimals, time boundaries, no GET writes, and cross-role convergence. Run relevant Vitest configurations plus changed workspace checks.

## 9. Definition of done

- [ ] All mapped screens/workflows and edge states function.
- [ ] Transition table, holds, collisions, terminal settlement and snapshots satisfy ADRs.
- [ ] Concurrency/failure tests prove exactly-once effects and tenant isolation.
- [ ] No generic status setter or mock financial result remains exposed.

## 10. Agent checkpoints

Stop until DEC-06/07/08 and required people/config fields are approved. Implement task 040 before 033/034/038 consumers. Tasks 033 and 034 are owned here and were moved from Segment 05 to keep session lifecycle ownership coherent. Do not weaken invariants to match a V1 defect.

## 11. Progress and handoff

- **Status:** NOT STARTED
- **Completed:** none
- **Remaining:** 033, 034 and 040–048
- **Next recommended task:** GYMOS-MIG-040.
- **Segment 05 coordination:** its exit gate is tasks031/032/035 and is documented in [the exit checklist](../SEGMENT_05_EXIT_CHECKLIST.md). Task033 and034 are owned in this segment. Complete 040 before their session-hold/credit consumers; complete 034 before booking tasks041/042 and 033 before task047.
- **Files/tests/issues/blockers/decisions:** _fill during execution_

