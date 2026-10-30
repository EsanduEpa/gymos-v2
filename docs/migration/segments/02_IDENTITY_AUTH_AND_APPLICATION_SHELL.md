# Segment 02 — Identity, Authentication, and Application Shell

## Execution instructions for AI agents

Read all sections and approved DEC-02/DEC-10; verify segment 01 gates; inspect current auth/web code and relevant V1 screens; implement one task at a time; use shared contracts; test direct API and browser negatives; update handoff only after evidence.

## 1. Segment overview

- **Capability:** secure role/gym entry and shared authenticated shell.
- **Objective:** migrate A01/A02/R00/T00/M00/L02/H01 plus sign-out, forced credential change, current actor authorization, and role navigation.
- **Result:** users authenticate safely, choose/resolve a permitted gym, cannot bypass forced change, land on the right role page, and see V1-equivalent dashboard chrome without cross-gym leakage.
- **Priority / complexity:** Critical / Large.
- **Dependencies:** segment 01; approved DEC-02 and DEC-10; the relevant web-session portion of DEC-11 was approved by the owner on 30 October 2026; provider/release scope remains task 087.
- **In scope:** GYMOS-MIG-013, 016–020.
- **Out of scope:** enrollment creation, gym provisioning/support, feature pages, mobile tokens, password reset/forgot/self-registration not present in V1.

## 2. Current V1 implementation

| UI/workflow | Exact sources | Behavior to preserve/correct |
|---|---|---|
| A01 `/login` | `app/(auth)/login/page.tsx`, `lib/auth.ts`, `lib/rate-limit.ts` | Centered email/password form, pending and inline credential/inactive/rate/unexpected feedback; same-origin role destination |
| A02 `/change-password` | page + `change-password-form.tsx`, `app/actions/account.ts`, `lib/passwords.ts` | Current/new/confirm; 10–200, number/symbol, no edge spaces, new differs, confirmation; success then sign-out/relogin |
| R00/T00/M00 | `app/page.tsx`, trainer/member entry pages | Redirect by role; trainer→schedule, member→trainer directory |
| L02/chrome | dashboard layout, `components/layout/dashboard-chrome.tsx`, sidebar/header/NotificationBell | Role nav, gym/banner context, responsive drawer, display identity, bell, sign-out, errors/not-found/loading |
| H01 | `app/api/auth/[...nextauth]/route.ts` | Auth.js boundary; do not copy implementation architecture |

V1's JWT revalidation and role checks are useful evidence, but forced-change is not a complete server-side gate and support impersonation is a separate segment. V2 already has Argon2/JWT login and an HttpOnly cookie adapter, but lacks full session renewal/revocation/forced-change, role shell, change-password flow, and operational actor policy.

## 3. Target V2 implementation

Extend verified `apps/api/src/auth.controller.ts`, `auth-token.ts`, `identity/identity.service.ts`, `gym-access.guard.ts`, Master `User/GymAccess`, `apps/web/src/app/login/page.tsx`, `actions.ts`, and `lib/gymos.ts`. Proposed feature organization may introduce `apps/api/src/auth/*`, policy/actor guards, web route helpers and `(dashboard)` layouts; paths are **proposed until created**. Tokens must bind identity/authVersion and expire per DEC-02; current Master access and tenant reciprocal actor tuple are rechecked for operational requests. Web keeps bearer material server-side and emits no-store/correct cookie flags.

## 4. V1 to V2 UI migration

- Preserve login card hierarchy, labels, submit/pending behavior, and inline feedback; never reveal whether an arbitrary email exists beyond approved error taxonomy.
- Preserve change-password fields and success panel; force navigation there for restricted credentials and reject every other protected API server-side.
- Build role/gym route helper using DEC-10 gym-scoped route scheme and safe legacy redirects.
- Build dashboard chrome from verified shared primitives: desktop sidebar, mobile menu/backdrop/Escape/body lock, active nav, identity/gym display, support banner slot, bell slot, and sign-out.
- X01/X02 return/retry must resolve current role/gym rather than V1's hard-coded `/owner`; add consistent skeleton/error/empty states without redesign.

## 5. Backend and database migration

Master owns login identity, password hash, credential expiry, must-change flag, auth/access versions, role/gym access. Tenant actors are authorization subjects, not login credentials. No tenant DB selection from an untrusted slug until Master access resolves and binding/schema gate passes. Change password uses current-password verification, Argon2id, authVersion rotation, audit/operation policy, and safe revocation. Logout/session invalidation follows DEC-02/DEC-11; no client storage of bearer tokens.

## 6. Detailed tasks

### GYMOS-MIG-016 — login/session policy and forced-change enforcement

