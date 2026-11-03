# Segment 05 follow-up and ownership record

This record supersedes the earlier scheduling-only note that treated tasks 036, 040 and 043 as prerequisites to all Segment 05 work. The Segment 05 exit scope is now tasks 031, 032 and 035; see [the exit checklist](SEGMENT_05_EXIT_CHECKLIST.md). This scope correction does not alter task implementation status or assert passing evidence.

## Ownership changes

| Capability | Owner | Status and dependency notes |
|---|---|---|
| Member enrollment, account recovery and credentials | Segment 05 / 031 | In Progress; full credential-loss, checkpoint, concurrency and two-gym evidence remains required. |
| Paged member roster, role-safe profile and membership-term history | Segment 05 / 032 | In Progress; session history, pack history and trainer health projection are explicitly excluded and assigned below. |
| Full enrollment/login/recovery journey | Segment 05 / 035 | In Progress; depends on 031/032 and the harness/auth prerequisites. Does not require pack issuance. |
| Member status change and future session-hold release | Segment 07 / 033 | Moved from Segment 05; requires 031/032/040/043 and listed foundations. |
| Exact-value pack issuance and hold-aware balances | Segment 07 / 034 | Moved from Segment 05; requires 031/032/040 and listed foundations; precedes booking tasks 041/042. |
| Session history and recent-session profile panel | Segment 07 / 044 | Owned by session read views; 032 remains a direct prerequisite for profile integration. |
| Confirmed-trainer profile and health projection | Segment 06 / 050 | Owned by confirmed-client relationship/profile contract and its privacy rules. |
| Trainer identity publication consumers | Segment 06 / 039; Segment 07 / 041 | Directory visibility is asserted by 039; booking eligibility is asserted by 041. Task036 remains responsible for registration/credential handoff. |

## Segment 05 close checklist

Use [SEGMENT_05_EXIT_CHECKLIST.md](SEGMENT_05_EXIT_CHECKLIST.md) as the acceptance source. In short, finish 031, 032 and 035 with task-owned recovery, authorization, tenant-isolation, browser and persisted-effect evidence; then update status/evidence/coverage/progress only for results that pass. Record owner acceptance separately. Verify all required hosted PR checks on the latest revision and resolve review findings. Do not merge without explicit authorization for that PR.

## Operational requirements

- Automated database verification uses owned disposable databases and fixtures only; preserve the existing local demonstration data.
- Preserve existing local changes and reviewed evidence. Archive reappeared modified screenshots before restoring committed references.
- Route ordinary generated screenshots to ignored `apps/web/test-results/`.
- No requirement is completed by this ownership record, a passing PR check, or a demo alone.
