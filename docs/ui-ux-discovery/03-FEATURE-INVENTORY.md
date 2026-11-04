# Feature inventory

Audit date: 5 November 2026 (Asia/Colombo). Scope: current `gymos-v2` working tree. Discovery only; implementation status means source-connected, not a fresh runtime certification.

## Coverage and counting

**46 feature groups:** 45 groups with implemented source (including partial/backend/CLI-only groups) plus one explicit subscription placeholder. Features are business capability groups, not counts of API endpoints or individual buttons. No additional production feature is counted from `/test-ui`, saved V1 screenshots, comments or the user’s example list. Every group below covers purpose/status/roles/screens/workflow, forms/tables/filters, models, transport, rules, issues and improvement direction. Fine-grained fields and columns are expanded in file02; endpoint/model ledgers are in file11.

| ID | Feature group | Status | Role |
|---|---|---|---|
| F01 | Account login, session expiry and sign-out | Implemented | All identities |
| F02 | First-login password replacement | Implemented | Authenticated identity |
| F03 | Gym selection and role navigation | Implemented | USER with gym links |
| F04 | Platform registry and sanitized aggregate counts | Implemented | SUPER_ADMIN |
| F05 | Gym provisioning and existing-owner approval | Partial: worker/API present, owner consent web UI absent | SUPER_ADMIN; intended existing owner privately |
| F06 | One-time owner credential handoff | Implemented | SUPER_ADMIN |
| F07 | Reasoned read-only platform support | Implemented | SUPER_ADMIN |
| F08 | Gym suspension/reactivation and recovery | Implemented | SUPER_ADMIN |
| F09 | Member directory and basic contact records | Implemented read UI; basic-create API only | OWNER |
| F10 | Full member enrollment and temporary credential delivery | Implemented | OWNER; new member at first login |
| F11 | Existing-member identity consent | Implemented with login-return gap | Intended existing identity; OWNER resumes |
| F12 | Owner member profile, membership and PT history | Partial: PT history not connected | OWNER |
| F13 | Member status lifecycle | Implemented | OWNER |
| F14 | Membership plan catalog | Implemented creation/read; no update/deactivate UI/API | OWNER |
| F15 | Membership eligibility and renewal | Backend only / partial product workflow | OWNER renews; member reads own eligibility |
| F16 | Session-pack issuance and entitlement accounting | Implemented | OWNER issues; member/trainer see scoped balances |
| F17 | Trainer enrollment and one-time credential delivery | Implemented | OWNER; new trainer first login |
| F18 | Existing-trainer identity consent | Implemented with login-return gap | Intended identity; OWNER resumes |
| F19 | Trainer roster, profiles and member trainer directory | Implemented with owner-search predicate issue | OWNER full roster; MEMBER sanitized active directory |
| F20 | Recurring trainer shift approval | Implemented | OWNER |
| F21 | Trainer deactivation/reactivation | Implemented | OWNER |
| F22 | Owner direct PT booking | Implemented | OWNER |
| F23 | Member PT request creation | Implemented | MEMBER |
| F24 | Trainer request decisions | Implemented | Assigned TRAINER |
| F25 | Session ledgers, calendars and monthly member overview | Implemented with owner list-navigation defect | OWNER/TRAINER/MEMBER scoped |
| F26 | Session start, visible notes and completion | Implemented trainer UI; owner UI partial | Assigned TRAINER; OWNER lifecycle API |
| F27 | Session withdrawal and policy cancellation | Implemented | Own MEMBER/TRAINER; OWNER tenant scope |
| F28 | No-show settlement | Implemented | Assigned TRAINER/OWNER; no MEMBER action |
| F29 | Confirmed trainer client roster and private profile | Implemented bounded views | TRAINER |
| F30 | Workout plan creation, assignment and member reading | Implemented create/read only | TRAINER current client; MEMBER own |
| F31 | Meal plan creation, nutrition totals and weekly projection | Implemented create/read only | TRAINER current client; MEMBER own |
| F32 | In-app notifications and read state | Implemented limited popover | OWNER/TRAINER/MEMBER |
| F33 | Operational revenue and deferred entitlement value | Implemented | OWNER |
| F34 | Expense recording and category filtering | Implemented creation/read only | OWNER |
| F35 | Monthly category budgets and variance | Implemented | OWNER |
| F36 | Trainer payroll periods, close and approval | Implemented | OWNER commands; TRAINER own read projection |
| F37 | Trainer own earnings portal | Implemented with date-zone mismatch | TRAINER |
| F38 | Operational P&L and category expense mix | Implemented | OWNER |
| F39 | Authenticated CSV snapshots | Implemented | OWNER |
| F40 | Owner sanitized audit history | Implemented selected events only | OWNER |
| F41 | Live owner operational dashboard | Implemented with misleading proxy labels | OWNER |
| F42 | Owner operational analytics | Implemented bounded estimates | OWNER |
| F43 | Gym contact, display name, fees and operating policy | Implemented limited settings | OWNER |
| F44 | Tenant appearance and public theme projection | Implemented storage/edit; live logo rendering partial | OWNER edits; public theme read |
| F45 | Schema gates, operation recovery and maintenance | Backend/CLI implemented; no general maintenance UI | Authorized platform operators via scripts; limited owner/admin recovery UI |
| F46 | GymOS subscription and billing navigation | Placeholder / billing not implemented | OWNER |

## F01 — Account login, session expiry and sign-out

**Status / access / screens:** Implemented · All identities · S01–S07.

**Purpose and complete source-backed workflow:** Email/password → API verification → short-lived server cookie → password gate/role landing/chooser. Logout revokes identity sessions and support; browser clears even when revocation uncertain.

**Forms, displayed data, tables, filters and states:** Email/password fields; account-unavailable/invalid/rate/expired feedback; no-access card; cross-tab invalidation and BFCache conceal/reload.

**Data models and relationships:** Master User, GymAccess, Gym, SupportSession.

**API/actions/services:** AuthController /auth/login, /auth/session, /auth/logout; actions.ts, /api/session.

**Validation/business/permission requirements:** 900s JWT, authVersion/current account checks, active gym/link, Argon2, issuer/audience. Mutations require trusted origin in web proxy.

