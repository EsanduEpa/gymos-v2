# Segment 05 — Member Enrollment and Account Management

## Execution instructions for AI agents

Read O02–O04 and tasks 031, 032 and 035; treat current V2 POST member as basic contact only; implement recoverable enrollment and sanitized roster/profile projections; test two-gym and failure checkpoints before marking complete. Session lifecycle tasks 033/034 are owned by Segment 07.

## 1. Segment overview

- **Capability:** owner-assisted member enrollment, roster/profile and membership-term history.
- **Objective:** migrate O02/O03/O04 without raw user leakage, fake payments, or partial enrollment.
- **Result:** owner can register a member with one-time credential handoff, browse/search/profile and recover interrupted enrollment.
- **Priority / complexity:** High / Large.
- **Dependencies:** segments 02–04; DEC-02/04/07; session history and trainer health projections are owned by later segments.
- **In scope:** GYMOS-MIG-031, 032 and 035. Tasks 033 and 034 are reassigned to Segment 07; task IDs and dependency edges are retained.
- **Out of scope:** facility check-in, progress UI, real payment capture/refunds/receipts, self-registration, arbitrary profile editing not in V1.

## 2. Current V1 implementation

- **O02** `owner/members/page.tsx` + `members-list-client.tsx`: name/email/phone search, status filter, plan/expiry/status columns, 25-row paging, profile links.
- **O03** new page/form + `actions/members.ts:createMember`: full name, email, phone, DOB default, emergency contact, plan, health notes; pending/error; one-time password Copy and Continue.
- **O04** detail page/client + member/pack/financial actions: banner/status; Overview, last-five PT “Attendance,” derived Billing tabs; issue-pack modal; status confirmation; desk-payment dialog and receipt alert.
- V1 direct page loads can serialize raw `User`; registration is multi-write and can partially succeed; latest-created membership/pack is mislabeled active; status errors can be ignored; billing PAID/receipt are not authoritative.

Pre-Segment-05 V2 baseline GET/POST `/gyms/:slug/members` handled only id/fullName/nullable email/status with a newest-100 cap and no identity, access, membership, phone, pagination, or detail endpoint.

## 3. Target V2 implementation

Use Master operation for identity/access publication and tenant transaction/receipt for `Member`, profile and initial MembershipTerm. Pack issuance is task034 in Segment07. Generate credentials via segment 02; publish only after reciprocal proof. Reads return sanitized role-specific DTOs. List uses server pagination/filter and full totals. Status command is versioned/recoverable and releases eligible future holds through session service. Pack issuance creates an exact-value entitlement ledger/projection; it does not claim cash receipt.

## 4. V1 to V2 UI migration

Preserve O02 filters/table/pager/empty hint; O03 field layout and full-form→one-time-handoff replacement; O04 member banner/profile/term history. Status and pack panels consume Segment07 tasks033/034. Normalize nullable email safely. Preserve “Attendance” layout while label/copy must honestly mean recent PT sessions. Remove/hide deferred desk-payment and fake receipt controls per approved MVP; billing may show derived membership/pack operational rows explicitly labeled, never PAID. Keep drafts and errors visible on failure; close/reset only on verified success.

## 5. Backend and database migration

Tenant `Member` is extended with approved profile fields and registration state; MembershipTerm/Pack models use independent IDs, Decimal and local dates. Master identity/access are global; health notes stay tenant-private and only owner/confirmed-related-trainer projections may expose approved fields. Enrollment operation checkpoints Master prepare→tenant commit receipt→Master activate. Never delete a reused global identity as compensation. Pack availability/holds are transactionally guarded and ordered per DEC-07/08.

## 6. Detailed tasks

### GYMOS-MIG-031 — full member registration vertical slice

- **Prerequisites:** 017,018,023,028,030,078,080,083. **Sources:** O03, `createMember`, schema/maps.
- **Targets:** tenant Member/profile migration; proposed member enrollment Nest module/contracts/client; O03 web page.
- **Instructions:** strict fields/bounds; canonical identity new/reuse flow; operation idempotency; tenant actor+term transaction/receipt; Master reciprocal activation; one-time credential only for new identity; no registration revenue/payment.
- **Acceptance/test:** new/reused email, role conflict, duplicate key/digest, fault after every checkpoint, response loss, validation, cross-gym, secret redaction. **[x]**

### GYMOS-MIG-032 — paged member list and complete profile

- **Prerequisites:** 013,018,030,031. **Sources:** O02/O04 pages/clients and direct Prisma reads.
- **Targets:** member list/detail query APIs/DTOs and web routes.
- **Instructions:** explicit selects; q/status/cursor-or-page contract; accurate totals; current membership-term history and bounded derived membership billing; role-safe fields; safe 404.
- **Acceptance/test:** >100 records, filters/page clamp/null email, empty/loading/error, owner/support/member/trainer projections, foreign IDs, forbidden-key recursive check. **[x]**

