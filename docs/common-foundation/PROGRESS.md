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

## CF-05 — Ready for review (automated checks passed; manual acceptance pending)

Bounded scope: a self-service, fresh-password-confirmed request for login email correction; identity-scoped request status and withdrawal; a SuperAdmin follow-up queue and closure outcome; help copy and an operator runbook. No actual login email change, mailbox verification, notification, contact snapshot update, account merge, recovery claim invalidation, or session revocation is implemented because this release has no mailbox possession provider or authorized identity-change process.

Data ownership: Master owns `User.email` and the new `IdentityEmailCorrectionRequest` facts. Tenant Member/Trainer email fields remain gym contact snapshots and are unchanged. Request address is normalized using the shared identity email policy and checked against current Master identities. A partial unique constraint allows at most one pending request per subject and target address. A database trigger protects request facts and allows only one versioned `PENDING` → `WITHDRAWN` or `PENDING` → `CLOSED` transition.

Authorization: signed-in subject can create/read/withdraw only their own request; submission requires current password and an active session. Only SuperAdmin can read the bounded follow-up queue or close a request. Read-only support cannot mutate. Closing records `FOLLOW_UP_RECORDED` or `CLOSED_NO_CHANGE`; neither outcome changes the login identity. Audit transitions include request ID, version and outcome code only. The request's target email is held on the request row and its idempotency digest, but not copied into audit transitions. Password, current password hash and staff evidence are not stored with the request.

Failure handling: normalized duplicates and already-pending requests conflict without creating extra rows; idempotent repeats return the original safe request; competing closures use version/state CAS and exactly one wins; applicant withdrawal is terminal. API outage leaves the current login usable and the UI says the outcome is unconfirmed. No tenant operation is needed, so tenant availability does not gate account security. The form clears the password after every action response.

Implementation: additive Master migration `20261106100000_identity_email_correction_requests`, Master manifest `.7`, strict shared contracts, API subject and platform-review endpoints, `/account/email-correction`, `/admin/email-correction-requests`, profile/help entry points, and [the CF-05 runbook](CF-05-EMAIL-CORRECTION-RUNBOOK.md). Existing profile login email stays read-only. No changes were made to PT source or PT progress/evidence/runbook.

Automated coverage: current-password rejection, canonical target normalization, case-variant duplicate handling, same-key concurrent replay, one-pending constraints, current identity collision rejection, password hash/login email preservation, tenant contact snapshot preservation, subject-only status/withdrawal behavior, safe audit data, SuperAdmin queue closure, and concurrent competing closure. The owned Master/tenant migration and existing application/enrollment/profile regression suites passed. Exact commands and actual outcomes are in `EVIDENCE.md`.

Remaining risks and deferred acceptance: an email address entered in a request is not proof of mailbox control, and staff follow-up only records an existing process; a real login identity update remains unavailable until a separately authorized proof and reconciliation process exists. Manual browser, visual/mobile, keyboard/focus/accessibility, real staff follow-up, and live outage acceptance remain deferred. CF-05 is not marked Verified.

Next task: resolve the CF-06 automated browser route issue and complete owned browser evidence in CF-08.

## CF-07 — Ready for review (automated checks passed; manual acceptance pending)

Bounded scope: account/gym help routes and state guidance; privacy and lifecycle owner procedures; SuperAdmin aggregate visibility for supported Master signals; standardized next-step copy on application submission uncertainty. No legal retention period, account merge/delete flow, member-directory contact lookup, external messaging, or unsupported telemetry was invented.

Implementation: `/help` now explains pending/rejected/withdrawn/revoked/suspended status, account versus gym membership, privacy and account correction next steps, identity verification, and the limits of the current email-correction request. Sign-in, recovery, authenticated application, and application status link to Help. The SuperAdmin `/admin` page reads `GET /admin/operations/visibility`, which reports only aggregate Master counts for pending/recovery-required applications, stale/retryable enrollment operations, and active exhausted recovery credentials. Profile operation failures and session renewal/revocation failures are explicitly marked not centrally recorded; inbox projection backlog is marked inapplicable because current notices commit with source records. The procedure is recorded in [the CF-07 owner privacy runbook](CF-07-OWNER-PRIVACY-RUNBOOK.md).

