# Segment 06 and 07 acceptance checklist

Working checklist created 3 November 2026 from the segment plans and task specs. Status is for the uncommitted working tree on `codex/segment-06-management`, based on `7c09fd4`. `In Progress` means code or tests exist; it does not satisfy the task's dependency/definition-of-done gate.

## Segment 06 — Trainer management and coaching

| Task | Acceptance outcome to verify | Current gate | Evidence |
|---|---|---|---|
| 036 | Trainer registration, safe one-time credential handoff, recoverable publication and owner/trainer role journey | Completed in PR #7; verify linked final evidence and hosted checks | [036](GYMOS-MIG-036.md) |
| 037 | Paged owner roster/profile; strict versioned local-time shifts; truthful bounded session summary; safe foreign-role denial | In Progress; guarded API and responsive browser evidence exist; needs booking/request consumers and final hosted/visible review | [037](GYMOS-MIG-037.md) |
| 038 | Trainer-specific recoverable status operation; cancel only eligible future sessions; release each hold/audit/notification once; serialize with booking/acceptance; preserve other-gym access/history and reactivation semantics | In Progress; interrupted recovery, notification rollback, held-fence barrier, retry, reactivation and cross-gym checks pass; consumer race gates remain | [038](GYMOS-MIG-038.md) |
| 039 | Active member-safe directory, no private fields, selected-gym request destination, empty/error/foreign-gym behavior | In Progress; directory API/UI and isolation evidence pass; Task 042 route integration and final browser review remain | [039](GYMOS-MIG-039.md) |
| 050 | Confirmed-client relationship gate at every request; paged roster and privacy-minimized trainer 360/history | In Progress; bounded cross-plane relationship scan and guarded suite pass; UI, final review and hosted/visible gates remain | [Task 050 spec](../MIGRATION_TASK_SPECS.md#task-id-gymos-mig-050) |
| 051 | Bounded transactional workout aggregate; trainer confirmation gate; save/retrieve last two; member reads own published assignment only | In Progress; guarded coaching suite passes assignment/replay/member-own checks; workout UI/E2E evidence is being finalized | [Task 051 spec](../MIGRATION_TASK_SPECS.md#task-id-gymos-mig-051) |
| 052 | Bounded meal aggregate/macros/day mapping; server totals; trainer confirmation gate; member reads own published assignment only | In Progress; guarded coaching suite passes ISO weekday/macros/assignment/member-own checks; meal UI/E2E evidence is being finalized | [Task 052 spec](../MIGRATION_TASK_SPECS.md#task-id-gymos-mig-052) |

## Segment 07 — PT sessions, notifications and lifecycle

| Task | Acceptance outcome to verify | Current gate | Evidence |
|---|---|---|---|
| 033 | Recoverable member status; revoke eligibility; cancel future eligible sessions and release holds once; preserve history; notification/audit failure recovery | In Progress; guarded lifecycle suite passes recovery/replay; same member’s independent Gym B access/session survives Gym A status changes; routed HTTP guard proof is being closed | [033](GYMOS-MIG-033.md) |
| 034 | Owner-only exact immutable pack issuance; zero/precision/expiry rules; ledger-derived available/held/consumed/expired; rollback and conflicting-key safety | In Progress; guarded issuance/balance, rollback and conflicting-key checks pass; Task 040 and full lifecycle dependencies remain | [034](GYMOS-MIG-034.md) |
| 040 | Named session transitions, state/version/overlap constraints, deterministic ordinal/value holds, release/consume ledger invariants, bounded transaction retry and actor checks | In Progress; foundation and guarded invariant tests pass; downstream commands and complete mapped receipt/authorization acceptance remain | [040](GYMOS-MIG-040.md) |
| 041 | Owner options and booking; local-time/DST/horizon/eligibility recheck; atomic scheduled session + hold + snapshots + receipt/audit/notification; safe replay and concurrent last-credit winner | In Progress; guarded API test 3/3 and headed browser 1/1; owner-observed Chrome, deactivation race and hosted checks remain | [041](GYMOS-MIG-041.md) |
| 042 | Member request creates pending without hold; assigned trainer accept/decline; recheck expiry/eligibility/collision/credit; receipt/audit/notification atomicity and single-winner races | In Progress; guarded request suite 4/4 and contracts/UI pass; member-visible decline reason is owner-approved; final HTTP/visible/hosted gates remain | [042](GYMOS-MIG-042.md) |
| 043 | Selected-gym bell/audit read privacy; idempotent recipient-owned reads/marks; event source de-duplication; lifecycle producers and delivery outcome | In Progress; read/UI and guarded tests pass; booking/request/lifecycle producer and final integration acceptance remain | [043](GYMOS-MIG-043.md) |
| 044 | Owner/trainer/member role views; gym-local date/month bounds and full-filter totals; >100 pagination; truthful pack/month totals; bounded recent panel; empty/error/refresh/timer behavior | In Progress; guarded session read/C63 suites and headed role E2E pass; quote-first policy controls are integrated; owner-observed Chrome and hosted gates remain | [044](GYMOS-MIG-044.md) |
| 045 | Assigned trainer start within server-time tolerance; versioned shared notes with bounds/visibility; repeat/stale/wrong-actor denial | In Progress; guarded lifecycle suite 3/3 covers role/version/start and notes receipts; UI integration and release gates remain | [045](GYMOS-MIG-045.md) |
| 046 | Only started sessions complete; minimum duration; one atomic hold consume, settlement, revenue/operational earning/pay origin, audit/notification and replay result | In Progress; guarded lifecycle suite 3/3 covers atomic completion, replay, rollback and approved-period correction provenance; UI/release gates remain | [046](GYMOS-MIG-046.md) |
| 047 | Server-quoted cancellation/no-show exact boundaries; accepted quote/version; role/state rules; exactly-once terminal settlement or release | In Progress; guarded suite 5/5 and exact cutoff/grace tests pass; role quote panels are integrated in headed E2E; owner-observed Chrome and hosted gates remain | [047](GYMOS-MIG-047.md) |
| 048 | Barrier-synchronized two-gym tests across overlap/last-credit/accept/complete/cancel/no-show/status races; persisted receipt/audit/notification/value counts and read convergence | Gated; on 3 Nov 2026 the owner chose to preserve Task 049's Segment 08 finance ownership, so this task waits for that dependency and no 049 implementation is included | [Task 048 spec](../MIGRATION_TASK_SPECS.md#task-id-gymos-mig-048) |

## Cross-segment release gates

- [ ] All task dependencies above have linked evidence; no task is marked complete from implementation alone.
- [ ] Workspace contracts/API/web typecheck, lint and production build pass on the final combined revision.
- [ ] Disposable PostgreSQL suites cover rollback, retries, role/tenant/privacy, concurrent access-fence races and exact persisted effects. Demo and V1 databases are not used.
- [ ] Visible Chrome review is performed in the correct app window for owner, trainer and member journeys. Current CUA browser host is unavailable; no owner-observed review is claimed.
- [ ] Evidence names commands, exit codes, disposable environment/cleanup, screenshots actually reviewed, and whether review was agent-performed or owner-observed.
- [ ] Focused commit(s), reviewable PR(s) and hosted checks are prepared when Git access permits. No merge or deployment is authorized.
