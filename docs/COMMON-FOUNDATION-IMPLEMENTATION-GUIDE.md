# Common account and application foundation — implementation plan

Status: proposed execution plan grounded in the current implementation. Product choices in section 2 are confirmed; technical defaults remain explicitly identified. No application changes or verification passes are implied by this file.

Audience: implementation agents, reviewers, and the gym owner. Scope: common owner/trainer/member journeys for a single gym, preserving the existing architecture and current UI theme.

## 1. Outcome

A prospective member applies online, the owner approves enrollment, and access becomes available only after approval completes. Existing users can sign in reliably, remain signed in appropriately for their device, sign out, recover a forgotten password through staff, view/update permitted profile information, and inspect useful in-app notifications. Every sensitive change has explicit authorization, an honest outcome, and a recovery path.

This is the next implementation increment after PT. Extend existing account, enrollment, and notification capabilities; do not build a parallel identity system or redo PT.

## 2. Confirmed product decisions

| ID | Confirmed decision |
| --- | --- |
| CF-R01 | Members can apply online. The owner must approve gym access; account creation is not membership approval. |
| CF-R02 | Forgotten-password recovery is staff-assisted for this release. Do not add email reset, SMS, WhatsApp, or a provider dependency. |
| CF-R03 | Personal devices can stay signed in between visits; shared staff devices use shorter sessions. |
| CF-R04 | Keep the existing UI theme/design system and application architecture. |
| CF-R05 | Extend the existing in-app notifications, including PT events/reminders, rather than replacing them. |

Implementation defaults requiring documentation before coding, rather than repeated routine approval:

- Public applications create MEMBER requests only. Trainer accounts remain owner-created/approved; public signup never grants OWNER/TRAINER/SUPER_ADMIN.
- Personal-device sessions: proposed seven-day inactivity limit and 30-day absolute lifetime, with rotating renewal credentials. Shared-device sessions: proposed 30-minute inactivity and eight-hour absolute limit. Default the checkbox to shared/short mode unless the user explicitly chooses a personal device. Keep access tokens short-lived at the existing 15 minutes. These durations are proposed operational defaults, not user-confirmed numbers.
- Staff recovery uses a short-lived, one-use recovery credential/code that allows password replacement only, not ordinary gym access. Proposed lifetime: 15 minutes, with bounded attempts and reissue revoking earlier credentials. Preserve existing 24-hour first-login enrollment credentials as a distinct flow.
- Public applications collect only the minimum contact/application data. Do not collect health notes or emergency-contact information in the unauthenticated application.
- Do not claim email ownership verification without a possession-verification mechanism. Staff identity confirmation and an email string on a form are not proof that a mailbox is controlled.

## 3. Current evidence and remaining PT work

Read the newest entries, not only the earlier milestone headings:

- [PT evidence](pt-implementation/EVIDENCE.md).
- [PT progress](pt-implementation/PROGRESS.md).
- [PT runbook](pt-implementation/RUNBOOK.md).

The latest local evidence records trainer availability publication, member request, trainer acceptance, a separately eligible completed session and member-visible notes, notification routing, and local runner health. PT has substantial implementation and main-check evidence; its full verification/release gates remain open.

Carry forward explicitly:

- Real-browser expired-auth and response-lost-after-commit recovery.
- Eligible start verification for a confirmed session and the remaining detailed race/accessibility/regression matrix.
- Older-template upgrade coverage, intended-environment worker/capacity monitoring, several-operating-day pilot, and owner launch sign-off.

CF-02 and CF-08 must close the relevant account/session recovery gaps. Do not overwrite PT evidence or label the whole PT scope Verified because common-account work passes. Preserve existing in-progress PT source and evidence changes.

## 4. Existing capabilities and gaps

