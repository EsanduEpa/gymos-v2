# Segment 05 — Member Enrollment and Account Management

## Execution instructions for AI agents

Read O02–O04 and tasks 031–035; verify auth/config/member eligibility and session aggregate prerequisites; treat current V2 POST member as basic contact only; implement recoverable enrollment and sanitized projections; test two-gym and failure checkpoints before marking complete.

## 1. Segment overview

- **Capability:** owner-assisted member enrollment, account/profile, membership, status, and session packs.
- **Objective:** migrate O02/O03/O04 without raw user leakage, fake payments, or partial enrollment.
- **Result:** owner can register a member with one-time credential handoff, browse/search/profile, manage status and packs, and recover interrupted enrollment.
- **Priority / complexity:** High / Large.
- **Dependencies:** segments 02–04; task 040 session/hold base before 033/034; DEC-02/04/06/07/08.
- **In scope:** GYMOS-MIG-031–035.
- **Out of scope:** facility check-in, progress UI, real payment capture/refunds/receipts, self-registration, arbitrary profile editing not in V1.

## 2. Current V1 implementation

- **O02** `owner/members/page.tsx` + `members-list-client.tsx`: name/email/phone search, status filter, plan/expiry/status columns, 25-row paging, profile links.
- **O03** new page/form + `actions/members.ts:createMember`: full name, email, phone, DOB default, emergency contact, plan, health notes; pending/error; one-time password Copy and Continue.
- **O04** detail page/client + member/pack/financial actions: banner/status; Overview, last-five PT “Attendance,” derived Billing tabs; issue-pack modal; status confirmation; desk-payment dialog and receipt alert.
- V1 direct page loads can serialize raw `User`; registration is multi-write and can partially succeed; latest-created membership/pack is mislabeled active; status errors can be ignored; billing PAID/receipt are not authoritative.

Current V2 GET/POST `/gyms/:slug/members` handles only id/fullName/nullable email/status with a newest-100 cap and no identity, access, membership, phone, pagination, or detail endpoint.

## 3. Target V2 implementation

Use Master operation for identity/access publication and tenant transaction/receipt for `Member`, profile, initial MembershipTerm, and optional initial pack only when specified. Generate credentials via segment 02; publish only after reciprocal proof. Reads return sanitized role-specific DTOs. List uses server pagination/filter and full totals. Status command is versioned/recoverable and releases eligible future holds through session service. Pack issuance creates an exact-value entitlement ledger/projection; it does not claim cash receipt.

## 4. V1 to V2 UI migration

Preserve O02 filters/table/pager/empty hint; O03 field layout and full-form→one-time-handoff replacement; O04 banner, tabs, confirmation and pack modal. Normalize nullable email safely. Preserve “Attendance” layout while label/copy must honestly mean recent PT sessions. Remove/hide deferred desk-payment and fake receipt controls per approved MVP; billing may show derived membership/pack operational rows explicitly labeled, never PAID. Keep drafts and errors visible on failure; close/reset only on verified success.

## 5. Backend and database migration

Tenant `Member` is extended with approved profile fields and registration state; MembershipTerm/Pack models use independent IDs, Decimal and local dates. Master identity/access are global; health notes stay tenant-private and only owner/confirmed-related-trainer projections may expose approved fields. Enrollment operation checkpoints Master prepare→tenant commit receipt→Master activate. Never delete a reused global identity as compensation. Pack availability/holds are transactionally guarded and ordered per DEC-07/08.

## 6. Detailed tasks

### GYMOS-MIG-031 — full member registration vertical slice

- **Prerequisites:** 017,018,023,028,030,078,080,083. **Sources:** O03, `createMember`, schema/maps.
- **Targets:** tenant Member/profile migration; proposed member enrollment Nest module/contracts/client; O03 web page.
- **Instructions:** strict fields/bounds; canonical identity new/reuse flow; operation idempotency; tenant actor+term transaction/receipt; Master reciprocal activation; one-time credential only for new identity; no registration revenue/payment.
- **Acceptance/test:** new/reused email, role conflict, duplicate key/digest, fault after every checkpoint, response loss, validation, cross-gym, secret redaction. **[ ]**

### GYMOS-MIG-032 — paged member list and complete profile

- **Prerequisites:** 013,018,030,031. **Sources:** O02/O04 pages/clients and direct Prisma reads.
- **Targets:** member list/detail query APIs/DTOs and web routes.
- **Instructions:** explicit selects; q/status/cursor-or-page contract; accurate totals; current term and pack projections; last-five sessions; bounded derived billing; role-specific health fields; safe 404.
- **Acceptance/test:** >100 records, filters/page clamp/null email, empty/loading/error, owner/support/member/trainer projections, foreign IDs, forbidden-key recursive check. **[ ]**

### GYMOS-MIG-033 — recoverable member status and hold release

