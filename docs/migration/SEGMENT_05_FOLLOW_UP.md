# Segment 05 follow-up after Segment 06/07 prerequisites

Owner scheduling instruction, 2 November 2026: wait for the relevant Segment 06
and 07 work, retain the outstanding Segment 05 requirements, and return to them
when their prerequisites have verified evidence. This records scheduling only;
it does not waive scope, mark acceptance complete, or authorize a merge.

## Prerequisite evidence audit — 2 November 2026

`git fetch origin --prune` completed before this audit. The refreshed remote
contains `main` and Segment 01–05 branches; no Segment 06 or Segment 07 task
branch is present. Tracker rows for GYMOS-MIG-036, 040 and 043 are **Not
Started**, no task evidence files for those IDs exist under
`docs/migration/evidence/`, and `git log --all` contains no commits identifying
those tasks. Therefore none of the three foundations is verified in this
checkout; their expected behavior cannot be treated as delivered by inference.
Continue work independent of those prerequisites and keep dependent acceptance
incomplete until each owning task has passing evidence.

## Follow-up execution update — 3 November 2026

Task 036 now has a partial implementation and task evidence on the active
Segment 05 PR branch: trainer profile/consent saga and owner UI, 26/26
disposable integration tests, and a 13/13 Chromium suite including the trainer
forced-change journey. The recovery suite proves a pending Master link cannot
operationalize the tenant actor before reciprocal activation. Task 036 remains
In Progress because its full owner/API/consumer acceptance and owner review are
not complete. No task 040 or 043 implementation/evidence exists yet. Continue
in the order 036 → 040 → 043, then return to 031/032, 033/034 and 035.

## Ownership and return checklist

| Outstanding requirement | Future provider | Work still owned by Segment 05 | Return gate |
|---|---|---|---|
| Trainer registration foundation | Segment 06 / 036 | Reuse compatible identity/enrollment primitives without treating trainer acceptance as member acceptance. | 036 Completed with evidence. |
| Session aggregate, credit holds and transition constraints | Segment 07 / 040, after 036 | Integrate member profile projections (032), member status/hold release (033), and pack issuance/balances (034). | 040 Completed with evidence; 033 also requires 043 and the other task prerequisites. |
| Selected-gym notifications and audit reads | Segment 07 / 043, after 040 | Produce and verify the correct member status notification/audit effects under 033. | 043 Completed with evidence. |
| Existing-identity consent/reuse, credential loss, forced password change and durable member enrollment recovery | No future task substitutes for 031 | Finish the member workflow and its checkpoint/failure/two-gym acceptance matrix. Shared improvements from 036 may be reused after verification. | Reassess actual 031 implementation and evidence; it remains In Progress. |
| Complete paged roster/profile, safe role projections, bounded derived billing and browser states | 040 supplies session/hold foundations; 034 supplies member pack issuance | Finish 032 integration and role/privacy/foreign-ID/UI acceptance. Session-view work from Segment 07 may be reused where available; do not infer that it completes 032. | Relevant data providers verified, 031 complete, and 032 acceptance passes. |
| Recoverable member status changes and future-hold release | 040 and 043 supply foundations | Implement and verify 033, including version conflicts, retries, concurrent commands, notification failure and retained history. | All dependencies of 033 Completed. |
| Exact-value member pack issuance and conserved balances | 040 supplies hold/transition rules | Implement and verify 034, including immutable issuance, expiry/order, concurrency, foreign IDs and no implied payment. | All dependencies of 034 Completed. |
| Full member enrollment/login/recovery journey | No future task substitutes for 035 | Complete 035 with new/reused identities, one-time handoff, forced change, roster/profile/packs, checkpoint faults and unchanged other gym. | 031, 032, 034 and the other dependencies of 035 Completed. |

## Execution order when work resumes

1. Verify task 036 in Segment 06, then task 040 and task 043 in Segment 07.
2. Reassess the actual member implementation. Finish 031 and the available 032
   work; implement 033/034 once all their task dependencies are satisfied.
3. Finish 032 projections and 035 end-to-end verification, then record any
   required owner acceptance separately.
4. Update authoritative task statuses, evidence, progress, coverage and handoff
   only for the scope actually verified. Passing PR checks alone is insufficient.

Do not wait for every task in Segments 06 and 07 to complete before returning.
Segment 07 tasks 041/042 depend on Segment 05 task 034, and task 047 depends on
033. Follow task dependencies across segment boundaries to avoid a scheduling
cycle. Keep the existing dependency graph and task ownership intact.

## Reassessment checklist

- [ ] 036 verified in its owning scope.
- [ ] 040 verified in its owning scope.
- [ ] 043 verified in its owning scope.
- [ ] 031 member consent, credential and recovery acceptance complete.
- [ ] 032 complete role-safe projections and UI acceptance complete.
- [ ] 033 member status/hold-release acceptance complete.
- [ ] 034 pack issuance/conservation acceptance complete.
- [ ] 035 full member journey and failure-path acceptance complete.
- [ ] Required owner acceptance recorded; latest PR revision passes all required checks.

No requirement in this checklist is resolved merely by creating this record.