| Capability | Inspected baseline | Action |
| --- | --- | --- |
| Sign-in | Email/password, password hashing, throttling, forced first password change, role/gym routing | Improve UX and introduce session lifecycle without losing revocation. |
| Logout | Cookie cleanup, identity-wide `authVersion` revocation, support revocation, uncertain-result copy | Make current-device versus all-device actions explicit with per-session records. |
| Enrollment | Owner-created members/trainers, durable operations, existing-identity consent, initial membership, temporary credential handoff/reissue | Add public application/owner approval; reuse authoritative enrollment mechanisms. |
| Password change | Current-password check, shared password schema, session revocation | Expose normal account settings, distinct from temporary-password onboarding. |
| Forgotten password | Reissue is limited to initial credential handoff, not general established-account recovery | Add a separate verified staff-assisted recovery flow. |
| Session lifetime | Access/cookie expire after 15 minutes; no renewal; live observer redirects on expiry | Add durable personal/shared session policy, safe renewal and reauthentication. |
| Profiles | Operational member/trainer data and read views exist; no complete self-service account/profile editing journey was found | Define ownership and add authorized editing. |
| Notifications | Tenant-scoped bell, five-item preview, unread count/read-through, polling/focus protection, durable PT events/reminders | Add history/paging and new typed targets; preserve PT behavior. |
| Security/account navigation | Header identity display; no complete shared Account/Security destination | Add a consistent account menu and settings entry. |

This is a source/evidence assessment, not a fresh browser certification of all existing functions.

## 5. Binding architecture and UI requirements

1. Read applicable `AGENTS.md`, `docs/migration/NOTES.md`, current UI transformation documents, and affected source before implementation. Follow installed Next.js documentation requirements from `apps/web/AGENTS.md`.
2. Preserve current Atlas Light/Midnight Blue, semantic tokens, fonts, spacing, icons, role shells, and shared UI primitives. Do not use older V1 Classic wording to revert the current V2 theme.
3. Keep Next.js pages/actions and authenticated transport; NestJS owns authoritative policy/authorization; shared Zod contracts and API client remain synchronized.
4. Master remains authoritative for identity, login email, credentials, sessions, account security, access, and registry. Tenant databases remain authoritative for gym member/trainer profiles, PT, membership/credits, and operational notifications.
5. A single-gym product scope does not remove existing multi-gym isolation or permit global identity takeover by one gym owner.
6. Preserve current access/enrollment fences, verified tenant schema/binding, read-only platform support, durable receipts, optimistic versions, and local transaction/audit guarantees.
7. Cross-database changes use durable operations/reconciliation, never a fictional distributed atomic transaction. Account-level notification delivery to a tenant must not make Master credential changes dependent on that tenant being online.
8. Additive migrations must update relevant Master/tenant manifests, checksums, postconditions, generated clients, and upgrade tests. Never edit applied migrations or generated code directly.
9. Browser storage may hold existing appearance preferences; never put session/renewal/recovery secrets, passwords, or health notes in localStorage. Cookies need production Secure/HttpOnly and appropriate SameSite/origin protections.
10. Preserve existing PT command keys and unknown-outcome recovery through reauthentication. Renewing/retrying transport must not silently repeat a non-idempotent command.

## 6. Shared navigation and ownership design

### Proposed shared destinations

- Public Sign in, Apply to join, Forgot password / Get staff help.
- Pending application / enrollment status for an authenticated applicant without active gym access.
- Account → Profile, Security, Notifications, Help.
- Owner → member applications / enrollment attention queue, with recovery initiation accessible only where authorized.

Fit final routes to the current app conventions. Do not expose broken or placeholder navigation while a milestone is incomplete. Keep gym context visible for tenant-specific edits.

### Field ownership matrix

