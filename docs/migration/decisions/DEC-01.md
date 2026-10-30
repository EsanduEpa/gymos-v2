# DEC-01 — Master/tenant configuration ownership and profile-save boundary

- Status: **Approved by project owner Esandu — 30 October 2026.**
- Prepared: 26 October 2026, Asia/Colombo.
- Resolution task: [GYMOS-MIG-077](../MIGRATION_TASK_SPECS.md#task-id-gymos-mig-077).
- Accountable reviewer: Esandu, project owner; owner explicitly accepts the decision-review responsibilities.
- Authority: Master Plan; Database map DB01; Functionality map F-D07/F-D08/F-D16.

## Preserved approved requirements

Master owns platform routing, gym lifecycle status and public branding. Each tenant owns its operational currency, timezone, rates and policies. A cross-database write is recoverable work with durable checkpoints; it is never presented as one atomic transaction.

## Proposed decision

| Area | Exact proposed default |
|---|---|
| Master ownership | `gymId`, immutable canonical slug, lifecycle/status, tenant binding and schema compatibility, public display name, and public theme. Master is the routing and public-brand source. |
| Tenant ownership | Legal/contact address, telephone, IANA timezone, ISO currency, payroll cadence, rates, budgets, scheduling rules, membership rules and their versions/effective dates. |
| Initial provisioning | The accepted request records all intended Master and tenant values in a durable C39 operation. Create/bind the tenant, write tenant configuration and verify the reciprocal binding before setting the Master gym to `ACTIVE`. A gym with incomplete tenant configuration remains unavailable with its operation status exposed to authorized platform users. |
| Later saves | Save public brand fields through a Master-only command and operational fields through a tenant-only command. A screen may submit both groups, but the client invokes and reports two explicit commands. A public display-name change is Master-only; tenant audit snapshots copy the name only as historical context. |
| Cross-plane exception | Any future invariant that truly requires both planes must use a durable C39 operation with immutable intent, checkpoints and reconciliation under DEC-04. It cannot be added as an ordinary profile save. |
| Pending projection | Reads return committed values plus an optional `pendingOperation` containing only operation ID, state, affected field names and retryability. Uncommitted requested values are never returned as active configuration. |
| Failure behavior | A failed tenant save rolls back locally. A staged operation remains `PENDING`, `FAILED_RETRYABLE`, `FAILED_FINAL` or `REPAIR_REQUIRED` and resumes by original IDs. It never silently restores or overwrites a value in the other database. |
| Currency/timezone creation gate | Both are required explicit provisioning inputs, validated before work begins, and committed tenant-side before activation. Currency becomes immutable after the first financial activity. Timezone changes after time-bound records exist require a later reviewed migration command. |

## Alternatives and tradeoffs

| Alternative | Tradeoff versus proposal |
|---|---|
| One profile command pretending to be atomic | Simpler UI response, but failure between databases creates an unrepresented partial state. Rejected. |
| Stage every edit through C39 | Uniform recovery, but adds operation latency and coordination to independent local fields. Reserved for real cross-plane invariants. |
| Copy all profile fields into both databases | Faster local reads, but creates two writable sources and conflict rules. Only immutable audit snapshots may copy values. |

## Schema/API impact

- Master gym records retain routing, lifecycle, tenant binding and public-brand fields.
- Tenant `GymConfiguration` holds operational values with `version`, `effectiveAt`, `createdAt` and actor/audit provenance.
- Provisioning intent includes normalized currency and timezone before physical tenant work starts.
- Master and tenant profile commands use separate DTOs, authorization, optimistic versions and audit events.
- Reads label committed configuration and pending operation metadata separately.

## Expected tests

1. Provisioning cannot activate without valid currency, timezone, tenant binding and tenant configuration receipt.
2. Master brand save succeeds or fails independently from a tenant operational save; the result identifies each command.
3. A crash after tenant commit resumes the same operation and activates once, without duplicate configuration or audit.
4. A pending operation never makes its requested values appear committed.
5. Currency change after financial activity and timezone change after time-bound activity are rejected with stable conflict codes.
6. A gym cannot read or mutate another gym's tenant configuration.

These are future implementation tests. No application behavior is claimed by this proposal.

## Historical approval-request checkpoint — 30 October 2026 (superseded)

At that checkpoint, the owner had requested finalization but the owner-review disposition was not yet recorded. The later owner approval below supersedes the separate-reviewer requirement.

## Finalization boundary — 30 October 2026

Owner authorization is recorded from this conversation. Historical proposal/preparation statements above describe earlier checkpoints. This document approves policy, not feature implementation; the final owner review disposition supersedes the earlier separate-reviewer gate. See [finalization record](../SEGMENT_01_FINALIZATION.md) for current verification and scope.

## Final owner review disposition — 30 October 2026

Esandu explicitly stated that decision review will be performed by the project owner and that this is acceptable. This supersedes the separate-reviewer gate and historical pending-review statements above. DEC-01 is approved under owner review with the recorded amendments. No independent specialist review is claimed. This approves policy, not implementation or production release.