- **Objective:** adapt login to approved token/session/credential rules and enforce restricted credentials on every protected backend route.
- **Prerequisites:** 002,003,007,078; provider-dependent settings recorded.
- **Sources:** V1 A01/auth/rate-limit; V2 auth controller/token/web login; `MIGRATION_TRACEABILITY` C01/C03.
- **Targets:** verified auth files above; proposed auth policy/service tests.
- **Implementation:** strict login DTO; canonical email; rate limit; ACTIVE gym-access projection without secrets; issue versioned short-lived token; return must-change and allowed gyms/roles; guard denies non-change/logout endpoints while restricted.
- **Expected behavior:** invalid/inactive/expired/restricted states are stable; no raw hashes/access internals; direct API bypass fails.
- **Acceptance/testing:** unit token claims; DB/API success+wrong password+inactive+rate+authVersion+forced-change tests across two gyms; login browser states. **[x]**

### GYMOS-MIG-017 — temporary credentials/change/reissue

- **Objective:** one-time owner-assisted credentials, forced change, and authorized reissue without resetting a reused identity.
- **Prerequisites:** 004,016,078.
- **Sources:** V1 A02, member/trainer handoff, account action/password helper.
- **Targets:** auth/identity command services, contracts/client, web change-password route.
- **Implementation:** generate strong temporary secret only at issuance boundary; store hash; set expiry/mustChange/authVersion; change current password atomically; reissue only for eligible newly issued identity with operation/audit; never log/serialize secret after one response.
- **Acceptance/testing:** expired/replayed/wrong current/reused identity/cross-gym/direct API negatives; successful change revokes old token and clears restriction; secret absent from logs/database responses. **[x]**

### GYMOS-MIG-018 — operational actor and resource authorization

- **Objective:** centralize current access→binding/schema→actor/relationship/resource policy.
- **Prerequisites:** 003–005,016,078,080.
- **Sources:** V1 `lib/authz.ts`; current gym guard; DEC-02/04.
- **Targets:** proposed Nest guards/decorators/policies plus integration tests.
- **Implementation:** derive identity from verified token; load current ACTIVE access; resolve DB server-side; verify reciprocal actor tuple; enforce role/relationship and foreign-ID safe 404; no implicit SUPER_ADMIN owner mutation.
- **Acceptance/testing:** role matrix, stale/revoked access, DB swap, forged slug/actor/resource, unrelated trainer/health projection, and cross-tenant denial tests. **[x]**

### GYMOS-MIG-019 — role-aware root, gym selection, protected navigation

- **Objective:** deterministic entry/chooser/redirect behavior with no forbidden eager fetch.
- **Prerequisites:** 012,016,018,086.
- **Sources:** R00/T00/M00/L02 and current V2 root/gym page.
- **Targets:** proposed route helper, protected layouts/pages; adapt existing root and gym page.
- **Implementation:** resolve zero/one/multiple access; chooser only when needed; role home mapping; unavailable/foreign gym 403/404; remove current unconditional member-list fetch for MEMBER/TRAINER. **[x]**
- **Acceptance/testing:** role navigation browser checks for one-gym owner, multi-gym chooser path, revoked/inactive access and trainer member-list denial. **[x]** — see [GYMOS-MIG-019 evidence](../evidence/GYMOS-MIG-019.md); no-access, suspended, stale-selection and callback cases remain follow-up coverage.

### GYMOS-MIG-013 — integrate role/gym dashboard chrome

- **Objective:** V1-equivalent accessible authenticated shell using verified primitives/tokens.
- **Prerequisites:** 012,018,019.
- **Sources:** V1 dashboard layout and four layout components; UI Map L02/X01–03.
- **Targets:** proposed web dashboard layout/chrome/nav; existing UI primitives.
- **Implementation:** normalized route builder; role nav; active state; mobile focus/keyboard/drawer; gym/identity display; support/lapsed banner slots; bell integration boundary; safe error/not-found/loading.
- **Acceptance/testing:** 320px and desktop; keyboard/Escape/focus/body scroll; role link matrix; cross-gym switch clears stale UI; visual comparison to fixtures. **[x]** — [evidence](../evidence/GYMOS-MIG-013.md).

### GYMOS-MIG-020 — web session transport and safe logout

- **Objective:** keep tokens server-side, refresh/revoke safely, and make logout deterministic.
- **Prerequisites:** 016,017,019,078 and relevant DEC-11 policy.
- **Sources:** current web actions/client and V1 sign-out.
- **Targets:** web server actions/BFF helpers, auth logout/renewal endpoint if approved, cookie configuration/tests.
- **Implementation:** HttpOnly/SameSite/Secure domain/path/expiry; no browser bearer exposure; CSRF/origin treatment; clear cookie even when backend unavailable; bind cache to identity/gym/role and use no-store for private reads.
- **Acceptance/testing:** cookie inspection, logout/back button, expired/revoked token, cross-origin rejection, no token in HTML/localStorage/logs. **[x]** — [evidence](../evidence/GYMOS-MIG-020.md); no refresh under approved DEC-02, concurrent logout/stale-response races covered instead.