| Field/action | Self-service | Owner/staff scope | Authority |
| --- | --- | --- | --- |
| Account display name | User edits own display label | Cannot impersonate/change another global identity through a tenant form | Master |
| Login email | Separate identity-change workflow; not an ordinary profile field | Can request correction/support, cannot silently replace global login identity | Master |
| Password/security sessions | Account owner; verified recovery is separately constrained | Recovery initiation only under CF-03 policy | Master |
| Gym member full name | Read; correction request by default | Owner edits with reason/version; do not rewrite historical snapshots | Tenant |
| Phone/emergency contact | Member edits own gym contact fields | Owner edits with audit | Tenant |
| Date of birth | Read/correction request initially | Owner corrects with reason | Tenant |
| Health information | Member can submit a proposed update | Owner review; related trainer access remains governed by existing relationship policy | Tenant; never public/audit payload |
| Trainer bio/specializations/experience | Trainer edits own professional profile, with input validation | Owner can correct with audit | Tenant |
| Trainer level, pay, status, shifts | Not editable through personal profile | Existing owner-managed business workflows | Tenant |
| Membership, credits, roles | Read permitted summaries only | Existing authorized workflows; never profile mass-assignment | Existing sources |

Account display-name edits do not silently synchronize operational names across all gyms. Every screen must label which name/contact record it edits. Decide whether existing tenant email columns are contact snapshots or mirrors before changing identity email; never leave two competing login authorities.

## 7. CF-00 — Baseline, rules, and data design

### Actions

1. Re-read current PT progress/evidence and working-tree changes. Create an inventory of existing public/authenticated routes, state transitions, identity/profile fields, and test harnesses.
2. Record session duration defaults, recovery authorization rules, name/email ownership, duplicate-application behavior, rejection/reapplication policy, and pending-applicant permissions.
3. Define a role/action matrix for applicant, member, trainer, owner, and read-only support. Account operations need no active gym when legitimately account-scoped, but gym operational access always does.
4. Plan additive data for applications, account sessions, renewal families, recovery attempts/credentials, profile revisions or change requests, and notification targets. Record which database owns each fact.
5. Design how a self-registered identity is enrolled without generating/replacing its chosen password. Extend existing durable enrollment operations rather than repurposing temporary credentials to overwrite it.
6. Add progress/evidence records under `docs/common-foundation/` when implementation begins; never fabricate initial check results.

### Done when

Every milestone has a bounded change list, data owner, authorization rule, failure/recovery behavior, and meaningful acceptance checks. Confirmed product rules and proposed implementation defaults are distinguished.

## 8. CF-01 — Online application, approval, and first access

Dependencies: CF-00. Uses existing login before CF-02 upgrades it.

### Actions

1. Add Apply to join for the intended gym. Show gym identity and explain that application does not grant membership or bookable PT access.
2. Let a new applicant create their own account/password using shared validation. Keep passwords transient. Do not create a gym profile, membership, credits, or active access solely because signup succeeds.
3. For an existing identity, require sign-in and explicit application/consent as that person. Never let an unauthenticated application claim an existing email, change its password, or attach gym access.
4. Use bounded input, normalized email uniqueness, request throttling, duplicate-submit protection, and generic public responses that do not enumerate existing accounts. Avoid CAPTCHA/provider work unless actual abuse requires it.
5. Persist a minimal application tied to the gym/subject identity with states such as pending, processing, approved, rejected, withdrawn, and recoverable failure. Use the existing operation states where suitable rather than inconsistent duplicate state machines.
6. Give authenticated applicants their own status and next step, including sign out/help and retryable failure. Their no-access route must not loop between login and change-password.
7. Give the owner a paged application queue and detail with approve, reject, optional safe applicant-facing reason, and private administrative notes kept separate.
8. Approval reuses enrollment, reciprocal tenant actor binding, initial membership selection/terms where required, and durable reconciliation. Choose the agreed plan/start date explicitly; approval must not silently invent paid status or issue PT credits.
9. Approval of a self-created account must not invoke the new-identity temporary-password path or ask the owner to assert the person's consent. Verify operation ownership and subject consent from actual authenticated application evidence.
10. Access becomes ACTIVE only after required Master/tenant effects reconcile. Retry returns the original outcome; two owners cannot approve twice or approve after rejection/withdrawal without an explicit valid transition.
11. Notify owner of a new pending application and applicant of approval/rejection through the appropriate in-app context. Pending applicants must not need active gym access to read their own outcome.
12. Preserve owner-created trainer/member enrollment for staff-assisted onboarding. Clarify first-password handoff and reissue without exposing plaintext after its allowed handoff.

