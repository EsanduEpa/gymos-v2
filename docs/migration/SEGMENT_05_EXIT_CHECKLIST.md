# Segment 05 exit checklist — Member Enrollment and Account Management

Segment 05 now owns **GYMOS-MIG-031, 032 and 035**. All three are still in progress; this checklist is a scope and acceptance aid, not evidence that any item has passed. Task 033 (member status/hold release) and 034 (session-pack issuance/balances) moved to Segment 07 because both are session-credit lifecycle behavior. Their task IDs and dependency edges remain intact. The latest partial verification addendum is recorded at commit `41a6ad5` (3 November 2026).

## Exit gate: required before Segment 06 starts

- [ ] **031 — full enrollment and account recovery:** verify owner authorization and selected-gym isolation server-side; existing-identity consent/reuse and refusal; role conflicts; one-time credential handling, forced password change, credential loss/reissue; durable checkpoints, lost response/retry, tenant rollback and Master activation recovery; concurrency/idempotency; no partial/unpublished actor leaks; exact membership-term values/boundaries; recursive secret redaction.
- [ ] **032 — roster and member profile:** prove stable paging/search/status/full-filter totals beyond 100 records; null/empty/error states; complete member fields and membership-term history; current/basic/pending/historical/operational states clearly distinguished; safe role projections for owner/member/support/trainer; safe foreign-resource denial; pure reads; no password/hash/database leakage. Session history, pack history and trainer health are excluded from this task.
- [ ] **035 — integrated enrollment journey:** in disposable two-gym fixtures, complete new and verified reused identity flows, login, forced password change, member role entry, owner roster/profile and durable recovery after injected failures; assert persisted effect counts and unchanged second gym; verify one-time secret is cleared and never returned after handoff. Do not include pack issuance or session-history acceptance here.
- [ ] Each task’s full acceptance criteria has task-owned evidence with exact revision, disposable environment/fixtures, commands and exit codes, persisted effects, failure/negative cases, browser artifacts where applicable, and explicit skipped checks.
- [ ] Update tracker, task evidence, coverage, progress and handoff from passing results only. Keep Codex/automated verification separate from required owner manual acceptance; record owner acceptance explicitly when given.
- [ ] On the latest PR revision, all 11 required hosted checks pass and any review findings are resolved. The PR remains unmerged until the user authorizes that specific PR.

### Partial results recorded; not exit approval

- [x] 031: existing-identity acceptance/refusal, lost reissue response/API recovery, revoked-secret rejection, forced password change, tenant rollback and post-tenant/pre-activation recovery have evidence. Chromium covers consent, credential replacement, first login and gym isolation.
- [x] 032: owner roster paging beyond 100 and membership-term profile paging beyond 100 have disposable integration evidence; browser verifies page navigation.
- [x] 035: new-member and explicitly consented existing-identity browser journeys pass in disposable two-gym fixtures.
- [ ] 031 remaining fault boundaries, owner revocation/concurrency races, and broad validation/redaction matrix.
- [ ] 032 remaining role projection/foreign-ID/privacy matrix and accessible empty/loading/error browser states.
- [ ] 035 injected-failure browser recovery and complete repeated-recovery/pending-publication effects.
- [ ] Independent owner manual acceptance for 031/032/035.
- [ ] Latest PR hosted checks (11 required) and review findings.

Evidence: [031](evidence/GYMOS-MIG-031.md), [032](evidence/GYMOS-MIG-032.md), [035](evidence/GYMOS-MIG-035.md). These partial passes do not make Segment 05 ready to hand off.

**Segment 05 is ready for Segment 06 when 031, 032 and 035 are complete with evidence and required owner acceptance is recorded.** An outstanding Segment 07 task is not a Segment 05 blocker unless it is a direct prerequisite of one of those three tasks. Segment 06 work may begin at that gate; unrelated Segment 06 tasks do not need to be complete first.

## Deliberately owned by later segments

| Capability | Owner | Return/dependency note |
|---|---|---|
| Member status change, revocation and future session-hold release | Segment 07 / 033 | Requires 031, 032, 040, 043 and listed platform foundations. |
| Exact-value pack issue, credit ledger and hold-aware balance | Segment 07 / 034 | Requires 031, 032, 040 and listed configuration/platform foundations; task041/042 depend on it. |
| Owner/trainer/member session history and recent-session member-profile panel | Segment 07 / 044 | Additive integration to the member profile; requires session request/booking/read foundations. |
| Confirmed-client roster/profile and trainer health projection | Segment 06 / 050 | Only confirmed relationship projections; must follow task050 privacy contract. |
| Trainer registration and trainer roster/directory | Segment 06 / 036–039 | Separate Segment 06 acceptance; 036 partial status is not treated as complete here. |

## Preservation and verification rules

- Use disposable, owned databases and fixtures only. Never reset, reseed or use the existing local demo database.
- Preserve existing uncommitted work and evidence. Archive modified reviewed screenshots before restoring references; send routine generated captures to ignored `apps/web/test-results/`.
- Passing PR checks alone do not satisfy task acceptance. No completion or owner approval is inferred from a demo.