## 7. Security and multi-tenancy checklist

- [x] Forced-change and credential expiry enforced by API, not only navigation.
- [x] Auth/access versions revoke stale tokens.
- [x] Gym/actor resolved from current Master access and verified tenant binding.
- [x] Current exposed gym/actor boundaries are enforced server-side; future relationship/resource endpoints retain their owning feature tests (see task 018 limits).
- [x] Bearer/temporary passwords/hashes never reach client logs or persistent browser storage; approved one-time handoff remains task 017.
- [x] Cache and navigation state are keyed by identity+gym+role and cleared on switch/logout.

## 8. Testing and verification

Run `pnpm --dir apps/api exec vitest run src` for unit changes, the relevant identity/tenancy integration configuration, `pnpm --dir packages/contracts test`, `pnpm --dir packages/api-client test`, and targeted `pnpm --dir apps/web test:e2e -- <spec>` only after adding a supported spec. Finish with lint/typecheck for changed packages. Expected outcomes are enumerated per task; record exact commands and exit codes.

## 9. Definition of done

- [x] Scoped A01/A02/R00/T00/M00/L02/H01 and sign-out behavior meet mapped requirements/approved corrections; final supported-browser and feature visual matrix remains task 065.
- [x] Six tasks pass targeted API, DB, browser, role and tenant negatives; 013/020 final hosted evidence linked below.
- [x] No current V2 admin/create/basic member capability regresses.
- [x] Intentional boundaries and provider-dependent release settings are documented.

## 10. Agent checkpoints

Do not start feature pages before actor authorization works. Stop if DEC-11 is required for final cookie/token policy; implement provider-neutral pieces only and record the blocked acceptance item. Do not add self-registration/forgot-password.

## 11. Progress and handoff

- **Status:** COMPLETED (6/6; implementation/verification, not merged or deployed)
- **Completed:** 013 — role/gym dashboard shell. [Evidence](../evidence/GYMOS-MIG-013.md); 020 — approved web transport/logout. [Evidence](../evidence/GYMOS-MIG-020.md); 016 — login session policy and forced-change API enforcement. [Evidence](../evidence/GYMOS-MIG-016.md); 017 — temporary credential issue/change/reissue. [Evidence](../evidence/GYMOS-MIG-017.md); 018 — operational actor and current access authorization. [Evidence](../evidence/GYMOS-MIG-018.md); 019 — role-aware root and protected navigation. [Evidence](../evidence/GYMOS-MIG-019.md)
- **Remaining:** None within Segment 02. Owner review and merge authorization remain required.
- **Files/tests/issues/blockers/decisions:** implementation and exact verification recorded in task evidence. Shared issue log: [SEGMENT_RUN_ISSUES.md](../SEGMENT_RUN_ISSUES.md). DEC-11 web-session portion was approved by the owner on 30 October 2026; provider/release scope remains open in 087. Tasks 013/020 are completed with local and all 11 hosted checks at `367bdf8`.
- **Next recommended task:** GYMOS-MIG-021 (Segment 03), after review/branch setup; do not merge either PR without owner authorization.


## 30 October 2026 continuation

- Reconciled 016–019 against source/evidence and preserved their authentication/authorization. Task 013 was implemented first and passed owned role/drawer/switching checks before task 020 implementation.
- Owner approved only the limited web-session portion of [DEC-11](../decisions/DEC-11.md). Provider/release choices remain in 087; no additional policy was inferred.
- [013 evidence](../evidence/GYMOS-MIG-013.md), [020 evidence](../evidence/GYMOS-MIG-020.md), [configuration/manual checks](../runbooks/web-sessions.md).
- Separate branch `codex/segment-02-identity-shell` preserves local `87c1766`; stacked PR depends on unmerged draft foundation PR #1. No change was pushed to the foundation branch or main. Explicit owner merge authorization and all 11 checks on latest revision remain mandatory.
- Historical checkpoint: local verification preceded the hosted checks; completion was not claimed at that stage.

## Final verification and handoff — 30 October 2026

[Run 41042328353](https://github.com/EsanduEpa/gymos-v2/actions/runs/41042328353) passed all 11 jobs at `367bdf8`, including browser 6/6, identity 10/10 and tenant 20/20. Tasks 013 and 020 are completed; total migration completion is 29/88. [Final handoff](../SEGMENT_02_HANDOFF.md) records revisions, boundaries, manual checks and the unmerged foundation dependency. PR #2 must be retargeted to main after an owner-authorized foundation merge, then latest-head checks/review/owner authorization are required again. Do not merge Segment 02 into the foundation branch.