### Acceptance

- New signup → pending status → owner approval → correct member landing works; no PT/member API access exists while pending.
- Duplicate signup/application, same email case variants, concurrent approve/reject, response loss, and tenant-unavailable approval do not duplicate identities/profiles/membership/access.
- Existing identities must authenticate and consent; application cannot self-select elevated roles.
- Rejected/withdrawn applicants cannot read another application or gym records.
- Already-approved enrollment and temporary-password onboarding still work.

## 9. CF-02 — Sign-in continuity, devices, and logout

Dependencies: CF-00; integrates CF-01 landing states.

### Actions

1. Keep current sign-in validation/hashing/throttling and add pending state, show/hide password, password-manager support, useful errors, and a safe return destination. Never trim passwords, log them, or accept an external redirect URL.
2. Add an explicit personal-device choice and clear shared-device guidance. Keep access tokens short-lived; persist a Master-backed session with device/session ID, creation/last-use, inactivity/absolute expiry, revocation, and a hashed renewal secret/family.
3. Rotate renewal credentials; implement replay detection and a documented concurrency-safe renewal protocol. Normal simultaneous tab renewals must not spuriously invalidate each other or create unlimited grace for replay.
4. Bind access to a session as well as current identity/access version. A revoked session must fail existing access-token requests, not only future renewal. Preserve all existing identity-wide revocation and gym-access checks.
5. Update API session reads, web cookie lifetime handling, server/client navigation helpers, middleware/proxy if present, and the live session observer together. Current code bounds cookies to 900 seconds; changing only the API is insufficient.
6. Define activity consistently: user interaction/authorized foreground work may renew idle expiry; background polling and PT reminder work must not keep an abandoned shared-device session alive forever. Absolute expiry is never extended.
7. Add safe reauthentication with preserved non-sensitive draft/return context. Sensitive notes remain transient; explain loss risk before expiry where practical. Reconcile submitted PT/account commands before creating another request key.
8. Add Sign out this device and Sign out all devices. Clear cookies/support context and conceal private cached/BFCache pages. Report uncertain server revocation honestly during API outage.
9. Add a simple session list in Security: current device, approximate browser/device label, recent use, and revoke. Do not claim fingerprint-based device identification or precise location tracking.
10. Require fresh authentication for credential/recovery-sensitive actions; a remembered browser alone does not satisfy it. Keep platform support sessions separately bounded and revoked correctly.

### Acceptance

- Personal sessions survive normal visits; shared sessions expire at configured inactivity and absolute limits.
- Refresh token replay, ordinary multi-tab renewal, clock boundaries, restart, and outage recovery are tested.
- Polling cannot prevent idle expiry. Per-device logout leaves other devices active; all-device logout and password changes revoke all as designed.
- Back/forward, switched identities, revoked gym access, and shared PT detail routes never reveal stale private data.
- A PT command saved before access expiry reconciles once after sign-in; unsubmitted drafts are handled honestly.

## 10. CF-03 — Password change and staff-assisted recovery

Dependencies: CF-02 session/revocation design and CF-00 recovery policy.

### Actions

