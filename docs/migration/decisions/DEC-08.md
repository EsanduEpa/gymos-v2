# DEC-08 — Settlement locking, payroll periods and correction policy

- Status: **Approved by project owner Esandu — 30 October 2026.**
- Prepared: 26 October 2026, Asia/Colombo.
- Resolution task: [GYMOS-MIG-084](../MIGRATION_TASK_SPECS.md#task-id-gymos-mig-084).
- Accountable reviewer: Esandu, project owner; owner explicitly accepts the decision-review responsibilities.
- Authority: Master Plan; Database map DB05/DB07; Functionality map F-D02/F-D11.

## Preserved approved requirements

Trainer pay is created only from completed sessions. Session rate, trainer level, shift and policy are frozen at confirmation. The first completed earning creates its weekly or monthly period. Approval freezes a period but does not mean payout. Corrections to approved periods are recorded later and never rewrite the approved result.

## Proposed decision

| Area | Exact proposed default |
|---|---|
| Time boundaries | Weekly periods are gym-local Monday 00:00 through the next Monday 00:00, half-open. Monthly periods are local first day 00:00 through next month's first day 00:00, half-open. UTC instants are derived with the period's stored gym timezone. |
| Period assignment | A completed session belongs to the period containing its scheduled start instant in gym-local time. The stored confirmation snapshot supplies rate/level/shift/policy; later configuration edits do not change it. |
| Transaction lock | Completion, reversal/correction and period close acquire a PostgreSQL transaction advisory lock derived from `(gymId, cadence, periodStartLocal)`, then lock the period row, then affected session/earning rows in stable ID order. No code path may reverse this order. |
| Uniqueness | One period per gym/cadence/start and one earning per source session/type are database-enforced. Session/shift overlap uses exclusion constraints or an equivalent documented serializing lock where Prisma cannot express the constraint. |
| Completion vs close | Both operations use the same period lock. If completion obtains it first, its earning commits before close totals. If close/approval obtains it first, a later completion cannot mutate that period and creates a signed correction in the next open period. Retrying uses the original idempotency/provenance key. |
| Period lifecycle | `OPEN` accepts ordinary earnings; `CLOSED` is review-only; `APPROVED` is immutable. Reopening an approved period is forbidden. Payment state is outside this lifecycle and outside MVP. |
| Corrections | A correction is a separate signed amount row in the next open period, references original period/earning/session and includes reason, actor and approval provenance. Sum of original plus corrections is the effective total. Rows are never edited or deleted to conceal history. |
| Quote/version acknowledgment | Commands that hold/consume a credit or create a charge submit the quoted resource version and policy version. Mismatch returns `409 STALE_QUOTE` with a fresh safe quote. A late-cancellation/no-show consequence requires an explicit acknowledgment token bound to quote, actor, gym, session and expiry. |
| Approval | Approval verifies the period version and calculated total, records approver/time, and makes rows immutable. It produces no payout, bank transaction or paid flag. |
| Recovery | Unknown command outcome is resolved from receipt, period and provenance keys before retry. Required audit/notification rows commit in the same tenant transaction under DEC-04. |

## Alternatives and tradeoffs

| Alternative | Tradeoff versus proposal |
|---|---|
| Lock only the period row | Cannot serialize first-period creation before the row exists. A deterministic transaction advisory lock covers create and close. |
| Close by a timestamp snapshot without shared lock | Higher throughput, but concurrent completion can fall inconsistently inside/outside the total. Shared locking gives one defined winner. |
| Reopen and edit approved periods | Familiar bookkeeping workflow, but destroys immutable approval evidence. Signed later corrections preserve history. |
| Treat approval as payout | Fewer states, but asserts an external money movement that MVP does not perform. Rejected. |

## Schema/API impact

- Pay periods store local boundaries, UTC boundaries, timezone, cadence, lifecycle version, calculated total and approval metadata.
- Earnings/corrections store exact amount, source uniqueness, snapshot references and original-period linkage.
- Database migrations install uniqueness and range exclusion constraints with verified migration SQL where Prisma schema syntax is insufficient.
- Quote DTOs expose safe consequence, amount, currency, resource version, policy version and short-lived acknowledgment binding.
- Close/approve/completion commands use idempotency and return stable conflict/outcome codes.

## Expected tests

1. Dates around Monday/month boundaries and DST transitions map to exactly one local period.
2. Concurrent first completions create one period and one earning per session.
3. Completion racing close has the two defined outcomes and never disappears or mutates a closed/approved row.
4. Approval leaves no paid state and blocks edits/deletes/reopen.
5. A correction in the next open period preserves the original approved amount and reconciles the effective total.
6. Stale resource/policy versions return `STALE_QUOTE`; altered, expired or cross-gym acknowledgment cannot authorize a consequence.
7. Concurrent overlap and retry tests prove database constraints/provenance keys prevent duplicate sessions, earnings and audit effects.

These are future implementation tests. No payout or application behavior is claimed by this proposal.

## Historical approval-request checkpoint — 30 October 2026 (superseded)

At that checkpoint, the owner had requested finalization but the owner-review disposition was not yet recorded. The later owner approval below supersedes the separate-reviewer requirement.

## Project-owner clarification — 30 October 2026

The owner explicitly confirmed trainer pay only for completed sessions. Charged cancellations and no-shows do not generate trainer pay. The final disposition below approves the remaining DEC-08 policy under owner review.

## Finalization boundary — 30 October 2026

Owner authorization is recorded from this conversation. Historical proposal/preparation statements above describe earlier checkpoints. This document approves policy, not feature implementation; the final owner review disposition supersedes the earlier separate-reviewer gate. See [finalization record](../SEGMENT_01_FINALIZATION.md) for current verification and scope.

## Final owner review disposition — 30 October 2026

Esandu explicitly stated that decision review will be performed by the project owner and that this is acceptable. This supersedes the separate-reviewer gate and historical pending-review statements above. DEC-08 is approved under owner review with the recorded amendments. No independent specialist review is claimed. This approves policy, not implementation or production release.