**UI limitation and improvement opportunity:** No reset/MFA/signup flow; no login pending feedback or consent returnTo handling. Preserve revocation and honest uncertainty. [apps/api/src/auth.controller.ts:1](../../apps/api/src/auth.controller.ts#L1), [apps/web/src/proxy.ts:1](../../apps/web/src/proxy.ts#L1)

## F02 — First-login password replacement

**Status / access / screens:** Implemented · Authenticated identity · S04.

**Purpose and complete source-backed workflow:** Enter current/new/confirm → validate → change password/revoke sessions → explicitly return to sign in.

**Forms, displayed data, tables, filters and states:** Three password inputs, requirements, pending/error/success and final sign-in action.

**Data models and relationships:** Master User credential/auth versions and expiry; support revocation.

**API/actions/services:** CredentialsController POST /auth/change-password; CredentialService.changePassword; changePasswordAction.

**Validation/business/permission requirements:** 10–200 new characters, non-letter content, no edge whitespace, differs from current, matching confirmation; rate-limited.

**UI limitation and improvement opportunity:** Protect first-login gate and avoid preserving temporary passwords in drafts/telemetry. [packages/contracts/src/credentials.ts:1](../../packages/contracts/src/credentials.ts#L1), [apps/web/src/components/credentials/change-password-form.tsx:1](../../apps/web/src/components/credentials/change-password-form.tsx#L1)

## F03 — Gym selection and role navigation

**Status / access / screens:** Implemented · USER with gym links · S01/S06/S07/S24/S32.

**Purpose and complete source-backed workflow:** Session lists active gym links → choose one → server checks slug/access/actor binding → proper role workspace; switch by full navigation.

**Forms, displayed data, tables, filters and states:** Gym name/role link list; role sidebar, active link, mobile drawer, Switch gym if >1.

**Data models and relationships:** Master GymAccess compound key and Gym lifecycle; reciprocal tenant actor for member/trainer.

**API/actions/services:** GET auth/session, gyms/:slug/access and public theme; gym-context.ts/navigation.ts.

**Validation/business/permission requirements:** One role per identity per gym; global admin routes to platform. Foreign and missing gyms hidden; session access updates invalidate rendered context.

**UI limitation and improvement opportunity:** Trainer landing inconsistent (earnings vs schedule). Standardize entry behavior while retaining identity/gym state disposal. [apps/web/src/lib/gymos.ts:1](../../apps/web/src/lib/gymos.ts#L1), [apps/web/src/components/navigation/dashboard-chrome.tsx:1](../../apps/web/src/components/navigation/dashboard-chrome.tsx#L1)

## F04 — Platform registry and sanitized aggregate counts

**Status / access / screens:** Implemented · SUPER_ADMIN · S02.

**Purpose and complete source-backed workflow:** Load bounded registry → inspect lifecycle/provisioning/counts → refresh first/next bounded batch → follow cursor.

**Forms, displayed data, tables, filters and states:** Table columns in S02; totals, active/verified/stale/unavailable indicators; partial totals withheld; up to 25/page.

**Data models and relationships:** Master Gym, GymAccess/User owner label, GymRegistrySummary, Operation.

**API/actions/services:** AdminController GET admin/gyms, admin/analytics/summary; POST analytics/refresh; PlatformRegistryService.

**Validation/business/permission requirements:** SuperAdminGuard; cached verified summaries have freshness and missing-state semantics; no raw tenant detail aggregation into browser.

**UI limitation and improvement opportunity:** No search/filter/sort, long technical metadata on mobile. Improve readable freshness and registry discovery. [apps/api/src/platform/platform-registry.service.ts:1](../../apps/api/src/platform/platform-registry.service.ts#L1), [apps/web/src/components/platform/registry.tsx:1](../../apps/web/src/components/platform/registry.tsx#L1)

## F05 — Gym provisioning and existing-owner approval

**Status / access / screens:** Partial: worker/API present, owner consent web UI absent · SUPER_ADMIN; intended existing owner privately · S02.

**Purpose and complete source-backed workflow:** Submit name/slug/email/currency/zone+stable key → reserve durable operation → worker prepares/commits/verifies tenant → owner identity/link → complete. Existing identity requires private signed-in password consent before finish.

**Forms, displayed data, tables, filters and states:** Create-gym fields, step/state/status refresh, retryable retry, repair-required notice and owner-verification warning.

**Data models and relationships:** Master Gym, Operation, ProvisioningIntent; tenant GymConfiguration/SchemaState; owner User/GymAccess.

**API/actions/services:** POST admin/gyms, GET admin/operations/:id, POST retry; POST auth/provisioning/:id/owner-consent; reservation/worker/owner/provisioning services and CLI.

**Validation/business/permission requirements:** Unique slug/request digest, current actor/version, valid LKR/USD and IANA timezone, verified schema/binding before active. Worker is not registered as background loop in AppModule.

**UI limitation and improvement opportunity:** No owner-consent route/link, worker scheduling/deployment unverified, form may reset values when submitted. Design resumable operation handoff without assuming instant success. [apps/api/src/platform/provisioning-owner.controller.ts:1](../../apps/api/src/platform/provisioning-owner.controller.ts#L1), [apps/api/src/platform/provisioning-worker.ts:1](../../apps/api/src/platform/provisioning-worker.ts#L1), [apps/web/src/components/platform/provisioning-form.tsx:1](../../apps/web/src/components/platform/provisioning-form.tsx#L1)

## F06 — One-time owner credential handoff

**Status / access / screens:** Implemented · SUPER_ADMIN · S02.

**Purpose and complete source-backed workflow:** Completed new-owner provision → issue credential → securely deliver once → acknowledge; lost/expired unacknowledged credential → review replacement → reissue/revoke prior.

**Forms, displayed data, tables, filters and states:** Registry row one-time output; delivered button; already-issued state; replacement confirmation and pending/error.

**Data models and relationships:** Master CredentialDelivery, User, Operation; plaintext not persisted in those models.

**API/actions/services:** POST admin/operations/:id/credentials/{issue,reissue,acknowledge}; CredentialService.

**Validation/business/permission requirements:** One-time disclosure, deliveryVersion, stable replacement key, owner/operation scope, 24h temporary expiry and forced change.

**UI limitation and improvement opportunity:** Keep secrets out of URLs, persistent client storage and analytics. Clearly distinguish delivery acknowledgment from account activation. [apps/web/src/components/platform/registry.tsx:27](../../apps/web/src/components/platform/registry.tsx#L27), [apps/api/src/identity/credential.service.ts:1](../../apps/api/src/identity/credential.service.ts#L1)

## F07 — Reasoned read-only platform support

**Status / access / screens:** Implemented · SUPER_ADMIN · S02 + S10/S11 variant.

**Purpose and complete source-backed workflow:** Select gym → code/explanation → enter audited15m context → fetch scoped summary → exit or expire; entering replaces previous.

**Forms, displayed data, tables, filters and states:** Support form, selected row and banner, expiry, summary health/operation/counts/currency/zone; no tenant mutation tools.

**Data models and relationships:** Master SupportSession/SupportEvent, User/Gym; tenant read-only summary.

**API/actions/services:** POST/DELETE admin/support-sessions; GET :id/gyms/:slug/summary; support-context server cookie, scope guard.

**Validation/business/permission requirements:** Opaque context+actor/authVersion+gym+expiry verified server-side; normal tenant APIs reject support header. Only GYM_SUMMARY_READ.

**UI limitation and improvement opportunity:** “View dashboard” actually starts selection; unavailable and expired contexts share limited recovery screen. Improve explicit action and exit visibility. [apps/api/src/platform/support-scope.guard.ts:1](../../apps/api/src/platform/support-scope.guard.ts#L1), [apps/web/src/components/platform/support-owner-page.tsx:1](../../apps/web/src/components/platform/support-owner-page.tsx#L1)

## F08 — Gym suspension/reactivation and recovery

**Status / access / screens:** Implemented · SUPER_ADMIN · S02.

**Purpose and complete source-backed workflow:** Choose suspend/reactivate → reason/confirm/current version → durable lifecycle intent → drain/verify/transition; resume immutable work if interrupted.

**Forms, displayed data, tables, filters and states:** Destructive/secondary dialog, reason10–500, operation reference, pending/error/resume status.

**Data models and relationships:** Master Gym/Operation/GymLifecycleIntent, access links; tenant schema/binding evidence.

**API/actions/services:** POST admin/gyms/:id/lifecycle; GET admin/lifecycle/:id; POST resume; GymLifecycleService.

**Validation/business/permission requirements:** Only active/suspended target transitions; version/key; suspend stops ordinary operational access; reactivate requires healthy verified binding and active owner.

**UI limitation and improvement opportunity:** Describe access effects separately from deletion and preserve history. No arbitrary repair approval interface. [apps/web/src/components/platform/lifecycle-control.tsx:1](../../apps/web/src/components/platform/lifecycle-control.tsx#L1), [apps/api/src/platform/gym-lifecycle.service.ts:1](../../apps/api/src/platform/gym-lifecycle.service.ts#L1)

## F09 — Member directory and basic contact records

**Status / access / screens:** Implemented read UI; basic-create API only · OWNER · S11/S13.

**Purpose and complete source-backed workflow:** Read BASIC contacts and published registered members → search/status/page → profile. Legacy basic-create endpoint persists name/email with no login account.

**Forms, displayed data, tables, filters and states:** Member table/search/status/pager in S11; BASIC/operational/historical account state shown in profile, not directory.

**Data models and relationships:** Tenant Member; published master enrollment Operations and active GymAccess; current MembershipTerm.

**API/actions/services:** GET gyms/:slug/members, GET members/:id; POST members basic path; GymsController.

**Validation/business/permission requirements:** Owner only; BASIC vs published COMPLETE distinguished; phone/name/email search API, status enum; selected current term uses gym-local date.

**UI limitation and improvement opportunity:** Directory hides returned account/pending summary and describes search incompletely. No current basic-create form. [apps/api/src/gyms.controller.ts:204](../../apps/api/src/gyms.controller.ts#L204), [apps/web/src/components/navigation/owner-gym-page.tsx:1](../../apps/web/src/components/navigation/owner-gym-page.tsx#L1)

## F10 — Full member enrollment and temporary credential delivery

**Status / access / screens:** Implemented · OWNER; new member at first login · S12/S13/S04.

**Purpose and complete source-backed workflow:** Select active plan and member details → cross-database operation → tenant actor+initial membership → master publish → one-time handoff/ack → profile; existing identity branches to F11.

**Forms, displayed data, tables, filters and states:** Required name/email/phone/DOB/plan, emergency/health optional; pending consent, preserved draft, lost-result credential replacement, copy/manual fallback.

**Data models and relationships:** Member, MembershipTerm, MembershipPlan, CommandReceipt/AuditLog; User/GymAccess/Operation/EnrollmentProof/CredentialDelivery.

**API/actions/services:** POST member-registrations; enrollment credential endpoints; MemberEnrollmentService; member-actions.ts.

**Validation/business/permission requirements:** Current owner, eligible plan/currency/zone, stable digest/key, DOB contract, private-field bounds, reciprocal publication. Agreed membership value creates no payment.

**UI limitation and improvement opportunity:** No profile edit/renewal or durable browser draft beyond mounted state. Preserve unchanged retry intent and new-vs-existing identity behavior. [apps/web/src/components/members/member-registration-form.tsx:1](../../apps/web/src/components/members/member-registration-form.tsx#L1), [apps/api/src/member-enrollment.service.ts:1](../../apps/api/src/member-enrollment.service.ts#L1)

## F11 — Existing-member identity consent

**Status / access / screens:** Implemented with login-return gap · Intended existing identity; OWNER resumes · S08/S12.

**Purpose and complete source-backed workflow:** Owner starts enrollment → shares private path/reference → intended user signs in/current-password Accept or Decline → owner retries unchanged form to finish.

**Forms, displayed data, tables, filters and states:** Current password, two explicit decisions, terminal recorded/declined feedback; pending operation reference in owner form.

**Data models and relationships:** Master EnrollmentProof, User, Operation and access; tenant member publication.

**API/actions/services:** POST member-enrollments/:operationId/consent; MemberEnrollmentService.consent; memberEnrollmentConsentAction.

**Validation/business/permission requirements:** Proof belongs to identity/gym/role/operation/authVersion, time-limited and consumed; password never sent to owner. Consent is not completed enrollment.

**UI limitation and improvement opportunity:** Login discards returnTo and no automatic owner notification/completion. Preserve private consent but connect the return path. [apps/web/src/app/gyms/[slug]/enrollment-consent/[operationId]/page.tsx:1](../../apps/web/src/app/gyms/[slug]/enrollment-consent/[operationId]/page.tsx#L1), [apps/web/src/app/actions.ts:22](../../apps/web/src/app/actions.ts#L22)

## F12 — Owner member profile, membership and PT history

**Status / access / screens:** Partial: PT history not connected · OWNER · S13.

**Purpose and complete source-backed workflow:** Open profile → Overview or Attendance History or Membership & Packs → browse terms/issue pack/change status.

**Forms, displayed data, tables, filters and states:** Contact/DOB/emergency/health/account/registration status; term name/dates/value and paginated history; pack balances; attendance list always empty from source projection.

**Data models and relationships:** Member→MembershipTerm/SessionPack; PTSession relation exists; recentSessions field returned empty.

**API/actions/services:** GET members/:id; separate GET members/:id/recent-sessions exists but is not fetched by profile.

**Validation/business/permission requirements:** Owner private fields; history includes inactive/historical accounts only when publication checks pass. Term end is exclusive.

**UI limitation and improvement opportunity:** Connect actual PT history and label it accurately; general gym attendance is unavailable. UI must not interpret empty placeholder as no recorded sessions. [apps/api/src/gyms.controller.ts:325](../../apps/api/src/gyms.controller.ts#L325), [apps/web/src/components/members/member-profile-tabs.tsx:1](../../apps/web/src/components/members/member-profile-tabs.tsx#L1)

## F13 — Member status lifecycle

**Status / access / screens:** Implemented · OWNER · S13.

**Purpose and complete source-backed workflow:** Select other status/reason/acknowledge → durable cross-database status operation → revoke/reactivate link, cancel future pending/confirmed sessions/release holds → refresh; resume original after interruption.

**Forms, displayed data, tables, filters and states:** ACTIVE/INACTIVE/SUSPENDED select; reason1–500; consequence checkbox; hidden member version/key; operation/recovery feedback.

**Data models and relationships:** Member, PTSession/hold/credit movement/audit; GymAccess, Operation, MemberLifecycleIntent.

**API/actions/services:** POST members/:id/status; GET member-lifecycle/:operationId; POST resume; MemberLifecycleService.

**Validation/business/permission requirements:** Published COMPLETE actors, expected versions and immutable intent, owner fence; past/ACTIVE sessions retained; reactivation does not restore cancellations.

**UI limitation and improvement opportunity:** Keep consequential summary before action; show completion vs pending recovery clearly. [apps/web/src/components/members/member-lifecycle-form.tsx:1](../../apps/web/src/components/members/member-lifecycle-form.tsx#L1), [apps/api/src/member-lifecycle.service.ts:1](../../apps/api/src/member-lifecycle.service.ts#L1)

## F14 — Membership plan catalog

**Status / access / screens:** Implemented creation/read; no update/deactivate UI/API · OWNER · S21 plans; S12 selector.

**Purpose and complete source-backed workflow:** Open Membership Plans → Add → name/description/price/days → create versioned plan → appears in list and active registration options.

**Forms, displayed data, tables, filters and states:** Plan list name/description/days/price/currency/status; inline Create/Cancel; no search/paging, maximum500 returned.

**Data models and relationships:** MembershipPlan→MembershipTerm snapshots; GymConfiguration.version and CommandReceipt/AuditLog.

**API/actions/services:** GET configuration; POST membership-plans; saveMembershipPlan.

**Validation/business/permission requirements:** Name1–80, optional description≤500, duration1–3650; nonnegative exact price currency precision≤2; current configuration version.

**UI limitation and improvement opportunity:** Design should preserve immutable agreed-term snapshots; do not show unsupported edit/deactivate as current actions. [apps/api/src/configuration.controller.ts:123](../../apps/api/src/configuration.controller.ts#L123), [apps/web/src/components/configuration/owner-gym-configuration.tsx:95](../../apps/web/src/components/configuration/owner-gym-configuration.tsx#L95)

## F15 — Membership eligibility and renewal

**Status / access / screens:** Backend only / partial product workflow · OWNER renews; member reads own eligibility · No connected renewal screen; S13 relevant.

**Purpose and complete source-backed workflow:** API computes eligibility from status/terms/gym-local today. Owner supplies active plan, current member version, key and IMMEDIATE or NEXT_AVAILABLE → creates non-overlapping snapshot term.

**Forms, displayed data, tables, filters and states:** No UI form, action or renewal button found. API results include start/endExclusive/price/currency/plan/memberVersion/replayed.

**Data models and relationships:** MembershipTerm, MembershipPlan, Member, GymConfiguration, CommandReceipt/AuditLog.

**API/actions/services:** GET members/:id/membership-eligibility; POST members/:id/memberships; ConfigurationController.

**Validation/business/permission requirements:** ACTIVE member only; immediate blocked by active/future term; next-available starts at latest future end or today; end exclusive; stable key protects duplication.

**UI limitation and improvement opportunity:** Adding renewal UI is completion of a backend feature and needs design scope approval; cash collection is still absent. [apps/api/src/configuration.controller.ts:150](../../apps/api/src/configuration.controller.ts#L150), [apps/api/src/configuration.controller.ts:170](../../apps/api/src/configuration.controller.ts#L170)

## F16 — Session-pack issuance and entitlement accounting

**Status / access / screens:** Implemented · OWNER issues; member/trainer see scoped balances · S13/S18/S28/S34/S35.

**Purpose and complete source-backed workflow:** Issue credits/validity/agreed price/currency → entitlement and ISSUE movement → booking holds allocated credit → complete/charged cancellation/no-show consumes or free/lifecycle release returns it; expiry changes available view.

**Forms, displayed data, tables, filters and states:** Credit ledger available/held/consumed/expired; pack dates/status/value; issue form/pending/error/success, active-member/currency guard.

**Data models and relationships:** SessionPack, PackCreditMovement, SessionCreditHold, PTSession, SessionSettlement, CommandReceipt/AuditLog.

**API/actions/services:** POST members/:id/session-packs; PacksController; credit-holds/session-state helpers; read projections.

**Validation/business/permission requirements:** Credits1–1000, validity1–3650, nonnegative price/current LKR/USD. Integer minor-unit base/remainder allocates exact per-credit value and ordinal; expiry is exclusive local date. Not a payment.

**UI limitation and improvement opportunity:** Balance definitions/remaining vs held vary by projection; use consistent labels, retain server ledger authority and no-payment wording. [apps/api/src/packs.controller.ts:1](../../apps/api/src/packs.controller.ts#L1), [apps/api/src/sessions/credit-holds.ts:1](../../apps/api/src/sessions/credit-holds.ts#L1)

## F17 — Trainer enrollment and one-time credential delivery

**Status / access / screens:** Implemented · OWNER; new trainer first login · S15/S04.

**Purpose and complete source-backed workflow:** Profile/level/paired shift input → durable registration → tenant actor/master role publication → temporary credential handoff/ack or existing-identity branch.

**Forms, displayed data, tables, filters and states:** Fields and limits in S15; draft state; pending/errors/complete/copy failure; missing-secret replacement.

**Data models and relationships:** Trainer, CommandReceipt/AuditLog; User, GymAccess, Operation, CredentialDelivery.

**API/actions/services:** POST trainer-registrations; TrainerEnrollmentService; credential endpoints reused by trainer registration form.

**Validation/business/permission requirements:** Level1/2, experience0–80 optional, specialisations array, paired shift, unique email and role binding; stable enrollment key; no password overwrite for existing identity.

**UI limitation and improvement opportunity:** Success returns dashboard; replacement retry behavior differs from member form. Share secure enrollment/handoff patterns. [apps/web/src/components/trainers/trainer-registration-form.tsx:1](../../apps/web/src/components/trainers/trainer-registration-form.tsx#L1), [apps/api/src/trainer-enrollment.service.ts:1](../../apps/api/src/trainer-enrollment.service.ts#L1)

## F18 — Existing-trainer identity consent

**Status / access / screens:** Implemented with login-return gap · Intended identity; OWNER resumes · S09/S15.

**Purpose and complete source-backed workflow:** Owner sends pending consent link → signed-in intended identity verifies password/accepts or declines → owner retries original enrollment.

**Forms, displayed data, tables, filters and states:** Password/Accept/Decline, pending operation reference and terminal feedback.

**Data models and relationships:** EnrollmentProof/Operation/User/GymAccess; registered Trainer.

**API/actions/services:** POST trainer-enrollments/:operationId/consent; trainer-actions.ts.

**Validation/business/permission requirements:** Identity/gym/role/operation proof, authVersion, expiry, current password, no password disclosed to owner.

**UI limitation and improvement opportunity:** Same return-path and manual coordination limitations as member consent. [apps/web/src/components/trainers/trainer-enrollment-consent-form.tsx:1](../../apps/web/src/components/trainers/trainer-enrollment-consent-form.tsx#L1), [apps/api/src/trainer-enrollment.service.ts:220](../../apps/api/src/trainer-enrollment.service.ts#L220)

## F19 — Trainer roster, profiles and member trainer directory

**Status / access / screens:** Implemented with owner-search predicate issue · OWNER full roster; MEMBER sanitized active directory · S14/S16/S33.

**Purpose and complete source-backed workflow:** Owner searches/status/level/pages → detailed profile; member searches active trainers → request selected trainer.

**Forms, displayed data, tables, filters and states:** Owner table name/contact/level/specialisations/shift/status; profile bio/experience/joined/metrics/latest 10; member cards omit contact, ratings explicitly unavailable.

**Data models and relationships:** Trainer, PTSession counts and confirmed Member relations; master published trainer tuples/receipts.

**API/actions/services:** GET trainers, trainers/:id, me/trainer-directory; TrainersController.

**Validation/business/permission requirements:** Owner roster/profile versus member sanitized DTO; active published trainers intended for directory; versioned metadata.

**UI limitation and improvement opportunity:** Owner search overwrites publication OR filter; audit separately. History bounded, no edit-level or ratings implementation. [apps/api/src/trainers.controller.ts:57](../../apps/api/src/trainers.controller.ts#L57), [apps/web/src/app/gyms/[slug]/member/trainers/page.tsx:1](../../apps/web/src/app/gyms/[slug]/member/trainers/page.tsx#L1)

## F20 — Recurring trainer shift approval

**Status / access / screens:** Implemented · OWNER · S16.

**Purpose and complete source-backed workflow:** Enter start/end/overnight → approve current version → future confirmations use updated shift/rate; existing snapshots remain.

**Forms, displayed data, tables, filters and states:** Time inputs, overnight yes/no, pending/conflict/success.

**Data models and relationships:** Trainer.shiftStart/shiftEnd/version; command receipt/audit; confirmation snapshots on PTSession.

**API/actions/services:** PUT trainers/:id/shift; approveTrainerShift; TrainersController.

**Validation/business/permission requirements:** Paired required times, duration15min–16h; explicit overnight wrap; current owner/trainer fences; idempotency derived from version.

**UI limitation and improvement opportunity:** No trainer-managed availability blocks, weekday-specific availability or shift-clear control; describe recurring daily scope. [apps/web/src/components/trainers/trainer-shift-form.tsx:1](../../apps/web/src/components/trainers/trainer-shift-form.tsx#L1), [packages/contracts/src/trainers.ts:56](../../packages/contracts/src/trainers.ts#L56)

## F21 — Trainer deactivation/reactivation

**Status / access / screens:** Implemented · OWNER · S16.

**Purpose and complete source-backed workflow:** Reason+ack → durable lifecycle operation → actor/link status and future pending/confirmed session release → refresh; resume original if interrupted.

**Forms, displayed data, tables, filters and states:** Target ACTIVE/DEACTIVATED; reason; checkbox; pending/unknown/recovery operation UI.

**Data models and relationships:** Trainer, PTSession/SessionCreditHold/PackCreditMovement; GymAccess/Operation/TrainerLifecycleIntent.

**API/actions/services:** POST trainers/:id/status; GET trainer-lifecycle/:op; POST resume.

**Validation/business/permission requirements:** Current trainer/access versions; owner only; future session effects retained in audit; active/history not deleted; reactivation does not restore cancelled appointments.

**UI limitation and improvement opportunity:** Use same consequence/recovery vocabulary as member lifecycle. [apps/web/src/components/trainers/trainer-lifecycle-form.tsx:1](../../apps/web/src/components/trainers/trainer-lifecycle-form.tsx#L1), [apps/api/src/trainer-lifecycle.service.ts:1](../../apps/api/src/trainer-lifecycle.service.ts#L1)

## F22 — Owner direct PT booking

**Status / access / screens:** Implemented · OWNER · S18/S17.

**Purpose and complete source-backed workflow:** Read options → choose eligible member/trainer/type/local date/time/duration/note → server checks/prices/holds one credit → SCHEDULED result and notification → oversight.

**Forms, displayed data, tables, filters and states:** Selects, server policy/fee panel, repeated-clock optional offset, no eligible options, pending/unknown/result link.

**Data models and relationships:** PTSession, SessionCreditHold/PackCreditMovement, MembershipTerm, Trainer, GymConfigurationVersion, CommandReceipt/events/audit/Notification.

**API/actions/services:** GET session-booking-options; POST sessions/bookings; SessionBookingService; session-booking-actions.

**Validation/business/permission requirements:** ≤365days future, current minimum–480min, timezone/DST valid; complete operational actors, membership+pack valid selected date; collisions checked; confirmation fee/rate/shift/policy snapshots.

**UI limitation and improvement opportunity:** Options only first 100 and date eligibility static after initial fetch. Add visible remote selection and dated recheck without trusting browser eligibility. [apps/api/src/sessions/booking.service.ts:1](../../apps/api/src/sessions/booking.service.ts#L1), [apps/web/src/components/sessions/owner-session-booking-form.tsx:1](../../apps/web/src/components/sessions/owner-session-booking-form.tsx#L1)

## F23 — Member PT request creation

**Status / access / screens:** Implemented · MEMBER · S34/S35.

**Purpose and complete source-backed workflow:** Choose trainer from directory → local date/time/type/duration/note → PENDING_CONFIRMATION request → trainer notified; no credit held yet.

**Forms, displayed data, tables, filters and states:** Trainer summary, today eligibility/balance, future-date caveat and request fields; success links own sessions.

**Data models and relationships:** PTSession pending, Member/Trainer/terms/packs/config; receipt/events/Notification.

**API/actions/services:** GET me/session-request-options; POST me/session-requests; SessionRequestsService.

**Validation/business/permission requirements:** Selected date eligible even if today not; active bound member/trainer, future horizon/duration/DST/collision rules and stable key. Acceptance rechecks.

**UI limitation and improvement opportunity:** UI lacks real available-slot picker; keep pending vs confirmed distinct and retain draft after failed send. [apps/api/src/sessions/session-requests.service.ts:152](../../apps/api/src/sessions/session-requests.service.ts#L152), [apps/web/src/components/sessions/session-request-forms.tsx:1](../../apps/web/src/components/sessions/session-request-forms.tsx#L1)

## F24 — Trainer request decisions

**Status / access / screens:** Implemented · Assigned TRAINER · S25/S26.

**Purpose and complete source-backed workflow:** Review member/time/note → accept rechecks and reserves credit/SCHEDULED; decline records optional member-visible reason/DECLINED; notify member.

**Forms, displayed data, tables, filters and states:** Pending summary/list; Accept and reserve one credit; decline textarea≤500 and button; conflict/error/pending/success.

**Data models and relationships:** PTSession version/declineReason, holds/movements, policy/fee/rate snapshots, receipt/state event/Notification.

**API/actions/services:** GET me/session-requests; POST sessions/:id/respond; SessionRequestsService.decide.

**Validation/business/permission requirements:** Assigned active trainer only; current expectedVersion/key; selected date cannot have passed; membership/credit/collisions and current duration/configuration rechecked.

**UI limitation and improvement opportunity:** No bulk decision/filter/pager; duplicate cards on schedule and request page. Preserve individual decision consequences and stale-conflict handling. [apps/web/src/app/gyms/[slug]/trainer/requests/page.tsx:1](../../apps/web/src/app/gyms/[slug]/trainer/requests/page.tsx#L1), [apps/api/src/sessions/session-requests.service.ts:225](../../apps/api/src/sessions/session-requests.service.ts#L225)

## F25 — Session ledgers, calendars and monthly member overview

**Status / access / screens:** Implemented with owner list-navigation defect · OWNER/TRAINER/MEMBER scoped · S17/S25/S35/S36.

**Purpose and complete source-backed workflow:** Read date/month → filter q/state → paginate → role-specific controls. Owner monthly overview lists all members and linked matching sessions; calendars project dates without writes.

**Forms, displayed data, tables, filters and states:** Owner table, trainer/member cards, owner/member calendars, counts and balances; fields/columns in screen inventory.

**Data models and relationships:** PTSession and linked Member/Trainer/holds/pay; MembershipTerm/SessionPack for overview; MealPlan for member calendar.

**API/actions/services:** GET sessions (owner), me/sessions, members/:id/recent-sessions(owner), member-session-overview(owner); reads services.

**Validation/business/permission requirements:** Read-only transactions; personal views reject actor filters; server-returned affordances, gym-local dates and asOf; month total vs filtered total distinguished.

**UI limitation and improvement opportunity:** Owner links omit view=list; member calendar first 100, owner loads all pages sequentially; seven extra member-state queries; full reload interrupts editing. [apps/web/src/components/sessions/read-views/load-session-read-page.ts:1](../../apps/web/src/components/sessions/read-views/load-session-read-page.ts#L1), [apps/api/src/sessions/session-reads.service.ts:1](../../apps/api/src/sessions/session-reads.service.ts#L1)

## F26 — Session start, visible notes and completion

**Status / access / screens:** Implemented trainer UI; owner UI partial · Assigned TRAINER; OWNER lifecycle API · S25, limited S17.

**Purpose and complete source-backed workflow:** SCHEDULED → start → ACTIVE with actual time; complete after booked minimum duration → COMPLETED, consume hold, settlement/revenue/pay creation → notify/update; then edit member-visible completed-session notes.

**Forms, displayed data, tables, filters and states:** Start/complete buttons; native completion confirmation; elapsed clock; notes disclosure/4000-char counter; server affordance gating.

**Data models and relationships:** PTSession, SessionStateEvent, SessionSettlement, hold/movement, RevenueRecord, PayRecord/TrainerPayPeriod, receipts/audits/Notification.

**API/actions/services:** POST sessions/:id/start, /complete; PATCH /notes; SessionLifecycleService.

**Validation/business/permission requirements:** Current actor/session version/key and held credit; assigned active trainer; start from 15 minutes before scheduled start through scheduled end; no simultaneous active trainer session; complete after booked minimum elapsed duration. Notes only on COMPLETED. Actual server time, confirmed compensation snapshots. No workout exercise-completion model.

**UI limitation and improvement opportunity:** Owner view advertises some commands without controls; auto-refresh can discard notes. Keep member-visible labeling explicit. [apps/web/src/components/sessions/session-lifecycle-controls.tsx:1](../../apps/web/src/components/sessions/session-lifecycle-controls.tsx#L1), [apps/api/src/sessions/session-lifecycle.service.ts:541](../../apps/api/src/sessions/session-lifecycle.service.ts#L541)

## F27 — Session withdrawal and policy cancellation

**Status / access / screens:** Implemented · Own MEMBER/TRAINER; OWNER tenant scope · S17/S25/S35 policy dialog.

**Purpose and complete source-backed workflow:** Load server quote → inspect free/late/pending consequence and value/cutoff → acknowledge if required → post versioned command → cancel/release or consume → refresh.

**Forms, displayed data, tables, filters and states:** Quote loading/eligibleAt/cutoff/value/ordinal; checkbox for late; close/review-updated-quote; pending/stale/unknown feedback.

**Data models and relationships:** PTSession/hold/PackCreditMovement/SessionSettlement, stored GymConfigurationVersion, RevenueRecord if charged, receipt/event/audit/notification.

**API/actions/services:** GET sessions/:id/quote?action=CANCEL; POST /cancel; session-policy-actions.

**Validation/business/permission requirements:** Member pending withdrawal uses no hold; scheduled cancellation follows booked policy snapshot; exactly at cutoff free; signed short-lived acknowledgment for charged consequence; stable command key.

**UI limitation and improvement opportunity:** Preserve server quote authority, refresh stale quotes and report exact credit effect; cancellation is not a monetary refund. [apps/api/src/sessions/session-lifecycle.service.ts:188](../../apps/api/src/sessions/session-lifecycle.service.ts#L188), [apps/web/src/components/sessions/read-views/session-policy-controls.tsx:1](../../apps/web/src/components/sessions/read-views/session-policy-controls.tsx#L1)

## F28 — No-show settlement

**Status / access / screens:** Implemented · Assigned TRAINER/OWNER; no MEMBER action · S17/S25 policy dialog.

**Purpose and complete source-backed workflow:** At scheduled start+15min and not started → obtain quote → acknowledge consumed credit → mark MISSED → settlement/operational earning and member notification. There is no MISSED→COMPLETED transition; payroll corrections instead handle completion of an ACTIVE session after its scheduled source payroll period has closed.

**Forms, displayed data, tables, filters and states:** Mark no-show, eligible-time/consequence/value, mandatory acknowledgment, conflict/requote/status feedback.

**Data models and relationships:** SessionSettlement(MISSED), RevenueRecord(MISSED_LATE), hold/movement and receipt/event/audit. TrainerPayCorrection belongs to delayed eligible completion (F26/F36), not reversal of MISSED.

**API/actions/services:** GET quote?action=NO_SHOW; POST sessions/:id/no-show; SessionLifecycleService.

**Validation/business/permission requirements:** Scheduled unstarted session with held credit; always consumes one credit under fixed rule; current version/policy/signed acknowledgment. Closed/approved payroll correction behavior is documented separately under F36.

**UI limitation and improvement opportunity:** No general gym absence/attendance operation. Explain consumed entitlement and operational earning without implying a payment/refund. [apps/api/src/sessions/session-lifecycle.service.ts:313](../../apps/api/src/sessions/session-lifecycle.service.ts#L313), [packages/database-tenant/prisma/schema.prisma:393](../../packages/database-tenant/prisma/schema.prisma#L393)

## F29 — Confirmed trainer client roster and private profile

**Status / access / screens:** Implemented bounded views · TRAINER · S27/S28.

**Purpose and complete source-backed workflow:** A confirmed/recent PT relationship makes client visible → search roster → profile → plan creation; expired relationship removes access.

**Forms, displayed data, tables, filters and states:** Roster5 columns, private client overview/health/balances, latest 2 workout/meal plans and latest 10 sessions with totals.

**Data models and relationships:** Member/Trainer linked by qualifying PTSession, not explicit assignment model; master/tenant publication proofs; coaching relations.

**API/actions/services:** GET me/clients, me/clients/:id; CoachingService.

**Validation/business/permission requirements:** Member ACTIVE+COMPLETE; ACTIVE session, future confirmed SCHEDULED or COMPLETED ended within90days; identity/access fences. Trainer sees their own plan/session relationship scope.

**UI limitation and improvement opportunity:** No manual owner assignment, permanent assignment or progress measurements; preview history cannot be fully browsed. Make relationship expiry understandable without widening backend permissions. [apps/api/src/coaching/coaching.service.ts:34](../../apps/api/src/coaching/coaching.service.ts#L34), [apps/web/src/app/gyms/[slug]/trainer/clients/[memberId]/page.tsx:1](../../apps/web/src/app/gyms/[slug]/trainer/clients/[memberId]/page.tsx#L1)

## F30 — Workout plan creation, assignment and member reading

**Status / access / screens:** Implemented create/read only · TRAINER current client; MEMBER own · S29/S28/S37.

**Purpose and complete source-backed workflow:** Client profile → create title/description/exercises → save explicitly assigned plan → member paginated read.

**Forms, displayed data, tables, filters and states:** 1–100 row fieldsets with name/sets/reps/kg/duration/notes, Add/Remove, success profile link; member ordered article view.

**Data models and relationships:** WorkoutPlan(member/trainer)→WorkoutExercise ordered by sortOrder; receipt/audit.

**API/actions/services:** POST me/clients/:id/workout-plans; GET me/workout-plans; coaching service/actions.

**Validation/business/permission requirements:** Bounds in S29; nonnegative zero kg preserved; relationship rechecked on command and replay; stable digest/key; own member reads survive relationship changes while actor stays authorized.

**UI limitation and improvement opportunity:** No edit/delete/reorder/today/completion/performance logging; prefilled workouts risk accidental assignment, title/description draft uncontrolled. [apps/web/src/components/coaching/workout-plan-builder.tsx:1](../../apps/web/src/components/coaching/workout-plan-builder.tsx#L1), [packages/contracts/src/coaching.ts:129](../../packages/contracts/src/coaching.ts#L129)

## F31 — Meal plan creation, nutrition totals and weekly projection

**Status / access / screens:** Implemented create/read only · TRAINER current client; MEMBER own · S30/S28/S38/S36.

**Purpose and complete source-backed workflow:** Client profile → meal rows and optional macros → live totals → save assigned plan → member read → calendar repeats weekday entries.

**Forms, displayed data, tables, filters and states:** Day1–7/six meal types/food/calories/protein/carbs/fat; row add/remove1–100; plan title; read-only totals and entries.

**Data models and relationships:** MealPlan(member/trainer)→MealPlanEntry sorted rows; receipt/audit.

**API/actions/services:** POST me/clients/:id/meal-plans; GET me/meal-plans; CoachingService/meal actions.

**Validation/business/permission requirements:** Nonnegative numbers; macro decimal precision2 and null vs0 preserved in backend; plan calorie safety bound; current relationship and key checks. No effective dates/current-plan selector.

**UI limitation and improvement opportunity:** All loaded plans repeat on every matching weekday; unknown macros printed as0. Design must define active/versioned plan semantics before adding dated scheduling. [apps/web/src/components/coaching/meal-plan-builder.tsx:1](../../apps/web/src/components/coaching/meal-plan-builder.tsx#L1), [apps/web/src/components/sessions/member-session-calendar.tsx:58](../../apps/web/src/components/sessions/member-session-calendar.tsx#L58)

## F32 — In-app notifications and read state

**Status / access / screens:** Implemented limited popover · OWNER/TRAINER/MEMBER · Tenant shell.

**Purpose and complete source-backed workflow:** Domain transaction emits per-recipient notification → bell fetch/poll → open deep link or mark one/all through snapshot read.

**Forms, displayed data, tables, filters and states:** Unread badge, latest 5 title/message/time/link; close/refresh/read buttons; visible polling20s, loading/empty/stale/error.

**Data models and relationships:** Tenant Notification recipientIdentityId/sourceEventKey uniqueness; domain session events.

**API/actions/services:** GET me/notifications; POST me/notifications/:id/read and read-all; NotificationsController/NotificationsService.

**Validation/business/permission requirements:** Recipient and tenant bound, no arbitrary destination URLs (linkKind mapping), read-through cannot be future; support/platform bell absent.

**UI limitation and improvement opportunity:** No full inbox, paging, email/SMS delivery settings or keyboard Escape/outside-close handler in popover. Preserve read-through snapshot safety. [apps/web/src/components/navigation/notifications-bell.tsx:1](../../apps/web/src/components/navigation/notifications-bell.tsx#L1), [packages/contracts/src/notifications.ts:70](../../packages/contracts/src/notifications.ts#L70)

## F33 — Operational revenue and deferred entitlement value

**Status / access / screens:** Implemented · OWNER · S19 Revenue/Deferred.

**Purpose and complete source-backed workflow:** Choose date window → project daily earned membership value plus recognized session facts → inspect totals/lines or unrecognized membership/available/held/expired pack value.

**Forms, displayed data, tables, filters and states:** Date filters; membership/completed/missed/late/operational KPIs; line table and deferred cards; no cash figure.

**Data models and relationships:** MembershipTerm snapshots, RevenueRecord/PTSession, packs/holds/movement exact allocation.

**API/actions/services:** GET financials/revenue; deferred-revenue alias exists but UI reads shared revenue response; FinanceService.revenue.

**Validation/business/permission requirements:** Recognition excludes current unelapsed membership day via elapsed local-day projection; bounded 5000-source/projection checks; expired-unused shown separately; cashReceived=null. Exact integer/decimal server math.

**UI limitation and improvement opportunity:** Missing page controls can hide later lines; dashboard formula differs. Keep agreed value, earning, deferred value and cash distinct. [apps/api/src/finance/finance.service.ts:213](../../apps/api/src/finance/finance.service.ts#L213), [apps/web/src/app/gyms/[slug]/owner/financials/page.tsx:74](../../apps/web/src/app/gyms/[slug]/owner/financials/page.tsx#L74)

## F34 — Expense recording and category filtering

**Status / access / screens:** Implemented creation/read only · OWNER · S19 Expenses.

**Purpose and complete source-backed workflow:** Filter dates/category → inspect full-window count/amount and paged list → enter expense → save receipt/audit → refreshed list.

**Forms, displayed data, tables, filters and states:** Seven categories, amount/date/description/recurring-note form; category/date filter; rows category/date/description/recurring/value.

**Data models and relationships:** ExpenseRecord→CommandReceipt/AuditLog; gym currency/timezone.

**API/actions/services:** GET/POST financials/expenses; FinanceService.listExpenses/createExpense; finance-actions.

**Validation/business/permission requirements:** Nonnegative contract amount, exact precision/current currency; date≤gym today, description≤500; stable command key. Recurring is annotation, no automation.

**UI limitation and improvement opportunity:** No edit/delete, no visible next-page links despite backend pagination; make no-future-recurring-generation meaning clear. [apps/web/src/components/finance/finance-forms.tsx:12](../../apps/web/src/components/finance/finance-forms.tsx#L12), [apps/api/src/finance/finance.service.ts:354](../../apps/api/src/finance/finance.service.ts#L354)

## F35 — Monthly category budgets and variance

**Status / access / screens:** Implemented · OWNER · S19 Expenses.

**Purpose and complete source-backed workflow:** Select month through query → compare category actual/budget → set/update amount at current nullable version → refresh variance.

**Forms, displayed data, tables, filters and states:** Seven editable category rows; amount, actual, variance and utilization; totals; Set/Update/error/success.

**Data models and relationships:** CategoryBudget unique(category,month), ExpenseRecord actuals, CommandReceipt/AuditLog.

**API/actions/services:** GET/POST financials/budgets; FinanceService.listBudgets/setBudget.

**Validation/business/permission requirements:** Gym currency, exact amount, month YYYY-MM, expectedVersion null for new vs integer existing, stable key.

**UI limitation and improvement opportunity:** No visible budget-month input; month can diverge from expense date filter and controlled amount may lag updated props. Add explicit scope and refresh handling. [apps/web/src/components/finance/finance-forms.tsx:34](../../apps/web/src/components/finance/finance-forms.tsx#L34), [apps/web/src/app/gyms/[slug]/owner/financials/page.tsx:54](../../apps/web/src/app/gyms/[slug]/owner/financials/page.tsx#L54)

## F36 — Trainer payroll periods, close and approval

**Status / access / screens:** Implemented · OWNER commands; TRAINER own read projection · S19 Payroll/S31.

**Purpose and complete source-backed workflow:** Eligible session creates pay record/period → OPEN aggregation → owner closes → review stored total → approve at current version/expected total.

**Forms, displayed data, tables, filters and states:** Period cadence/start/endExclusive/zone/state/total/record count; Close and Approve controls; empty/error/success; no payout button.

**Data models and relationships:** TrainerPayPeriod, PayRecord, TrainerPayCorrection, PTSession; command receipt/audit.

**API/actions/services:** GET payroll/periods/current; POST payroll/periods/:id/close/approve; PayrollService.

**Validation/business/permission requirements:** Owner only commands; OPEN→CLOSED→APPROVED, CAS/version/idempotency and expectedTotal guard. Weekly/monthly local boundaries; approved source history immutable; correction records supported.

**UI limitation and improvement opportunity:** No payroll drilldown/review route or explicit approval confirmation; approval is not disbursement. Improve itemized review without mutating historical totals client-side. [apps/api/src/finance/payroll.service.ts:1](../../apps/api/src/finance/payroll.service.ts#L1), [apps/web/src/components/finance/finance-forms.tsx:52](../../apps/web/src/components/finance/finance-forms.tsx#L52)

## F37 — Trainer own earnings portal

**Status / access / screens:** Implemented with date-zone mismatch · TRAINER · S31.

**Purpose and complete source-backed workflow:** Open/default month → server scopes PayRecord to own trainer → total/count/current period/lines → page month results.

**Forms, displayed data, tables, filters and states:** Three KPIs total/session count/average and dated itemized earning records; month filter/pager.

**Data models and relationships:** PayRecord→PTSession→Trainer; current TrainerPayPeriod; corrections present in broader payroll projections.

**API/actions/services:** GET me/earnings; FinanceService.myEarnings; page also requests denied owner-only configuration.

**Validation/business/permission requirements:** Own active published trainer and current currency; full-window total separate from25 lines; no payout status claim. UTC fallback/default month in web.

**UI limitation and improvement opportunity:** Use authorized timezone projection, exact formatting and correction-aware explanation; assess relation between earnings lines and corrected payroll. [apps/web/src/app/gyms/[slug]/trainer/earnings/page.tsx:1](../../apps/web/src/app/gyms/[slug]/trainer/earnings/page.tsx#L1), [apps/api/src/finance/finance.service.ts:450](../../apps/api/src/finance/finance.service.ts#L450)

## F38 — Operational P&L and category expense mix

**Status / access / screens:** Implemented · OWNER · S19 P&L.

**Purpose and complete source-backed workflow:** Choose date window → aggregate earned membership/session value, non-salary expenses and trainer payroll → operating surplus + expense category breakdown.

**Forms, displayed data, tables, filters and states:** Earning/expense/payroll/salary-excluded/surplus metrics; method text; category/amount/records table; explicit unavailable state.

**Data models and relationships:** RevenueRecord, MembershipTerm, ExpenseRecord, PayRecord/TrainerPayCorrection and PTSession source dates.

**API/actions/services:** GET financials/pnl; FinanceService.pnl.

**Validation/business/permission requirements:** Full-window aggregation, not sum of visible pages; SALARIES-category expenses separately excluded to prevent payroll double count; bounded sources; scheduled source-session date for payroll.

**UI limitation and improvement opportunity:** Not statutory accounts or cash profit. Preserve method and separate excluded salary display; avoid inferring totals from failed dependencies. [apps/api/src/finance/finance.service.ts:145](../../apps/api/src/finance/finance.service.ts#L145), [apps/web/src/app/gyms/[slug]/owner/financials/page.tsx:89](../../apps/web/src/app/gyms/[slug]/owner/financials/page.tsx#L89)

## F39 — Authenticated CSV snapshots

**Status / access / screens:** Implemented · OWNER · S19 Export/S22.

**Purpose and complete source-backed workflow:** Choose revenue/expenses/payroll/audit scope → same-origin POST handler → API validates/reads snapshot/audits export → download CSV or return explicit error.

**Forms, displayed data, tables, filters and states:** Kind, from/to, audit page and action filter; current-page audit shortcut; export-failure flags.

**Data models and relationships:** Domain financial records/AuditLog plus CommandReceipt export audit.

**API/actions/services:** POST /api/gyms/[slug]/financials/export → POST gyms/:slug/financials/export; FinanceService.exportCsv/finance-csv.

**Validation/business/permission requirements:** Authenticated role/tenant, no-store, nosniff, source/row cap5000, spreadsheet formulas escaped; audit export only selected filtered page. Export is a POST and may create export audit.

**UI limitation and improvement opportunity:** Error return can lose financial scope; no progress UI; clarify bounded snapshot rather than full database export. [apps/web/src/app/api/gyms/[slug]/financials/export/route.ts:1](../../apps/web/src/app/api/gyms/[slug]/financials/export/route.ts#L1), [apps/api/src/finance/finance-csv.ts:1](../../apps/api/src/finance/finance-csv.ts#L1)

## F40 — Owner sanitized audit history

**Status / access / screens:** Implemented selected events only · OWNER · S22.

**Purpose and complete source-backed workflow:** Filter action → browse20 events/page → inspect UTC/action/actor/resource/transition → export current page.

**Forms, displayed data, tables, filters and states:** Action enum, count/asOf, five columns, paging/empty/error. No free-text/date/actor filter or event-detail modal.

**Data models and relationships:** Tenant AuditLog→CommandReceipt. Master PlatformAuditLog and SupportEvent exist separately.

**API/actions/services:** GET gyms/:slug/audit; NotificationsController.audit; financials/export audit.

**Validation/business/permission requirements:** Owner only, allow-listed event categories and sanitized from/to/version; raw transition metadata excluded.

**UI limitation and improvement opportunity:** SESSION_PACK_ISSUED emitted vs MEMBER_SESSION_PACK_ISSUED allow-list; coaching/config/name/theme and platform events not complete here. Label scope honestly and align event taxonomy. [apps/api/src/notifications.controller.ts:8](../../apps/api/src/notifications.controller.ts#L8), [apps/api/src/packs.controller.ts:68](../../apps/api/src/packs.controller.ts#L68)

## F41 — Live owner operational dashboard

**Status / access / screens:** Implemented with misleading proxy labels · OWNER · S10.

**Purpose and complete source-backed workflow:** Read gym-local day → show PT-derived metrics, earning buckets, first10 scheduled records/trainer cards → poll30s/manual refresh retaining stale data.

**Forms, displayed data, tables, filters and states:** Four visible KPIs and chart/table/cards; DTO pending request count not rendered.

**Data models and relationships:** PTSession active/day state, Trainer schedule presence, RevenueRecord; no attendance model.

**API/actions/services:** GET dashboard; DashboardService.owner; OwnerDashboardLive/loadOwnerDashboard.

**Validation/business/permission requirements:** Read-only transaction, verified tenant/schema; local clock and definitions/asOf. MembersInGym counts active session records; trainersOnFloor counts scheduled distinct trainers; RevenueRecord-only daily total.

**UI limitation and improvement opportunity:** Rename proxy KPIs and reconcile membership earning/day scope with finance; chart only06–22 while total includes all day. [apps/api/src/dashboard/dashboard.service.ts:71](../../apps/api/src/dashboard/dashboard.service.ts#L71), [apps/web/src/components/navigation/owner-dashboard-live.tsx:1](../../apps/web/src/components/navigation/owner-dashboard-live.tsx#L1)

## F42 — Owner operational analytics

**Status / access / screens:** Implemented bounded estimates · OWNER · S20.

**Purpose and complete source-backed workflow:** Choose window link → read utilization/peak/growth projections → inspect per-point values/formulas.

**Forms, displayed data, tables, filters and states:** CSS bar charts/text alternative,30d/6m selector, trainer empty/unavailable states.

**Data models and relationships:** Trainer recurring shift, PTSession states/start/duration, Member.createdAt.

**API/actions/services:** GET analytics; AnalyticsService.gym.

**Validation/business/permission requirements:** Max100 active trainers; utilization trailing30+future365 /shift×22; peak fixed trailing30 06–20; growth fixed6months; percent capped100.

**UI limitation and improvement opportunity:** Window switch does not change underlying three series calculation; estimated capacity and signup profiles are not attendance/retention. Redesign wording and select one defined period model. [apps/api/src/analytics/analytics.service.ts:1](../../apps/api/src/analytics/analytics.service.ts#L1), [apps/web/src/app/gyms/[slug]/owner/analytics/page.tsx:1](../../apps/web/src/app/gyms/[slug]/owner/analytics/page.tsx#L1)

## F43 — Gym contact, display name, fees and operating policy

**Status / access / screens:** Implemented limited settings · OWNER · S21.

**Purpose and complete source-backed workflow:** Read operational settings/master name → edit independent profile/name/fees/pay/policy panel → save expected version → future confirmations snapshot policy.

**Forms, displayed data, tables, filters and states:** Address/phone/email/pay cadence; separate display name; standard/level2/intro fees; pay percentages; cancellation hours/minimum duration/late deduction. Currency/zone read-only.

**Data models and relationships:** Gym.publicProfileVersion; GymConfiguration/GymConfigurationVersion, MembershipPlan, receipts/audits.

**API/actions/services:** GET/POST configuration; GET/PATCH public-profile; configuration/gym-config actions and controllers.

**Validation/business/permission requirements:** Current role and version; money precision≤2, ratios0–1≤6 digits; policy minutes0–10080, duration15–480; no-show fixed consumption. Blank optional fee fallback differs from0.

**UI limitation and improvement opportunity:** Fractional percent conversion below1 incorrect; some ratio precision can fail read contract (read moneyAmount≤4 vs rate input≤6). Use exact unit-aware controls and test boundaries. [apps/web/src/components/configuration/owner-gym-configuration.tsx:23](../../apps/web/src/components/configuration/owner-gym-configuration.tsx#L23), [packages/contracts/src/configuration.ts:8](../../packages/contracts/src/configuration.ts#L8)

## F44 — Tenant appearance and public theme projection

**Status / access / screens:** Implemented storage/edit; live logo rendering partial · OWNER edits; public theme read · S21 + tenant shell.

**Purpose and complete source-backed workflow:** Set hex/optional HTTPS logo → CAS master Theme update/audit → refreshed shell accent; invalid or unavailable theme gets Classic fallback.

**Forms, displayed data, tables, filters and states:** Color picker/text and logo URL; no upload, preview or font/layout/dark-mode controls. GymLogo fallback exists only in unmounted role page.

**Data models and relationships:** Master Theme unique gymId/version; no tenant token document or configurable navigation model.

**API/actions/services:** GET gyms/:slug/theme public; GET theme/settings owner; PATCH theme; resolveGymBrandColors.

**Validation/business/permission requirements:** Six-digit hex, HTTPS URL with frontend bound2048, expectedVersion; derived foreground contrast. Semantic colors/focus fixed.

**UI limitation and improvement opportunity:** Most owner/trainer buttons/nav use Classic even when --gym-color supplied; saved logo not mounted. Define accent scope and logo placement without weakening isolation. [apps/api/src/gyms.controller.ts:107](../../apps/api/src/gyms.controller.ts#L107), [packages/theme-tokens/src/classic.ts:64](../../packages/theme-tokens/src/classic.ts#L64)

## F45 — Schema gates, operation recovery and maintenance

**Status / access / screens:** Backend/CLI implemented; no general maintenance UI · Authorized platform operators via scripts; limited owner/admin recovery UI · S02/S13/S16 show specific operations only.

**Purpose and complete source-backed workflow:** Durable operations/receipts advance controlled states → reconcile/retry original intent → verified schema rollout/repair via bounded canary/review services/scripts; recovery tooling handles artifacts/retention.

**Forms, displayed data, tables, filters and states:** Safe state/step/version/errorCode/retry/repair-required reference exposed where appropriate. No arbitrary SQL/database/repair editor in web.

**Data models and relationships:** Operation, SchemaRollout/Target/RepairReview/Approval, MasterSchemaState/Deployment; tenant SchemaState, CommandReceipt.

**API/actions/services:** OperationFoundationService, tenant schema services, platform/schema-rollout.service.ts, scripts/schema-rollout.mjs; infrastructure/recovery.

**Validation/business/permission requirements:** Reviewed manifests, ownership/digest/version evidence, physical binding and bounded leases; replay safe results exclude secrets. Maintenance is not normal tenant permission.

**UI limitation and improvement opportunity:** Document operational dependencies and controlled handoff; do not invent a web rollout/backup/restore console. Actual deployment/runbooks remain unverified. [apps/api/src/platform/schema-rollout.service.ts:1](../../apps/api/src/platform/schema-rollout.service.ts#L1), [apps/api/src/operations/operation.service.ts:1](../../apps/api/src/operations/operation.service.ts#L1), [infrastructure/recovery/recovery.mjs:1](../../infrastructure/recovery/recovery.mjs#L1)

## F46 — GymOS subscription and billing navigation

**Status / access / screens:** Placeholder / billing not implemented · OWNER · S23.

**Purpose and complete source-backed workflow:** Open sidebar Subscription → read unavailable explanation; no operational transition.

**Forms, displayed data, tables, filters and states:** Single info card; no fields/invoices/status/payment methods/plan changes.

**Data models and relationships:** No SaaS subscription/payment/invoice model found in either Prisma schema.

**API/actions/services:** No billing endpoint/server action; role/theme context only.

**Validation/business/permission requirements:** Do not infer suspended gym means unpaid subscription; backend lifecycle reasons are separate.

**UI limitation and improvement opportunity:** Decide whether to retain honest placeholder or remove/promote when real product scope exists. Current redesign must not claim a connected checkout. [apps/web/src/app/gyms/[slug]/owner/subscription/page.tsx:1](../../apps/web/src/app/gyms/[slug]/owner/subscription/page.tsx#L1)

## Requested examples that are not implemented

| Candidate capability | Source-backed conclusion |
|---|---|
| General physical attendance/check-in/out | **Not implemented.** No attendance entity/command/page. Member Attendance History currently empty; dashboard explicitly disclaims people counts. PT session state is the implemented related concept. |
| Collect payment, payment gateway, receipt/invoice, refund | **Not implemented.** Entitlement/operational earnings are not cash; no payment/invoice/receipt financial entity or command. `CommandReceipt` is an idempotency record, not a customer payment receipt. |
| Tenant SaaS subscriptions/plan changes/invoices | **Not implemented.** S23 is a placeholder. Gym ACTIVE/SUSPENDED lifecycle does not establish billing rules. |
| General owner-managed permanent trainer assignment | **Not implemented as a separate assignment model.** Session booking/acceptance creates a qualifying relationship; visibility is dynamic. |
| Create/update a workout | **Create and assign implemented; update/delete not implemented.** No mutation route beyond creation; a new plan is a separate record. |
| Today’s workout / mark complete / progress tracking | **Not implemented.** Assigned plan reading and PT notes exist; no exercise completions, body metrics, goals history or progression charts. |
| Member self-service membership status/renewal/purchase | **Partial.** Eligibility API and request options expose status; owner renewal API exists. No dedicated member status page, renewal form or payment flow. |
| Ratings/reviews | **Not implemented.** Directory and trainer profile explicitly show unavailable. |
| Classes, group events, general calendar availability | **Not implemented.** Current calendars project personal PT sessions and repeating meal-plan weekday entries. |
| Email/SMS/push/chat | **Not implemented as connected communication UI.** In-app Notification rows and bell are implemented; no inbox/history/preferences/channel delivery screen found. |
| Role builder/receptionist/accountant/front-desk account | **Not implemented.** Only master/global roles and three fixed gym roles are defined. |
| Arbitrary white labeling or dark mode | **Not implemented.** Hex accent/logo URL storage only; logo mounting partial and Classic remains pervasive. |

“Not implemented” is a boundary for this audited tree, not a claim about the older GymOS sibling or future product roadmap. The handoff must preserve all connected functionality and explicitly scope any additional product behavior.