1. Expose Change password in Security with Current password rather than the first-login-specific Temporary password label. Keep a distinct required-first-change screen and shared schema.
2. Add Forgot password / Get staff help from login. Explain the staff-assisted process and gym contact route without implying that an email has been sent.
3. Provide an authorized owner recovery action for eligible ordinary member/trainer identities in this gym, following documented in-person/known-contact identity checks. Log an attestation/reason without collecting copies of identity documents by default.
4. Separate initiation from completion: issue a one-use recovery credential shown only at authorized handoff, store its hash, and let the subject choose the new password on a restricted recovery screen. It grants no PT, account-edit, or general gym API access.
5. Scope the initial automated staff flow to a subject whose identity has only the authorized gym relationship and no owner/platform privilege. Shared identities, owners, privileged accounts, or ambiguous proof require an independent operator recovery procedure with explicit authority. Gym ownership alone is not authority to replace a shared global credential.
6. Handle pending applicants through an equally explicit identity-bound policy; a public application reference is not recovery proof. Do not automatically enroll an applicant during recovery.
7. Expire credentials, cap attempts, revoke earlier reissues, serialize redemption, and prevent replay. Use established secret handling and never place recovery secrets in logs, audit transitions, analytics, plaintext durable receipts, or referrers. Token-bearing pages must avoid third-party resources.
8. On completion, replace the password, invalidate recovery credentials, revoke sessions/renewal families/support sessions, append safe audit, and require normal sign-in. Do not restore revoked membership or gym access.
9. Preserve the existing initial enrollment credential reissue path. It currently requires a still-unset first password and must not be loosened into a universal owner reset endpoint.
10. Document owner-account recovery separately using an authorized audited operator process. Do not ship a public emergency backdoor or an endpoint accepting only an email and gym slug.
11. Provide an account security event after recovery/password change. In-app events supplement staff identity checks; they cannot reach a locked-out user before access is restored, and must not be presented as an out-of-band alert.

### Acceptance

- Established member and trainer recovery works after legitimate verification; a credential is usable once, expires, and is invalid after reissue.
- Concurrent redemptions, brute-force attempts, response loss, and revoked recovery authority are tested.
- Password change/reset revokes active access and renewal credentials; temporary credentials do not gain ordinary access.
- One gym owner cannot reset a shared identity or privileged account through the gym endpoint.
- Recovery cannot bypass pending approval, suspension, or enrollment consent.

## 11. CF-04 — Shared account page and profile editing

Dependencies: CF-00 ownership matrix, CF-02 authorization/session context.

### Actions

1. Make the current header identity an accessible account menu with Profile, Security, Notifications, Help, and clear logout choices. Fit mobile/drawer navigation without replacing the shell.
2. Add an account profile projection and tenant-specific member/trainer profile projections. Use bounded explicit field allowlists and shared schemas for each role, never spread arbitrary JSON into Prisma updates.
3. Implement self-service display name and permitted tenant contact/professional fields from section 6, with inline validation, versions, receipts, safe audit, and preserved input on error.
4. Add owner correction for official member fields and an explicit proposed-health-update review flow if included. Never include health values in generic audit, notifications, directories, support summaries, or logs.
5. Keep trainer level/pay/status/shift and membership/credit controls in their existing authorized workflows. Self-service profile updates cannot change role, status, identity ID, price, or enrollment state.
6. Define global display-name versus gym-record-name behavior visibly; avoid silent cross-gym copying. Refresh account/header, directories, client/member views and PT detail names from authoritative current projections while retaining historical snapshots.
7. Recheck identity/link/access and expected profile version at save. A stale editor must receive a review/reload option rather than silently overwrite concurrent changes.
8. Start with existing initials avatars. Photo upload is optional after launch; it should not block profile editing or add an unnecessary storage dependency.

### Acceptance

- Each role can edit only its permitted fields; direct API mass-assignment and wrong-subject requests fail.
- A member phone update and trainer bio update persist after reload and appear in authorized related views.
- Global display-name and tenant official-name behavior is explicit and consistent.
- Health/privacy relationships remain unchanged, including time-limited trainer access after prior completions.
- Concurrent edits, access revocation, offline save and repeat submission preserve correct state.

## 12. CF-05 — Contact correction and identity-email changes

Dependencies: CF-03 recovery rules and CF-04 field ownership. This release has no assumed email verification provider.

### Actions

