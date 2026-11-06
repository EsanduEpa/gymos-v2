# Common foundation progress

Baseline: 2026-11-06. The working tree was clean at entry. PT source and records remain intact. Read the full common-foundation implementation guide, `docs/migration/NOTES.md`, current PT progress/evidence/runbook, UI transformation plan and Owner/Member workspace notes, `apps/web/AGENTS.md`, installed Next.js docs requirements, current scripts/harnesses, and the affected auth/enrollment/access/notification source.

## CF-00 — Complete (documentation baseline)

Bounded scope: record rules, data ownership, authorization, session/recovery defaults, application state and duplicate/reapplication policy, pending permissions, risks, and remaining CF milestones. No product code changed in CF-00.

Confirmed choices remain those in guide CF-R01–R05. Proposed session durations and recovery defaults remain proposals, not confirmed product policy. See the decisions/ownership matrix in this document and `EVIDENCE.md`.

## CF-01 — Ready for review (automated checks passed; manual acceptance pending)

Bounded scope: public Member application and self-created account, authenticated existing-identity consent, own status, Owner queue/decision, durable enrollment reconciliation, applicant outcome notices and typed routing. Preserve existing Owner-created onboarding and one-time temporary credential handoff. Do not implement CF-02–CF-08 except strict CF-01 dependencies.

Data authority: Master owns identity, password, gym link, application lifecycle, application consent evidence and account-scoped notices. Tenant owns operational Member profile, membership term and PT/credit eligibility. Tenant effects reconcile using existing Master Operation and tenant CommandReceipt patterns; no cross-database atomicity claim.

Authorization: public may read the public gym identity and submit a bounded MEMBER application only. Applicant must authenticate to read/withdraw their own application; an existing identity must authenticate and explicitly consent. Owner with current active OWNER access for that gym may list/review/decide; support remains read-only. Pending applicants have only account/session/help and own-application access, never tenant operational endpoints. Access remains pending until Master/tenant enrollment effects are reconciled.

Failure handling: preserve idempotency across repeated submits and owner actions; serialize decisions; reject conflicting terminal decisions; tenant outage leaves an honest resumable operation and no ACTIVE access. Never replace credentials. Approval requires an explicit membership plan/start policy and must not imply payment or issue PT credits.

Status: implementation complete for the bounded CF-01 scope. Automated checks pass; manual browser walkthroughs and manual acceptance are explicitly deferred by the user, so CF-01 is not marked Verified.

Implementation: additive Master `MemberApplication` and identity-scoped `MemberApplicationNotice` records, immutable/audited lifecycle transitions, normalized public self-signup, authenticated existing-identity application, own status/withdrawal, owner queue and approve/reject, offer-bound applicant password consent, typed application destinations, and minimal applicant/owner application notices. The existing durable `REGISTER_MEMBER` operation and tenant receipt remain the only path to tenant membership and active access. Self-created password hashes are never changed; owner-created onboarding and temporary-password delivery retain their prior path.

Automated coverage: normalized/repeated submissions, pending `GymAccessGuard` denial, existing identity and auth-version fencing, credential preservation, withdraw/reapply after rejection or withdrawal, same-action and competing approve/reject races, owner-private note isolation, identity-scoped notice access, outage/retry, and a real application-bound enrollment-consent/reconciliation test. See `EVIDENCE.md` for exact commands, results and limitations.

## CF-02 — Ready for review (automated checks passed; manual acceptance pending)

Bounded scope: device-class sessions, durable refresh rotation and replay handling, global access-token/session binding, idle and absolute expiry, explicit current/all-device logout, session list/revocation UI, return destination preservation, and browser lifecycle renewal. Password recovery and profile workflows remain outside this milestone.

Confirmed choice: personal devices may remain signed in and shared staff devices use shorter sessions. Durations remain **proposed defaults, not confirmed product policy**: personal 7-day idle/30-day absolute; shared 30-minute idle/8-hour absolute; shared selected by default; 15-minute access tokens retained. Session rows live in Master and bind identity, authVersion, device class, expiry and revocation. Only SHA-256 refresh hashes are stored. Refresh rotates under a row lock; simultaneous requests within a 10-second grace receive one deterministic successor. Passive/background renewal never extends inactivity; foreground activity does. Current-device logout revokes only that row; all-device logout increments authVersion and revokes all rows. Legacy sid-less tokens remain accepted only for their bounded 15-minute lifetime during rollout compatibility.

Implementation: additive Master `IdentitySession` schema/migration and template-manifest entry; strict session contracts; login device choice; refresh endpoint and HttpOnly cookie transport; global guard enforces durable session validity for session-bound bearer tokens; explicit logout scopes; self-scoped active-session listing and other-session revocation; Security screen; foreground and document-navigation renewal without counting polling or prefetch as activity. Existing authVersion revocation and support-session revocation on logout remain in place. Existing owner-created onboarding and temporary-password flow remain intact.

