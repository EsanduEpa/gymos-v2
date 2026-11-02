# Segment 05 handoff — Member Enrollment and Account Management

Status: **In progress. No Segment 05 task is complete.** Branch `codex/segment-05-member-enrollment` is based on `origin/main` at `97b16a7`.

## Implemented partial slices

- Tasks 031 and 032 remain In Progress; 035 now has partial browser coverage. Evidence: [031](evidence/GYMOS-MIG-031.md), [032](evidence/GYMOS-MIG-032.md), [035](evidence/GYMOS-MIG-035.md).
- Verified local checks: workspace typecheck, lint and build; contract tests (26/26); disposable tenancy integration suite (23/23), including consent/refusal, tenant rollback retry and post-tenant-commit recovery; full disposable Playwright suite (12/12), including enrollment, one-time credential handoff, forced password change and unchanged second gym. No shared/local demonstration database was used. The harnesses cleaned 8 and 7 disposable databases respectively, plus their containers/manifests.
- Member identity rows, profile and term commit use the existing durable operation/receipt foundation. Exact price and exclusive end date are snapshotted; no payment is recorded. Pending operation rows stay out of the owner roster.

## Required work before Segment 05 completion

- Task 031: complete credential-loss/reissue behavior, remaining checkpoint recovery matrix, owner-revocation/concurrency cases and full two-gym verification. Consent/reuse, decline, new-member forced-change journey, tenant rollback retry and post-tenant/pre-activation recovery now pass.
- Task 032: complete role-specific projections and UI verification; task 040 must supply complete session and pack history.
- Task 033: depends on task 040 and task 043; status/hold release command is not implemented.
- Task 034: depends on task 040; pack issuance and held/consumed/released balance ledger are not implemented. The profile labels this history unavailable.
- Task 035: full cross-role browser and recovery journey is not complete; current evidence covers a new identity and first-login forced password change only.
- Prerequisites must be delivered in their owning scopes: task 036 (Segment 06 trainer enrollment), then task 040 (Segment 07 session aggregate/holds), and task 043 (Segment 07 notifications/audit reads, dependent on 040). Do not remove these dependencies.

## Next recommended task

Owner scheduling instruction (2 November 2026): verify actual completion evidence for **GYMOS-MIG-036** in Segment 06, then **GYMOS-MIG-040** and **GYMOS-MIG-043** in Segment 07. None currently has completion evidence in the refreshed checkout. Retain and resume all outstanding member work using the [follow-up checklist](SEGMENT_05_FOLLOW_UP.md). Tasks 031/032/035 remain In Progress; 033/034 remain Not Started. No Segment 05 completion or owner acceptance is implied.

Return at these task gates rather than after all of Segment 07: its booking tasks 041/042 need task 034, and task 047 needs task 033. Existing owner acceptance remains outstanding for prior segments. Do not merge any PR without the user's explicit authorization for that PR.