1. Keep login email read-only in ordinary profile forms. Add Request email correction with clear staff-help instructions.
2. Normalize/check uniqueness and distinguish contact correction from a global login-identity change. Never merge accounts or grant access because two profiles have matching contact data.
3. For a logged-in user, require fresh password confirmation plus documented staff verification before any staff-assisted login-email correction. A forgotten-password/new-email combination follows stronger operator recovery, not an easier fallback.
4. Keep automated email replacement out of launch if ownership/authorization cannot be proven with the staff process. Provide a supported correction request and runbook rather than a misleading editable field. Email verification/reset links remain deferred unless separately approved.
5. If an authorized identity-email change is implemented, update Master identity uniquely, revoke outstanding recovery/enrollment claims bound to the old email as appropriate, and reconcile tenant contact snapshots through durable operations. Do not claim cross-database atomicity or silently alter unrelated gym records.
6. Do not mark historical account emails verified automatically. Show honest contact-verification state where useful, without pretending that it blocks approved staff onboarding unless the product policy explicitly requires it.
7. Notify the subject in-app of the change and retain safe audit. Do not claim that this is an independent mailbox alert.

### Acceptance

- Editing a contact profile cannot change login credentials or take over another email identity.
- Duplicate/normalized emails and concurrent changes are rejected safely.
- New login works and old login no longer works after a fully committed authorized change; interrupted reconciliation is visible/retryable.
- When no safe automated change is supported, the UI/runbook give a truthful next step and no nonfunctional save button.

## 13. CF-06 — Notification center and account/application events

Dependencies: CF-01 lifecycle and CF-03/CF-04 event definitions. Preserve existing PT runner and notification contracts.

### Actions

1. Keep the bell as a short preview; add View all with bounded pagination, unread/all filters, mark read, and snapshot-bounded mark-all-read.
2. Keep PT notifications/reminders tenant-scoped, with their existing dedupe and supersession semantics. Do not rebuild 24H/1H work or introduce external messaging.
3. Extend notification targets with a typed allowlist: session detail, own application status, profile/security, or authorized owner application queue. The current `notificationHref` treats resource IDs as session IDs; update this explicitly before adding non-session resources. Never accept an arbitrary URL from event content.
4. Separate Master-owned application/account security inbox events from tenant operational events. Applicants without active access need an identity-scoped way to read their own application outcomes.
5. Prefer explicit Account versus Gym inbox scopes/tabs over an unexplained mixed feed. If aggregated, give each source its own stable cursor/snapshot and honest partial failure/read outcomes; there is no cross-database atomic mark-all.
6. Persist credential/application security events locally with their owning transaction. Any tenant projection uses a durable outbox/reconciliation path; an unavailable gym must not undo a successful account password change.
7. Include approval/rejection/withdrawal where appropriate, profile-change outcomes requiring attention, password change/reset, and session revocation security history. Do not notify on every heartbeat or every harmless keystroke.
8. Keep essential PT and account security notices enabled. Defer broad preference settings unless there is a real optional category; never silently let preferences disable required reminders/security history.
9. Preserve bell polling/focus handling, context-key invalidation, accurate unread counts, keyboard/focus behavior and unavailable-data messages. Handle deleted/inaccessible targets with a useful status rather than exposing details.
10. Notification text and title must exclude health information, secret/recovery tokens, sensitive staff reasons, or payroll amounts for unauthorized recipients. Retention/archival needs a stated policy, not a permanent-delete action on immutable audit history.

### Acceptance

- An applicant can read approval status without active gym access; unrelated identities cannot.
- PT links still open sessions, and application/account links open their correct destinations.
- Read state, snapshot mark-all, pagination, retries, and new events during paging maintain consistent counts.
- Old/gym-switched responses cannot leak another user's or gym's inbox.
- Credential changes work with the tenant offline; security event projection resumes once without duplicates.

## 14. CF-07 — Common help, errors, privacy, and account lifecycle

Dependencies: CF-01–CF-06 interfaces; independent copy/accessibility work may proceed earlier.

### Actions