Data and retention decisions: collect only fields required for application, membership, security and support. No legal retention duration was confirmed. Retain records as required for present access control, support, reconciliation and audit; do not automate deletion/anonymization until an explicit reviewed schedule exists. No identity merge or hard delete is authorized by this milestone.

Automated checks for CF-07 pass: contract safety, operational-summary service unit test, workspace typechecks, unit suite (including the pre-existing localhost controller test after permitted rerun), lint, API build, web build, workspace graph, and whitespace/diff checks. The earlier CF-06 Playwright notification journey remains a failing automated browser check and is carried forward; CF-07 is Ready for review for its own automated coverage, but the common-foundation release is not fully verified. Manual mobile, keyboard/focus, theme, zoom, long-name, and real owner workflow acceptance is deferred.

## Remaining milestones

- CF-07: implemented; review manual help, keyboard/focus, mobile, theme and privacy workflows.
- CF-08: resolve the existing automated notification-browser redirect, run owned browser/upgrade/recovery evidence, and complete release review; no milestone is Verified by compilation alone.

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

## CF-04 — Ready for review (automated checks passed; manual acceptance pending)

Bounded scope: accessible shared account destinations, global account display-name editing, Member and Trainer self-editable gym profile fields, and reasoned Owner corrections for official Member fields. No email-change workflow, health-note submission/review, photo storage, or notification center was added.

Data ownership and visible names: Master remains authoritative for login email and global `displayName`. Tenant `Member.fullName` and `Trainer.fullName` remain gym-local official names; the profile page labels that separation and never copies an account name into a gym record. Existing directories, client views, dashboard and PT session reads use the current tenant names; historical PT/session snapshots are unchanged. Member DOB is read-only to the Member and the page directs them to the Owner for correction.

Authorization and allowlists: account display name is self-only through `/auth/profile`. Active Member and Trainer accesses can read/update only their own verified reciprocal tenant actor using `/gyms/:slug/me/profile`; Member edits phone/emergency contact, while Trainer edits phone, biography, specialisations and experience. The APIs use strict shared contracts and explicit Prisma field assignments. Owner official Member correction requires current Owner gym access and a published completed enrollment/receipt binding; it permits only full name, DOB, phone and emergency contact with an expected version and enumerated correction reason. Status, level, pay, role, membership/credits, email and health notes are excluded. Support is read-only; profile server actions refuse mutation while support context is present.

Durability: profile writes use compare-and-set versions and idempotency keys. Master account edits have a new immutable Master `ProfileCommandReceipt`, matching migration/manifest update and version audit. Tenant edits use existing `CommandReceipt` plus append-only `AuditLog`; audit transitions contain version and event/reason code only, never contact or health values. Stale/concurrent writes conflict without overwriting newer data. Retry with the same key returns the committed result. Form action state preserves typed fields on validation/outage errors and exposes inline contract field errors. Profile mutation does not touch enrollment, session, PT, membership, credits, or tenant health data.

Implementation: accessible account disclosure in the shared header with Profile, Security, existing in-app Notifications bell, Help and sign-out-this-device destinations; `/account/profile`, gym-scoped `/gyms/[slug]/profile`, and `/help` routes; themed forms for account and gym records; Owner correction editor on the existing Member detail page; strict contracts, API controllers, and the Master receipt migration. Tenant schema is unchanged because the fields and receipt/audit machinery already exist.

Automated coverage: contracts test strict field separation and restricted inputs; owned tenant integration updates a real synthetic Member and Trainer, confirms global name does not change gym full name, denies mass assignment and wrong-subject updates, validates concurrent CAS conflict and idempotent replay, applies an Owner correction, and checks audit values contain version/reason only. Existing CF-01 application/enrollment and CF-03 identity/session/recovery suites also pass. Exact commands are in `EVIDENCE.md`.