- **Prerequisites:** 004,018,031,040,043,078,080,084. **Sources:** O04 status UI, `updateMemberStatus`, known expiry defect.
- **Targets:** member status command/service/receipt/audit/notification and UI dialog.
- **Instructions:** allowed transitions with version/reason; separate identity access from membership terms; release/cancel future holds per policy atomically/recoverably; return actual result; retain dialog/error on failure.
- **Acceptance/test:** stale/repeat/concurrent command, future/active/terminal sessions, notification outage, foreign member, no partial published result. **[ ]**

### GYMOS-MIG-034 — session-pack issuance and balance projection

- **Prerequisites:** 018,030,031,040,082–084. **Sources:** O04 pack modal, `issueSessionPack`, SessionPack/pricing.
- **Targets:** tenant pack/hold ledger/schema, command/query APIs and profile UI.
- **Instructions:** validate positive sessions/nonnegative exact price/validity; approved expiry/order; immutable issuance values; available=issued−held−consumed/released; no fake cash/receipt.
- **Acceptance/test:** zero/negative/precision/expiry, concurrent last credit/issue, historical expired packs, owner-only, foreign member, conservation invariant. **[ ]**

### GYMOS-MIG-035 — enrollment and recovery journey

- **Prerequisites:** 007,020,031,032,034. **Sources:** O03→O04 workflow, harness.
- **Targets:** API/Playwright/fault evidence only unless defects found.
- **Instructions:** run new/reused member through login forced change, role entry, owner roster/profile/pack; inject each cross-plane failure and resume; prove other gym unchanged.
- **Acceptance/test:** exactly one identity/access/actor/term/pack as expected; one-time secret absent after handoff; repair states hidden from normal lists; screenshots and persisted counts recorded. **[ ]**

## 7. Security and multi-tenancy checklist

- [ ] Enrollment verifies current OWNER and trusted gym; no client actor/gym authority.
- [ ] Raw User/password/hash/DB/health fields never leak.
- [ ] Reused identity is verified and never password-reset/deleted as compensation.
- [ ] Tenant actor and Master access reciprocal tuple required before publication.
- [ ] Foreign member/plan/pack/session IDs deny safely.

## 8. Testing and verification

Run contract/client tests, member service unit tests, owned identity/operation/tenant DB integration tests, barrier concurrency for packs/holds, and targeted O02–O04 Playwright/visual/accessibility journeys. Verify persisted counts and pure reads. Use workspace lint/typecheck after targeted tests.

## 9. Definition of done

- [ ] O02–O04 required behavior exists; deferred mock payment/receipt is absent/honest.
- [ ] Registration and status operations recover safely.
- [ ] List/profile are complete, paged, sanitized, role-limited, and isolated.
- [ ] Pack balances conserve under concurrency.
- [ ] All five tasks pass and current basic-contact data receives an explicit compatibility treatment.

## 10. Agent checkpoints

Do not stretch the current basic member endpoint into enrollment without operation/identity semantics. Do not implement 033/034 before task 040 establishes holds/transitions. Stop on unresolved health/profile ownership.

## 11. Progress and handoff

- **Status:** IN PROGRESS — automated implementation and owner acceptance are incomplete.
- **Completed:** none. Tasks 031, 032 and 035 have partial code and passing targeted verification; none meets its full Definition of Done.
- **Remaining:** finish 031/032; implement prerequisite tasks 036, 040 (which itself depends on 036), and 043 in their owning scopes; then implement 033/034 and complete 035. Do not mark dependent work complete early.
- **Verification to date:** `pnpm typecheck:workspace`, `pnpm lint:workspace`, `pnpm build:workspace`, and `pnpm --dir packages/contracts test` (26/26); owned disposable tenancy integration tests (22/22, including identity consent/refusal and recovery after a tenant commit); owned disposable Playwright suite (12/12, including new-member registration, one-time handoff, forced first-login password change, and two-gym isolation). Test evidence: `docs/migration/evidence/GYMOS-MIG-031.md`, `GYMOS-MIG-032.md`, and `GYMOS-MIG-035.md`.
- **Files/tests/issues/blockers/decisions:** 036, 040 and 043 have no completion evidence in this checkout or on refreshed origin branches; tracker status is Not Started. Consent/refusal and one credential recovery segment are implemented, but task 031 still lacks the full credential-loss, checkpoint, concurrency and two-gym matrix. Task 032 lacks sessions/packs and complete role-specific acceptance. No status/hold-release command or member pack ledger exists. Do not begin dependent tasks 033/034 or claim 035 complete before the required providers pass.
- **Scheduling — owner instruction, 2 November 2026:** wait for task 036 in Segment 06, then tasks 040/043 in Segment 07. Outstanding member requirements remain assigned to 031–035; follow the [recorded ownership and return checklist](../SEGMENT_05_FOLLOW_UP.md). This is a scheduling hold, not completed or removed scope.
- **Next recommended task:** resolve and verify task 036 in Segment 06, then 040 and 043 in Segment 07, since no actual completion evidence is currently present. Continue independent 031 and 032 acceptance work meanwhile. Do not wait for every Segment 07 task: 041/042 depend on 034, and 047 depends on 033.