1. Standardize validation, saving, success, denied, expired, conflict, offline, and unknown-outcome states across all common forms. Distinguish incorrect password from a server outage without account enumeration.
2. Provide a visible gym Help/contact destination from sign-in, pending application, recovery, and account settings. Do not make help a fake chat feature or silently send messages.
3. Explain account versus membership suspension, rejected/pending approval, and revoked access. A suspended member still needs an authorized support/account path where policy permits, without restoring gym data access.
4. Add unsaved-change protection where needed, password paste/manager support, clear field errors, keyboard focus, and no accidental double-submit. Keep appearance preferences and existing mobile geometry.
5. Establish a recorded owner procedure for contact/privacy correction, duplicate-account review, gym departure and data-access requests. Do not add automatic account merge or hard-delete that destroys PT/finance/audit history.
6. Document minimal-data collection and retention decisions for rejected applications, sessions, recovery attempts, and notifications. Any future deletion/anonymization must respect operational history and be explicitly reviewed; this plan does not invent legal retention periods.
7. Add safe operational visibility: pending approvals, stuck enrollment/profile operations, failed recoveries, renewal/revocation errors, and inbox projection backlog. Do not log credentials or protected profile values.

### Acceptance

- A person can understand pending/rejected/revoked/expired states and reach a real next step.
- Each sensitive form works on a phone, with keyboard-only input, zoom, long names and both themes.
- Unknown-save recovery retains the original command identity; privacy-help paths do not expose other members.

## 15. CF-08 — Verification, upgrades, and pilot

Dependencies: all included milestones. No application feature is Verified solely because it compiles.

### Actions

1. Extend meaningful unit, contract, owned-database integration, and browser suites. Run checks against synthetic owned fixtures only; preserve user/PT working-tree changes.
2. Verify complete journeys:
   - New applicant → pending → approval → first authorized member visit.
   - Existing identity → authenticated application/consent → approval without credential replacement.
   - Reject/withdraw → safe status/help; concurrent owner actions and failed cross-database enrollment recovery.
   - Personal/shared sign-in → renewal/inactivity → per-device/all-device logout.
   - Normal password change and staff recovery → all-session revocation → fresh login.
   - Member/trainer profile edits → stale version/revoked access → safe recovery.
   - Applicant/account/gym inboxes → correct routing, counts, pagination and partial outage.
   - PT request/accept/start/complete and owner exceptions after the authentication changes.
3. Close PT's expired-auth/unknown-save recovery gap with actual browser evidence: response lost after commit, return to the intended session, same-command retry, and correct credit/earning/notification reconciliation. Do not fake elapsed training time.
4. Test multiple tabs, identity/gym switching, renewal replay, reset races, stale cookies/BFCache, direct API role attacks, support read-only context, and cross-gym shared identities.
5. Rehearse fresh Master/tenant setup and supported existing-schema upgrades. Legacy sessions and unverified email data need explicit migration behavior; never backfill arbitrary verified-email timestamps or silently grant access to old pending applicants.
6. Rehearse compatible rollout: new schema and API capability before UI activation; transition existing access-token sessions safely; preserve rollback/recovery compatibility with new session/application states.
7. Update runbooks for owner approval, staff identity verification, recovery handoff, session revocation, rejected applicants, profile conflicts, and outage reconciliation.
8. Pilot with owner, trainer, existing members and at least one new applicant. Measure manual interventions, approval delays, lost drafts, recovery failures, unexpected sign-outs, notification confusion, and PT regressions.

### Existing command entry points — verify current scripts first

```sh
pnpm prepare:checks
pnpm check:workspace
pnpm typecheck:workspace
pnpm lint:workspace
pnpm test:unit
pnpm build:workspace
```

Use targeted existing identity/enrollment/notification suites and add explicit test discovery/CI configuration for new application/session/recovery/profile suites. Before database/browser suites, inspect their harness and ownership requirements. Relevant regressions include `pnpm test:pt:owned`, existing two-gym/browser tests, and the PT workspace/bell specs. A missing environment prerequisite is an unverified check, not a pass.