Automated coverage includes exact session response validation, global guard enforcement, session rotation/replay, concurrent refresh idempotence, passive versus active idle updates, session checks, current/all-device logout, CF-01 application/pending-access regression and existing tenant enrollment/consent reconciliation. Exact results and initial corrected attempts are recorded in `EVIDENCE.md`. Manual browser/device lifecycle and accessibility acceptance are deferred; no CF-specific browser spec was added.

## Remaining milestones

- CF-04: account/profile destinations and field-scoped self-service editing.
- CF-05: safe login-email correction workflow.
- CF-06: notification center, paging, inbox scopes and broader event history.
- CF-07: common help/error/privacy/lifecycle behavior and operational visibility.
- CF-08: owned integration/browser, upgrade, recovery and release evidence; no milestone is Verified by compilation alone.

## Risks and dependencies

- Existing Master enrollment operations are owner-initiated and require explicit subject consent for reused identities; public application approval must not impersonate that consent.
- Tenant enrollment requires an explicit active membership plan and currently starts the term at the gym-local current date. Existing owner-created onboarding remains separate.
- Master application events must remain readable when tenant databases are unavailable; operational membership and access cannot be activated before reciprocal tenant binding and receipt reconciliation.
- Normalized email uniqueness and public responses must avoid account enumeration. Public signup must not create an elevated role.
- Proposed CF-02 session durations are implementation defaults only and need product confirmation before production policy is claimed.
- Sid-less pre-CF-02 access tokens bypass session-row checks until their 15-minute expiry; rollout must account for this compatibility window.
- Owner design system is Atlas Light/Midnight Blue, shared role shells and semantic tokens; preserve existing conventions and mobile layouts.
- Disposable DB/browser suites require the owned test harness and its prerequisites. Missing Docker/credentials means blocked/unverified, never passed.

## CF-01 handoff boundary

The implementation is Ready for review after automated checks. It is not Verified because manual acceptance is pending and no CF-specific Playwright browser spec was added. The owned API/database suites prove the application service, permission fence, decision races, and application-bound enrollment consent/reconciliation; they do not replace the deferred applicant/owner browser acceptance. `RECOVERY_REQUIRED` remains a modeled state without a separate operator recovery UI; recoverable interruptions remain `PROCESSING` and retry the stable operation. Rejected/withdrawn applications can be resubmitted from an authenticated account. Retention duration remains a product policy decision.

CF-02 is Ready for review on automated evidence only. Manual acceptance is pending, so neither CF-01 nor CF-02 is marked Verified.

## CF-03 — Ready for review (automated checks passed; manual acceptance pending)

Bounded scope: normal authenticated password changes plus audited, one-time staff-assisted recovery for ordinary gym identities and a distinct privileged-operator recovery path. This does not add email reset, provider-based recovery, or the CF-06 notification center.

Data ownership: Master owns only recovery credential hashes, identity/scope, verification method and attestation, attempt/expiry/redeemed/revoked evidence, issuer/auth-version binding, and append-only identity security events. Plaintext recovery secrets are returned once and never stored or logged. User credentials and durable sessions remain Master-owned; tenant databases are not touched.

Authorization and defaults: ordinary recovery requires the current gym Owner to reauthenticate, attest to verification method/reason, and select an eligible ordinary single-gym Member/Trainer or uniquely scoped pending applicant. Pending applicants remain pending and receive no GymAccess. Elevated, shared, multi-gym, ambiguous, and temporary-credential identities are excluded from this path. A separately audited SuperAdmin flow handles privileged/operator identities, requires the acting SuperAdmin's current password, and prohibits self-reset. Issuer authority and authVersion are rechecked on redemption. The implemented 15-minute expiry, five failed-attempt limit, and one-time redemption/reissue revocation are **proposed defaults**, not confirmed product policy. Routine password change requires the current password, advances authVersion, revokes durable sessions/recovery credentials/support sessions, and records audit/security history. Existing temporary-password onboarding remains intact.

Implementation: additive Master recovery/security-event schema and migration/template-manifest entry; strict recovery contracts and guarded/throttled APIs; one-use URL-fragment delivery; gym Owner recovery UI, separately scoped SuperAdmin recovery UI, public completion screen, normal change-password semantics and self-scoped security history. Response-lost replay is idempotent after successful redemption. No recovery path grants gym access or membership.

Automated evidence: 17 identity integration tests passed, including password/session revocation, recovery token expiry/attempt/reissue/replay behavior, pending-applicant non-activation, issuer downgrade fencing and privileged operator recovery. Contracts (63), tenant manifests, web/API typechecks, lint, workspace graph, and production web build passed. Exact commands and results are in `EVIDENCE.md`.

Remaining risks: staff attestation records the verification process but cannot prove that real-world identity verification occurred; the operator process does not implement dual control. The recovery page directs users to contact information already supplied by their gym; there is no verified in-app contact directory or email reset. Manual browser, visual, mobile, accessibility, recovery-outage and live operational acceptance are deferred. CF-03 is not marked Verified. No PT files or PT status records were modified.

Next task: implement **CF-04 account/profile destinations and field-scoped self-service editing**.
