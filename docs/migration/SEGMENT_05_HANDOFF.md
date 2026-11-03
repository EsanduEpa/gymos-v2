# Segment 05 handoff — Member Enrollment and Account Management

Status: **In progress.** Segment 05 owns tasks 031, 032 and 035. None is marked complete by this scope update. The actionable exit gate is [SEGMENT_05_EXIT_CHECKLIST.md](SEGMENT_05_EXIT_CHECKLIST.md).

## Segment 05 work remaining

- **031 — enrollment and account recovery:** finish full credential-loss/reissue, checkpoint, concurrency, idempotency and two-gym failure-path acceptance. Keep identity-consent/refusal, one-time credential and forced-change requirements.
- **032 — roster and profile:** finish paging, membership-term history, role-safe projections, privacy/tenant denials and browser states. Session history belongs to 044, pack history to 034, and confirmed-trainer health projection to 050.
- **035 — integrated journey:** prove enrollment/login/recovery across two isolated gyms, including durable recovery and persisted effect counts. Pack issuance and session history are not this task’s acceptance.

Use the task evidence links in the tracker. Partial code and passing PR checks do not complete a task. Record task owner acceptance separately from automated verification.

## Reassigned work and preserved dependencies

- **033** recoverable member status changes and release future session holds → Segment 07. It still depends on 031, 032, 040, 043 and the platform foundations in its task specification.
- **034** exact-value pack issuance and hold-aware balances → Segment 07. It still depends on 031, 032, 040 and the listed configuration/platform foundations; Segment 07 booking tasks 041/042 depend on it.
- **044** owns owner/trainer/member session views and the recent-session member-profile panel.
- **050** owns confirmed-client roster/profile health projection under its privacy contract.

This reallocation changes ownership and schedule, not required product behavior. No dependency was waived. Tasks 036/040/043 are not automatic blockers for closing 031/032/035 unless a direct dependency is present in that task’s specification. Segment 06 may start at the Segment 05 exit gate; its own task dependencies still apply.

## Verification and data safeguards

Use disposable, owned databases only. Do not reset, delete, reseed or test against the existing local demonstration database. Preserve local changes and evidence screenshots; archive modified reviewed screenshots before restoring committed references. Routine generated captures belong in ignored `apps/web/test-results/`.

No PR merge is authorized by this handoff. The user must explicitly authorize the specific PR before merge.
