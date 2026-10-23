# DEC-02 — Identity verification, credential lifetime and revocation

- Status: **Approved by project owner in this chat on23 October2026.**
- Prepared: 23 October 2026, Asia/Colombo.
- Resolution task: [GYMOS-MIG-078](../MIGRATION_TASK_SPECS.md#task-id-gymos-mig-078).
- Accountable reviewer: project owner with Security + Product. Actual approving reviewer/date/result: **project owner,23 October2026, “Approve all three proposals.”**
- Authority: [Master Plan](../MIGRATION_EXECUTION_PLAN.md), Functionality map §§2,14.1; Database map §§7,14.1; DB02/F-D03/F-D04.

## Preserved approved requirements

One identity has one role in each gym and can belong to multiple gyms. Existing verified V2 identities are reused without resetting their password. New member/trainer credentials are handed to the owner once and require first-login password change. Lost secrets are rotated through authorized recovery, never replayed. Tenant actor IDs differ from Master identity IDs; pending enrollment is unpublished. No V1 account/hash/data import.

## Proposed decision

| Area | Exact proposed default |
|---|---|
| Email | At every writer, trim outer whitespace, require an ASCII email accepted by the shared runtime validator, then lowercase the entire address. Reject non-ASCII local/domain characters rather than silently transliterating. Store only the canonical value. In PostgreSQL use deterministic `C` collation, a CHECK enforcing ASCII/no whitespace/canonical lowercase, and a unique expression on `lower(btrim(email)) COLLATE "C"`. Retain ordinary unique email where needed for Prisma lookup. HTTP/CLI/fixtures/provisioning use the same helper; database constraints remain the final race gate. |
| Existing development identities | First run a read-only duplicate/noncanonical inventory. Do not rewrite or merge conflicts automatically. A separate reviewed repair is required before constraints if current rows conflict. |
| Sessions | Preserve 15-minute signed access JWTs with existing issuer/audience/algorithm checks; add identity security version. No refresh token for this tranche. Every protected call rereads current Master identity/security version and, for a gym call, active access/gym/version. No authorization cache. Expiry returns401 and requires login; never automatically retry an unknown-outcome command. |
| Revocation | Password change/reissue or explicit logout increments identity security version in a Master transaction. Logout revokes all current sessions for that identity; web cookie is cleared even if API revocation fails, with revocation uncertainty reported. Gym suspension/access removal changes that gym's access version/status, denying its next call without affecting another gym. A call authorized before a revocation races according to DEC-04's final authorization/recovery rule; a pre-read is not a distributed lock. |
| Forced change | New temporary credentials expire24hours after issue. Login with an unexpired temporary credential produces only a restricted session. Allow session inspection, self password change and logout; deny all gym/domain commands until change succeeds. Password change checks current secret, confirmation, new≠current and retained V1 policy:10–200 characters, a nonletter, no leading/trailing spaces. Never log passwords. |
| One-time handoff | Store Argon2id hash and credential metadata only. Plaintext exists only during generation and the first authorized successful response, then component memory until handoff/exit/context switch. No durable plaintext, request/result evidence, URL, browser storage or replay. Lost response returns operation/delivery status without secret. Acknowledgment records delivery completion, not plaintext. |
| Reissue | Current authorized OWNER may rotate only a newly created identity's still-unacknowledged enrollment credential for that same operation, before successful password change and only while no other active gym association relies on that identity. Rotate hash, issued/expiry/version atomically; invalidate old credential/sessions. Acknowledge/reissue race uses CAS so only one wins. Existing/reused identity never enters this path. An acknowledged credential or identity used elsewhere requires self-service recovery, outside this tranche; show a clear support-required state. |
| Existing-identity verification | Existing person authenticates as self and reconfirms current password in a private consent step. Issue an opaque random256-bit, single-use enrollment proof valid10minutes, stored only as a hash with `identityId,gymId,role,enrollmentOperationId,expiresAt,consumedAt`. The owner never receives the person's password. Consume proof in the Master enrollment transaction against all four bindings; operation retries reference the recorded consumption, never consume another proof or reset a password. Consent/refusal/recovery is explicit; owner assertion of matching email is insufficient. Proof transport is server-held or memory-only, never URLs/logs. Exact route names belong to078/031/036 contract review. |
| DOB | Store/transport a valid date-only `YYYY-MM-DD`, reject future date against the gym-local current date. No minimum age is assumed; age-gating is separate product work. |

ASCII-only identity creation is a deliberate proposed MVP restriction, **not** an existing approved product rule. It is reversible through a later reviewed international-email migration; it does not justify modifying V1.

## Alternatives and tradeoffs

| Alternative | Tradeoff versus proposed default |
|---|---|
| International email immediately | More inclusive but requires an explicit Unicode/IDNA/casefold policy shared across runtime, DB and all writers; defer until reviewed rather than produce inconsistent identities. |
| Refresh tokens/device sessions now | Better long-lived sessions and targeted logout, but expands storage, rotation, theft/reuse detection and mobile policy.15-minute relogin is simpler for development. |
| Owner verifies by email assertion | Easier enrollment but can attach the wrong global identity; rejected in favor of self-authenticated consent proof. |
| Email invitation/recovery provider now | Avoids owner handoff but requires commissioned delivery/recovery infrastructure. Not required for this approved temporary-password workflow. |

## Implementation impact and expected tests

Affected: GYMOS-MIG-003,016–020,023,031,033,035,036,038 and078; E01/C01–C03/C06/C12–C14/C17 and supplemental enrollment/reissue contracts.003 adds canonical constraints/security metadata/minimal actor links, not full enrollment handlers.016–020 own session and forced-change behavior;031/036 own consent/enrollment/one-time handoff.

1. Mixed case/outer whitespace from HTTP, admin CLI and fixtures resolves to one identity; concurrent canonical duplicates yield one commit and safe409. Non-ASCII is rejected clearly; conflicting existing rows block migration without modification.
2. JWT wrong issuer/audience/algorithm/version, expiry and unavailable Master fail closed. Next call after revocation is denied; another gym's authorized role survives gym-specific removal.
3. At exactly24hours temporary login is rejected. Forced-change identity cannot fetch private gym data or call domain APIs. Valid change removes forced flag and invalidates prior session/version.
4. Same enrollment replay returns safe status without password; lost first response permits only authorized rotation. Old secret fails after rotation; acknowledged/reused/cross-gym identity cannot be owner-reset. No secret appears in logs, receipts, audit or serialized reads.
5. Proof at expiry, wrong identity/gym/role/operation, tampered/random proof and second unrelated consumption fail without tenant publication. Same operation safely resumes its recorded proof use after failure.
6. DOB preserves its calendar date across zones; malformed/leap-day/future inputs reject. No invented minimum-age rejection.

These are required future tests; none is claimed executed by this proposal. Approval records reviewer/date/accepted changes here before dependent source work. Rejecting the proposal leaves existing source unchanged and dependent tasks blocked pending a revised decision.

## Approval record

The project owner explicitly approved DEC-02, DEC-04 and DEC-05 together in this chat on23 October2026. The defaults above are accepted for dependent implementation; existing MVP scope remains unchanged. This does not authorize production deployment, shared-data reset, external credential rotation or V1 edits.