Remaining gaps: no tracked Member DOB correction request is created (the profile directs the member to ask the Owner); no proposed-health-update workflow or avatar upload is included. The Notifications item opens the existing bell; paged notification history remains CF-06. Help gives the existing gym-contact route but does not create or verify contact details. Browser, mobile, visual, keyboard/focus, accessibility, offline UI and real multi-gym role switching acceptance remain deferred. CF-04 is not marked Verified. PT files and PT progress/evidence/runbook were not modified.

Next task: implement **CF-05 safe login-email correction workflow**, keeping login identity, tenant contact snapshots, verification evidence, and session invalidation distinct.

## CF-06 — Core implementation complete; browser verification unresolved

Bounded scope: full tenant notification history for the existing gym bell, explicit Account versus Gym inboxes, application/account-security event history, typed local targets, mark-one and snapshot-bounded mark-all, and the Owner Member-profile correction outcome notice. No broad notification preferences, external messaging, cross-database combined feed, runner rebuild, or delete action was added.

Ownership and authorization: Master remains authoritative for applicant/owner application notices, password changes/recovery and session revocation. Master security events remain append-only; a separate subject-bound `IdentitySecurityEventRead` receipt stores read state. Gym operational/PT notifications and Owner profile-correction notices remain in the selected tenant. Gym history uses the existing gym authorization guard and recipient identity filter; Account history queries only the signed-in subject. Owner queue notices are visible only while the recipient retains active Owner access to that active gym. Applicant notices remain readable without active GymAccess. Each inbox has its own bounded cursor/snapshot and unread count; no cross-database atomic mark-all is claimed.

Confirmed architecture choices: existing PT notification dedupe, supersession, reminder scheduling, polling and focus/context guards remain the source of truth. Notification destinations are typed session/application/profile/security/authorized-owner-queue paths; event content cannot supply an arbitrary URL. Member profile corrections create one generic notice in the same tenant command transaction, with no changed field values or private reason in its text. Account session-revocation events are recorded in the same Master transaction as session revocation. Essential notices have no opt-out setting in CF-06. Proposed/undecided policy: notification retention duration and archival timing remain product decisions; immutable application/security events are not deleted by inbox controls.

Implementation: Master migration `20261106110000_account_notification_read_receipts` and manifest `.8`; tenant migration `20261106120000_member_profile_notifications` and manifest `.6`; separate Account and Gym paged APIs; typed target contracts; `/account/notifications` and `/gyms/[slug]/notifications`; bell View all link; Account/Gym notification destinations; generic Member correction notice; and duplicate application-notice feed fetches removed from status/queue pages. The Account inbox remains usable independently of tenant availability. No PT progress/evidence/runbook or PT source was changed.

Automated coverage passed for typed contract validation, tenant and Master manifest checks, identity-scoped Account notices for a pending applicant, security append-only/read receipts, safe generic application text, mark-read and snapshot mark-all, tenant pagination snapshot stability, gym recipient isolation, superseded-item mark-all exclusion, Owner profile-notice transaction and privacy, the CF-01 application/enrollment suite, existing identity/session/recovery regressions, and PT reminder/upgrade behavior. Exact commands and results are in `EVIDENCE.md`.

Status: API, contract, database, workspace, type, lint, build, CF-01, identity and PT automated suites passed. The automated Playwright notification-bell journey did not pass: its synthetic API preflights for the current session, gym access and notification-history endpoint succeeded, but the Next.js browser journey still reached `/login?error=expired` while opening the bell. The test source was restored to its original state after diagnosis. This remains an automated browser verification gap; no manual browser walkthrough or acceptance test was performed. CF-06 is not marked Ready for review or Verified until the browser issue is resolved and rerun.

Next task: implement **CF-07 common help, error, privacy and account-lifecycle consistency**, then resolve and rerun the notification browser journey within the owned automated browser evidence work in CF-08. No deploy, merge, pilot, external message or shared/production database change occurred.
