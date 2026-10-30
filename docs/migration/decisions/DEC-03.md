# DEC-03 — Read-only support scope and expiry

- Status: **Blocked — concrete proposal awaiting project-owner approval.**
- Prepared: 26 October 2026, Asia/Colombo.
- Resolution task: [GYMOS-MIG-079](../MIGRATION_TASK_SPECS.md#task-id-gymos-mig-079).
- Accountable reviewer: project owner with Platform security + Product.
- Authority: Master Plan; Database map DB08; Functionality map F-D05.

## Preserved approved requirements

Support access is read-only. Every request preserves the original platform-admin identity and effective gym. Support cannot read private health notes and cannot execute tenant commands.

## Proposed decision

| Area | Exact proposed default |
|---|---|
| Entry | A platform admin selects one gym, a reason code and a 10–500 character explanation. The server creates a random opaque context, stores only its hash and binds original actor, gym, scope, issue/expiry times and security version. |
| Lifetime | A context expires 15 minutes after issue, is never renewed, and requires a fresh reason for re-entry. Starting another context or logging out revokes the previous one. |
| Scope | The only MVP scope is `GYM_SUMMARY_READ`. Every support-aware request requires that exact scope and rechecks actor, gym status, expiry and revocation. |
| Exit/invalidation | Explicit exit revokes server state and clears the browser cookie/context immediately. Expiry, admin revocation, password/security-version change, gym deletion, or binding/schema mismatch also invalidates it. Cached support data is cleared on exit or gym switch. |
| Allowed Master fields | Gym ID, slug, public name/theme, lifecycle status, tenant binding health category, creation/update timestamps and safe operation state. Database names, URLs, credentials and raw operation payloads are excluded. |
| Allowed tenant fields | Gym contact/profile summary, timezone/currency, policy version labels, and aggregate counts needed to diagnose owner screens. Person lists expose only IDs, display names, role and account state when a named support endpoint explicitly needs them. |
| Always excluded | Passwords, hashes, tokens, proofs, credential delivery, private health fields/notes, free-form internal notes, raw audit payloads, financial account details, database identifiers and arbitrary JSON. |
| Gym status handling | `ACTIVE` and `SUSPENDED` gyms may be viewed if binding and schema checks pass. Provisioning, failed, deleted or repair-required gyms expose only the safe Master summary and operation state; no tenant connection is attempted. |
| Audit | Entry, exit, expiry/revocation and every tenant support request record original actor, effective gym, scope, route/resource, outcome, reason reference and timestamp. Audit stores no excluded field values. |
| Command denial | Support context never satisfies owner/member/trainer command authorization. All non-GET/HEAD requests and any read endpoint outside an explicit allowlist fail closed. |

## Alternatives and tradeoffs

| Alternative | Tradeoff versus proposal |
|---|---|
| Long-lived reusable support sessions | Less repeated entry work, but increases unattended access and weakens reason attribution. |
| Broad owner impersonation | Reuses owner screens, but risks writes and exposes fields outside support need. Rejected. |
| Master-only support | Strong isolation, but cannot diagnose tenant owner-read failures. The proposal allows narrowly listed tenant summaries after binding/schema validation. |

## Schema/API impact

- Master stores hashed support contexts and revocation metadata; plaintext context exists only in secure transport.
- Support guards use an explicit endpoint/field allowlist and preserve original actor separately from effective gym.
- Responses use dedicated support-summary DTOs rather than owner DTO reuse.
- Tenant audit accepts the original Master actor reference and reason reference without creating a tenant role.

## Expected tests

1. Missing/short reason, wrong scope, expiry equality, revoked context and altered security version fail closed.
2. A second entry and logout invalidate the first context; browser state is cleared on exit.
3. All write verbs and owner command endpoints deny support access without changing tenant data.
4. Allowed summaries contain no health notes, secrets, raw audit bodies, database identifiers or financial account details.
5. Suspended gyms allow approved reads; provisioning/failed/repair-required gyms never open a tenant connection.
6. Audit identifies the original platform admin, effective gym, reason and result for every tenant support request.

These are future implementation tests. No application behavior is claimed by this proposal.

## Approval record

Awaiting the project owner's explicit approval or requested changes. Until then DEC-03 and GYMOS-MIG-079 remain blocked.
