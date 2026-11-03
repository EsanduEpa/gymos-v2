# Segment 05 handoff — Member Enrollment and Account Management

Status: **In progress.** Segment 05 owns tasks 031, 032 and 035. None is marked complete. Commits `41a6ad5` and `5d9cf8a` add verified credential recovery, original version-zero handoff, consent browser coverage, and membership-term paging; remaining acceptance is tracked below and in the [exit checklist](SEGMENT_05_EXIT_CHECKLIST.md).

## Segment 05 work remaining

- **031 — enrollment and account recovery:** automated acceptance now covers Master preparation rollback, tenant commit before Master checkpoint recovery, owner-revoked retry denial, acknowledgment/reissue concurrency, strict validation/no-effect cases, durable secret redaction, and the existing two-gym enrollment/recovery journeys. Evidence and commands are in [031](evidence/GYMOS-MIG-031.md). The hosted run on `3bfeb3c` is 10/11 because the unrelated Segment 06 trainer-registration browser test raced its owner redirect; a focused local test passes after a direct-route test fix. Push that fix and verify the hosted rerun. Project-owner manual acceptance remains outstanding.
- **032 — roster and profile:** owner roster and membership-term histories now page past 100 with API/browser evidence. Finish safe role projections, foreign-ID/privacy denials and loading/error/empty accessibility. Session history belongs to 044, pack history to 034, and confirmed-trainer health projection to 050.
- **035 — integrated journey:** new and reused-identity browser journeys now pass across two isolated gyms, including forced change and unchanged second-gym effects. Finish browser-injected durable recovery, repeated-recovery/pending publication effects, and full role/accessibility evidence. Pack issuance and session history are not this task’s acceptance.

Owner manual acceptance for all three tasks is not recorded. No all-task acceptance or Segment 05 handoff is claimed. The latest partial results and exact commands are in [031](evidence/GYMOS-MIG-031.md), [032](evidence/GYMOS-MIG-032.md), [035](evidence/GYMOS-MIG-035.md).

Use the task evidence links in the tracker. Partial code and passing PR checks do not complete a task. Record task owner acceptance separately from automated verification.

## Reassigned work and preserved dependencies

- **033** recoverable member status changes and release future session holds → Segment 07. It still depends on 031, 032, 040, 043 and the platform foundations in its task specification.
- **034** exact-value pack issuance and hold-aware balances → Segment 07. It still depends on 031, 032, 040 and the listed configuration/platform foundations; Segment 07 booking tasks 041/042 depend on it.
- **044** owns owner/trainer/member session views and the recent-session member-profile panel.
- **050** owns confirmed-client roster/profile health projection under its privacy contract.

This reallocation changes ownership and schedule, not required product behavior. No dependency was waived. Tasks 036/040/043 are not automatic blockers for closing 031/032/035 unless a direct dependency is present in that task’s specification. Segment 06 may start at the Segment 05 exit gate; its own task dependencies still apply.

### Dependency evidence audit — 3 November 2026

- **036** is **In Progress**, not complete. Its task-owned evidence records passing partial registration/recovery/browser checks and explicitly lists missing checkpoint, concurrency, consent/reissue, role/foreign-gym and downstream publication acceptance: [GYMOS-MIG-036 evidence](evidence/GYMOS-MIG-036.md).
- **040** and **043** remain **Not Started** in the task tracker, and no task-owned evidence files exist for them. Their full acceptance criteria are still required before downstream session booking/status and notification/audit tasks can close.
- These tasks are retained as prerequisites for Segment 07 tasks 033/034 where specified. They are not direct dependencies of Segment 05 tasks 031/032/035 in the authoritative task specs and therefore do not block the Segment 05 exit gate.

## Verification and data safeguards

Use disposable, owned databases only. Do not reset, delete, reseed or test against the existing local demonstration database. Preserve local changes and evidence screenshots; archive modified reviewed screenshots before restoring committed references. Routine generated captures belong in ignored `apps/web/test-results/`.

No PR merge is authorized by this handoff. The user must explicitly authorize the specific PR before merge.