### GYMOS-MIG-033 — moved to Segment 07

Recoverable member status changes and session hold release are session-lifecycle behavior. Ownership moves to Segment 07; dependencies remain 031, 032, 040, 043 and the existing platform foundations. See the Segment 07 task specification.

- **Prerequisites:** 004,018,031,040,043,078,080,084. **Sources:** O04 status UI, `updateMemberStatus`, known expiry defect.
- **Targets:** member status command/service/receipt/audit/notification and UI dialog.
- **Instructions:** allowed transitions with version/reason; separate identity access from membership terms; release/cancel future holds per policy atomically/recoverably; return actual result; retain dialog/error on failure.
- **Acceptance/test:** stale/repeat/concurrent command, future/active/terminal sessions, notification outage, foreign member, no partial published result. **[ ]**

### GYMOS-MIG-034 — moved to Segment 07

Session-pack issuance, hold-aware balances and pack history are session credit lifecycle behavior. Ownership moves to Segment 07; dependencies remain 031, 032, 040 and the existing money/configuration foundations. See the Segment 07 task specification.

- **Prerequisites:** 018,030,031,040,082–084. **Sources:** O04 pack modal, `issueSessionPack`, SessionPack/pricing.
- **Targets:** tenant pack/hold ledger/schema, command/query APIs and profile UI.
- **Instructions:** validate positive sessions/nonnegative exact price/validity; approved expiry/order; immutable issuance values; available=issued−held−consumed/released; no fake cash/receipt.
- **Acceptance/test:** zero/negative/precision/expiry, concurrent last credit/issue, historical expired packs, owner-only, foreign member, conservation invariant. **[ ]**

### GYMOS-MIG-035 — enrollment and recovery journey

- **Prerequisites:** 007,020,031,032. **Sources:** O03→O04 workflow, harness.
- **Targets:** API/Playwright/fault evidence only unless defects found.
- **Instructions:** run new/reused member through login forced change, role entry, owner roster/profile; inject each cross-plane failure and resume; prove other gym unchanged.
- **Acceptance/test:** exactly one identity/access/actor/term as expected; one-time secret absent after handoff; repair states hidden from normal lists; screenshots and persisted counts recorded. **[x]**

## 7. Security and multi-tenancy checklist

- [x] Enrollment verifies current OWNER and trusted gym; no client actor/gym authority.
- [x] Raw User/password/hash/DB/health fields never leak.
- [x] Reused identity is verified and never password-reset/deleted as compensation.
- [x] Tenant actor and Master access reciprocal tuple required before publication.
- [x] Foreign member and plan IDs deny safely; pack/session IDs remain with Segment 07.

## 8. Testing and verification

Run contract/client tests, member service unit tests, owned identity/operation/tenant DB integration tests, barrier concurrency for packs/holds, and targeted O02–O04 Playwright/visual/accessibility journeys. Verify persisted counts and pure reads. Use workspace lint/typecheck after targeted tests.

## 9. Definition of done

- [x] Tasks 031, 032 and 035 meet their full task specifications with linked passing evidence.
- [x] Enrollment/recovery is durable and recoverable; roster/profile is paged, sanitized, role-limited and tenant-isolated.
- [x] The full enrollment/login/recovery journey passes in two gyms, including failure paths.
- [x] Basic-contact records are clearly distinguished from enrolled members; deferred payment/receipt controls are absent or honest.
- [x] Required owner acceptance is recorded separately from automated verification.

Tasks 033 and 034 are not Segment 05 exit criteria. They remain required migration tasks in Segment 07 and must pass before their downstream consumers (including booking and session race proofs) can complete.

## 10. Agent checkpoints

Do not stretch the current basic member endpoint into enrollment without operation/identity semantics. Do not pull status/hold release or pack lifecycle back into this segment. Stop on unresolved member-profile privacy requirements; trainer-confirmed health projection is task050.

## 11. Progress and handoff

- **Status:** COMPLETED — 031/032/035 acceptance passed at code revision `bab9b97`; latest hosted check and merge evidence are in the handoff.
- **Owned tasks:** 031, 032 and 035 (3 total); all Completed.
- **Moved to Segment 07:** 033 (recoverable member status/hold release) and 034 (pack issuance/balances). Their specifications, prerequisites and downstream dependency edges remain active.
- **Current evidence:** task evidence records automated results and owner-delegated agent manual visual acceptance separately; see the tracker and Segment 05 handoff.
- **Out-of-scope profile extensions:** session-history panel is task044; confirmed-trainer health projection is task050. Member term history and safe member/owner/support projections remain in task032.
- **Next recommended task:** continue Segment 06 at task036 (complete its remaining trainer enrollment acceptance), then follow its owned dependency order. Tasks050–052 remain gated by their actual session/relationship dependencies.