### Done when

Confirmed product choices are implemented, critical invariants have test/browser evidence, PT still reconciles, recovery procedures are usable by staff, migration/restore readiness is documented, and the owner approves wider use. No deployment or real pilot is inferred from local checks.

## 16. Implementation sequence and agent handoff

Recommended order: CF-00 → CF-01 → CF-02 → CF-03 → CF-04 → CF-05 → CF-06 → CF-07 → CF-08.

Implement required domain events within their owning milestones; CF-06 adds their complete inbox/routing experience. Account menu/common form work belongs alongside each feature, with CF-07 providing consistency checks. Do not leave security or error handling until the final pass.

For each milestone:

1. Inspect current capabilities and the newest handoff before editing.
2. State the bounded task, contract/data ownership, permissions, transaction boundaries, and acceptance criteria.
3. Implement schema/manifest changes if needed, shared contracts, authoritative API, transport, web UI, audit/events and recovery as one usable journey.
4. Run relevant meaningful tests; verify affected screens in both existing appearances and on mobile.
5. Record actual results in `docs/common-foundation/PROGRESS.md` and `EVIDENCE.md`; create these when implementation starts. Keep secrets and real private data out of evidence.
6. Use statuses Not started, In progress, Ready for review, Verified, or Blocked. Record exact next action and environment/dependency gaps. Do not declare the earlier PT release gates passed by association.

Initial status of CF-00–CF-08: Not started for this upgrade. Existing capabilities remain present as described in section 4.

No merge, shared/production migration, deployment, account permission expansion, or external communication is authorized merely by this plan. Follow actual user authorization and repository rules. Work may continue across agents/sessions from the first unfinished task; do not restart or overwrite another agent's unrelated changes.

## 17. Essential versus deferred scope

### Essential for this increment

- Online member application with owner-controlled activation and safe existing-identity consent.
- Personal/shared session continuity, explicit logout choices, normal password change, and staff-assisted recovery with safe privilege boundaries.
- Account/profile navigation and permitted profile/contact editing.
- Honest login-email correction process, without pretending email verification exists.
- In-app notification history, correct targets, account/applicant visibility, and PT regression protection.
- Clear help/errors/privacy boundaries, audit, operational recovery, and cross-role/mobile verification.

### Defer unless independently required

- Email/SMS/WhatsApp verification or reset, external notification providers.
- Social login, passkeys, broad MFA rollout; evaluate owner/admin MFA as a subsequent security increment rather than leaving a nonfunctional switch in this release.
- Profile photos/uploads, public profiles, social/community features.
- Automatic account merging, automatic irreversible deletion, impersonation tools.
- Marketing notification preferences, presence/location tracking, and new SaaS administration.
- General payment, membership-freeze, or reception/attendance projects.

## 18. Final checklist

- [ ] Online signup/application does not grant gym access or replace existing credentials.
- [ ] Owner approval reconciles enrollment exactly once and preserves required consent.
- [ ] Pending/rejected users have truthful status/help and no operational access.
- [ ] Personal/shared sessions obey documented limits; polling cannot keep abandoned staff sessions alive.
- [ ] Current-device/all-device logout, password change, and recovery revoke the intended access.
- [ ] Staff recovery is one-use, audited, bounded, and cannot take over privileged/shared identities.
- [ ] Profiles enforce field ownership and privacy; login email is not a casual profile edit.
- [ ] Account/applicant/gym notifications route correctly and retain PT behavior.
- [ ] Unknown-save and expired-auth PT journeys are browser-verified with correct net effects.
- [ ] Current theme, architecture, mobile/accessibility behavior, and tenant isolation remain intact.
- [ ] Relevant tests, upgrade/recovery rehearsal, runbooks and pilot evidence are recorded.
- [ ] Remaining limitations and owner launch approval are explicit.
