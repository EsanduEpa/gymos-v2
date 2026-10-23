# GymOS V2 — Unified Migration Traceability Appendix

Part of [Master Plan §8](MIGRATION_EXECUTION_PLAN.md#8-unified-v1-to-v2-feature-traceability-matrix); not an independent requirement source. Source paths link to exact inspected files. All proposed routes/DTO names are future definitions, not existing APIs. Every feature uses UI+API+domain+database+auth+tests acceptance, with shared constraints inherited from Master Plan §§7,17–21 and task specifications.
## Feature traceability matrix

One record per discovered page-route responsibility; complete component/control/action/model/API inventories follow. R00/T00/M00 redirect; O14 is deferred. Completion status for every task is Not Started. “Implemented” V2 below describes only source existence, never runtime verification.

### R00 — Role entry redirect

| Traceability item | Verified source / target responsibility |
|---|---|
| Feature name and ID | R00: Role entry redirect |
| Existing UI route | /; [/Users/esanduepa/Desktop/Projects/gymos/app/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/page.tsx>) |
| React components | Page-local JSX + shared dashboard/auth primitives; see full TSX inventory. |
| Interactions | W04, UI-I001; all inherited shell/local controls remain mapped below. |
| Server Actions | Direct page loader/navigation/auth boundary; do not invent an action. |
| Business rules | Functionality §§4–12 for these W/C IDs; approved §14.1 overrides old source behavior; task scopes give concrete corrections. |
| Validation | Exact field rules in contract dossiers below; server-side strict DTOs and safe typed errors. Local draft/navigation controls require no mutation. |
| Authorization | All / R is V1 observation. V2 uses current gym role/actor/relationship; support read-only, health restricted. |
| Existing models | Gym, User |
| Target Master entities | M.Gym, M.GymAccess, M.Theme, M.User; cross-plane operation/audit when task specifies. |
| Target Gym entities | No domain profile query for auth/redirect; validated actor-link context only.; receipts/hold/settlement structures when task specifies. Full ownership: Gym → Master Gym registry/theme/localization; Tenant GymProfile/policy/rates; User → Master User identity+GymAccess; Tenant Member/Trainer (no password) |
| Target Nest modules | navigation |
| REST endpoints | C01 GET `/auth/session`; C06 GET `/gyms/:slug/context` |
| Request/response DTOs | SessionIdentityDto (C01); GymContextDto (C06) |
| Target Next route/components | / (proposed); source basename adapted under role feature; shared components follow full inventory. |
| Tests | Task acceptance scenarios in GYMOS-MIG-019; Task064 journeys,065 visuals,066 isolation. No screenshot-only completion. |
| Known defects | Defect register in Master Plan §9; raw serialization, ignored errors, mock billing and lifecycle corrections apply where mapped. |
| Existing V2 status | A01/S01/L02 and basic member/theme foundations partially present; no V1 page parity is verified. E08 is not registration. |
| Complexity | High for financial/session/enrollment slices; Medium presentation. Detailed per-task estimates authoritative. |
| Dependency order | GYMOS-MIG-019; complete prerequisites in task index/dependency graph, including decision gates. |
| Acceptance criteria | Every referenced task-specific checklist passes, intended fields/interactions retained, approved bugs corrected, role/isolation/visual evidence linked. |
| Disposition / final status | Adapt; Not Started, no runtime parity claim. |


### A01 — Sign in

| Traceability item | Verified source / target responsibility |
|---|---|
| Feature name and ID | A01: Sign in |
| Existing UI route | /login; [/Users/esanduepa/Desktop/Projects/gymos/app/(auth)/login/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(auth)/login/page.tsx>) |
| React components | Page-local JSX + shared dashboard/auth primitives; see full TSX inventory. |
| Interactions | W01, UI-I002; all inherited shell/local controls remain mapped below. |
| Server Actions | Direct page loader/navigation/auth boundary; do not invent an action. |
| Business rules | Functionality §§4–12 for these W/C IDs; approved §14.1 overrides old source behavior; task scopes give concrete corrections. |
| Validation | Exact field rules in contract dossiers below; server-side strict DTOs and safe typed errors. Local draft/navigation controls require no mutation. |
| Authorization | P / R is V1 observation. V2 uses current gym role/actor/relationship; support read-only, health restricted. |
| Existing models | Gym, User |
| Target Master entities | M.Gym, M.GymAccess, M.Theme, M.User; cross-plane operation/audit when task specifies. |
| Target Gym entities | No domain profile query for auth/redirect; validated actor-link context only.; receipts/hold/settlement structures when task specifies. Full ownership: Gym → Master Gym registry/theme/localization; Tenant GymProfile/policy/rates; User → Master User identity+GymAccess; Tenant Member/Trainer (no password) |
| Target Nest modules | auth, navigation, web-auth |
| REST endpoints | E01 existing POST /auth/login; C01 GET `/auth/session`; C02 POST `/auth/logout` |
| Request/response DTOs | SessionIdentityDto (C01); LogoutResultDto (C02) |
| Target Next route/components | /login (proposed); source basename adapted under role feature; shared components follow full inventory. |
| Tests | Task acceptance scenarios in GYMOS-MIG-016, GYMOS-MIG-019, GYMOS-MIG-020; Task064 journeys,065 visuals,066 isolation. No screenshot-only completion. |
| Known defects | Defect register in Master Plan §9; raw serialization, ignored errors, mock billing and lifecycle corrections apply where mapped. |
| Existing V2 status | A01/S01/L02 and basic member/theme foundations partially present; no V1 page parity is verified. E08 is not registration. |
| Complexity | High for financial/session/enrollment slices; Medium presentation. Detailed per-task estimates authoritative. |
| Dependency order | GYMOS-MIG-016, GYMOS-MIG-019, GYMOS-MIG-020; complete prerequisites in task index/dependency graph, including decision gates. |
| Acceptance criteria | Every referenced task-specific checklist passes, intended fields/interactions retained, approved bugs corrected, role/isolation/visual evidence linked. |
| Disposition / final status | Adapt; Not Started, no runtime parity claim. |


### A02 — Required/optional password change

| Traceability item | Verified source / target responsibility |
|---|---|
| Feature name and ID | A02: Required/optional password change |
| Existing UI route | /change-password; [/Users/esanduepa/Desktop/Projects/gymos/app/(auth)/change-password/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(auth)/change-password/page.tsx>) |
| React components | [change-password-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(auth)/change-password/change-password-form.tsx>) |
| Interactions | W02, W03, W38, UI-I003; all inherited shell/local controls remain mapped below. |
| Server Actions | [changePassword](</Users/esanduepa/Desktop/Projects/gymos/app/actions/account.ts:30>) |
| Business rules | Functionality §§4–12 for these W/C IDs; approved §14.1 overrides old source behavior; task scopes give concrete corrections. |
| Validation | Exact field rules in contract dossiers below; server-side strict DTOs and safe typed errors. Local draft/navigation controls require no mutation. |
| Authorization | Signed-in A/O/T/M / R is V1 observation. V2 uses current gym role/actor/relationship; support read-only, health restricted. |
| Existing models | User |
| Target Master entities | M.GymAccess, M.User; cross-plane operation/audit when task specifies. |
| Target Gym entities | No domain profile query for auth/redirect; validated actor-link context only.; receipts/hold/settlement structures when task specifies. Full ownership: User → Master User identity+GymAccess; Tenant Member/Trainer (no password) |
| Target Nest modules | credentials, web-auth |
| REST endpoints | C01 GET `/auth/session`; C03 POST `/auth/password/change` |
| Request/response DTOs | SessionIdentityDto (C01); ChangePasswordDto (C03) |
| Target Next route/components | /change-password (proposed); source basename adapted under role feature; shared components follow full inventory. |
| Tests | Task acceptance scenarios in GYMOS-MIG-017, GYMOS-MIG-020; Task064 journeys,065 visuals,066 isolation. No screenshot-only completion. |
| Known defects | Defect register in Master Plan §9; raw serialization, ignored errors, mock billing and lifecycle corrections apply where mapped. |
| Existing V2 status | A01/S01/L02 and basic member/theme foundations partially present; no V1 page parity is verified. E08 is not registration. |
| Complexity | High for financial/session/enrollment slices; Medium presentation. Detailed per-task estimates authoritative. |
| Dependency order | GYMOS-MIG-017, GYMOS-MIG-020; complete prerequisites in task index/dependency graph, including decision gates. |
| Acceptance criteria | Every referenced task-specific checklist passes, intended fields/interactions retained, approved bugs corrected, role/isolation/visual evidence linked. |
| Disposition / final status | Adapt; Not Started, no runtime parity claim. |


### S01 — Platform gym registry and selection

| Traceability item | Verified source / target responsibility |
|---|---|
| Feature name and ID | S01: Platform gym registry and selection |
| Existing UI route | /admin; [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/admin/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/admin/page.tsx>) |
| React components | [AdminClient.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/admin/AdminClient.tsx>) |
| Interactions | W05, W06, W07, W08, W27, W28, W29, UI-I004; all inherited shell/local controls remain mapped below. |
| Server Actions | [getSuperAdminData](</Users/esanduepa/Desktop/Projects/gymos/app/actions/admin.ts:9>); [setImpersonatedGym](</Users/esanduepa/Desktop/Projects/gymos/app/actions/admin.ts:50>) |
| Business rules | Functionality §§4–12 for these W/C IDs; approved §14.1 overrides old source behavior; task scopes give concrete corrections. |
| Validation | Exact field rules in contract dossiers below; server-side strict DTOs and safe typed errors. Local draft/navigation controls require no mutation. |
| Authorization | A / D is V1 observation. V2 uses current gym role/actor/relationship; support read-only, health restricted. |
| Existing models | Gym, User, AuditLog, GymSubscription |
| Target Master entities | M.Gym, M.GymAccess, M.GymSubscription (future, no MVP table required), M.PlatformAuditLog, M.Theme, M.User; cross-plane operation/audit when task specifies. |
| Target Gym entities | T.AuditLog, T.GymConfiguration, T.Member, T.Trainer; receipts/hold/settlement structures when task specifies. Full ownership: Gym → Master Gym registry/theme/localization; Tenant GymProfile/policy/rates; User → Master User identity+GymAccess; Tenant Member/Trainer (no password); AuditLog → Tenant business AuditLog; Master platform/support/provision AuditLog; GymSubscription → Master future PlatformSubscription metadata; no billing MVP |
| Target Nest modules | admin, provisioning, schema-rollout, tenant-lifecycle |
| REST endpoints | E02 existing GET /admin/gyms; E03 existing POST /admin/gyms; C04 POST `/admin/support-sessions`; C07 GET `/admin/gyms`; C57 GET `/gyms/:slug/audit` |
| Request/response DTOs | SupportSessionDto (C04); GymRegistryPageDto (C07); AuditPageDto (C57) |
| Target Next route/components | /admin (proposed); source basename adapted under role feature; shared components follow full inventory. |
| Tests | Task acceptance scenarios in GYMOS-MIG-021, GYMOS-MIG-022, GYMOS-MIG-023, GYMOS-MIG-024, GYMOS-MIG-025, GYMOS-MIG-026; Task064 journeys,065 visuals,066 isolation. No screenshot-only completion. |
| Known defects | Defect register in Master Plan §9; raw serialization, ignored errors, mock billing and lifecycle corrections apply where mapped. |
| Existing V2 status | A01/S01/L02 and basic member/theme foundations partially present; no V1 page parity is verified. E08 is not registration. |
| Complexity | High for financial/session/enrollment slices; Medium presentation. Detailed per-task estimates authoritative. |
| Dependency order | GYMOS-MIG-021, GYMOS-MIG-022, GYMOS-MIG-023, GYMOS-MIG-024, GYMOS-MIG-025, GYMOS-MIG-026; complete prerequisites in task index/dependency graph, including decision gates. |
| Acceptance criteria | Every referenced task-specific checklist passes, intended fields/interactions retained, approved bugs corrected, role/isolation/visual evidence linked. |
| Disposition / final status | Adapt; Not Started, no runtime parity claim. |


### O01 — Live operations dashboard

| Traceability item | Verified source / target responsibility |
|---|---|
| Feature name and ID | O01: Live operations dashboard |
| Existing UI route | /owner; [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/page.tsx>) |
| React components | [OwnerDashboardClient.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/components/OwnerDashboardClient.tsx>) |
| Interactions | UI-I005; all inherited shell/local controls remain mapped below. |
| Server Actions | [getOwnerDashboardData](</Users/esanduepa/Desktop/Projects/gymos/app/actions/dashboard.ts:7>) |
| Business rules | Functionality §§4–12 for these W/C IDs; approved §14.1 overrides old source behavior; task scopes give concrete corrections. |
| Validation | Exact field rules in contract dossiers below; server-side strict DTOs and safe typed errors. Local draft/navigation controls require no mutation. |
| Authorization | O, A* / D is V1 observation. V2 uses current gym role/actor/relationship; support read-only, health restricted. |
| Existing models | User, SessionPack, PTSession, RevenueRecord |
| Target Master entities | M.GymAccess, M.User; cross-plane operation/audit when task specifies. |
| Target Gym entities | T.Member, T.PTSession, T.RevenueRecord, T.SessionPack, T.Trainer; receipts/hold/settlement structures when task specifies. Full ownership: User → Master User identity+GymAccess; Tenant Member/Trainer (no password); SessionPack → Tenant SessionPack + credit reservation/settlement ledger; PTSession → Tenant Session + confirmation snapshots and effect-source keys; RevenueRecord → Tenant operational earned value ledger; payment settlement future |
| Target Nest modules | analytics |
| REST endpoints | C08 GET `/gyms/:slug/dashboard`; C45 GET `/gyms/:slug/financials/revenue` |
| Request/response DTOs | OwnerDashboardDto (C08); OperationalRevenueDto (C45) |
| Target Next route/components | /gyms/[slug]/owner (proposed); source basename adapted under role feature; shared components follow full inventory. |
| Tests | Task acceptance scenarios in GYMOS-MIG-058; Task064 journeys,065 visuals,066 isolation. No screenshot-only completion. |
| Known defects | Defect register in Master Plan §9; raw serialization, ignored errors, mock billing and lifecycle corrections apply where mapped. |
| Existing V2 status | A01/S01/L02 and basic member/theme foundations partially present; no V1 page parity is verified. E08 is not registration. |
| Complexity | High for financial/session/enrollment slices; Medium presentation. Detailed per-task estimates authoritative. |
| Dependency order | GYMOS-MIG-058; complete prerequisites in task index/dependency graph, including decision gates. |
| Acceptance criteria | Every referenced task-specific checklist passes, intended fields/interactions retained, approved bugs corrected, role/isolation/visual evidence linked. |
| Disposition / final status | Adapt; Not Started, no runtime parity claim. |


### O02 — Member management

| Traceability item | Verified source / target responsibility |
|---|---|
| Feature name and ID | O02: Member management |
| Existing UI route | /owner/members; [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/page.tsx>) |
| React components | [members-list-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/members-list-client.tsx>) |
| Interactions | W09, W11, W39, UI-I006; all inherited shell/local controls remain mapped below. |
| Server Actions | [createMember](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts:21>); [updateMemberStatus](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts:116>); [checkMembershipExpiries](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts:155>) |
| Business rules | Functionality §§4–12 for these W/C IDs; approved §14.1 overrides old source behavior; task scopes give concrete corrections. |
| Validation | Exact field rules in contract dossiers below; server-side strict DTOs and safe typed errors. Local draft/navigation controls require no mutation. |
| Authorization | O, A* / D is V1 observation. V2 uses current gym role/actor/relationship; support read-only, health restricted. |
| Existing models | User, MembershipPlan, Membership, SessionPack |
| Target Master entities | M.GymAccess, M.User; cross-plane operation/audit when task specifies. |
| Target Gym entities | T.Member, T.Membership, T.MembershipPlan, T.SessionPack, T.Trainer; receipts/hold/settlement structures when task specifies. Full ownership: User → Master User identity+GymAccess; Tenant Member/Trainer (no password); MembershipPlan → Tenant MembershipPlan; Membership → Tenant Membership with date-derived expiry and no-overlap; SessionPack → Tenant SessionPack + credit reservation/settlement ledger |
| Target Nest modules | members |
| REST endpoints | C09 GET `/gyms/:slug/members` |
| Request/response DTOs | MemberPageDto (C09) |
| Target Next route/components | /gyms/[slug]/owner/members (proposed); source basename adapted under role feature; shared components follow full inventory. |
| Tests | Task acceptance scenarios in GYMOS-MIG-032; Task064 journeys,065 visuals,066 isolation. No screenshot-only completion. |
| Known defects | Defect register in Master Plan §9; raw serialization, ignored errors, mock billing and lifecycle corrections apply where mapped. |
| Existing V2 status | A01/S01/L02 and basic member/theme foundations partially present; no V1 page parity is verified. E08 is not registration. |
| Complexity | High for financial/session/enrollment slices; Medium presentation. Detailed per-task estimates authoritative. |
| Dependency order | GYMOS-MIG-032; complete prerequisites in task index/dependency graph, including decision gates. |
| Acceptance criteria | Every referenced task-specific checklist passes, intended fields/interactions retained, approved bugs corrected, role/isolation/visual evidence linked. |
| Disposition / final status | Adapt; Not Started, no runtime parity claim. |


### O03 — Register member

| Traceability item | Verified source / target responsibility |
|---|---|
| Feature name and ID | O03: Register member |
| Existing UI route | /owner/members/new; [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/new/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/new/page.tsx>) |
| React components | [new-member-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/new/new-member-form.tsx>) |
| Interactions | W07, W08, W09, W27, W28, W29, W39, UI-I007; all inherited shell/local controls remain mapped below. |
| Server Actions | [createMember](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts:21>); [updateMemberStatus](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts:116>); [checkMembershipExpiries](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts:155>) |
| Business rules | Functionality §§4–12 for these W/C IDs; approved §14.1 overrides old source behavior; task scopes give concrete corrections. |
| Validation | Exact field rules in contract dossiers below; server-side strict DTOs and safe typed errors. Local draft/navigation controls require no mutation. |
| Authorization | O, A* / D is V1 observation. V2 uses current gym role/actor/relationship; support read-only, health restricted. |
| Existing models | User, MembershipPlan, Membership, AuditLog |
| Target Master entities | M.GymAccess, M.PlatformAuditLog, M.User; cross-plane operation/audit when task specifies. |
| Target Gym entities | T.AuditLog, T.Member, T.Membership, T.MembershipPlan, T.Trainer; receipts/hold/settlement structures when task specifies. Full ownership: User → Master User identity+GymAccess; Tenant Member/Trainer (no password); MembershipPlan → Tenant MembershipPlan; Membership → Tenant Membership with date-derived expiry and no-overlap; AuditLog → Tenant business AuditLog; Master platform/support/provision AuditLog |
| Target Nest modules | members, testing |
| REST endpoints | C11 GET `/gyms/:slug/membership-plans`; C12 POST `/gyms/:slug/member-registrations` |
| Request/response DTOs | MembershipPlanPageDto (C11); MemberRegistrationDto (C12) |
| Target Next route/components | /gyms/[slug]/owner/members/new (proposed); source basename adapted under role feature; shared components follow full inventory. |
| Tests | Task acceptance scenarios in GYMOS-MIG-031, GYMOS-MIG-035; Task064 journeys,065 visuals,066 isolation. No screenshot-only completion. |
| Known defects | Defect register in Master Plan §9; raw serialization, ignored errors, mock billing and lifecycle corrections apply where mapped. |
| Existing V2 status | A01/S01/L02 and basic member/theme foundations partially present; no V1 page parity is verified. E08 is not registration. |
| Complexity | High for financial/session/enrollment slices; Medium presentation. Detailed per-task estimates authoritative. |
| Dependency order | GYMOS-MIG-031, GYMOS-MIG-035; complete prerequisites in task index/dependency graph, including decision gates. |
| Acceptance criteria | Every referenced task-specific checklist passes, intended fields/interactions retained, approved bugs corrected, role/isolation/visual evidence linked. |
| Disposition / final status | Adapt; Not Started, no runtime parity claim. |


### O04 — Member profile

| Traceability item | Verified source / target responsibility |
|---|---|
| Feature name and ID | O04: Member profile |
| Existing UI route | /owner/members/[id]; [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/page.tsx>) |
| React components | [member-profile-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/member-profile-client.tsx>) |
| Interactions | W09, W11, W14, W15, W16, W17, W23, W30, W31, W32, UI-I008, UI-I009, UI-I010, UI-I011, UI-I012; all inherited shell/local controls remain mapped below. |
| Server Actions | [getRevenueOverview](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:39>); [createExpense](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:125>); [getExpenses](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:163>); [setCategoryBudget](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:183>); [getBudgetVsActual](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:226>); [getDeferredRevenue](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:268>); [getCurrentPayPeriodInfo](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:329>); [closePayPeriod](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:404>); [approvePayPeriod](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:420>); [generatePnL](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:437>); [recordManualPayment](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:538>); [createMember](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts:21>); [updateMemberStatus](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts:116>); [checkMembershipExpiries](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts:155>); [issueSessionPack](</Users/esanduepa/Desktop/Projects/gymos/app/actions/packs.ts:17>) |
| Business rules | Functionality §§4–12 for these W/C IDs; approved §14.1 overrides old source behavior; task scopes give concrete corrections. |
| Validation | Exact field rules in contract dossiers below; server-side strict DTOs and safe typed errors. Local draft/navigation controls require no mutation. |
| Authorization | O, A* / D is V1 observation. V2 uses current gym role/actor/relationship; support read-only, health restricted. |
| Existing models | User, MembershipPlan, Membership, SessionPack, PTSession, RevenueRecord |
| Target Master entities | M.GymAccess, M.User; cross-plane operation/audit when task specifies. |
| Target Gym entities | T.Member, T.Membership, T.MembershipPlan, T.PTSession, T.RevenueRecord, T.SessionPack, T.Trainer; receipts/hold/settlement structures when task specifies. Full ownership: User → Master User identity+GymAccess; Tenant Member/Trainer (no password); MembershipPlan → Tenant MembershipPlan; Membership → Tenant Membership with date-derived expiry and no-overlap; SessionPack → Tenant SessionPack + credit reservation/settlement ledger; PTSession → Tenant Session + confirmation snapshots and effect-source keys; RevenueRecord → Tenant operational earned value ledger; payment settlement future |
| Target Nest modules | members, memberships, packs |
| REST endpoints | C10 GET `/gyms/:slug/members/:memberId`; C14 POST `/gyms/:slug/members/:memberId/status`; C19 POST `/gyms/:slug/members/:memberId/session-packs`; C48 GET `/gyms/:slug/financials/deferred-revenue`; C53 Earlier POST `/gyms/:slug/members/:memberId/desk-payments` shape withdrawn; linked-payment contract TBD |
| Request/response DTOs | MemberProfileDto (C10); MemberStatusDto (C14); SessionPackIssueDto (C19); DeferredRevenueDto (C48); FutureLinkedPaymentDto (C53) |
| Target Next route/components | /gyms/[slug]/owner/members/[id] (proposed); source basename adapted under role feature; shared components follow full inventory. |
| Tests | Task acceptance scenarios in GYMOS-MIG-030, GYMOS-MIG-032, GYMOS-MIG-033, GYMOS-MIG-034; Task064 journeys,065 visuals,066 isolation. No screenshot-only completion. |
| Known defects | Defect register in Master Plan §9; raw serialization, ignored errors, mock billing and lifecycle corrections apply where mapped. |
| Existing V2 status | A01/S01/L02 and basic member/theme foundations partially present; no V1 page parity is verified. E08 is not registration. |
| Complexity | High for financial/session/enrollment slices; Medium presentation. Detailed per-task estimates authoritative. |
| Dependency order | GYMOS-MIG-030, GYMOS-MIG-032, GYMOS-MIG-033, GYMOS-MIG-034; complete prerequisites in task index/dependency graph, including decision gates. |
| Acceptance criteria | Every referenced task-specific checklist passes, intended fields/interactions retained, approved bugs corrected, role/isolation/visual evidence linked. |
| Disposition / final status | Adapt; Not Started, no runtime parity claim. |


### O05 — Trainer roster

| Traceability item | Verified source / target responsibility |
|---|---|
| Feature name and ID | O05: Trainer roster |
| Existing UI route | /owner/trainers; [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/page.tsx>) |
| React components | [trainers-list-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/trainers-list-client.tsx>) |
| Interactions | W10, W12, W13, UI-I013; all inherited shell/local controls remain mapped below. |
| Server Actions | [createTrainer](</Users/esanduepa/Desktop/Projects/gymos/app/actions/trainers.ts:23>); [updateTrainerStatus](</Users/esanduepa/Desktop/Projects/gymos/app/actions/trainers.ts:92>); [approveShiftHours](</Users/esanduepa/Desktop/Projects/gymos/app/actions/trainers.ts:123>) |
| Business rules | Functionality §§4–12 for these W/C IDs; approved §14.1 overrides old source behavior; task scopes give concrete corrections. |
| Validation | Exact field rules in contract dossiers below; server-side strict DTOs and safe typed errors. Local draft/navigation controls require no mutation. |
| Authorization | O, A* / D is V1 observation. V2 uses current gym role/actor/relationship; support read-only, health restricted. |
| Existing models | User, PTSession, PayRecord |
| Target Master entities | M.GymAccess, M.User; cross-plane operation/audit when task specifies. |
| Target Gym entities | T.Member, T.PTSession, T.PayRecord, T.Trainer; receipts/hold/settlement structures when task specifies. Full ownership: User → Master User identity+GymAccess; Tenant Member/Trainer (no password); PTSession → Tenant Session + confirmation snapshots and effect-source keys; PayRecord → Tenant PayRecord / immutable later adjustment, source uniqueness |
| Target Nest modules | trainers |
| REST endpoints | C15 GET `/gyms/:slug/trainers` |
| Request/response DTOs | TrainerPageDto (C15) |
| Target Next route/components | /gyms/[slug]/owner/trainers (proposed); source basename adapted under role feature; shared components follow full inventory. |
| Tests | Task acceptance scenarios in GYMOS-MIG-037; Task064 journeys,065 visuals,066 isolation. No screenshot-only completion. |
| Known defects | Defect register in Master Plan §9; raw serialization, ignored errors, mock billing and lifecycle corrections apply where mapped. |
| Existing V2 status | A01/S01/L02 and basic member/theme foundations partially present; no V1 page parity is verified. E08 is not registration. |
| Complexity | High for financial/session/enrollment slices; Medium presentation. Detailed per-task estimates authoritative. |
| Dependency order | GYMOS-MIG-037; complete prerequisites in task index/dependency graph, including decision gates. |
| Acceptance criteria | Every referenced task-specific checklist passes, intended fields/interactions retained, approved bugs corrected, role/isolation/visual evidence linked. |
| Disposition / final status | Adapt; Not Started, no runtime parity claim. |


### O06 — Add trainer

| Traceability item | Verified source / target responsibility |
|---|---|
| Feature name and ID | O06: Add trainer |
| Existing UI route | /owner/trainers/new; [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/new/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/new/page.tsx>) |
| React components | [new-trainer-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/new/new-trainer-form.tsx>) |
| Interactions | W10, UI-I014; all inherited shell/local controls remain mapped below. |
| Server Actions | [createTrainer](</Users/esanduepa/Desktop/Projects/gymos/app/actions/trainers.ts:23>); [updateTrainerStatus](</Users/esanduepa/Desktop/Projects/gymos/app/actions/trainers.ts:92>); [approveShiftHours](</Users/esanduepa/Desktop/Projects/gymos/app/actions/trainers.ts:123>) |
| Business rules | Functionality §§4–12 for these W/C IDs; approved §14.1 overrides old source behavior; task scopes give concrete corrections. |
| Validation | Exact field rules in contract dossiers below; server-side strict DTOs and safe typed errors. Local draft/navigation controls require no mutation. |
| Authorization | O, A* / D is V1 observation. V2 uses current gym role/actor/relationship; support read-only, health restricted. |
| Existing models | User, AuditLog |
| Target Master entities | M.GymAccess, M.PlatformAuditLog, M.User; cross-plane operation/audit when task specifies. |
| Target Gym entities | T.AuditLog, T.Member, T.Trainer; receipts/hold/settlement structures when task specifies. Full ownership: User → Master User identity+GymAccess; Tenant Member/Trainer (no password); AuditLog → Tenant business AuditLog; Master platform/support/provision AuditLog |
| Target Nest modules | trainers |
| REST endpoints | C13 POST `/gyms/:slug/trainer-registrations` |
| Request/response DTOs | TrainerRegistrationDto (C13) |
| Target Next route/components | /gyms/[slug]/owner/trainers/new (proposed); source basename adapted under role feature; shared components follow full inventory. |
| Tests | Task acceptance scenarios in GYMOS-MIG-036; Task064 journeys,065 visuals,066 isolation. No screenshot-only completion. |
| Known defects | Defect register in Master Plan §9; raw serialization, ignored errors, mock billing and lifecycle corrections apply where mapped. |
| Existing V2 status | A01/S01/L02 and basic member/theme foundations partially present; no V1 page parity is verified. E08 is not registration. |
| Complexity | High for financial/session/enrollment slices; Medium presentation. Detailed per-task estimates authoritative. |
| Dependency order | GYMOS-MIG-036; complete prerequisites in task index/dependency graph, including decision gates. |
| Acceptance criteria | Every referenced task-specific checklist passes, intended fields/interactions retained, approved bugs corrected, role/isolation/visual evidence linked. |
| Disposition / final status | Adapt; Not Started, no runtime parity claim. |


### O07 — Trainer profile and shifts

| Traceability item | Verified source / target responsibility |
|---|---|
| Feature name and ID | O07: Trainer profile and shifts |
| Existing UI route | /owner/trainers/[id]; [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/[id]/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/[id]/page.tsx>) |
| React components | [trainer-profile-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/[id]/trainer-profile-client.tsx>) |
| Interactions | W10, W12, W13, W15, W16, W17, W23, UI-I015, UI-I016; all inherited shell/local controls remain mapped below. |
| Server Actions | [createTrainer](</Users/esanduepa/Desktop/Projects/gymos/app/actions/trainers.ts:23>); [updateTrainerStatus](</Users/esanduepa/Desktop/Projects/gymos/app/actions/trainers.ts:92>); [approveShiftHours](</Users/esanduepa/Desktop/Projects/gymos/app/actions/trainers.ts:123>) |
| Business rules | Functionality §§4–12 for these W/C IDs; approved §14.1 overrides old source behavior; task scopes give concrete corrections. |
| Validation | Exact field rules in contract dossiers below; server-side strict DTOs and safe typed errors. Local draft/navigation controls require no mutation. |
| Authorization | O, A* / D is V1 observation. V2 uses current gym role/actor/relationship; support read-only, health restricted. |
| Existing models | User, PTSession, PayRecord |
| Target Master entities | M.GymAccess, M.User; cross-plane operation/audit when task specifies. |
| Target Gym entities | T.Member, T.PTSession, T.PayRecord, T.Trainer; receipts/hold/settlement structures when task specifies. Full ownership: User → Master User identity+GymAccess; Tenant Member/Trainer (no password); PTSession → Tenant Session + confirmation snapshots and effect-source keys; PayRecord → Tenant PayRecord / immutable later adjustment, source uniqueness |
| Target Nest modules | trainers |
| REST endpoints | C16 GET `/gyms/:slug/trainers/:trainerId`; C17 POST `/gyms/:slug/trainers/:trainerId/status`; C18 PUT `/gyms/:slug/trainers/:trainerId/shift` |
| Request/response DTOs | TrainerProfileDto (C16); TrainerStatusDto (C17); TrainerShiftDto (C18) |
| Target Next route/components | /gyms/[slug]/owner/trainers/[id] (proposed); source basename adapted under role feature; shared components follow full inventory. |
| Tests | Task acceptance scenarios in GYMOS-MIG-037, GYMOS-MIG-038; Task064 journeys,065 visuals,066 isolation. No screenshot-only completion. |
| Known defects | Defect register in Master Plan §9; raw serialization, ignored errors, mock billing and lifecycle corrections apply where mapped. |
| Existing V2 status | A01/S01/L02 and basic member/theme foundations partially present; no V1 page parity is verified. E08 is not registration. |
| Complexity | High for financial/session/enrollment slices; Medium presentation. Detailed per-task estimates authoritative. |
| Dependency order | GYMOS-MIG-037, GYMOS-MIG-038; complete prerequisites in task index/dependency graph, including decision gates. |
| Acceptance criteria | Every referenced task-specific checklist passes, intended fields/interactions retained, approved bugs corrected, role/isolation/visual evidence linked. |
| Disposition / final status | Adapt; Not Started, no runtime parity claim. |


### O08 — Session oversight

| Traceability item | Verified source / target responsibility |
|---|---|
| Feature name and ID | O08: Session oversight |
| Existing UI route | /owner/sessions; [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/page.tsx>) |
| React components | [daily-view.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/daily-view.tsx>); [monthly-view.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/monthly-view.tsx>); [sessions-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/sessions-client.tsx>) |
| Interactions | W09, W11, W14, W15, W16, W17, W19, W20, W21, W22, W23, UI-I017, UI-I018, UI-I019, UI-I020, UI-I021, UI-I037; all inherited shell/local controls remain mapped below. |
| Server Actions | [bookSession](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:182>); [requestSession](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:280>); [respondToSessionRequest](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:382>); [startSession](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:484>); [endSession](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:515>); [handleNoShow](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:623>); [cancelSession](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:673>); [overrideSessionStatus](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:739>); [updateSessionNotes](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:770>) |
| Business rules | Functionality §§4–12 for these W/C IDs; approved §14.1 overrides old source behavior; task scopes give concrete corrections. |
| Validation | Exact field rules in contract dossiers below; server-side strict DTOs and safe typed errors. Local draft/navigation controls require no mutation. |
| Authorization | O, A* / D is V1 observation. V2 uses current gym role/actor/relationship; support read-only, health restricted. |
| Existing models | User, SessionPack, PTSession |
| Target Master entities | M.GymAccess, M.User; cross-plane operation/audit when task specifies. |
| Target Gym entities | T.Member, T.PTSession, T.SessionPack, T.Trainer; receipts/hold/settlement structures when task specifies. Full ownership: User → Master User identity+GymAccess; Tenant Member/Trainer (no password); SessionPack → Tenant SessionPack + credit reservation/settlement ledger; PTSession → Tenant Session + confirmation snapshots and effect-source keys |
| Target Nest modules | sessions, testing |
| REST endpoints | C20 GET `/gyms/:slug/sessions`; C25 POST `/gyms/:slug/sessions/:id/start`; C26 POST `/gyms/:slug/sessions/:id/complete`; C27 POST `/gyms/:slug/sessions/:id/no-show`; C28 POST `/gyms/:slug/sessions/:id/cancel`; C29 PATCH `/gyms/:slug/sessions/:id/notes`; C63 GET `/gyms/:slug/member-session-overview` |
| Request/response DTOs | OwnerSessionPageDto (C20); SessionStartDto (C25); SessionCompleteDto (C26); SessionNoShowDto (C27); SessionCancelDto (C28); SessionNotesDto (C29); MemberSessionOverviewPageDto (C63) |
| Target Next route/components | /gyms/[slug]/owner/sessions (proposed); source basename adapted under role feature; shared components follow full inventory. |
| Tests | Task acceptance scenarios in GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048; Task064 journeys,065 visuals,066 isolation. No screenshot-only completion. |
| Known defects | Defect register in Master Plan §9; raw serialization, ignored errors, mock billing and lifecycle corrections apply where mapped. |
| Existing V2 status | A01/S01/L02 and basic member/theme foundations partially present; no V1 page parity is verified. E08 is not registration. |
| Complexity | High for financial/session/enrollment slices; Medium presentation. Detailed per-task estimates authoritative. |
| Dependency order | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048; complete prerequisites in task index/dependency graph, including decision gates. |
| Acceptance criteria | Every referenced task-specific checklist passes, intended fields/interactions retained, approved bugs corrected, role/isolation/visual evidence linked. |
| Disposition / final status | Adapt; Not Started, no runtime parity claim. |


### O09 — Staff-assisted booking

| Traceability item | Verified source / target responsibility |
|---|---|
| Feature name and ID | O09: Staff-assisted booking |
| Existing UI route | /owner/sessions/book; [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/book/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/book/page.tsx>) |
| React components | [book-session-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/book/book-session-form.tsx>) |
| Interactions | W07, W08, W09, W12, W13, W14, W15, W16, W27, W28, W29, UI-I022; all inherited shell/local controls remain mapped below. |
| Server Actions | [bookSession](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:182>); [requestSession](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:280>); [respondToSessionRequest](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:382>); [startSession](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:484>); [endSession](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:515>); [handleNoShow](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:623>); [cancelSession](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:673>); [overrideSessionStatus](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:739>); [updateSessionNotes](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:770>) |
| Business rules | Functionality §§4–12 for these W/C IDs; approved §14.1 overrides old source behavior; task scopes give concrete corrections. |
| Validation | Exact field rules in contract dossiers below; server-side strict DTOs and safe typed errors. Local draft/navigation controls require no mutation. |
| Authorization | O, A* / D is V1 observation. V2 uses current gym role/actor/relationship; support read-only, health restricted. |
| Existing models | Gym, User, Membership, SessionPack, PTSession |
| Target Master entities | M.Gym, M.GymAccess, M.Theme, M.User; cross-plane operation/audit when task specifies. |
| Target Gym entities | T.GymConfiguration, T.Member, T.Membership, T.PTSession, T.SessionPack, T.Trainer; receipts/hold/settlement structures when task specifies. Full ownership: Gym → Master Gym registry/theme/localization; Tenant GymProfile/policy/rates; User → Master User identity+GymAccess; Tenant Member/Trainer (no password); Membership → Tenant Membership with date-derived expiry and no-overlap; SessionPack → Tenant SessionPack + credit reservation/settlement ledger; PTSession → Tenant Session + confirmation snapshots and effect-source keys |
| Target Nest modules | sessions |
| REST endpoints | C15 GET `/gyms/:slug/trainers`; C21 GET `/gyms/:slug/session-booking-options`; C22 POST `/gyms/:slug/sessions/bookings` |
| Request/response DTOs | TrainerPageDto (C15); SessionBookingOptionsDto (C21); SessionBookingDto (C22) |
| Target Next route/components | /gyms/[slug]/owner/sessions/book (proposed); source basename adapted under role feature; shared components follow full inventory. |
| Tests | Task acceptance scenarios in GYMOS-MIG-041; Task064 journeys,065 visuals,066 isolation. No screenshot-only completion. |
| Known defects | Defect register in Master Plan §9; raw serialization, ignored errors, mock billing and lifecycle corrections apply where mapped. |
| Existing V2 status | A01/S01/L02 and basic member/theme foundations partially present; no V1 page parity is verified. E08 is not registration. |
| Complexity | High for financial/session/enrollment slices; Medium presentation. Detailed per-task estimates authoritative. |
| Dependency order | GYMOS-MIG-041; complete prerequisites in task index/dependency graph, including decision gates. |
| Acceptance criteria | Every referenced task-specific checklist passes, intended fields/interactions retained, approved bugs corrected, role/isolation/visual evidence linked. |
| Disposition / final status | Adapt; Not Started, no runtime parity claim. |


### O10 — Finance, payroll, reports, export

| Traceability item | Verified source / target responsibility |
|---|---|
| Feature name and ID | O10: Finance, payroll, reports, export |
| Existing UI route | /owner/financials; [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/page.tsx>) |
| React components | [charts.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/components/charts.tsx>); [financial-modals.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/components/financial-modals.tsx>); [financials-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/financials-client.tsx>) |
| Interactions | W30, W31, W32, W33, W34, UI-I023, UI-I024, UI-I025, UI-I026, UI-I027, UI-I028; all inherited shell/local controls remain mapped below. |
| Server Actions | [getRevenueOverview](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:39>); [createExpense](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:125>); [getExpenses](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:163>); [setCategoryBudget](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:183>); [getBudgetVsActual](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:226>); [getDeferredRevenue](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:268>); [getCurrentPayPeriodInfo](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:329>); [closePayPeriod](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:404>); [approvePayPeriod](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:420>); [generatePnL](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:437>); [recordManualPayment](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:538>) |
| Business rules | Functionality §§4–12 for these W/C IDs; approved §14.1 overrides old source behavior; task scopes give concrete corrections. |
| Validation | Exact field rules in contract dossiers below; server-side strict DTOs and safe typed errors. Local draft/navigation controls require no mutation. |
| Authorization | O, A* / D is V1 observation. V2 uses current gym role/actor/relationship; support read-only, health restricted. |
| Existing models | Gym, SessionPack, PTSession, PayPeriod, PayRecord, RevenueRecord, ExpenseRecord, CategoryBudget |
| Target Master entities | M.Gym, M.Theme; cross-plane operation/audit when task specifies. |
| Target Gym entities | T.CategoryBudget, T.ExpenseRecord, T.GymConfiguration, T.PTSession, T.PayPeriod, T.PayRecord, T.RevenueRecord, T.SessionPack; receipts/hold/settlement structures when task specifies. Full ownership: Gym → Master Gym registry/theme/localization; Tenant GymProfile/policy/rates; SessionPack → Tenant SessionPack + credit reservation/settlement ledger; PTSession → Tenant Session + confirmation snapshots and effect-source keys; PayPeriod → Tenant PayPeriod with weekly/monthly bounds and transitions; PayRecord → Tenant PayRecord / immutable later adjustment, source uniqueness; RevenueRecord → Tenant operational earned value ledger; payment settlement future; ExpenseRecord → Tenant ExpenseRecord; recurring marker only; CategoryBudget → Tenant CategoryBudget |
| Target Nest modules | exports, finance, payroll |
| REST endpoints | C45 GET `/gyms/:slug/financials/revenue`; C46 GET `/gyms/:slug/financials/expenses`; C47 GET `/gyms/:slug/financials/budgets`; C48 GET `/gyms/:slug/financials/deferred-revenue`; C49 GET `/gyms/:slug/payroll/current`; C50 GET `/gyms/:slug/financials/profit-and-loss`; C51 POST `/gyms/:slug/financials/expenses`; C52 PUT `/gyms/:slug/financials/budgets/:category`; C54 POST `/gyms/:slug/payroll/periods/:id/close`; C55 POST `/gyms/:slug/payroll/periods/:id/approve`; C62 GET `/gyms/:slug/exports/:kind` |
| Request/response DTOs | OperationalRevenueDto (C45); ExpensePageDto (C46); BudgetSummaryDto (C47); DeferredRevenueDto (C48); CurrentPayrollDto (C49); OperationalProfitLossDto (C50); ExpenseCreateDto (C51); CategoryBudgetUpsertDto (C52); PayPeriodCloseDto (C54); PayPeriodApproveDto (C55); CsvExportDto (C62) |
| Target Next route/components | /gyms/[slug]/owner/financials (proposed); source basename adapted under role feature; shared components follow full inventory. |
| Tests | Task acceptance scenarios in GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061; Task064 journeys,065 visuals,066 isolation. No screenshot-only completion. |
| Known defects | Defect register in Master Plan §9; raw serialization, ignored errors, mock billing and lifecycle corrections apply where mapped. |
| Existing V2 status | A01/S01/L02 and basic member/theme foundations partially present; no V1 page parity is verified. E08 is not registration. |
| Complexity | High for financial/session/enrollment slices; Medium presentation. Detailed per-task estimates authoritative. |
| Dependency order | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061; complete prerequisites in task index/dependency graph, including decision gates. |
| Acceptance criteria | Every referenced task-specific checklist passes, intended fields/interactions retained, approved bugs corrected, role/isolation/visual evidence linked. |
| Disposition / final status | Adapt; Not Started, no runtime parity claim. |


### O11 — Operational analytics

| Traceability item | Verified source / target responsibility |
|---|---|
| Feature name and ID | O11: Operational analytics |
| Existing UI route | /owner/analytics; [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/analytics/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/analytics/page.tsx>) |
| React components | [AnalyticsClient.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/analytics/AnalyticsClient.tsx>) |
| Interactions | UI-I029; all inherited shell/local controls remain mapped below. |
| Server Actions | [getAnalyticsData](</Users/esanduepa/Desktop/Projects/gymos/app/actions/analytics.ts:28>) |
| Business rules | Functionality §§4–12 for these W/C IDs; approved §14.1 overrides old source behavior; task scopes give concrete corrections. |
| Validation | Exact field rules in contract dossiers below; server-side strict DTOs and safe typed errors. Local draft/navigation controls require no mutation. |
| Authorization | O, A* / D is V1 observation. V2 uses current gym role/actor/relationship; support read-only, health restricted. |
| Existing models | Gym, User, PTSession |
| Target Master entities | M.Gym, M.GymAccess, M.Theme, M.User; cross-plane operation/audit when task specifies. |
| Target Gym entities | T.GymConfiguration, T.Member, T.PTSession, T.Trainer; receipts/hold/settlement structures when task specifies. Full ownership: Gym → Master Gym registry/theme/localization; Tenant GymProfile/policy/rates; User → Master User identity+GymAccess; Tenant Member/Trainer (no password); PTSession → Tenant Session + confirmation snapshots and effect-source keys |
| Target Nest modules | analytics |
| REST endpoints | C56 GET `/gyms/:slug/analytics` |
| Request/response DTOs | AnalyticsDto (C56) |
| Target Next route/components | /gyms/[slug]/owner/analytics (proposed); source basename adapted under role feature; shared components follow full inventory. |
| Tests | Task acceptance scenarios in GYMOS-MIG-059; Task064 journeys,065 visuals,066 isolation. No screenshot-only completion. |
| Known defects | Defect register in Master Plan §9; raw serialization, ignored errors, mock billing and lifecycle corrections apply where mapped. |
| Existing V2 status | A01/S01/L02 and basic member/theme foundations partially present; no V1 page parity is verified. E08 is not registration. |
| Complexity | High for financial/session/enrollment slices; Medium presentation. Detailed per-task estimates authoritative. |
| Dependency order | GYMOS-MIG-059; complete prerequisites in task index/dependency graph, including decision gates. |
| Acceptance criteria | Every referenced task-specific checklist passes, intended fields/interactions retained, approved bugs corrected, role/isolation/visual evidence linked. |
| Disposition / final status | Adapt; Not Started, no runtime parity claim. |


### O12 — Gym settings and plans

| Traceability item | Verified source / target responsibility |
|---|---|
| Feature name and ID | O12: Gym settings and plans |
| Existing UI route | /owner/gym-config; [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/gym-config/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/gym-config/page.tsx>) |
| React components | [gym-config-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/gym-config/gym-config-client.tsx>) |
| Interactions | W07, W08, W11, W19, W20, W21, W26, W27, W28, W29, W37, UI-I030, UI-I031; all inherited shell/local controls remain mapped below. |
| Server Actions | [updateGymProfile](</Users/esanduepa/Desktop/Projects/gymos/app/actions/gym-config.ts:23>); [createMembershipPlan](</Users/esanduepa/Desktop/Projects/gymos/app/actions/gym-config.ts:70>); [updateTrainerPayRates](</Users/esanduepa/Desktop/Projects/gymos/app/actions/gym-config.ts:111>); [updateSessionRates](</Users/esanduepa/Desktop/Projects/gymos/app/actions/gym-config.ts:162>); [updateCancellationPolicy](</Users/esanduepa/Desktop/Projects/gymos/app/actions/gym-config.ts:213>); [createMember](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts:21>); [updateMemberStatus](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts:116>); [checkMembershipExpiries](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts:155>) |
| Business rules | Functionality §§4–12 for these W/C IDs; approved §14.1 overrides old source behavior; task scopes give concrete corrections. |
| Validation | Exact field rules in contract dossiers below; server-side strict DTOs and safe typed errors. Local draft/navigation controls require no mutation. |
| Authorization | O, A* / D is V1 observation. V2 uses current gym role/actor/relationship; support read-only, health restricted. |
| Existing models | Gym, MembershipPlan, AuditLog |
| Target Master entities | M.Gym, M.PlatformAuditLog, M.Theme; cross-plane operation/audit when task specifies. |
| Target Gym entities | T.AuditLog, T.GymConfiguration, T.MembershipPlan; receipts/hold/settlement structures when task specifies. Full ownership: Gym → Master Gym registry/theme/localization; Tenant GymProfile/policy/rates; MembershipPlan → Tenant MembershipPlan; AuditLog → Tenant business AuditLog; Master platform/support/provision AuditLog |
| Target Nest modules | configuration, memberships, theme |
| REST endpoints | E04/E05 existing GET/PATCH /gyms/:slug/theme (expanded by C05); C05 GET/PATCH `/gyms/:slug/theme`; C11 GET `/gyms/:slug/membership-plans`; C38 GET `/gyms/:slug/configuration`; C39 PATCH `/gyms/:slug/configuration/profile`; C40 POST `/gyms/:slug/membership-plans`; C41 PUT `/gyms/:slug/configuration/session-rates`; C42 PUT `/gyms/:slug/configuration/pay-rates`; C43 PUT `/gyms/:slug/configuration/session-policy`; C44 Legacy POST `/gyms/:slug/memberships/check-expiries` withdrawn for MVP |
| Request/response DTOs | GymThemeDto (C05); MembershipPlanPageDto (C11); GymConfigurationDto (C38); GymProfileUpdateDto (C39); MembershipPlanCreateDto (C40); SessionRatesUpdateDto (C41); PayRatesUpdateDto (C42); SessionPolicyUpdateDto (C43); DerivedExpirySummaryDto (C44) |
| Target Next route/components | /gyms/[slug]/owner/gym-config (proposed); source basename adapted under role feature; shared components follow full inventory. |
| Tests | Task acceptance scenarios in GYMOS-MIG-015, GYMOS-MIG-027, GYMOS-MIG-028, GYMOS-MIG-029, GYMOS-MIG-030; Task064 journeys,065 visuals,066 isolation. No screenshot-only completion. |
| Known defects | Defect register in Master Plan §9; raw serialization, ignored errors, mock billing and lifecycle corrections apply where mapped. |
| Existing V2 status | A01/S01/L02 and basic member/theme foundations partially present; no V1 page parity is verified. E08 is not registration. |
| Complexity | High for financial/session/enrollment slices; Medium presentation. Detailed per-task estimates authoritative. |
| Dependency order | GYMOS-MIG-015, GYMOS-MIG-027, GYMOS-MIG-028, GYMOS-MIG-029, GYMOS-MIG-030; complete prerequisites in task index/dependency graph, including decision gates. |
| Acceptance criteria | Every referenced task-specific checklist passes, intended fields/interactions retained, approved bugs corrected, role/isolation/visual evidence linked. |
| Disposition / final status | Adapt; Not Started, no runtime parity claim. |


### O13 — Security/audit records

| Traceability item | Verified source / target responsibility |
|---|---|
| Feature name and ID | O13: Security/audit records |
| Existing UI route | /owner/audit-log; [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/audit-log/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/audit-log/page.tsx>) |
| React components | [AuditLogClient.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/audit-log/AuditLogClient.tsx>) |
| Interactions | UI-I032, UI-I033; all inherited shell/local controls remain mapped below. |
| Server Actions | [getAuditLogs](</Users/esanduepa/Desktop/Projects/gymos/app/actions/audit.ts:7>) |
| Business rules | Functionality §§4–12 for these W/C IDs; approved §14.1 overrides old source behavior; task scopes give concrete corrections. |
| Validation | Exact field rules in contract dossiers below; server-side strict DTOs and safe typed errors. Local draft/navigation controls require no mutation. |
| Authorization | O, A* / D is V1 observation. V2 uses current gym role/actor/relationship; support read-only, health restricted. |
| Existing models | User, AuditLog |
| Target Master entities | M.GymAccess, M.PlatformAuditLog, M.User; cross-plane operation/audit when task specifies. |
| Target Gym entities | T.AuditLog, T.Member, T.Trainer; receipts/hold/settlement structures when task specifies. Full ownership: User → Master User identity+GymAccess; Tenant Member/Trainer (no password); AuditLog → Tenant business AuditLog; Master platform/support/provision AuditLog |
| Target Nest modules | audit, exports, notifications |
| REST endpoints | C57 GET `/gyms/:slug/audit`; C62 GET `/gyms/:slug/exports/:kind` |
| Request/response DTOs | AuditPageDto (C57); CsvExportDto (C62) |
| Target Next route/components | /gyms/[slug]/owner/audit-log (proposed); source basename adapted under role feature; shared components follow full inventory. |
| Tests | Task acceptance scenarios in GYMOS-MIG-043, GYMOS-MIG-060, GYMOS-MIG-061; Task064 journeys,065 visuals,066 isolation. No screenshot-only completion. |
| Known defects | Defect register in Master Plan §9; raw serialization, ignored errors, mock billing and lifecycle corrections apply where mapped. |
| Existing V2 status | A01/S01/L02 and basic member/theme foundations partially present; no V1 page parity is verified. E08 is not registration. |
| Complexity | High for financial/session/enrollment slices; Medium presentation. Detailed per-task estimates authoritative. |
| Dependency order | GYMOS-MIG-043, GYMOS-MIG-060, GYMOS-MIG-061; complete prerequisites in task index/dependency graph, including decision gates. |
| Acceptance criteria | Every referenced task-specific checklist passes, intended fields/interactions retained, approved bugs corrected, role/isolation/visual evidence linked. |
| Disposition / final status | Adapt; Not Started, no runtime parity claim. |


### O14 — Platform subscription

| Traceability item | Verified source / target responsibility |
|---|---|
| Feature name and ID | O14: Platform subscription |
| Existing UI route | /owner/subscription; [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/subscription/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/subscription/page.tsx>) |
| React components | [SubscriptionClient.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/subscription/SubscriptionClient.tsx>) |
| Interactions | UI-I034; all inherited shell/local controls remain mapped below. |
| Server Actions | [getGymSubscription](</Users/esanduepa/Desktop/Projects/gymos/app/actions/subscription.ts:7>) |
| Business rules | Functionality §§4–12 for these W/C IDs; approved §14.1 overrides old source behavior; task scopes give concrete corrections. |
| Validation | Exact field rules in contract dossiers below; server-side strict DTOs and safe typed errors. Local draft/navigation controls require no mutation. |
| Authorization | O, A* / D is V1 observation. V2 uses current gym role/actor/relationship; support read-only, health restricted. |
| Existing models | Gym, GymSubscription |
| Target Master entities | M.Gym, M.GymSubscription (future, no MVP table required), M.Theme; cross-plane operation/audit when task specifies. |
| Target Gym entities | T.GymConfiguration; receipts/hold/settlement structures when task specifies. Full ownership: Gym → Master Gym registry/theme/localization; Tenant GymProfile/policy/rates; GymSubscription → Master future PlatformSubscription metadata; no billing MVP |
| Target Nest modules | scope |
| REST endpoints | C58 GET `/gyms/:slug/subscription` |
| Request/response DTOs | FutureSubscriptionDto (C58) |
| Target Next route/components | /gyms/[slug]/owner/subscription (proposed); source basename adapted under role feature; shared components follow full inventory. |
| Tests | Task acceptance scenarios in GYMOS-MIG-062; Task064 journeys,065 visuals,066 isolation. No screenshot-only completion. |
| Known defects | Defect register in Master Plan §9; raw serialization, ignored errors, mock billing and lifecycle corrections apply where mapped. |
| Existing V2 status | A01/S01/L02 and basic member/theme foundations partially present; no V1 page parity is verified. E08 is not registration. |
| Complexity | High for financial/session/enrollment slices; Medium presentation. Detailed per-task estimates authoritative. |
| Dependency order | GYMOS-MIG-062; complete prerequisites in task index/dependency graph, including decision gates. |
| Acceptance criteria | Every referenced task-specific checklist passes, intended fields/interactions retained, approved bugs corrected, role/isolation/visual evidence linked. |
| Disposition / final status | Defer O14; hide MVP route/navigation; Not Started disposition verification task062. |


### T00 — Trainer entry redirect

| Traceability item | Verified source / target responsibility |
|---|---|
| Feature name and ID | T00: Trainer entry redirect |
| Existing UI route | /trainer; [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/page.tsx>) |
| React components | Page-local JSX + shared dashboard/auth primitives; see full TSX inventory. |
| Interactions | W04, UI-I035; all inherited shell/local controls remain mapped below. |
| Server Actions | Direct page loader/navigation/auth boundary; do not invent an action. |
| Business rules | Functionality §§4–12 for these W/C IDs; approved §14.1 overrides old source behavior; task scopes give concrete corrections. |
| Validation | Exact field rules in contract dossiers below; server-side strict DTOs and safe typed errors. Local draft/navigation controls require no mutation. |
| Authorization | T, A~ / D is V1 observation. V2 uses current gym role/actor/relationship; support read-only, health restricted. |
| Existing models | Gym, User |
| Target Master entities | M.Gym, M.GymAccess, M.Theme, M.User; cross-plane operation/audit when task specifies. |
| Target Gym entities | No domain profile query for auth/redirect; validated actor-link context only.; receipts/hold/settlement structures when task specifies. Full ownership: Gym → Master Gym registry/theme/localization; Tenant GymProfile/policy/rates; User → Master User identity+GymAccess; Tenant Member/Trainer (no password) |
| Target Nest modules | navigation |
| REST endpoints | Role redirect / no new endpoint |
| Request/response DTOs | Core SessionIdentity/GymContext projection; no browser Prisma type. |
| Target Next route/components | /gyms/[slug]/trainer (proposed); source basename adapted under role feature; shared components follow full inventory. |
| Tests | Task acceptance scenarios in GYMOS-MIG-019; Task064 journeys,065 visuals,066 isolation. No screenshot-only completion. |
| Known defects | Defect register in Master Plan §9; raw serialization, ignored errors, mock billing and lifecycle corrections apply where mapped. |
| Existing V2 status | A01/S01/L02 and basic member/theme foundations partially present; no V1 page parity is verified. E08 is not registration. |
| Complexity | High for financial/session/enrollment slices; Medium presentation. Detailed per-task estimates authoritative. |
| Dependency order | GYMOS-MIG-019; complete prerequisites in task index/dependency graph, including decision gates. |
| Acceptance criteria | Every referenced task-specific checklist passes, intended fields/interactions retained, approved bugs corrected, role/isolation/visual evidence linked. |
| Disposition / final status | Adapt; Not Started, no runtime parity claim. |


### T01 — Schedule and session requests

| Traceability item | Verified source / target responsibility |
|---|---|
| Feature name and ID | T01: Schedule and session requests |
| Existing UI route | /trainer/schedule; [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/page.tsx>) |
| React components | [schedule-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/schedule-client.tsx>) |
| Interactions | W15, W16, W17, W18, W19, W20, W23, UI-I036, UI-I037, UI-I038, UI-I039; all inherited shell/local controls remain mapped below. |
| Server Actions | [bookSession](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:182>); [requestSession](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:280>); [respondToSessionRequest](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:382>); [startSession](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:484>); [endSession](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:515>); [handleNoShow](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:623>); [cancelSession](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:673>); [overrideSessionStatus](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:739>); [updateSessionNotes](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:770>) |
| Business rules | Functionality §§4–12 for these W/C IDs; approved §14.1 overrides old source behavior; task scopes give concrete corrections. |
| Validation | Exact field rules in contract dossiers below; server-side strict DTOs and safe typed errors. Local draft/navigation controls require no mutation. |
| Authorization | T, A~ / D is V1 observation. V2 uses current gym role/actor/relationship; support read-only, health restricted. |
| Existing models | Gym, User, SessionPack, PTSession, Notification |
| Target Master entities | M.Gym, M.GymAccess, M.Theme, M.User; cross-plane operation/audit when task specifies. |
| Target Gym entities | T.GymConfiguration, T.Member, T.Notification, T.PTSession, T.SessionPack, T.Trainer; receipts/hold/settlement structures when task specifies. Full ownership: Gym → Master Gym registry/theme/localization; Tenant GymProfile/policy/rates; User → Master User identity+GymAccess; Tenant Member/Trainer (no password); SessionPack → Tenant SessionPack + credit reservation/settlement ledger; PTSession → Tenant Session + confirmation snapshots and effect-source keys; Notification → Tenant selected-gym Notification, master identity reference |
| Target Nest modules | sessions |
| REST endpoints | C24 POST `/gyms/:slug/sessions/:id/respond`; C25 POST `/gyms/:slug/sessions/:id/start`; C26 POST `/gyms/:slug/sessions/:id/complete`; C27 POST `/gyms/:slug/sessions/:id/no-show`; C28 POST `/gyms/:slug/sessions/:id/cancel`; C29 PATCH `/gyms/:slug/sessions/:id/notes`; C37 GET `/gyms/:slug/me/sessions` |
| Request/response DTOs | SessionResponseDto (C24); SessionStartDto (C25); SessionCompleteDto (C26); SessionNoShowDto (C27); SessionCancelDto (C28); SessionNotesDto (C29); OwnSessionPageDto (C37) |
| Target Next route/components | /gyms/[slug]/trainer/schedule (proposed); source basename adapted under role feature; shared components follow full inventory. |
| Tests | Task acceptance scenarios in GYMOS-MIG-042, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047; Task064 journeys,065 visuals,066 isolation. No screenshot-only completion. |
| Known defects | Defect register in Master Plan §9; raw serialization, ignored errors, mock billing and lifecycle corrections apply where mapped. |
| Existing V2 status | A01/S01/L02 and basic member/theme foundations partially present; no V1 page parity is verified. E08 is not registration. |
| Complexity | High for financial/session/enrollment slices; Medium presentation. Detailed per-task estimates authoritative. |
| Dependency order | GYMOS-MIG-042, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047; complete prerequisites in task index/dependency graph, including decision gates. |
| Acceptance criteria | Every referenced task-specific checklist passes, intended fields/interactions retained, approved bugs corrected, role/isolation/visual evidence linked. |
| Disposition / final status | Adapt; Not Started, no runtime parity claim. |


### T02 — Assigned client roster

| Traceability item | Verified source / target responsibility |
|---|---|
| Feature name and ID | T02: Assigned client roster |
| Existing UI route | /trainer/clients; [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/page.tsx>) |
| React components | [clients-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/clients-client.tsx>) |
| Interactions | W11, W14, W15, W16, W17, UI-I040; all inherited shell/local controls remain mapped below. |
| Server Actions | Direct page loader/navigation/auth boundary; do not invent an action. |
| Business rules | Functionality §§4–12 for these W/C IDs; approved §14.1 overrides old source behavior; task scopes give concrete corrections. |
| Validation | Exact field rules in contract dossiers below; server-side strict DTOs and safe typed errors. Local draft/navigation controls require no mutation. |
| Authorization | T only at page gate / D is V1 observation. V2 uses current gym role/actor/relationship; support read-only, health restricted. |
| Existing models | User, Membership, SessionPack, PTSession |
| Target Master entities | M.GymAccess, M.User; cross-plane operation/audit when task specifies. |
| Target Gym entities | T.Member, T.Membership, T.PTSession, T.SessionPack, T.Trainer; receipts/hold/settlement structures when task specifies. Full ownership: User → Master User identity+GymAccess; Tenant Member/Trainer (no password); Membership → Tenant Membership with date-derived expiry and no-overlap; SessionPack → Tenant SessionPack + credit reservation/settlement ledger; PTSession → Tenant Session + confirmation snapshots and effect-source keys |
| Target Nest modules | coaching |
| REST endpoints | C30 GET `/gyms/:slug/me/clients` |
| Request/response DTOs | TrainerClientPageDto (C30) |
| Target Next route/components | /gyms/[slug]/trainer/clients (proposed); source basename adapted under role feature; shared components follow full inventory. |
| Tests | Task acceptance scenarios in GYMOS-MIG-050; Task064 journeys,065 visuals,066 isolation. No screenshot-only completion. |
| Known defects | Defect register in Master Plan §9; raw serialization, ignored errors, mock billing and lifecycle corrections apply where mapped. |
| Existing V2 status | A01/S01/L02 and basic member/theme foundations partially present; no V1 page parity is verified. E08 is not registration. |
| Complexity | High for financial/session/enrollment slices; Medium presentation. Detailed per-task estimates authoritative. |
| Dependency order | GYMOS-MIG-050; complete prerequisites in task index/dependency graph, including decision gates. |
| Acceptance criteria | Every referenced task-specific checklist passes, intended fields/interactions retained, approved bugs corrected, role/isolation/visual evidence linked. |
| Disposition / final status | Adapt; Not Started, no runtime parity claim. |


### T03 — Client 360° overview

| Traceability item | Verified source / target responsibility |
|---|---|
| Feature name and ID | T03: Client 360° overview |
| Existing UI route | /trainer/clients/[id]; [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/[id]/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/[id]/page.tsx>) |
| React components | [client-360-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/[id]/client-360-client.tsx>) |
| Interactions | W11, W14, W15, W16, W17, W23, W24, W25, UI-I041; all inherited shell/local controls remain mapped below. |
| Server Actions | [saveWorkoutPlan](</Users/esanduepa/Desktop/Projects/gymos/app/actions/plans.ts:23>); [saveMealPlan](</Users/esanduepa/Desktop/Projects/gymos/app/actions/plans.ts:78>) |
| Business rules | Functionality §§4–12 for these W/C IDs; approved §14.1 overrides old source behavior; task scopes give concrete corrections. |
| Validation | Exact field rules in contract dossiers below; server-side strict DTOs and safe typed errors. Local draft/navigation controls require no mutation. |
| Authorization | T only at page gate / D is V1 observation. V2 uses current gym role/actor/relationship; support read-only, health restricted. |
| Existing models | User, Membership, SessionPack, PTSession, WorkoutPlan, WorkoutExercise, MealPlan, MealPlanEntry, BodyMetric |
| Target Master entities | M.GymAccess, M.User; cross-plane operation/audit when task specifies. |
| Target Gym entities | T.BodyMetric (deferred; no MVP table required), T.MealPlan, T.MealPlanEntry, T.Member, T.Membership, T.PTSession, T.SessionPack, T.Trainer, T.WorkoutExercise, T.WorkoutPlan; receipts/hold/settlement structures when task specifies. Full ownership: User → Master User identity+GymAccess; Tenant Member/Trainer (no password); Membership → Tenant Membership with date-derived expiry and no-overlap; SessionPack → Tenant SessionPack + credit reservation/settlement ledger; PTSession → Tenant Session + confirmation snapshots and effect-source keys; WorkoutPlan → Tenant WorkoutPlan; WorkoutExercise → Tenant WorkoutExercise; MealPlan → Tenant MealPlan; MealPlanEntry → Tenant MealPlanEntry; BodyMetric → Tenant future BodyMetric; T03 fetch unused, no rendered workflow |
| Target Nest modules | coaching |
| REST endpoints | C31 GET `/gyms/:slug/me/clients/:memberId` |
| Request/response DTOs | TrainerClientProfileDto (C31) |
| Target Next route/components | /gyms/[slug]/trainer/clients/[id] (proposed); source basename adapted under role feature; shared components follow full inventory. |
| Tests | Task acceptance scenarios in GYMOS-MIG-050, GYMOS-MIG-051, GYMOS-MIG-052; Task064 journeys,065 visuals,066 isolation. No screenshot-only completion. |
| Known defects | Defect register in Master Plan §9; raw serialization, ignored errors, mock billing and lifecycle corrections apply where mapped. |
| Existing V2 status | A01/S01/L02 and basic member/theme foundations partially present; no V1 page parity is verified. E08 is not registration. |
| Complexity | High for financial/session/enrollment slices; Medium presentation. Detailed per-task estimates authoritative. |
| Dependency order | GYMOS-MIG-050, GYMOS-MIG-051, GYMOS-MIG-052; complete prerequisites in task index/dependency graph, including decision gates. |
| Acceptance criteria | Every referenced task-specific checklist passes, intended fields/interactions retained, approved bugs corrected, role/isolation/visual evidence linked. |
| Disposition / final status | Adapt; Not Started, no runtime parity claim. |


### T04 — Workout builder

| Traceability item | Verified source / target responsibility |
|---|---|
| Feature name and ID | T04: Workout builder |
| Existing UI route | /trainer/plans/workout/new; [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/workout/new/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/workout/new/page.tsx>) |
| React components | [workout-builder-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/workout/new/workout-builder-form.tsx>) |
| Interactions | W24, W25, UI-I042; all inherited shell/local controls remain mapped below. |
| Server Actions | [saveWorkoutPlan](</Users/esanduepa/Desktop/Projects/gymos/app/actions/plans.ts:23>); [saveMealPlan](</Users/esanduepa/Desktop/Projects/gymos/app/actions/plans.ts:78>) |
| Business rules | Functionality §§4–12 for these W/C IDs; approved §14.1 overrides old source behavior; task scopes give concrete corrections. |
| Validation | Exact field rules in contract dossiers below; server-side strict DTOs and safe typed errors. Local draft/navigation controls require no mutation. |
| Authorization | T only at page gate / D is V1 observation. V2 uses current gym role/actor/relationship; support read-only, health restricted. |
| Existing models | User, PTSession, WorkoutPlan, WorkoutExercise |
| Target Master entities | M.GymAccess, M.User; cross-plane operation/audit when task specifies. |
| Target Gym entities | T.Member, T.PTSession, T.Trainer, T.WorkoutExercise, T.WorkoutPlan; receipts/hold/settlement structures when task specifies. Full ownership: User → Master User identity+GymAccess; Tenant Member/Trainer (no password); PTSession → Tenant Session + confirmation snapshots and effect-source keys; WorkoutPlan → Tenant WorkoutPlan; WorkoutExercise → Tenant WorkoutExercise |
| Target Nest modules | coaching |
| REST endpoints | C30 GET `/gyms/:slug/me/clients`; C32 POST `/gyms/:slug/me/clients/:memberId/workout-plans` |
| Request/response DTOs | TrainerClientPageDto (C30); WorkoutPlanCreateDto (C32) |
| Target Next route/components | /gyms/[slug]/trainer/plans/workout/new (proposed); source basename adapted under role feature; shared components follow full inventory. |
| Tests | Task acceptance scenarios in GYMOS-MIG-051; Task064 journeys,065 visuals,066 isolation. No screenshot-only completion. |
| Known defects | Defect register in Master Plan §9; raw serialization, ignored errors, mock billing and lifecycle corrections apply where mapped. |
| Existing V2 status | A01/S01/L02 and basic member/theme foundations partially present; no V1 page parity is verified. E08 is not registration. |
| Complexity | High for financial/session/enrollment slices; Medium presentation. Detailed per-task estimates authoritative. |
| Dependency order | GYMOS-MIG-051; complete prerequisites in task index/dependency graph, including decision gates. |
| Acceptance criteria | Every referenced task-specific checklist passes, intended fields/interactions retained, approved bugs corrected, role/isolation/visual evidence linked. |
| Disposition / final status | Adapt; Not Started, no runtime parity claim. |


### T05 — Meal builder

| Traceability item | Verified source / target responsibility |
|---|---|
| Feature name and ID | T05: Meal builder |
| Existing UI route | /trainer/plans/meal/new; [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/meal/new/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/meal/new/page.tsx>) |
| React components | [meal-builder-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/meal/new/meal-builder-form.tsx>) |
| Interactions | W24, W25, UI-I043; all inherited shell/local controls remain mapped below. |
| Server Actions | [saveWorkoutPlan](</Users/esanduepa/Desktop/Projects/gymos/app/actions/plans.ts:23>); [saveMealPlan](</Users/esanduepa/Desktop/Projects/gymos/app/actions/plans.ts:78>) |
| Business rules | Functionality §§4–12 for these W/C IDs; approved §14.1 overrides old source behavior; task scopes give concrete corrections. |
| Validation | Exact field rules in contract dossiers below; server-side strict DTOs and safe typed errors. Local draft/navigation controls require no mutation. |
| Authorization | T only at page gate / D is V1 observation. V2 uses current gym role/actor/relationship; support read-only, health restricted. |
| Existing models | User, PTSession, MealPlan, MealPlanEntry |
| Target Master entities | M.GymAccess, M.User; cross-plane operation/audit when task specifies. |
| Target Gym entities | T.MealPlan, T.MealPlanEntry, T.Member, T.PTSession, T.Trainer; receipts/hold/settlement structures when task specifies. Full ownership: User → Master User identity+GymAccess; Tenant Member/Trainer (no password); PTSession → Tenant Session + confirmation snapshots and effect-source keys; MealPlan → Tenant MealPlan; MealPlanEntry → Tenant MealPlanEntry |
| Target Nest modules | coaching |
| REST endpoints | C30 GET `/gyms/:slug/me/clients`; C33 POST `/gyms/:slug/me/clients/:memberId/meal-plans` |
| Request/response DTOs | TrainerClientPageDto (C30); MealPlanCreateDto (C33) |
| Target Next route/components | /gyms/[slug]/trainer/plans/meal/new (proposed); source basename adapted under role feature; shared components follow full inventory. |
| Tests | Task acceptance scenarios in GYMOS-MIG-052; Task064 journeys,065 visuals,066 isolation. No screenshot-only completion. |
| Known defects | Defect register in Master Plan §9; raw serialization, ignored errors, mock billing and lifecycle corrections apply where mapped. |
| Existing V2 status | A01/S01/L02 and basic member/theme foundations partially present; no V1 page parity is verified. E08 is not registration. |
| Complexity | High for financial/session/enrollment slices; Medium presentation. Detailed per-task estimates authoritative. |
| Dependency order | GYMOS-MIG-052; complete prerequisites in task index/dependency graph, including decision gates. |
| Acceptance criteria | Every referenced task-specific checklist passes, intended fields/interactions retained, approved bugs corrected, role/isolation/visual evidence linked. |
| Disposition / final status | Adapt; Not Started, no runtime parity claim. |


### T06 — Earnings

| Traceability item | Verified source / target responsibility |
|---|---|
| Feature name and ID | T06: Earnings |
| Existing UI route | /trainer/earnings; [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/earnings/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/earnings/page.tsx>) |
| React components | [earnings-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/earnings/earnings-client.tsx>) |
| Interactions | W33, W34, UI-I044; all inherited shell/local controls remain mapped below. |
| Server Actions | Direct page loader/navigation/auth boundary; do not invent an action. |
| Business rules | Functionality §§4–12 for these W/C IDs; approved §14.1 overrides old source behavior; task scopes give concrete corrections. |
| Validation | Exact field rules in contract dossiers below; server-side strict DTOs and safe typed errors. Local draft/navigation controls require no mutation. |
| Authorization | T, A~ / D is V1 observation. V2 uses current gym role/actor/relationship; support read-only, health restricted. |
| Existing models | User, PTSession, PayPeriod, PayRecord |
| Target Master entities | M.GymAccess, M.User; cross-plane operation/audit when task specifies. |
| Target Gym entities | T.Member, T.PTSession, T.PayPeriod, T.PayRecord, T.Trainer; receipts/hold/settlement structures when task specifies. Full ownership: User → Master User identity+GymAccess; Tenant Member/Trainer (no password); PTSession → Tenant Session + confirmation snapshots and effect-source keys; PayPeriod → Tenant PayPeriod with weekly/monthly bounds and transitions; PayRecord → Tenant PayRecord / immutable later adjustment, source uniqueness |
| Target Nest modules | finance, payroll |
| REST endpoints | C34 GET `/gyms/:slug/me/earnings` |
| Request/response DTOs | TrainerEarningsDto (C34) |
| Target Next route/components | /gyms/[slug]/trainer/earnings (proposed); source basename adapted under role feature; shared components follow full inventory. |
| Tests | Task acceptance scenarios in GYMOS-MIG-049, GYMOS-MIG-056; Task064 journeys,065 visuals,066 isolation. No screenshot-only completion. |
| Known defects | Defect register in Master Plan §9; raw serialization, ignored errors, mock billing and lifecycle corrections apply where mapped. |
| Existing V2 status | A01/S01/L02 and basic member/theme foundations partially present; no V1 page parity is verified. E08 is not registration. |
| Complexity | High for financial/session/enrollment slices; Medium presentation. Detailed per-task estimates authoritative. |
| Dependency order | GYMOS-MIG-049, GYMOS-MIG-056; complete prerequisites in task index/dependency graph, including decision gates. |
| Acceptance criteria | Every referenced task-specific checklist passes, intended fields/interactions retained, approved bugs corrected, role/isolation/visual evidence linked. |
| Disposition / final status | Adapt; Not Started, no runtime parity claim. |


### M00 — Member entry redirect

| Traceability item | Verified source / target responsibility |
|---|---|
| Feature name and ID | M00: Member entry redirect |
| Existing UI route | /member; [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/page.tsx>) |
| React components | Page-local JSX + shared dashboard/auth primitives; see full TSX inventory. |
| Interactions | W04, UI-I045; all inherited shell/local controls remain mapped below. |
| Server Actions | Direct page loader/navigation/auth boundary; do not invent an action. |
| Business rules | Functionality §§4–12 for these W/C IDs; approved §14.1 overrides old source behavior; task scopes give concrete corrections. |
| Validation | Exact field rules in contract dossiers below; server-side strict DTOs and safe typed errors. Local draft/navigation controls require no mutation. |
| Authorization | M, A~ / D is V1 observation. V2 uses current gym role/actor/relationship; support read-only, health restricted. |
| Existing models | Gym, User |
| Target Master entities | M.Gym, M.GymAccess, M.Theme, M.User; cross-plane operation/audit when task specifies. |
| Target Gym entities | No domain profile query for auth/redirect; validated actor-link context only.; receipts/hold/settlement structures when task specifies. Full ownership: Gym → Master Gym registry/theme/localization; Tenant GymProfile/policy/rates; User → Master User identity+GymAccess; Tenant Member/Trainer (no password) |
| Target Nest modules | navigation |
| REST endpoints | Role redirect / no new endpoint |
| Request/response DTOs | Core SessionIdentity/GymContext projection; no browser Prisma type. |
| Target Next route/components | /gyms/[slug]/member (proposed); source basename adapted under role feature; shared components follow full inventory. |
| Tests | Task acceptance scenarios in GYMOS-MIG-019; Task064 journeys,065 visuals,066 isolation. No screenshot-only completion. |
| Known defects | Defect register in Master Plan §9; raw serialization, ignored errors, mock billing and lifecycle corrections apply where mapped. |
| Existing V2 status | A01/S01/L02 and basic member/theme foundations partially present; no V1 page parity is verified. E08 is not registration. |
| Complexity | High for financial/session/enrollment slices; Medium presentation. Detailed per-task estimates authoritative. |
| Dependency order | GYMOS-MIG-019; complete prerequisites in task index/dependency graph, including decision gates. |
| Acceptance criteria | Every referenced task-specific checklist passes, intended fields/interactions retained, approved bugs corrected, role/isolation/visual evidence linked. |
| Disposition / final status | Adapt; Not Started, no runtime parity claim. |


### M01 — Trainer directory

| Traceability item | Verified source / target responsibility |
|---|---|
| Feature name and ID | M01: Trainer directory |
| Existing UI route | /member/trainers; [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/page.tsx>) |
| React components | [member-trainers-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/member-trainers-client.tsx>) |
| Interactions | W10, W12, W13, UI-I046; all inherited shell/local controls remain mapped below. |
| Server Actions | Direct page loader/navigation/auth boundary; do not invent an action. |
| Business rules | Functionality §§4–12 for these W/C IDs; approved §14.1 overrides old source behavior; task scopes give concrete corrections. |
| Validation | Exact field rules in contract dossiers below; server-side strict DTOs and safe typed errors. Local draft/navigation controls require no mutation. |
| Authorization | M, A~ / D is V1 observation. V2 uses current gym role/actor/relationship; support read-only, health restricted. |
| Existing models | User |
| Target Master entities | M.GymAccess, M.User; cross-plane operation/audit when task specifies. |
| Target Gym entities | T.Member, T.Trainer; receipts/hold/settlement structures when task specifies. Full ownership: User → Master User identity+GymAccess; Tenant Member/Trainer (no password) |
| Target Nest modules | trainers |
| REST endpoints | C35 GET `/gyms/:slug/me/trainer-directory` |
| Request/response DTOs | MemberTrainerDirectoryDto (C35) |
| Target Next route/components | /gyms/[slug]/member/trainers (proposed); source basename adapted under role feature; shared components follow full inventory. |
| Tests | Task acceptance scenarios in GYMOS-MIG-039; Task064 journeys,065 visuals,066 isolation. No screenshot-only completion. |
| Known defects | Defect register in Master Plan §9; raw serialization, ignored errors, mock billing and lifecycle corrections apply where mapped. |
| Existing V2 status | A01/S01/L02 and basic member/theme foundations partially present; no V1 page parity is verified. E08 is not registration. |
| Complexity | High for financial/session/enrollment slices; Medium presentation. Detailed per-task estimates authoritative. |
| Dependency order | GYMOS-MIG-039; complete prerequisites in task index/dependency graph, including decision gates. |
| Acceptance criteria | Every referenced task-specific checklist passes, intended fields/interactions retained, approved bugs corrected, role/isolation/visual evidence linked. |
| Disposition / final status | Adapt; Not Started, no runtime parity claim. |


### M02 — Request trainer session

| Traceability item | Verified source / target responsibility |
|---|---|
| Feature name and ID | M02: Request trainer session |
| Existing UI route | /member/trainers/[id]/book; [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/[id]/book/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/[id]/book/page.tsx>) |
| React components | [request-session-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/[id]/book/request-session-form.tsx>) |
| Interactions | W07, W08, W12, W13, W14, W15, W16, W27, W28, W29, UI-I047; all inherited shell/local controls remain mapped below. |
| Server Actions | [bookSession](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:182>); [requestSession](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:280>); [respondToSessionRequest](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:382>); [startSession](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:484>); [endSession](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:515>); [handleNoShow](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:623>); [cancelSession](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:673>); [overrideSessionStatus](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:739>); [updateSessionNotes](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:770>) |
| Business rules | Functionality §§4–12 for these W/C IDs; approved §14.1 overrides old source behavior; task scopes give concrete corrections. |
| Validation | Exact field rules in contract dossiers below; server-side strict DTOs and safe typed errors. Local draft/navigation controls require no mutation. |
| Authorization | M, A~ / D is V1 observation. V2 uses current gym role/actor/relationship; support read-only, health restricted. |
| Existing models | Gym, User, Membership, SessionPack, PTSession |
| Target Master entities | M.Gym, M.GymAccess, M.Theme, M.User; cross-plane operation/audit when task specifies. |
| Target Gym entities | T.GymConfiguration, T.Member, T.Membership, T.PTSession, T.SessionPack, T.Trainer; receipts/hold/settlement structures when task specifies. Full ownership: Gym → Master Gym registry/theme/localization; Tenant GymProfile/policy/rates; User → Master User identity+GymAccess; Tenant Member/Trainer (no password); Membership → Tenant Membership with date-derived expiry and no-overlap; SessionPack → Tenant SessionPack + credit reservation/settlement ledger; PTSession → Tenant Session + confirmation snapshots and effect-source keys |
| Target Nest modules | sessions |
| REST endpoints | C23 POST `/gyms/:slug/me/session-requests`; C36 GET `/gyms/:slug/me/session-request-options` |
| Request/response DTOs | SessionRequestDto (C23); MemberSessionRequestOptionsDto (C36) |
| Target Next route/components | /gyms/[slug]/member/trainers/[id]/book (proposed); source basename adapted under role feature; shared components follow full inventory. |
| Tests | Task acceptance scenarios in GYMOS-MIG-042; Task064 journeys,065 visuals,066 isolation. No screenshot-only completion. |
| Known defects | Defect register in Master Plan §9; raw serialization, ignored errors, mock billing and lifecycle corrections apply where mapped. |
| Existing V2 status | A01/S01/L02 and basic member/theme foundations partially present; no V1 page parity is verified. E08 is not registration. |
| Complexity | High for financial/session/enrollment slices; Medium presentation. Detailed per-task estimates authoritative. |
| Dependency order | GYMOS-MIG-042; complete prerequisites in task index/dependency graph, including decision gates. |
| Acceptance criteria | Every referenced task-specific checklist passes, intended fields/interactions retained, approved bugs corrected, role/isolation/visual evidence linked. |
| Disposition / final status | Adapt; Not Started, no runtime parity claim. |


### M03 — My session requests/history

| Traceability item | Verified source / target responsibility |
|---|---|
| Feature name and ID | M03: My session requests/history |
| Existing UI route | /member/sessions; [/Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/sessions/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/sessions/page.tsx>) |
| React components | [member-sessions-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/sessions/member-sessions-client.tsx>) |
| Interactions | W15, W16, W17, W21, W23, UI-I048; all inherited shell/local controls remain mapped below. |
| Server Actions | [bookSession](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:182>); [requestSession](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:280>); [respondToSessionRequest](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:382>); [startSession](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:484>); [endSession](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:515>); [handleNoShow](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:623>); [cancelSession](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:673>); [overrideSessionStatus](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:739>); [updateSessionNotes](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:770>) |
| Business rules | Functionality §§4–12 for these W/C IDs; approved §14.1 overrides old source behavior; task scopes give concrete corrections. |
| Validation | Exact field rules in contract dossiers below; server-side strict DTOs and safe typed errors. Local draft/navigation controls require no mutation. |
| Authorization | M, A~ / D is V1 observation. V2 uses current gym role/actor/relationship; support read-only, health restricted. |
| Existing models | Gym, User, SessionPack, PTSession |
| Target Master entities | M.Gym, M.GymAccess, M.Theme, M.User; cross-plane operation/audit when task specifies. |
| Target Gym entities | T.GymConfiguration, T.Member, T.PTSession, T.SessionPack, T.Trainer; receipts/hold/settlement structures when task specifies. Full ownership: Gym → Master Gym registry/theme/localization; Tenant GymProfile/policy/rates; User → Master User identity+GymAccess; Tenant Member/Trainer (no password); SessionPack → Tenant SessionPack + credit reservation/settlement ledger; PTSession → Tenant Session + confirmation snapshots and effect-source keys |
| Target Nest modules | sessions |
| REST endpoints | C28 POST `/gyms/:slug/sessions/:id/cancel`; C37 GET `/gyms/:slug/me/sessions` |
| Request/response DTOs | SessionCancelDto (C28); OwnSessionPageDto (C37) |
| Target Next route/components | /gyms/[slug]/member/sessions (proposed); source basename adapted under role feature; shared components follow full inventory. |
| Tests | Task acceptance scenarios in GYMOS-MIG-044, GYMOS-MIG-047; Task064 journeys,065 visuals,066 isolation. No screenshot-only completion. |
| Known defects | Defect register in Master Plan §9; raw serialization, ignored errors, mock billing and lifecycle corrections apply where mapped. |
| Existing V2 status | A01/S01/L02 and basic member/theme foundations partially present; no V1 page parity is verified. E08 is not registration. |
| Complexity | High for financial/session/enrollment slices; Medium presentation. Detailed per-task estimates authoritative. |
| Dependency order | GYMOS-MIG-044, GYMOS-MIG-047; complete prerequisites in task index/dependency graph, including decision gates. |
| Acceptance criteria | Every referenced task-specific checklist passes, intended fields/interactions retained, approved bugs corrected, role/isolation/visual evidence linked. |
| Disposition / final status | Adapt; Not Started, no runtime parity claim. |

## Complete TSX and component inventory

74 TSX files:29 pages,2 layouts,3 special states and40 component files (11 shared/layout+29 colocated). Component-file count is not named component export count. Every source declaration/export and handler site is retained below; unused declarations are explicitly omitted. Target folder paths are proposed.

| V1 source | Kind | Feature IDs | Declared exports:line | Disposition | Proposed V2 path | Tasks |
|---|---|---|---|---|---|---|
| [app/(auth)/change-password/change-password-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(auth)/change-password/change-password-form.tsx>) | component | A02 | ChangePasswordForm:14 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/change-password/change-password-form.tsx (proposed) | GYMOS-MIG-017, GYMOS-MIG-020 |
| [app/(auth)/change-password/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(auth)/change-password/page.tsx>) | page | A02 | ChangePasswordPage:5 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/change-password/page.tsx (proposed) | GYMOS-MIG-017, GYMOS-MIG-020 |
| [app/(auth)/login/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(auth)/login/page.tsx>) | page | A01 | LoginPage:154 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/login/page.tsx (proposed) | GYMOS-MIG-016, GYMOS-MIG-019, GYMOS-MIG-020 |
| [app/(dashboard)/admin/AdminClient.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/admin/AdminClient.tsx>) | component | S01 | AdminClient:15 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/admin/AdminClient.tsx (proposed) | GYMOS-MIG-021, GYMOS-MIG-022, GYMOS-MIG-023, GYMOS-MIG-024, GYMOS-MIG-025, GYMOS-MIG-026 |
| [app/(dashboard)/admin/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/admin/page.tsx>) | page | S01 | AdminDashboardPage:6 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/admin/page.tsx (proposed) | GYMOS-MIG-021, GYMOS-MIG-022, GYMOS-MIG-023, GYMOS-MIG-024, GYMOS-MIG-025, GYMOS-MIG-026 |
| [app/(dashboard)/error.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/error.tsx>) | error | SHARED | DashboardError:5 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/error.tsx (proposed) | GYMOS-MIG-012 |
| [app/(dashboard)/layout.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/layout.tsx>) | layout | SHARED | DashboardLayout:8 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/layout.tsx (proposed) | GYMOS-MIG-012 |
| [app/(dashboard)/member/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/page.tsx>) | page | M00 | MemberHomePage:3 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/member/page.tsx (proposed) | GYMOS-MIG-019 |
| [app/(dashboard)/member/sessions/member-sessions-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/sessions/member-sessions-client.tsx>) | component | M03 | MemberSessionsClient:27 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/member/sessions/member-sessions-client.tsx (proposed) | GYMOS-MIG-044, GYMOS-MIG-047 |
| [app/(dashboard)/member/sessions/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/sessions/page.tsx>) | page | M03 | MemberSessionsPage:5 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/member/sessions/page.tsx (proposed) | GYMOS-MIG-044, GYMOS-MIG-047 |
| [app/(dashboard)/member/trainers/[id]/book/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/[id]/book/page.tsx>) | page | M02 | RequestSessionPage:5 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/member/trainers/[id]/book/page.tsx (proposed) | GYMOS-MIG-042 |
| [app/(dashboard)/member/trainers/[id]/book/request-session-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/[id]/book/request-session-form.tsx>) | component | M02 | RequestSessionForm:15 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/member/trainers/[id]/book/request-session-form.tsx (proposed) | GYMOS-MIG-042 |
| [app/(dashboard)/member/trainers/member-trainers-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/member-trainers-client.tsx>) | component | M01 | MemberTrainersClient:24 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/member/trainers/member-trainers-client.tsx (proposed) | GYMOS-MIG-039 |
| [app/(dashboard)/member/trainers/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/page.tsx>) | page | M01 | MemberTrainersPage:5 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/member/trainers/page.tsx (proposed) | GYMOS-MIG-039 |
| [app/(dashboard)/not-found.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/not-found.tsx>) | not-found | SHARED | NotFound:4 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/not-found.tsx (proposed) | GYMOS-MIG-012 |
| [app/(dashboard)/owner/analytics/AnalyticsClient.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/analytics/AnalyticsClient.tsx>) | component | O11 | AnalyticsClient:13 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/analytics/AnalyticsClient.tsx (proposed) | GYMOS-MIG-059 |
| [app/(dashboard)/owner/analytics/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/analytics/page.tsx>) | page | O11 | AnalyticsPage:6 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/analytics/page.tsx (proposed) | GYMOS-MIG-059 |
| [app/(dashboard)/owner/audit-log/AuditLogClient.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/audit-log/AuditLogClient.tsx>) | component | O13 | AuditLogClient:28 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/audit-log/AuditLogClient.tsx (proposed) | GYMOS-MIG-043, GYMOS-MIG-060, GYMOS-MIG-061 |
| [app/(dashboard)/owner/audit-log/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/audit-log/page.tsx>) | page | O13 | AuditLogPage:6 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/audit-log/page.tsx (proposed) | GYMOS-MIG-043, GYMOS-MIG-060, GYMOS-MIG-061 |
| [app/(dashboard)/owner/components/OwnerDashboardClient.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/components/OwnerDashboardClient.tsx>) | component | O01 | OwnerDashboardClient:12 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/components/OwnerDashboardClient.tsx (proposed) | GYMOS-MIG-058 |
| [app/(dashboard)/owner/financials/components/charts.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/components/charts.tsx>) | component | O10 | RevenueLineChart:21; RevenuePieChart:55; ExpenseBudgetChart:113; TrainerPayChart:135 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/financials/components/charts.tsx (proposed) | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061 |
| [app/(dashboard)/owner/financials/components/financial-modals.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/components/financial-modals.tsx>) | component | O10 | LogExpenseDialog:6; SetBudgetDialog:128; RecordDeskPaymentDialog:218 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/financials/components/financial-modals.tsx (proposed) | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061 |
| [app/(dashboard)/owner/financials/financials-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/financials-client.tsx>) | component | O10 | FinancialsClient:90 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/financials/financials-client.tsx (proposed) | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061 |
| [app/(dashboard)/owner/financials/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/page.tsx>) | page | O10 | FinancialsPage:11 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/financials/page.tsx (proposed) | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061 |
| [app/(dashboard)/owner/gym-config/gym-config-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/gym-config/gym-config-client.tsx>) | component | O12 | GymConfigClient:19 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/gym-config/gym-config-client.tsx (proposed) | GYMOS-MIG-015, GYMOS-MIG-027, GYMOS-MIG-028, GYMOS-MIG-029, GYMOS-MIG-030 |
| [app/(dashboard)/owner/gym-config/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/gym-config/page.tsx>) | page | O12 | GymConfigPage:6 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/gym-config/page.tsx (proposed) | GYMOS-MIG-015, GYMOS-MIG-027, GYMOS-MIG-028, GYMOS-MIG-029, GYMOS-MIG-030 |
| [app/(dashboard)/owner/loading.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/loading.tsx>) | loading | SHARED | DashboardLoading:1 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/loading.tsx (proposed) | GYMOS-MIG-012 |
| [app/(dashboard)/owner/members/[id]/member-profile-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/member-profile-client.tsx>) | component | O04 | MemberProfileClient:17 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/members/[id]/member-profile-client.tsx (proposed) | GYMOS-MIG-030, GYMOS-MIG-032, GYMOS-MIG-033, GYMOS-MIG-034 |
| [app/(dashboard)/owner/members/[id]/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/page.tsx>) | page | O04 | MemberProfilePage:6 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/members/[id]/page.tsx (proposed) | GYMOS-MIG-030, GYMOS-MIG-032, GYMOS-MIG-033, GYMOS-MIG-034 |
| [app/(dashboard)/owner/members/members-list-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/members-list-client.tsx>) | component | O02 | MembersListClient:15 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/members/members-list-client.tsx (proposed) | GYMOS-MIG-032 |
| [app/(dashboard)/owner/members/new/new-member-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/new/new-member-form.tsx>) | component | O03 | NewMemberForm:21 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/members/new/new-member-form.tsx (proposed) | GYMOS-MIG-031, GYMOS-MIG-035 |
| [app/(dashboard)/owner/members/new/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/new/page.tsx>) | page | O03 | NewMemberPage:6 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/members/new/page.tsx (proposed) | GYMOS-MIG-031, GYMOS-MIG-035 |
| [app/(dashboard)/owner/members/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/page.tsx>) | page | O02 | MembersPage:6 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/members/page.tsx (proposed) | GYMOS-MIG-032 |
| [app/(dashboard)/owner/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/page.tsx>) | page | O01 | OwnerDashboardPage:6 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/page.tsx (proposed) | GYMOS-MIG-058 |
| [app/(dashboard)/owner/sessions/book/book-session-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/book/book-session-form.tsx>) | component | O09 | BookSessionForm:15 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/sessions/book/book-session-form.tsx (proposed) | GYMOS-MIG-041 |
| [app/(dashboard)/owner/sessions/book/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/book/page.tsx>) | page | O09 | BookSessionPage:6 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/sessions/book/page.tsx (proposed) | GYMOS-MIG-041 |
| [app/(dashboard)/owner/sessions/daily-view.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/daily-view.tsx>) | component | O08 | DailySessionsView:22 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/sessions/daily-view.tsx (proposed) | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048 |
| [app/(dashboard)/owner/sessions/monthly-view.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/monthly-view.tsx>) | component | O08 | MonthlyMemberView:17 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/sessions/monthly-view.tsx (proposed) | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048 |
| [app/(dashboard)/owner/sessions/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/page.tsx>) | page | O08 | OwnerSessionsPage:6 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/sessions/page.tsx (proposed) | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048 |
| [app/(dashboard)/owner/sessions/sessions-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/sessions-client.tsx>) | component | O08 | OwnerSessionsClient:17 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/sessions/sessions-client.tsx (proposed) | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048 |
| [app/(dashboard)/owner/subscription/SubscriptionClient.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/subscription/SubscriptionClient.tsx>) | component | O14 | SubscriptionClient:37 | Defer/hide MVP | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/subscription/SubscriptionClient.tsx (proposed) | GYMOS-MIG-062 |
| [app/(dashboard)/owner/subscription/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/subscription/page.tsx>) | page | O14 | SubscriptionPage:6 | Defer/hide MVP | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/subscription/page.tsx (proposed) | GYMOS-MIG-062 |
| [app/(dashboard)/owner/trainers/[id]/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/[id]/page.tsx>) | page | O07 | TrainerProfilePage:6 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/trainers/[id]/page.tsx (proposed) | GYMOS-MIG-037, GYMOS-MIG-038 |
| [app/(dashboard)/owner/trainers/[id]/trainer-profile-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/[id]/trainer-profile-client.tsx>) | component | O07 | TrainerProfileClient:15 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/trainers/[id]/trainer-profile-client.tsx (proposed) | GYMOS-MIG-037, GYMOS-MIG-038 |
| [app/(dashboard)/owner/trainers/new/new-trainer-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/new/new-trainer-form.tsx>) | component | O06 | NewTrainerForm:17 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/trainers/new/new-trainer-form.tsx (proposed) | GYMOS-MIG-036 |
| [app/(dashboard)/owner/trainers/new/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/new/page.tsx>) | page | O06 | NewTrainerPage:3 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/trainers/new/page.tsx (proposed) | GYMOS-MIG-036 |
| [app/(dashboard)/owner/trainers/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/page.tsx>) | page | O05 | TrainersPage:6 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/trainers/page.tsx (proposed) | GYMOS-MIG-037 |
| [app/(dashboard)/owner/trainers/trainers-list-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/trainers-list-client.tsx>) | component | O05 | TrainersListClient:14 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/owner/trainers/trainers-list-client.tsx (proposed) | GYMOS-MIG-037 |
| [app/(dashboard)/trainer/clients/[id]/client-360-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/[id]/client-360-client.tsx>) | component | T03 | Client360Client:13 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/trainer/clients/[id]/client-360-client.tsx (proposed) | GYMOS-MIG-050, GYMOS-MIG-051, GYMOS-MIG-052 |
| [app/(dashboard)/trainer/clients/[id]/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/[id]/page.tsx>) | page | T03 | TrainerClient360Page:6 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/trainer/clients/[id]/page.tsx (proposed) | GYMOS-MIG-050, GYMOS-MIG-051, GYMOS-MIG-052 |
| [app/(dashboard)/trainer/clients/clients-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/clients-client.tsx>) | component | T02 | TrainerClientsClient:14 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/trainer/clients/clients-client.tsx (proposed) | GYMOS-MIG-050 |
| [app/(dashboard)/trainer/clients/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/page.tsx>) | page | T02 | TrainerClientsPage:6 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/trainer/clients/page.tsx (proposed) | GYMOS-MIG-050 |
| [app/(dashboard)/trainer/earnings/earnings-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/earnings/earnings-client.tsx>) | component | T06 | TrainerEarningsClient:12 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/trainer/earnings/earnings-client.tsx (proposed) | GYMOS-MIG-049, GYMOS-MIG-056 |
| [app/(dashboard)/trainer/earnings/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/earnings/page.tsx>) | page | T06 | TrainerEarningsPage:5 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/trainer/earnings/page.tsx (proposed) | GYMOS-MIG-049, GYMOS-MIG-056 |
| [app/(dashboard)/trainer/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/page.tsx>) | page | T00 | TrainerDashboardPage:3 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/trainer/page.tsx (proposed) | GYMOS-MIG-019 |
| [app/(dashboard)/trainer/plans/meal/new/meal-builder-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/meal/new/meal-builder-form.tsx>) | component | T05 | MealBuilderForm:26 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/trainer/plans/meal/new/meal-builder-form.tsx (proposed) | GYMOS-MIG-052 |
| [app/(dashboard)/trainer/plans/meal/new/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/meal/new/page.tsx>) | page | T05 | NewMealPlanPage:6 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/trainer/plans/meal/new/page.tsx (proposed) | GYMOS-MIG-052 |
| [app/(dashboard)/trainer/plans/workout/new/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/workout/new/page.tsx>) | page | T04 | NewWorkoutPlanPage:6 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/trainer/plans/workout/new/page.tsx (proposed) | GYMOS-MIG-051 |
| [app/(dashboard)/trainer/plans/workout/new/workout-builder-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/workout/new/workout-builder-form.tsx>) | component | T04 | WorkoutBuilderForm:24 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/trainer/plans/workout/new/workout-builder-form.tsx (proposed) | GYMOS-MIG-051 |
| [app/(dashboard)/trainer/schedule/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/page.tsx>) | page | T01 | TrainerSchedulePage:5 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/trainer/schedule/page.tsx (proposed) | GYMOS-MIG-042, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047 |
| [app/(dashboard)/trainer/schedule/schedule-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/schedule-client.tsx>) | component | T01 | TrainerScheduleClient:25 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/gyms/[slug]/trainer/schedule/schedule-client.tsx (proposed) | GYMOS-MIG-042, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047 |
| [app/layout.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/layout.tsx>) | layout | SHARED | RootLayout:9 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/layout.tsx (proposed) | GYMOS-MIG-012 |
| [app/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/page.tsx>) | page | R00 | Home:4 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/app/page.tsx (proposed) | GYMOS-MIG-019 |
| [components/layout/NotificationBell.tsx](</Users/esanduepa/Desktop/Projects/gymos/components/layout/NotificationBell.tsx>) | component | SHARED | NotificationBell:8 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/layout/NotificationBell.tsx (proposed) | GYMOS-MIG-012 |
| [components/layout/dashboard-chrome.tsx](</Users/esanduepa/Desktop/Projects/gymos/components/layout/dashboard-chrome.tsx>) | component | SHARED | DashboardChrome:15 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/layout/dashboard-chrome.tsx (proposed) | GYMOS-MIG-012 |
| [components/layout/header.tsx](</Users/esanduepa/Desktop/Projects/gymos/components/layout/header.tsx>) | component | SHARED | Header:13 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/layout/header.tsx (proposed) | GYMOS-MIG-012 |
| [components/layout/sidebar.tsx](</Users/esanduepa/Desktop/Projects/gymos/components/layout/sidebar.tsx>) | component | SHARED | Sidebar:32 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/layout/sidebar.tsx (proposed) | GYMOS-MIG-012 |
| [components/shared/confirm-dialog.tsx](</Users/esanduepa/Desktop/Projects/gymos/components/shared/confirm-dialog.tsx>) | component | SHARED | ConfirmDialog:18 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/shared/confirm-dialog.tsx (proposed) | GYMOS-MIG-012 |
| [components/shared/data-table.tsx](</Users/esanduepa/Desktop/Projects/gymos/components/shared/data-table.tsx>) | component | SHARED | DataTable:27 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/shared/data-table.tsx (proposed) | GYMOS-MIG-012 |
| [components/shared/formatted-date.tsx](</Users/esanduepa/Desktop/Projects/gymos/components/shared/formatted-date.tsx>) | component | SHARED | FormattedDate:9 | Intentionally omit unused component | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/shared/formatted-date.tsx (proposed) | GYMOS-MIG-012 |
| [components/shared/page-header.tsx](</Users/esanduepa/Desktop/Projects/gymos/components/shared/page-header.tsx>) | component | SHARED | PageHeader:9 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/shared/page-header.tsx (proposed) | GYMOS-MIG-012 |
| [components/shared/stat-card.tsx](</Users/esanduepa/Desktop/Projects/gymos/components/shared/stat-card.tsx>) | component | SHARED | StatCard:11 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/shared/stat-card.tsx (proposed) | GYMOS-MIG-012 |
| [components/shared/status-badge.tsx](</Users/esanduepa/Desktop/Projects/gymos/components/shared/status-badge.tsx>) | component | SHARED | StatusBadge:6 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/shared/status-badge.tsx (proposed) | GYMOS-MIG-012 |
| [components/shared/temporary-password-notice.tsx](</Users/esanduepa/Desktop/Projects/gymos/components/shared/temporary-password-notice.tsx>) | component | SHARED | TemporaryPasswordNotice:14 | Adapt | /Users/esanduepa/Desktop/Projects/gymos-v2/apps/web/src/components/shared/temporary-password-notice.tsx (proposed) | GYMOS-MIG-012 |

TrainerPayChart in charts.tsx is imported but not rendered: intentionally omit initial migration. RecordDeskPaymentDialog is deferred while LogExpenseDialog/SetBudgetDialog in the same file adapt. SubscriptionClient is deferred. Auth page-local JSX remains included even when it has no separate component file.
## Source handler-site inventory

149 source lines with recognized authored interaction/form handlers are a static search cross-check, not149 distinct product interactions or proof of runtime completeness. Each maps through its owning feature/task. The52 UI groups,22 local-control groups and39 workflows below supply semantic coverage. Framework callbacks, conditional browser behavior and accessibility still need task063/065 verification.

| Source:line | Authored handler/form site | Tasks | Disposition |
|---|---|---|---|
| [app/(auth)/change-password/change-password-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(auth)/change-password/change-password-form.tsx:84>) | &lt;form onSubmit={handleSubmit} className="space-y-5"&gt; | GYMOS-MIG-017, GYMOS-MIG-020 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(auth)/change-password/change-password-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(auth)/change-password/change-password-form.tsx:152>) | onClick={() =&gt; signOut({ callbackUrl: "/login" })} | GYMOS-MIG-017, GYMOS-MIG-020 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(auth)/login/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(auth)/login/page.tsx:100>) | &lt;form onSubmit={handleSubmit} className="space-y-5"&gt; | GYMOS-MIG-016, GYMOS-MIG-019, GYMOS-MIG-020 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(auth)/login/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(auth)/login/page.tsx:112>) | onChange={(e) =&gt; setEmail(e.target.value)} | GYMOS-MIG-016, GYMOS-MIG-019, GYMOS-MIG-020 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(auth)/login/page.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(auth)/login/page.tsx:129>) | onChange={(e) =&gt; setPassword(e.target.value)} | GYMOS-MIG-016, GYMOS-MIG-019, GYMOS-MIG-020 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/admin/AdminClient.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/admin/AdminClient.tsx:45>) | onChange={(e) =&gt; handleGymSwitch(e.target.value)} | GYMOS-MIG-021, GYMOS-MIG-022, GYMOS-MIG-023, GYMOS-MIG-024, GYMOS-MIG-025, GYMOS-MIG-026 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/admin/AdminClient.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/admin/AdminClient.tsx:107>) | onClick={() =&gt; handleGymSwitch(isImpersonated ? "" : gym.id)} | GYMOS-MIG-021, GYMOS-MIG-022, GYMOS-MIG-023, GYMOS-MIG-024, GYMOS-MIG-025, GYMOS-MIG-026 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/error.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/error.tsx:24>) | onClick={() =&gt; reset()} | GYMOS-MIG-012 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/member/sessions/member-sessions-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/sessions/member-sessions-client.tsx:44>) | action={ | GYMOS-MIG-044, GYMOS-MIG-047 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/member/sessions/member-sessions-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/sessions/member-sessions-client.tsx:89>) | onClick={() =&gt; setTarget(s)} | GYMOS-MIG-044, GYMOS-MIG-047 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/member/trainers/[id]/book/request-session-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/[id]/book/request-session-form.tsx:70>) | &lt;form onSubmit={handleSubmit} className="space-y-4"&gt; | GYMOS-MIG-042 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/member/trainers/member-trainers-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/member/trainers/member-trainers-client.tsx:46>) | onChange={(e) =&gt; setSearch(e.target.value)} | GYMOS-MIG-039 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/audit-log/AuditLogClient.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/audit-log/AuditLogClient.tsx:84>) | onClick={handleExportCSV} | GYMOS-MIG-043, GYMOS-MIG-060, GYMOS-MIG-061 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/audit-log/AuditLogClient.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/audit-log/AuditLogClient.tsx:99>) | onChange={(e) =&gt; handleFilterChange(e.target.value)} | GYMOS-MIG-043, GYMOS-MIG-060, GYMOS-MIG-061 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/audit-log/AuditLogClient.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/audit-log/AuditLogClient.tsx:170>) | onClick={() =&gt; handlePageChange(data.currentPage - 1)} | GYMOS-MIG-043, GYMOS-MIG-060, GYMOS-MIG-061 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/audit-log/AuditLogClient.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/audit-log/AuditLogClient.tsx:180>) | onClick={() =&gt; handlePageChange(data.currentPage + 1)} | GYMOS-MIG-043, GYMOS-MIG-060, GYMOS-MIG-061 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/components/OwnerDashboardClient.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/components/OwnerDashboardClient.tsx:47>) | onClick={handleRefresh} | GYMOS-MIG-058 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/financials/components/financial-modals.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/components/financial-modals.tsx:39>) | &lt;button onClick={onClose} className="text-gray-400 hover:text-gray-600"&gt;✕&lt;/button&gt; | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/financials/components/financial-modals.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/components/financial-modals.tsx:44>) | &lt;form onSubmit={handleSubmit} className="space-y-4"&gt; | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/financials/components/financial-modals.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/components/financial-modals.tsx:109>) | onClick={onClose} | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/financials/components/financial-modals.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/components/financial-modals.tsx:161>) | &lt;button onClick={onClose} className="text-gray-400 hover:text-gray-600"&gt;✕&lt;/button&gt; | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/financials/components/financial-modals.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/components/financial-modals.tsx:166>) | &lt;form onSubmit={handleSubmit} className="space-y-4"&gt; | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/financials/components/financial-modals.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/components/financial-modals.tsx:199>) | onClick={onClose} | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/financials/components/financial-modals.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/components/financial-modals.tsx:253>) | &lt;button onClick={onClose} className="text-gray-400 hover:text-gray-600"&gt;✕&lt;/button&gt; | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/financials/components/financial-modals.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/components/financial-modals.tsx:258>) | &lt;form onSubmit={handleSubmit} className="space-y-4"&gt; | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/financials/components/financial-modals.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/components/financial-modals.tsx:314>) | onClick={onClose} | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/financials/financials-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/financials-client.tsx:127>) | onClick={() =&gt; setIsLogExpenseOpen(true)} | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/financials/financials-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/financials-client.tsx:147>) | onClick={() =&gt; setActiveTab("revenue")} | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/financials/financials-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/financials-client.tsx:157>) | onClick={() =&gt; setActiveTab("expenses")} | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/financials/financials-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/financials-client.tsx:167>) | onClick={() =&gt; setActiveTab("deferred")} | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/financials/financials-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/financials-client.tsx:177>) | onClick={() =&gt; setActiveTab("payroll")} | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/financials/financials-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/financials-client.tsx:187>) | onClick={() =&gt; setActiveTab("pnl")} | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/financials/financials-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/financials-client.tsx:197>) | onClick={() =&gt; setActiveTab("export")} | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/financials/financials-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/financials-client.tsx:309>) | onClick={() =&gt; setIsSetBudgetOpen(true)} | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/financials/financials-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/financials-client.tsx:538>) | onClick={handleClosePayPeriod} | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/financials/financials-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/financials/financials-client.tsx:548>) | onClick={handleApprovePayPeriod} | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/gym-config/gym-config-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/gym-config/gym-config-client.tsx:111>) | action={ | GYMOS-MIG-015, GYMOS-MIG-027, GYMOS-MIG-028, GYMOS-MIG-029, GYMOS-MIG-030 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/gym-config/gym-config-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/gym-config/gym-config-client.tsx:113>) | onClick={handleManualExpiryCheck} | GYMOS-MIG-015, GYMOS-MIG-027, GYMOS-MIG-028, GYMOS-MIG-029, GYMOS-MIG-030 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/gym-config/gym-config-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/gym-config/gym-config-client.tsx:138>) | onClick={() =&gt; { setActiveTab("profile"); setMessage(null); }} | GYMOS-MIG-015, GYMOS-MIG-027, GYMOS-MIG-028, GYMOS-MIG-029, GYMOS-MIG-030 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/gym-config/gym-config-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/gym-config/gym-config-client.tsx:151>) | onClick={() =&gt; { setActiveTab("plans"); setMessage(null); }} | GYMOS-MIG-015, GYMOS-MIG-027, GYMOS-MIG-028, GYMOS-MIG-029, GYMOS-MIG-030 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/gym-config/gym-config-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/gym-config/gym-config-client.tsx:164>) | onClick={() =&gt; { setActiveTab("fees"); setMessage(null); }} | GYMOS-MIG-015, GYMOS-MIG-027, GYMOS-MIG-028, GYMOS-MIG-029, GYMOS-MIG-030 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/gym-config/gym-config-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/gym-config/gym-config-client.tsx:177>) | onClick={() =&gt; { setActiveTab("rates"); setMessage(null); }} | GYMOS-MIG-015, GYMOS-MIG-027, GYMOS-MIG-028, GYMOS-MIG-029, GYMOS-MIG-030 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/gym-config/gym-config-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/gym-config/gym-config-client.tsx:190>) | onClick={() =&gt; { setActiveTab("policy"); setMessage(null); }} | GYMOS-MIG-015, GYMOS-MIG-027, GYMOS-MIG-028, GYMOS-MIG-029, GYMOS-MIG-030 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/gym-config/gym-config-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/gym-config/gym-config-client.tsx:206>) | &lt;form onSubmit={handleProfileSubmit} className="space-y-4"&gt; | GYMOS-MIG-015, GYMOS-MIG-027, GYMOS-MIG-028, GYMOS-MIG-029, GYMOS-MIG-030 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/gym-config/gym-config-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/gym-config/gym-config-client.tsx:281>) | onClick={() =&gt; setShowAddPlan(!showAddPlan)} | GYMOS-MIG-015, GYMOS-MIG-027, GYMOS-MIG-028, GYMOS-MIG-029, GYMOS-MIG-030 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/gym-config/gym-config-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/gym-config/gym-config-client.tsx:291>) | &lt;form onSubmit={handleAddPlanSubmit} className="space-y-4"&gt; | GYMOS-MIG-015, GYMOS-MIG-027, GYMOS-MIG-028, GYMOS-MIG-029, GYMOS-MIG-030 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/gym-config/gym-config-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/gym-config/gym-config-client.tsx:390>) | &lt;form onSubmit={handleSessionRatesSubmit} className="space-y-4"&gt; | GYMOS-MIG-015, GYMOS-MIG-027, GYMOS-MIG-028, GYMOS-MIG-029, GYMOS-MIG-030 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/gym-config/gym-config-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/gym-config/gym-config-client.tsx:468>) | &lt;form onSubmit={handleRatesSubmit} className="space-y-4"&gt; | GYMOS-MIG-015, GYMOS-MIG-027, GYMOS-MIG-028, GYMOS-MIG-029, GYMOS-MIG-030 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/gym-config/gym-config-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/gym-config/gym-config-client.tsx:532>) | &lt;form onSubmit={handlePolicySubmit} className="space-y-4"&gt; | GYMOS-MIG-015, GYMOS-MIG-027, GYMOS-MIG-028, GYMOS-MIG-029, GYMOS-MIG-030 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/members/[id]/member-profile-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/member-profile-client.tsx:90>) | onClick={() =&gt; triggerDialog("SUSPENDED")} | GYMOS-MIG-030, GYMOS-MIG-032, GYMOS-MIG-033, GYMOS-MIG-034 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/members/[id]/member-profile-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/member-profile-client.tsx:96>) | onClick={() =&gt; triggerDialog("INACTIVE")} | GYMOS-MIG-030, GYMOS-MIG-032, GYMOS-MIG-033, GYMOS-MIG-034 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/members/[id]/member-profile-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/member-profile-client.tsx:104>) | onClick={() =&gt; triggerDialog("ACTIVE")} | GYMOS-MIG-030, GYMOS-MIG-032, GYMOS-MIG-033, GYMOS-MIG-034 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/members/[id]/member-profile-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/member-profile-client.tsx:116>) | onClick={() =&gt; setActiveTab("overview")} | GYMOS-MIG-030, GYMOS-MIG-032, GYMOS-MIG-033, GYMOS-MIG-034 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/members/[id]/member-profile-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/member-profile-client.tsx:126>) | onClick={() =&gt; setActiveTab("attendance")} | GYMOS-MIG-030, GYMOS-MIG-032, GYMOS-MIG-033, GYMOS-MIG-034 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/members/[id]/member-profile-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/member-profile-client.tsx:136>) | onClick={() =&gt; setActiveTab("payments")} | GYMOS-MIG-030, GYMOS-MIG-032, GYMOS-MIG-033, GYMOS-MIG-034 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/members/[id]/member-profile-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/member-profile-client.tsx:187>) | onClick={() =&gt; setPackModalOpen(true)} | GYMOS-MIG-030, GYMOS-MIG-032, GYMOS-MIG-033, GYMOS-MIG-034 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/members/[id]/member-profile-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/member-profile-client.tsx:250>) | onClick={() =&gt; setDeskPaymentModalOpen(true)} | GYMOS-MIG-030, GYMOS-MIG-032, GYMOS-MIG-033, GYMOS-MIG-034 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/members/[id]/member-profile-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/member-profile-client.tsx:287>) | onClick={() =&gt; alert(`Receipt #${activeMembership.id.slice(-6)}: Paid $${activeMembership.plan.price.toFixed(2)} via GymOS Desk Billing`)} | GYMOS-MIG-030, GYMOS-MIG-032, GYMOS-MIG-033, GYMOS-MIG-034 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/members/[id]/member-profile-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/member-profile-client.tsx:314>) | onClick={() =&gt; alert(`Receipt #${p.id.slice(-6)}: Paid $${(p.price \|\| 0).toFixed(2)} for ${p.totalSessions} PT Sessions`)} | GYMOS-MIG-030, GYMOS-MIG-032, GYMOS-MIG-033, GYMOS-MIG-034 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/members/[id]/member-profile-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/member-profile-client.tsx:361>) | &lt;form onSubmit={handleIssuePackSubmit} className="space-y-4"&gt; | GYMOS-MIG-030, GYMOS-MIG-032, GYMOS-MIG-033, GYMOS-MIG-034 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/members/[id]/member-profile-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/[id]/member-profile-client.tsx:404>) | onClick={() =&gt; setPackModalOpen(false)} | GYMOS-MIG-030, GYMOS-MIG-032, GYMOS-MIG-033, GYMOS-MIG-034 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/members/members-list-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/members-list-client.tsx:92>) | action={ | GYMOS-MIG-032 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/members/members-list-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/members-list-client.tsx:112>) | onChange={(e) =&gt; setSearch(e.target.value)} | GYMOS-MIG-032 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/members/members-list-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/members-list-client.tsx:120>) | onChange={(e) =&gt; setStatusFilter(e.target.value)} | GYMOS-MIG-032 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/members/new/new-member-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/members/new/new-member-form.tsx:91>) | &lt;form onSubmit={handleSubmit} className="space-y-4"&gt; | GYMOS-MIG-031, GYMOS-MIG-035 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/sessions/book/book-session-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/book/book-session-form.tsx:62>) | &lt;form onSubmit={handleSubmit} className="space-y-4"&gt; | GYMOS-MIG-041 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/sessions/daily-view.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/daily-view.tsx:139>) | onClick={() =&gt; triggerOverride(row, "COMPLETED")} | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/sessions/daily-view.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/daily-view.tsx:145>) | onClick={() =&gt; triggerOverride(row, "MISSED")} | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/sessions/daily-view.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/daily-view.tsx:172>) | onClick={() =&gt; shiftDay(-1)} | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/sessions/daily-view.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/daily-view.tsx:180>) | onChange={(e) =&gt; setSelectedDate(e.target.value)} | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/sessions/daily-view.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/daily-view.tsx:184>) | onClick={() =&gt; shiftDay(1)} | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/sessions/daily-view.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/daily-view.tsx:190>) | onClick={() =&gt; setSelectedDate(toDateInputValue(new Date()))} | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/sessions/daily-view.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/daily-view.tsx:202>) | onClick={exportCSV} | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/sessions/daily-view.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/daily-view.tsx:220>) | onChange={(e) =&gt; setSearch(e.target.value)} | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/sessions/daily-view.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/daily-view.tsx:227>) | onChange={(e) =&gt; setTrainerFilter(e.target.value)} | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/sessions/daily-view.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/daily-view.tsx:241>) | onChange={(e) =&gt; setStatusFilter(e.target.value)} | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/sessions/monthly-view.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/monthly-view.tsx:111>) | onClick={() =&gt; setExpandedRow({ member: row.member, bookedThisMonth: row.bookedThisMonth })} | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/sessions/monthly-view.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/monthly-view.tsx:128>) | onClick={() =&gt; shiftMonth(-1)} | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/sessions/monthly-view.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/monthly-view.tsx:136>) | onChange={(e) =&gt; setSelectedMonth(e.target.value)} | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/sessions/monthly-view.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/monthly-view.tsx:140>) | onClick={() =&gt; shiftMonth(1)} | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/sessions/monthly-view.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/monthly-view.tsx:146>) | onClick={() =&gt; setSelectedMonth(toMonthInputValue(new Date()))} | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/sessions/monthly-view.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/monthly-view.tsx:160>) | onChange={(e) =&gt; setSearch(e.target.value)} | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/sessions/monthly-view.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/monthly-view.tsx:176>) | onClick={() =&gt; setExpandedRow(null)} | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/sessions/monthly-view.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/monthly-view.tsx:180>) | onClick={(e) =&gt; e.stopPropagation()} | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/sessions/monthly-view.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/monthly-view.tsx:195>) | onClick={() =&gt; setExpandedRow(null)} | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/sessions/sessions-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/sessions-client.tsx:30>) | action={ | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/sessions/sessions-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/sessions-client.tsx:64>) | onClick={() =&gt; setTab("daily")} | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/sessions/sessions-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/sessions/sessions-client.tsx:75>) | onClick={() =&gt; setTab("monthly")} | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/subscription/SubscriptionClient.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/subscription/SubscriptionClient.tsx:82>) | onClick={() =&gt; alert("Redirecting to Billing Portal...")} | GYMOS-MIG-062 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/subscription/SubscriptionClient.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/subscription/SubscriptionClient.tsx:136>) | onClick={() =&gt; alert(`To change your plan to ${tier.name}, please contact Support.`)} | GYMOS-MIG-062 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/trainers/[id]/trainer-profile-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/[id]/trainer-profile-client.tsx:90>) | onClick={() =&gt; setDialogOpen(true)} | GYMOS-MIG-037, GYMOS-MIG-038 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/trainers/[id]/trainer-profile-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/[id]/trainer-profile-client.tsx:138>) | &lt;form onSubmit={handleApproveShift} className="space-y-4"&gt; | GYMOS-MIG-037, GYMOS-MIG-038 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/trainers/[id]/trainer-profile-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/[id]/trainer-profile-client.tsx:145>) | onChange={(e) =&gt; setShiftStart(e.target.value)} | GYMOS-MIG-037, GYMOS-MIG-038 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/trainers/[id]/trainer-profile-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/[id]/trainer-profile-client.tsx:155>) | onChange={(e) =&gt; setShiftEnd(e.target.value)} | GYMOS-MIG-037, GYMOS-MIG-038 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/trainers/new/new-trainer-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/new/new-trainer-form.tsx:86>) | &lt;form onSubmit={handleSubmit} className="space-y-4"&gt; | GYMOS-MIG-036 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/trainers/trainers-list-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/trainers-list-client.tsx:101>) | action={ | GYMOS-MIG-037 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/owner/trainers/trainers-list-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/owner/trainers/trainers-list-client.tsx:120>) | onChange={(e) =&gt; setSearch(e.target.value)} | GYMOS-MIG-037 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/clients/[id]/client-360-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/[id]/client-360-client.tsx:97>) | onClick={() =&gt; setActiveTab("overview")} | GYMOS-MIG-050, GYMOS-MIG-051, GYMOS-MIG-052 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/clients/[id]/client-360-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/[id]/client-360-client.tsx:107>) | onClick={() =&gt; setActiveTab("workouts")} | GYMOS-MIG-050, GYMOS-MIG-051, GYMOS-MIG-052 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/clients/[id]/client-360-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/[id]/client-360-client.tsx:117>) | onClick={() =&gt; setActiveTab("meals")} | GYMOS-MIG-050, GYMOS-MIG-051, GYMOS-MIG-052 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/clients/[id]/client-360-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/[id]/client-360-client.tsx:127>) | onClick={() =&gt; setActiveTab("history")} | GYMOS-MIG-050, GYMOS-MIG-051, GYMOS-MIG-052 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/clients/clients-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/clients/clients-client.tsx:98>) | onChange={(e) =&gt; setSearch(e.target.value)} | GYMOS-MIG-050 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/plans/meal/new/meal-builder-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/meal/new/meal-builder-form.tsx:121>) | &lt;form onSubmit={handleSubmit} className="space-y-6"&gt; | GYMOS-MIG-052 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/plans/meal/new/meal-builder-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/meal/new/meal-builder-form.tsx:129>) | onChange={(e) =&gt; setClientId(e.target.value)} | GYMOS-MIG-052 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/plans/meal/new/meal-builder-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/meal/new/meal-builder-form.tsx:149>) | onChange={(e) =&gt; setPlanName(e.target.value)} | GYMOS-MIG-052 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/plans/meal/new/meal-builder-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/meal/new/meal-builder-form.tsx:185>) | onClick={addMeal} | GYMOS-MIG-052 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/plans/meal/new/meal-builder-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/meal/new/meal-builder-form.tsx:205>) | onChange={(e) =&gt; updateMeal(m.id, "mealType", e.target.value)} | GYMOS-MIG-052 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/plans/meal/new/meal-builder-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/meal/new/meal-builder-form.tsx:224>) | onChange={(e) =&gt; updateMeal(m.id, "foodItem", e.target.value)} | GYMOS-MIG-052 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/plans/meal/new/meal-builder-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/meal/new/meal-builder-form.tsx:234>) | onClick={() =&gt; removeMeal(m.id)} | GYMOS-MIG-052 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/plans/meal/new/meal-builder-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/meal/new/meal-builder-form.tsx:250>) | onChange={(e) =&gt; updateMeal(m.id, "calories", e.target.value)} | GYMOS-MIG-052 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/plans/meal/new/meal-builder-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/meal/new/meal-builder-form.tsx:261>) | onChange={(e) =&gt; updateMeal(m.id, "protein", e.target.value)} | GYMOS-MIG-052 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/plans/meal/new/meal-builder-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/meal/new/meal-builder-form.tsx:272>) | onChange={(e) =&gt; updateMeal(m.id, "carbs", e.target.value)} | GYMOS-MIG-052 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/plans/meal/new/meal-builder-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/meal/new/meal-builder-form.tsx:283>) | onChange={(e) =&gt; updateMeal(m.id, "fats", e.target.value)} | GYMOS-MIG-052 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/plans/workout/new/workout-builder-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/workout/new/workout-builder-form.tsx:116>) | &lt;form onSubmit={handleSubmit} className="space-y-6"&gt; | GYMOS-MIG-051 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/plans/workout/new/workout-builder-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/workout/new/workout-builder-form.tsx:124>) | onChange={(e) =&gt; setClientId(e.target.value)} | GYMOS-MIG-051 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/plans/workout/new/workout-builder-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/workout/new/workout-builder-form.tsx:144>) | onChange={(e) =&gt; setPlanName(e.target.value)} | GYMOS-MIG-051 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/plans/workout/new/workout-builder-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/workout/new/workout-builder-form.tsx:157>) | onChange={(e) =&gt; setDescription(e.target.value)} | GYMOS-MIG-051 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/plans/workout/new/workout-builder-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/workout/new/workout-builder-form.tsx:173>) | onClick={addExercise} | GYMOS-MIG-051 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/plans/workout/new/workout-builder-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/workout/new/workout-builder-form.tsx:193>) | onChange={(e) =&gt; updateExercise(ex.id, "name", e.target.value)} | GYMOS-MIG-051 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/plans/workout/new/workout-builder-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/workout/new/workout-builder-form.tsx:207>) | onChange={(e) =&gt; updateExercise(ex.id, "sets", e.target.value)} | GYMOS-MIG-051 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/plans/workout/new/workout-builder-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/workout/new/workout-builder-form.tsx:220>) | onChange={(e) =&gt; updateExercise(ex.id, "reps", e.target.value)} | GYMOS-MIG-051 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/plans/workout/new/workout-builder-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/workout/new/workout-builder-form.tsx:232>) | onChange={(e) =&gt; updateExercise(ex.id, "weight", e.target.value)} | GYMOS-MIG-051 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/plans/workout/new/workout-builder-form.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/plans/workout/new/workout-builder-form.tsx:241>) | onClick={() =&gt; removeExercise(ex.id)} | GYMOS-MIG-051 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/schedule/schedule-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/schedule-client.tsx:151>) | onClick={() =&gt; handleAccept(req.id)} | GYMOS-MIG-042, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/schedule/schedule-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/schedule-client.tsx:158>) | onClick={() =&gt; setDeclineTarget(req)} | GYMOS-MIG-042, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/schedule/schedule-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/schedule-client.tsx:196>) | onClick={() =&gt; handleComplete(activeSession.id)} | GYMOS-MIG-042, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/schedule/schedule-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/schedule-client.tsx:244>) | onClick={() =&gt; handleStart(s.id)} | GYMOS-MIG-042, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/schedule/schedule-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/schedule-client.tsx:251>) | onClick={() =&gt; handleNoShowAction(s.id)} | GYMOS-MIG-042, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/schedule/schedule-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/schedule-client.tsx:262>) | onClick={() =&gt; { | GYMOS-MIG-042, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/schedule/schedule-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/schedule-client.tsx:292>) | &lt;form onSubmit={handleSaveNotes} className="space-y-4"&gt; | GYMOS-MIG-042, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/schedule/schedule-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/schedule-client.tsx:295>) | onChange={(e) =&gt; setNotesText(e.target.value)} | GYMOS-MIG-042, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/schedule/schedule-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/schedule-client.tsx:305>) | onClick={() =&gt; setSelectedNotesSession(null)} | GYMOS-MIG-042, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/schedule/schedule-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/schedule-client.tsx:332>) | &lt;form onSubmit={handleDeclineSubmit} className="space-y-4"&gt; | GYMOS-MIG-042, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/schedule/schedule-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/schedule-client.tsx:335>) | onChange={(e) =&gt; setDeclineReason(e.target.value)} | GYMOS-MIG-042, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [app/(dashboard)/trainer/schedule/schedule-client.tsx](</Users/esanduepa/Desktop/Projects/gymos/app/(dashboard)/trainer/schedule/schedule-client.tsx:344>) | onClick={() =&gt; { | GYMOS-MIG-042, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [components/layout/NotificationBell.tsx](</Users/esanduepa/Desktop/Projects/gymos/components/layout/NotificationBell.tsx:47>) | onClick={() =&gt; setOpen(!open)} | GYMOS-MIG-012 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [components/layout/NotificationBell.tsx](</Users/esanduepa/Desktop/Projects/gymos/components/layout/NotificationBell.tsx:68>) | &lt;div className="fixed inset-0 z-40" onClick={() =&gt; setOpen(false)}&gt;&lt;/div&gt; | GYMOS-MIG-012 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [components/layout/NotificationBell.tsx](</Users/esanduepa/Desktop/Projects/gymos/components/layout/NotificationBell.tsx:74>) | onClick={handleMarkAllRead} | GYMOS-MIG-012 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [components/layout/NotificationBell.tsx](</Users/esanduepa/Desktop/Projects/gymos/components/layout/NotificationBell.tsx:89>) | onClick={() =&gt; handleNotificationClick(notif)} | GYMOS-MIG-012 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [components/layout/header.tsx](</Users/esanduepa/Desktop/Projects/gymos/components/layout/header.tsx:22>) | onClick={onMenuClick} | GYMOS-MIG-012 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [components/layout/sidebar.tsx](</Users/esanduepa/Desktop/Projects/gymos/components/layout/sidebar.tsx:90>) | onClick={onClose} | GYMOS-MIG-012 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [components/layout/sidebar.tsx](</Users/esanduepa/Desktop/Projects/gymos/components/layout/sidebar.tsx:124>) | onClick={onClose} | GYMOS-MIG-012 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [components/layout/sidebar.tsx](</Users/esanduepa/Desktop/Projects/gymos/components/layout/sidebar.tsx:147>) | onClick={onClose} | GYMOS-MIG-012 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [components/layout/sidebar.tsx](</Users/esanduepa/Desktop/Projects/gymos/components/layout/sidebar.tsx:168>) | onClick={() =&gt; signOut({ callbackUrl: "/login" })} | GYMOS-MIG-012 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [components/shared/confirm-dialog.tsx](</Users/esanduepa/Desktop/Projects/gymos/components/shared/confirm-dialog.tsx:47>) | onClick={onClose} | GYMOS-MIG-012 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [components/shared/confirm-dialog.tsx](</Users/esanduepa/Desktop/Projects/gymos/components/shared/confirm-dialog.tsx:55>) | onClick={onConfirm} | GYMOS-MIG-012 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [components/shared/data-table.tsx](</Users/esanduepa/Desktop/Projects/gymos/components/shared/data-table.tsx:117>) | onClick={() =&gt; setPage((p) =&gt; Math.max(1, p - 1))} | GYMOS-MIG-012 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [components/shared/data-table.tsx](</Users/esanduepa/Desktop/Projects/gymos/components/shared/data-table.tsx:129>) | onClick={() =&gt; setPage((p) =&gt; Math.min(totalPages, p + 1))} | GYMOS-MIG-012 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |
| [components/shared/temporary-password-notice.tsx](</Users/esanduepa/Desktop/Projects/gymos/components/shared/temporary-password-notice.tsx:71>) | onClick={copy} | GYMOS-MIG-012 | Adapt, correct error handling; defer payment/subscription handlers when present; local state stays local. |

## UI interaction groups

Each row preserves the source map semantics; approved §14.1 corrections and task scopes override obsolete mutation/mock behavior. These group counts overlap workflows/handlers and must not be added as distinct-click totals.

| ID | Source map row | Tasks / disposition |
|---|---|---|
| UI-I001 | \| R00 role entry \| Navigate `/` \| Redirect login or role home \| No custom loading/error \| `auth`, `redirect` \| | GYMOS-MIG-019; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I002 | \| A01 sign in \| Submit credentials \| Credentials sign-in; same-origin callback or proxy-driven role destination \| Required/email; Signing in disabled; invalid/inactive/rate/unexpected inline errors \| Auth.js `signIn` \| | GYMOS-MIG-016, GYMOS-MIG-019, GYMOS-MIG-020; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I003 | \| A02 change password \| Submit current/new/confirmation \| Validate; success panel; sign-out/relogin \| Required; ≥10, ≤200, number/symbol, no edge spaces, new≠old, confirmation; Saving disabled; inline errors \| `changePassword`, Auth.js `signOut` \| | GYMOS-MIG-017, GYMOS-MIG-020; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I004 | \| S01 gym select/row action \| Change/click \| Set/clear gym, refresh; selected row/Owner View update \| Select disabled; row buttons not disabled; no inline failure \| `setImpersonatedGym`, `getSuperAdminData` \| | GYMOS-MIG-021, GYMOS-MIG-022, GYMOS-MIG-023, GYMOS-MIG-024, GYMOS-MIG-025, GYMOS-MIG-026; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I005 | \| O01 refresh/chart \| Click /30s/hover \| Refresh server data; chart tooltip \| 500ms spinner only, empty session/chart states \| `getOwnerDashboardData`, router \| | GYMOS-MIG-058; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I006 | \| O02 roster controls \| Type/select/page/click \| Local name/email/phone+status filter; page; register/profile navigation \| Empty hint, page-end disabled; no sorting \| Direct page data, DataTable, Link \| | GYMOS-MIG-032; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I007 | \| O03 registration \| Submit/copy/continue \| Create→credential handoff→profile \| Pending; first validation error; one-time success; Copy feedback, copy error silent \| `createMember`, clipboard \| | GYMOS-MIG-031, GYMOS-MIG-035; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I008 | \| O04 status \| Open/confirm dialog \| Suspend/deactivate/reactivate \| Dialog loading; returned error ignored; closes \| `updateMemberStatus` \| | GYMOS-MIG-030, GYMOS-MIG-032, GYMOS-MIG-033, GYMOS-MIG-034; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I009 | \| O04 tabs \| Click \| Overview / last5 PT sessions / derived billing \| Empty session/pack copy; no progress view \| Local state + page data \| | GYMOS-MIG-030, GYMOS-MIG-032, GYMOS-MIG-033, GYMOS-MIG-034; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I010 | \| O04 pack \| Open/submit/cancel \| Issue pack and close \| Required numeric fields; action min1/nonnegative validation; pending/error \| `issueSessionPack` \| | GYMOS-MIG-030, GYMOS-MIG-032, GYMOS-MIG-033, GYMOS-MIG-034; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I011 | \| O04 desk payment \| Open/submit/cancel \| Record membership/add-on payment; close \| Required member/amount; positive validation; pending/error; no transaction list update visible \| `recordManualPayment` \| | GYMOS-MIG-030, GYMOS-MIG-032, GYMOS-MIG-033, GYMOS-MIG-034; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I012 | \| O04 receipt \| Click Download Receipt \| Browser text alert only \| **Mock**, no downloaded file \| `alert` \| | GYMOS-MIG-030, GYMOS-MIG-032, GYMOS-MIG-033, GYMOS-MIG-034; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I013 | \| O05 roster \| Type/page/click \| Local search, register/detail \| Empty roster; page ends disabled \| Direct page data, DataTable \| | GYMOS-MIG-037; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I014 | \| O06 create trainer \| Submit/copy/continue \| Create→one-time credentials→profile \| Required/email; pending/error; success notice \| `createTrainer`, clipboard \| | GYMOS-MIG-036; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I015 | \| O07 trainer status \| Confirm \| Toggle ACTIVE/DEACTIVATED \| Pending; error ignored; confirmation always destructive style \| `updateTrainerStatus` \| | GYMOS-MIG-037, GYMOS-MIG-038; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I016 | \| O07 shift form \| Edit/submit \| Update hours and show result \| Pending; failure text rendered with success color \| `approveShiftHours` \| | GYMOS-MIG-037, GYMOS-MIG-038; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I017 | \| O08 tabs/stat cards \| Click tab \| Daily/monthly switch; stats stay all-session \| Local state; stats not date-filtered \| Page data \| | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I018 | \| O08 daily filters \| Date/arrows/Today/search/select \| Date-filter and sort by time then name/trainer/status filters \| Empty day; client pagination25 \| Local state/DataTable \| | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I019 | \| O08 override \| Click Complete/No-Show, confirm \| Complete accepts SCHEDULED/ACTIVE; minimum duration applies only to ACTIVE. No-show action has no status/time/repeat guard \| Pending; returned error discarded. Pre-start completion and no-show eligibility/idempotency need functionality decisions \| `overrideSessionStatus`, `endSession`, `handleNoShow`; O08 source trace \| | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I020 | \| O08 daily export \| Click \| Download all currently filtered day rows \| No pending/error feedback \| Client data URI \| | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I021 | \| O08 monthly \| Month/search/More/close \| Pack totals + selected-month pending/scheduled list \| Empty search/list copy; overlay scroll; backdrop/X close \| Local state/DataTable \| | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I022 | \| O09 book \| Submit/back/cancel \| Eligible member+trainer booking→session overview \| Required fields; no-credit warning/disable; pending/action errors \| `bookSession` \| | GYMOS-MIG-041; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I023 | \| O10 all tabs \| Click \| Six distinct read panels; no URL tab persistence \| Local tab state; some empty panels only \| Six initial actions listed in O10 \| | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I024 | \| O10 expense \| Open/submit/close \| Save expense→close \| Required fields; positive amount action error; Saving disabled \| `createExpense` \| | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I025 | \| O10 budget \| Open/submit/close \| Submit required category/amount; omitted optional month defaults to current month \| Updating disabled submit; validation/action error panel; success closes; no month picker \| `setCategoryBudget` \| | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I026 | \| O10 payroll \| Native confirm close/approve \| Attempt current-period transition \| Conditional OPEN/CLOSED; disabled pending; errors ignored \| `closePayPeriod`, `approvePayPeriod` \| | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I027 | \| O10 downloads \| Click financial/payroll links \| Authenticated CSV attachment \| Browser download, no inline errors \| `GET /api/export/csv` \| | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I028 | \| O10 accounting \| Disabled button \| Coming Soon \| Disabled/opacity; no integration \| None \| | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I029 | \| O11 charts \| Hover \| Tooltip/legend series view \| No custom empty/error UI \| `getAnalyticsData`, Recharts \| | GYMOS-MIG-059; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I030 | \| O12 profile/plan/rates/policy \| Tab/toggle/submit \| Save form; display success/error; add-plan closes \| Shared loading; native/action validation; banners; no edit/delete plans \| Five config actions \| | GYMOS-MIG-015, GYMOS-MIG-027, GYMOS-MIG-028, GYMOS-MIG-029, GYMOS-MIG-030; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I031 | \| O12 expiry \| Click \| Run immediate expiry check \| No pending guard; count/error banner \| `checkMembershipExpiries` \| | GYMOS-MIG-015, GYMOS-MIG-027, GYMOS-MIG-028, GYMOS-MIG-029, GYMOS-MIG-030; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I032 | \| O13 filter/page \| Select/Previous/Next \| Server filter and pages20 \| Loading row; empty; ends disabled; no caught inline errors \| `getAuditLogs` \| | GYMOS-MIG-043, GYMOS-MIG-060, GYMOS-MIG-061; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I033 | \| O13 export \| Click \| Download currently loaded logs only \| No pending/error; manual data URI \| Browser CSV \| | GYMOS-MIG-043, GYMOS-MIG-060, GYMOS-MIG-061; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I034 | \| O14 billing/tier \| Click \| Alert for portal/support only \| Current plan disabled; **mock mutations** \| `getGymSubscription`, `alert` \| | GYMOS-MIG-062; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I035 | \| T00 entry \| Navigate \| Redirect schedule \| No standalone dashboard \| `redirect` \| | GYMOS-MIG-019; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I036 | \| T01 accept/decline \| Click/submit reason \| Confirm or decline member request \| Shared pending; native alert errors; optional reason modal \| `respondToSessionRequest` \| | GYMOS-MIG-042, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I037 | \| T01 start/no-show \| Click scheduled card \| Attempt state update; no-show has authorization checks but no status/time/already-noShow guard \| Pending; returned errors ignored; no no-show confirmation. Repeat-call effects are an untested functionality risk; see O08 \| `startSession`, `handleNoShow` \| | GYMOS-MIG-040, GYMOS-MIG-042, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I038 | \| T01 timer/complete \| Tick/click active banner \| Elapsed time and completion attempt \| Shared pending; ACTIVE-only minimum-time/error alert; no client time lock. Action additionally accepts SCHEDULED \| `endSession`, effect timer \| | GYMOS-MIG-042, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I039 | \| T01 notes \| Open/edit/submit/cancel \| Edit completed-session notes \| Required textarea; pending; returned error ignored, closes \| `updateSessionNotes` \| | GYMOS-MIG-042, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I040 | \| T02 search/page/profile \| Type/click \| Filter assigned clients and open360 \| Empty; page ends disabled \| Direct page data, DataTable \| | GYMOS-MIG-050; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I041 | \| T03 tabs/create links \| Click \| Four panels; builder query-prefill \| Empty plan/history states \| Local data/state/Link \| | GYMOS-MIG-050, GYMOS-MIG-051, GYMOS-MIG-052; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I042 | \| T04 exercises \| Add/delete/edit/submit \| Dynamic rows, validate, assign→client \| Native required + at-least-one; pending/action error \| `saveWorkoutPlan` \| | GYMOS-MIG-051; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I043 | \| T05 meals/macros \| Add/delete/edit/submit \| Dynamic entries and aggregate totals; assign→client \| Native required + at-least-one; pending/action error; no day picker \| `saveMealPlan` \| | GYMOS-MIG-052; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I044 | \| T06 pagination \| Click \| Page earnings records \| Empty; 25 rows; no filters/export \| Direct page data/DataTable \| | GYMOS-MIG-049, GYMOS-MIG-056; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I045 | \| M00 entry \| Navigate \| Redirect directory \| No standalone dashboard \| `redirect` \| | GYMOS-MIG-019; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I046 | \| M01 search/request \| Type/click \| Filter active trainer cards; open request route \| Empty directory \| Direct page data/Link \| | GYMOS-MIG-039; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I047 | \| M02 request \| Submit/cancel \| Pending request→My Sessions \| No credits disable; required/min date/min duration; pending/action errors \| `requestSession` \| | GYMOS-MIG-042; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I048 | \| M03 withdraw/cancel \| Open/confirm \| Withdraw pending or cancel scheduled, with different warning \| Pending; returned error ignored; closes \| `cancelSession` \| | GYMOS-MIG-044, GYMOS-MIG-047; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I049 | \| All D mobile navigation \| Menu/X/backdrop/Escape/link \| Drawer open/close, body lock, active nav \| Accessible labels/expanded; hidden visually when closed; focus/inert behavior needs verification \| DashboardChrome/Sidebar \| | GYMOS-MIG-012; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I050 | \| All D bell \| Open/mark one/all/row link \| Poll20s, count, last5, mark/read then navigate \| Empty; no pending/error display; backdrop dismiss \| Three notification actions \| | GYMOS-MIG-012; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I051 | \| All D sign-out \| Click \| Session logout→login \| No dedicated pending UI \| Auth.js `signOut` \| | GYMOS-MIG-012; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-I052 | \| X01/X02 \| Retry/return \| Reset error or navigate `/owner` \| Boundary display \| Next reset/Link \| | GYMOS-MIG-012, GYMOS-MIG-013, GYMOS-MIG-019; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |

## Local control groups

Each row preserves the source map semantics; approved §14.1 corrections and task scopes override obsolete mutation/mock behavior. These group counts overlap workflows/handlers and must not be added as distinct-click totals.

| ID | Source map row | Tasks / disposition |
|---|---|---|
| UI-LC001 | \| All L02 / sidebar links, brand, mobile drawer, backdrop/X/Escape \| Nav groups per role; path closes drawer, body scroll lock; Sign Out is W02. Header avatar/name is display only \| Local open/close; links use central normalized role+slug route builder; no “open drawer” action. Unavailable destination shows proper 403/404; selected gym context propagates \| | GYMOS-MIG-013, GYMOS-MIG-020, GYMOS-MIG-043; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-LC002 | \| S01 gym select and Owner View link \| Select control calls W05 (context mutation), View Dashboard sets context; Owner View separately navigates. Stop calls W05(null) \| Do not misclassify selection as local when it changes trusted support context; confirm success before navigation. Pure navigation itself has no command \| | GYMOS-MIG-021, GYMOS-MIG-022, GYMOS-MIG-023, GYMOS-MIG-024, GYMOS-MIG-025, GYMOS-MIG-026; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-LC003 | \| O02/O05/T02 table search; status filters where rendered; DataTable page Previous/Next \| Name/email searches (O02 also phone); default 25 rows, page clamp after filtering; profile row/link navigation. No generic column sorting implemented \| Client filtering only with demonstrably complete dataset; otherwise C09/C15/C30 GET with q/status/page. Always totals over full filter; no search Server Action \| | GYMOS-MIG-032, GYMOS-MIG-035, GYMOS-MIG-037, GYMOS-MIG-050, GYMOS-MIG-072, GYMOS-MIG-075; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-LC004 | \| O03/O06 handoff Copy, Continue/profile/back links \| TemporaryPasswordNotice copies to clipboard, Copied state2s, failure silent; secret held in component state \| Local clipboard action only, handle unavailable clipboard visibly; navigate only after handoff; clear secret. No copy API/analytics payload; one-time retrieval D03 \| | GYMOS-MIG-031, GYMOS-MIG-035, GYMOS-MIG-036; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-LC005 | \| O04 Overview/Attendance/Payments tabs; issue-pack/payment modal open/X/backdrop/cancel \| Attendance = last 5 PT sessions, not facility check-in. Billing rows synthesized from memberships/packs. Draft changes local; status/submit are W11/W14/W32 \| Tabs/local modal states; preserve input on API failure, close/reset on success/cancel by explicit UX choice. No tab command or fabricated billing ledger \| | GYMOS-MIG-030, GYMOS-MIG-032, GYMOS-MIG-033, GYMOS-MIG-034; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-LC006 | \| O07 shift input edits, banner/back links \| Inputs draft until Approve; status confirm cancel no-op \| Local edit/confirmation; W12/W13 only on confirmation/submit \| | GYMOS-MIG-037, GYMOS-MIG-038; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-LC007 | \| O08 Daily/Monthly switch \| Both datasets loaded by V1 owner sessions page; top stats are not automatically selected-day stats \| Local tab; V2 may lazy-read C20/C63, no mutation. API summaries state window to avoid partial-page totals \| | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-LC008 | \| O08 day arrows/Today, member/trainer q, trainer status chips, table pages \| Local selected date, search/filter; time sort; CSV separate section 8 \| C20 read on query changes if paged; preserve query in URL, debounce, reset page; no command \| | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-LC009 | \| O08 month arrows/This Month/member search/More→X/backdrop \| Month counts use selected scheduled month; pack totals are lifetime loaded data; member name/email search; More shows matching sessions \| Local month/overlay; C63 read for summary and paged session read C20 with member+month for More when unloaded. No fabricated all-time totals from a page \| | GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-LC010 | \| O09/M02 date/time/type/duration/note/select inputs, cancel/back \| Draft inputs; member/trainer context fetched separately. Required/empty/no-credit views; HTML limits complement server validation \| Local draft; C21/C36 reads can quote eligibility, command rechecks; no action for selecting a time. Success/error per W15/W16 \| | GYMOS-MIG-041, GYMOS-MIG-042, GYMOS-MIG-074; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-LC011 | \| O10 Revenue/Expenses/Deferred/Payroll/P&L/Export tabs; chart hovers \| All six V1 panels preloaded; chart tooltip/donut legend/local tabs; modal cancel no write \| Local tab; C45–C50 adapter reads may be lazy, each has loading/empty/error. No tab command; charts do not fetch privileged detail on hover without explicit contract \| | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-LC012 | \| O11 charts/legends/tooltips \| Three source series; no period/filter/save controls \| Local chart interactions; C56 read; no invented analytics commands \| | GYMOS-MIG-059; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-LC013 | \| O12 Profile/Plans/Session Fees/Pay Rates/Policy tabs; Add Plan toggle, form inputs \| Shared feedback clears on tab; inline form, not modal; checkbox/percentage/blank inputs are drafts \| Local tabs/toggle/draft; C39–C44/C40 on submit only. New appearance editor W37 separately scoped \| | GYMOS-MIG-004, GYMOS-MIG-015, GYMOS-MIG-027, GYMOS-MIG-028, GYMOS-MIG-029, GYMOS-MIG-030; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-LC014 | \| O14 current-plan/four-tier cards \| Current plan disabled; update-payment and switch-plan show browser alerts; four static prices/tiers not checkout offers \| **Mock/deferred:** preserve honest non-operational state or hide by scope decision; no fake billing command/API. C58 display only, D14 \| | GYMOS-MIG-062; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-LC015 | \| T01 live elapsed timer, decline modal reason, notes modal, card links \| Timer local from startedAt; required notes UI vs action gap; decline reason optional; cancel modal no effect \| Local clock/modal/draft; server determines min-duration and eligibility, never trust client elapsed time; W17/W23 submit \| | GYMOS-MIG-042, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-LC016 | \| T03 Overview/Workouts/Meal Plans/History tabs; builder links \| Last 2 workout/meal plans, last 10 related sessions; links prefill clientId. No member plan delivery UI \| Local tabs/navigation; C31 read explicitly capped or paged with hasMore. Prefill clientId not permission \| | GYMOS-MIG-050, GYMOS-MIG-051, GYMOS-MIG-052; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-LC017 | \| T04 workout Add Exercise/Remove/edit/client/title \| Starts 2 sample rows; sets/reps/weight; weight 0 may become undefined via truthy conversion; duration/notes typed in action but not editable UI \| Local array/draft; C32 explicit zero/null normalization, no separate row API before save \| | GYMOS-MIG-051; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-LC018 | \| T05 meal Add Meal/Remove/edit/type/client/title/live macro totals \| Starts 2 samples, day 1, six meal types from selector; kcal/protein/carbs/fats summed locally, no day picker \| Local rows/totals only; C33 validates authoritative payload; do not persist samples until explicit save; D12 defaults/day semantics \| | GYMOS-MIG-052; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-LC019 | \| T06 earnings pager; M01 name search/card Request link \| Earnings 25-row DataTable; directory active trainers name search, request context link \| C34/C35 GET if paged; directory search remains name-only unless changed deliberately; no command for filter/navigation \| | GYMOS-MIG-039, GYMOS-MIG-046, GYMOS-MIG-048, GYMOS-MIG-049, GYMOS-MIG-056, GYMOS-MIG-072, GYMOS-MIG-074, GYMOS-MIG-075; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-LC020 | \| M03 cancel/withdraw modal open/cancel; notes/cards \| Local confirm; source warning may deduct; returned deduction currently ignored \| W21 only on confirm; use API eligibility/cutoff/result to show actual charge. Terminal cards read-only \| | GYMOS-MIG-044, GYMOS-MIG-047; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-LC021 | \| Shared bell open/close/backdrop \| Local dropdown; selecting row marks W35 then optional link; Mark All W36; read poll section 8 \| Local dropdown, authorized command result and safe links; error/pending states, keep unread state until success \| | GYMOS-MIG-012; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |
| UI-LC022 | \| X01 reset, X02 return, X03 skeletons; form pending/errors; table empties \| Retry read/render, fixed owner return in V1; no feature mutation. Client disabled pending is not duplicate prevention \| Retry reads only; role/gym-correct return link, accessible error/loading/empty states; preserve safe drafts, no secret persistence \| | GYMOS-MIG-012, GYMOS-MIG-013, GYMOS-MIG-019; adapt/correct, local state/nav remains local; deferred billing/withdrawn expiry stay excluded. |

## Workflow responsibility register

All39 W IDs are mapped; some are V2/shared needs rather than V1 exports. Detailed original rows are source requirements, corrected by approved MVP scope.

### W01

Primary owning tasks: GYMOS-MIG-016, GYMOS-MIG-020. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID and route / trigger | V1 input, validation and source behavior | V2 boundary and result / refresh |
|---|---|---|
| W01 Sign in / A01 `/login` / Sign In | `app/(auth)/login/page.tsx:14`, `:50` → Auth.js H01→`lib/auth.ts:74`; required email/password, safe local callback. Normalize email, password verify,5/min IP+email memory limit, reject inactive members except null status and DEACTIVATED trainers. Returns Auth.js result/error; hard-nav callback or `/login`→proxy role destination; no audit/notification write | Thin login action→E01 **insufficient**; proposed E01 extension + C01 session context. Explicit bad/inactive/rate/forced-change feedback; refresh identity/context/all private views, clear previous identity state; D03/D04/D09 |


### W02

Primary owning tasks: GYMOS-MIG-020. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID and route / trigger | V1 input, validation and source behavior | V2 boundary and result / refresh |
|---|---|---|
| W02 Sign out / all D + optional A02 / sidebar Sign Out | `components/layout/sidebar.tsx:168`, password form`:41`, `:152`; Auth.js signOut→login; no feature action/audit | Existing V2 web `signOut`:delete cookie→login; no Nest call needed for cookie-only parity. Proposed C02 logout/revocation only if D04 requires it; clear caches/support/drafts and credential state |


### W03

Primary owning tasks: GYMOS-MIG-017, GYMOS-MIG-020. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID and route / trigger | V1 input, validation and source behavior | V2 boundary and result / refresh |
|---|---|---|
| W03 Change password / A02 `/change-password` / Update | `actions/account.ts:8`, `:30`, `lib/passwords.ts:34`:signed-in self; current required/verify, new 10–200 with nonletters and no edge spaces, confirm match, new≠current. Writes hash and mustChangePassword=false; `{success:true}` or first validation/current/account/write error; UI success→signOut after1600ms. No audit/notification/feature path invalidation | Thin action→C03 **proposed**; session-restricted endpoint; force-change flag enforced for commands as well as navigation; `{requiresRelogin:true}`; clear old session/private data. Current E01 provides no flag |


### W04

Primary owning tasks: GYMOS-MIG-019. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID and route / trigger | V1 input, validation and source behavior | V2 boundary and result / refresh |
|---|---|---|
| W04 Select normal gym/role / R00 `/`, T00 `/trainer`, M00 `/member`, proposed V2 chooser / entry | `app/page.tsx:4`, trainer/member home`:3`, `proxy.ts:39`:V1 owns one role/gym, redirects. Root no user→login, A→admin/O→owner/T→trainer/M→member; trainer→schedule/member→directory. Proxy blocks wrong role; temporary-password branch precedes dashboard routing. No business writes | SSR adapter→C01/E06; selection stored only after API-access validation; same-origin return-to plus role/slug builder. If multiple accessible gyms choose explicitly; if one select it; zero shows no access. This chooser/destination logic is **proposed**, not an existing API workflow (D03/D09). Clear old-gym query state; full shell reread |


### W05

Primary owning tasks: GYMOS-MIG-024. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID and route / trigger | V1 input, validation and source behavior | V2 boundary and result / refresh |
|---|---|---|
| W05 Support view / S01 `/admin` / select gym, View Dashboard, Stop | `actions/admin.ts:50`:A only; gymId or null; ensure gym exists; set/delete HttpOnly superAdminGymId cookie; `{success:true}` or throws Unauthorized/Gym not found. Revalidates `/admin`; client refresh; View Dashboard changes context only, Owner View link separately navigates. No audit/notification | Thin action→C04 **proposed** support start/end; API validates A + permitted gym + scope, records original actor/effective gym/reason; opaque support context server-side; response explicit access/destination/expiry; reread admin and selected gym shell, clear previous tenant caches. D05 governs permission/expiry |


### W06

Primary owning tasks: GYMOS-MIG-021, GYMOS-MIG-022, GYMOS-MIG-023, GYMOS-MIG-024. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID and route / trigger | V1 input, validation and source behavior | V2 boundary and result / refresh |
|---|---|---|
| W06 Create gym / V2 S01-equivalent `/admin` / Create gym | No V1 control; current V2 E03 input/validation and provisioning/result as section 3; owner password supplied by admin, not generated one-time member credential. Existing web success says owner can sign in. No source audit/notification hooks | Thin existing action→E03 **existing**; provisioning retry/recovery/idempotency improvements are **proposed** (D13). Refresh E02/admin list; select/access data only after successful provisioning. This is V2 foundation functionality, not fabricated V1 parity |


### W07

Primary owning tasks: GYMOS-MIG-027. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID / triggering control | V1 input and validation / source | State and side effects explicitly called | V1 result and UI handling / proposed contract |
|---|---|---|---|
| W07 / O12 Profile→Save Changes | `updateGymProfile`, `actions/gym-config.ts:23`; name nonempty, optional address/phone/email (email valid), payPeriod WEEKLY/MONTHLY default MONTHLY | Update gym fields; audit GYM_CONFIG_UPDATED after write; no financial/notification/credential effects | `{success:true}` or auth/validation/Failed to save gym profile settings; shared banner. C39; name changes also refresh shell/platform registry; pay-period setting alone does not rebuild payroll |


### W08

Primary owning tasks: GYMOS-MIG-028. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID, route and trigger | V1 inputs/validation, role/gym/relationship | Transition and side-effect calls | V1 success/error and UI handling | V2 command/refresh |
|---|---|---|---|---|
| W08 Create gym membership plan / O12 `/owner/gym-config`, Plans→Add→Create | `actions/gym-config.ts:63`, `:70`; O+G; `{name nonempty,description?,price>=0,durationDays>=1}` numeric coerce; integer not explicitly required | Creates MembershipPlan in gym; audit GYM_CONFIG_UPDATED affected plan.id; no credential/pack/revenue/pay/notification | `{success:true}` or auth/first validation/Failed to create membership plan; client success banner and hide form | C40 proposed; refresh config/plans/O03 picker. Existing form is inline, not modal |


### W09

Primary owning tasks: GYMOS-MIG-031. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID, route and trigger | V1 inputs/validation, role/gym/relationship | Transition and side-effect calls | V1 success/error and UI handling | V2 command/refresh |
|---|---|---|---|---|
| W09 Full member registration / O03 `/owner/members/new`, Complete Registration | `actions/members.ts:11`, `:21`; O+G; fullName nonempty, valid email, phone nonempty,DOB nonempty string, planId required, optional emergencyContact/healthNotes. Global duplicate user email check; same-gym plan required. Date validity/age not explicitly checked | Generate 12-char temp password, bcrypt hash, create user GYM_MEMBER ACTIVE + mustChangePassword + nested ACTIVE membership starting now/end by plan days; create MEMBERSHIP revenue at plan.price; audit MEMBER_CREATED. Not enclosed in one transaction; no notification/email delivery | `{success:true,memberId:user.id,temporaryPassword}`; duplicate/invalid plan/first validation/auth or generic failure. UI keeps one-time handoff, no immediate redirect; Copy→continue profile. Writes/audit failure may leave a created account despite error (inference) | C12 proposed, E08 insufficient; identity+tenant-member/access linkage D03; credential recovery/repeat policy. Refresh members/profile/plans usage/financials/dashboard/analytics/audit/platform counts; never refresh plaintext into profile |


### W10

Primary owning tasks: GYMOS-MIG-036. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID, route and trigger | V1 inputs/validation, role/gym/relationship | Transition and side-effect calls | V1 success/error and UI handling | V2 command/refresh |
|---|---|---|---|---|
| W10 Trainer registration / O06 `/owner/trainers/new`, Create Account | `actions/trainers.ts:11`, `:23`; O+G; name/email/phone, level enum LEVEL_1/LEVEL_2, specs comma string?,coerced years?,shift strings?,bio?; global user-email duplicate; no shift format/range or years minimum validation | Generate temp/hash, create trainer ACTIVE/mustChangePassword; specs split/trim, shifts default 08:00/17:00; audit TRAINER_CREATED; no pay/revenue/notification/email | `{success:true,trainerId,temporaryPassword}` or auth/validation/duplicate/generic failure; one-time handoff→profile. Separate audit after create has partial-failure risk | C13 proposed; refresh trainers/profile/directory/booking options/analytics/audit/identity mappings. D03 credential linkage |


### W11

Primary owning tasks: GYMOS-MIG-033. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID / triggering control | V1 input and validation / source | State and side effects explicitly called | V1 result and UI handling / proposed contract |
|---|---|---|---|
| W11 / O04 Suspend/Reactivate→Confirm | `updateMemberStatus`, `actions/members.ts:116`; memberId+typed MemberStatus, no runtime enum validation; target must be same-gym GYM_MEMBER | Update user status then **all non-EXPIRED memberships** to status, separate writes; audit MEMBER_SUSPENDED for SUSPENDED else MEMBER_UPDATED; no balance/pay/revenue/notification. Does not revoke existing JWT here | `{success:true}` or auth/not at gym/Failed to update member status. V1 UI closes without showing returned error. C14; explicitly validate ACTIVE/SUSPENDED UI choices, version and access/session consequences D04/D06 |


### W12

Primary owning tasks: GYMOS-MIG-038. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID / triggering control | V1 input and validation / source | State and side effects explicitly called | V1 result and UI handling / proposed contract |
|---|---|---|---|
| W12 / O07 Deactivate/Reactivate→Confirm | `updateTrainerStatus`, `actions/trainers.ts:92`; trainerId+typed ACTIVE/DEACTIVATED, no runtime enum; same-gym trainer required | Update trainerStatus; audit TRAINER_DEACTIVATED or TRAINER_UPDATED; no session cancellation/pay/notification/revocation | Success or auth/not at gym/Failed to update trainer status; V1 closes without returned-error feedback. C17; active-session/booking/login treatment D04/D06 |


### W13

Primary owning tasks: GYMOS-MIG-037. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID / triggering control | V1 input and validation / source | State and side effects explicitly called | V1 result and UI handling / proposed contract |
|---|---|---|---|
| W13 / O07 Approved Shift Hours→Approve | `approveShiftHours`, `actions/trainers.ts:123`; same-gym trainer; shiftStart/shiftEnd strings, no format/range/overnight validation | Update shifts; audit TRAINER_UPDATED; no approval object or notification. Existing session shiftStatus is not recomputed here | Success or auth/not at gym/Failed to approve shift hours; success state, returned error not rendered. C18; gym-zone HH:mm plus overnight policy D08 |


### W14

Primary owning tasks: GYMOS-MIG-034. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID, route and trigger | V1 inputs/validation, role/gym/relationship | Transition and side-effect calls | V1 success/error and UI handling | V2 command/refresh |
|---|---|---|---|---|
| W14 Issue pack / O04 `/owner/members/:id`, Issue New Pack→Confirm | `actions/packs.ts:10`, `:17`; O+G + target same-gym member; `{userId,totalSessions>=1,price>=0,durationDays numeric default90}`; integer/positive days not explicitly required. UI defaults 10/$450/90 | Creates ACTIVE pack with remaining=total, expiry=now+days; audit MEMBER_UPDATED affected pack.id. **No upfront revenueRecord, pay, notification** in action. Deferred read derives value from pack data | `{success:true,packId}` or first validation/member-scope/auth/Failed to issue session pack; pending, inline error, success closes | C19 proposed; full pack balance/expiry/price selection rules D06/D10; refresh profiles/options/self credits/monthly/client lists/finance deferred/dashboard alerts/audit |


### W15

Primary owning tasks: GYMOS-MIG-041. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID, route and trigger | V1 inputs/validation and authorization | State and side effects | V1 result / UI states | V2 contract |
|---|---|---|---|---|
| W15 Staff booking / O09 `/owner/sessions/book`, Confirm & Book | `actions/sessions.ts:170`, `:182`; O+G; clientId/trainerId/date/time required strings, type enum IN_PERSON/VIRTUAL/INTRODUCTORY,duration coerced(default 60),notes?. Lookup same-gym member/trainer role; action does **not** require ACTIVE trainer though picker does; active positive pack earliest expiry required, no explicit pack expiry>now/member ACTIVE/date future/duration>0 check | Check trainer SCHEDULED/ACTIVE interval collision; strict `<` overlap means touching endpoints allowed. Create SCHEDULED, compute shift via time strings, snapshot fee from pack price/count first then intro/level 2/default rates. No credit reservation/deduction, revenue/pay/notification. Audit SESSION_CREATED | `{success:true,sessionId}` or scope/no credit/collision/first validation/generic failure; UI error/pending then→O08. Pre-create lookup/pricing errors may throw outside try | C22 proposed; eligibility/date/duration/booking-credit decisions D01/D06/D08; refresh session group, relationship/client options and audit |


### W16

Primary owning tasks: GYMOS-MIG-042. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID, route and trigger | V1 inputs/validation and authorization | State and side effects | V1 result / UI states | V2 contract |
|---|---|---|---|---|
| W16 Member request / M02 `/member/trainers/:id/book`, Send Request | `actions/sessions.ts:268`, `:280`; M+G; actor clientId from auth (not form); trainer/date/time/type/duration/notes as above; active same-gym trainer required; past timestamp rejected; earliest ACTIVE positive pack; same-client+trainer overlap blocks pending/scheduled/active; confirmed trainer collision check. UI-only duration min 20 step 5 | Create PENDING_CONFIRMATION with snapshot fee/shift; no credit reservation, revenue or pay. Notification trainer HIRE_REQUEST (link `/trainer/schedule`); audit SESSION_CREATED | `{success:true,sessionId}` / past/no credit/duplicate/collision/scope/auth/validation/generic error; pending/error/no-credit disable, success→M03. Notify/audit outside create can fail after creation (inference) | C23 proposed; self identity→member mapping required; request≠confirmed relationship; refresh owner/trainer/member sessions, trainer bell, audit; D06 reservation/concurrency |


### W17

Primary owning tasks: GYMOS-MIG-042. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID, route and trigger | V1 inputs/validation and authorization | State and side effects | V1 result / UI states | V2 contract |
|---|---|---|---|---|
| W17 Accept / T01 `/trainer/schedule`, Accept | `actions/sessions.ts:382`; signed-in PERSONAL_TRAINER only, addressed trainerId=self, existing PENDING only; sessionId + decision. No explicit current gym check in branch. Runtime payload decision not Zod-validated: only exact DECLINE takes decline branch; other values enter accept branch | Collision recheck inside transaction then update SCHEDULED; initial status read outside transaction, update predicate only id. No credit/pay/revenue. Notify member SESSION_BOOKED; audit HIRE_REQUEST_ACCEPTED outside transaction | `{success:true}` / Unauthorized/not addressed/not pending/conflict/generic failure. UI alert error; shared pending. No balance/active-trainer/future-time recheck on acceptance | C24 proposed strict decision enum +G+assigned trainer +version; atomic transition/overlap behavior contract D06; refresh sessions/relationship clients/pickers/member bell/audit |

| Workflow / UI ID, route and trigger | V1 inputs/validation and authorization | State and side effects | V1 result / UI states | V2 contract |
|---|---|---|---|---|
| W17 Decline / T01, Decline→optional reason→Confirm | Same action/actor/pending guard; optional reason string appended to shared notes (`Declined: …`) | Update DECLINED; no credit/revenue/pay; notify member SESSION_DECLINED; audit HIRE_REQUEST_DECLINED. Update/notify/audit separate calls | `{success:true}` / guards/generic failure; reason optional, alert error keeps modal, success closes/clears. Reason may be visible in member notes | C24 proposed; strict validation/length, who sees shared reason; refresh sessions/member bell/audit; declining pending alone does not remove access supported by other confirmed/active/completed sessions |


### W18

Primary owning tasks: GYMOS-MIG-045. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID, route and trigger | V1 guards/validation | State/effects attempted by source | V1 result and UI consequence | V2 contract / refresh |
|---|---|---|---|---|
| W18 Start / T01, SCHEDULED Start Session | `actions/sessions.ts:484`:sign-in, record, session trainer or same-gym owner/support actor; status SCHEDULED only; no scheduled-time or already-active-other-session check | ACTIVE, startedAt=now. No credit/revenue/pay/audit/notification calls | `{success:true}` / Unauthorized/not found/not actor/invalid status/Failed to start session. UI discards returned error; shared pending | C25 proposed; version/state/time eligibility; refresh sessions/dashboard/floor status. API actor may owner but no V1 owner Start control |


### W19

Primary owning tasks: GYMOS-MIG-046. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID, route and trigger | V1 guards/validation | State/effects attempted by source | V1 result and UI consequence | V2 contract / refresh |
|---|---|---|---|---|
| W19 Complete / T01 ACTIVE banner; O08 SCHEDULED/ACTIVE Mark Complete→confirm | `actions/sessions.ts:515`:same actor roles; accepts **SCHEDULED or ACTIVE**. Minimum duration checks only ACTIVE; elapsed rounded mins from startedAt, fallback now−30 min if absent; minDuration `\|\|20`. No future scheduledAt/start prerequisite for SCHEDULED | Transaction sets COMPLETED/endedAt, consumes available pack credit if found, creates PT_SESSION revenue even if no pack, computes trainer pay using **current gym pay rates/current trainer level at completion** plus stored shiftStatus, finds/creates OPEN pay period, creates payRecord. Audit SESSION_OVERRIDDEN after transaction; no notification. Fee snapshotted at booking, pay percentages not snapshotted at start here | `{success:true}` / guard/min-duration/Failed to complete PT session. T alerts error; owner discards error/closes confirm. Sequential completed call hits status guard; concurrent pre-read calls lack conditional status/version update inside transaction—risk, not tested duplicate outcome | C26 proposed; **pre-start completion remains Open D01**, missing start/zero-credit/rounding D06/D08/D10; explicit outcome/money/pay summary/version; refresh sessions/balances/earnings/finance/audit/dashboard/client profiles |


### W20

Primary owning tasks: GYMOS-MIG-047. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID, route and trigger | V1 guards/validation | State/effects attempted by source | V1 result and UI consequence | V2 contract / refresh |
|---|---|---|---|---|
| W20 No-show / T01 SCHEDULED No-Show; O08 SCHEDULED/ACTIVE No-Show→confirm | `actions/sessions.ts:623`:sign-in, existing record, assigned trainer or same-gym owner/support. **No status/time/already-noShow guard** | Every authorized invocation enters transaction setting MISSED/noShow=true then consumePackCredit; available positive ACTIVE pack decremented if found; PT_SESSION revenue attempted even without pack. No pay creation or previous-pay reversal. Audit SESSION_CANCELLED after transaction; no notification | `{success:true}` / actor/not found/auth/Failed to log no-show. Both UI paths discard returned error. Already-MISSED repeat has no early-return/dedupe in these functions; potential repeated effects, not runtime-verified | C27 proposed; **eligibility/timing/repeat/idempotency Open D02**. Do not infer safety from hidden button. Refresh all balance/financial/session/audit scopes; no new earnings without pay effect, but prior-pay consistency must be resolved |


### W21

Primary owning tasks: GYMOS-MIG-047. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID, route and trigger | V1 guards/validation | State/effects attempted by source | V1 result and UI consequence | V2 contract / refresh |
|---|---|---|---|---|
| W21 Withdraw / M03 pending Withdraw Request→confirm | `actions/sessions.ts:673`:sign-in, record+gym; self member, assigned trainer or same-gym owner/support; PENDING_CONFIRMATION or SCHEDULED only. Optional reason; current member UI passes none | Pending→CANCELLED, no credit/revenue/pay. Optional reason appended to notes. Audit SESSION_CANCELLED after transaction; no notification | `{success:true,isLateCancel:false}` / guard/Failed to cancel session. UI pending confirm then closes, error ignored | C28 proposed; separate response `{deductedCredits:0}`; refresh sessions/client relationship/audit; cancellation notifications only if D18 approves |

| Workflow / UI ID, route and trigger | V1 guards/validation | State/effects attempted by source | V1 result and UI consequence | V2 contract / refresh |
|---|---|---|---|---|
| W21 Confirmed cancellation / M03 SCHEDULED Cancel→confirm | Same actor/status guard. isLateCancel = confirmed and hoursUntilSession < (gym.cancellationWindowHours **or 24**); noShowDeduction/lateCancelDeduction toggle not consulted; zero window falls back 24 | SCHEDULED→CANCELLED; if late, consume credit+revenue transaction, else none; **no trainer pay**; audit SESSION_CANCELLED; no notification. Time in past is late by formula | `{success:true,isLateCancel}` / guard/generic. Sequential repeated CANCELLED rejects, concurrent calls read outside transaction; risk remains. UI warns may deduct but does not show actual returned deduction | C28 proposed; API quote/confirmed consequences or explicit policy result; D02/D06/D08; refresh sessions/credits/finance/audit/relationships and user feedback |


### W22

Primary owning tasks: GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID, route and trigger | V1 guards/validation | State/effects attempted by source | V1 result and UI consequence | V2 contract / refresh |
|---|---|---|---|---|
| W22 Owner override / O08 Mark Complete/No-Show confirmation | `actions/sessions.ts:739`:same-gym owner/support, sessionId + typed SessionStatus but no runtime enum/schema/transition matrix | COMPLETED delegates W19; MISSED W20; CANCELLED W21 (not exposed by daily UI). Any other supplied status directly updates with id, no start/end/billing effects; no additional audit in fallback | Delegate result or `{success:true}` / Unauthorized owner override/not found/generic. Owner UI closes ignoring errors; only complete/no-show visible | No generic arbitrary-status API proposed. Thin web action chooses C26/C27 (C28 only if authorized UI later); unexpected status rejected. Preserve rendered controls, not unexposed unsafe fallback |


### W23

Primary owning tasks: GYMOS-MIG-045. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID, route and trigger | V1 guards/validation | State/effects attempted by source | V1 result and UI consequence | V2 contract / refresh |
|---|---|---|---|---|
| W23 Session notes / T01 completed Add/Edit Notes→Save | `actions/sessions.ts:770`:sign-in, record, trainer/owner actor; `{sessionId,notes}`; **no action status or text validation**, UI requires textarea and exposes only COMPLETED | Updates shared notes only; no financial/audit/notification calls; member session cards render same notes | `{success:true}` / auth/scope/Failed to update session notes. UI closes and discards error | C29 proposed; assigned trainer +G, allowed edit statuses/text length/privacy D12; result retains input on failure; refresh trainer/member session cards and T03/O04 histories |


### W24

Primary owning tasks: GYMOS-MIG-051. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID / triggering control | V1 input and validation / source | State and side effects explicitly called | V1 result and UI handling / proposed contract |
|---|---|---|---|
| W24 / T04 Save Workout Plan | `saveWorkoutPlan`, `actions/plans.ts:23`; T-only, resolveClient via T-rel. Typed `{clientId,name,description?,exercises:[{name,sets,reps?,weight?,duration?,notes?}]}` without runtime schema. UI requires client/title/≥1 row and required exercise fields; numeric conversion is not authoritative validation | Nested workout+exercises create; trainerId derived; audit PLAN_ASSIGNED after create; no notification, credits, revenue or pay. No edit/delete path | `{success:true,planId}` or unauthorized/unassigned/generic; UI keeps error or navigates client profile. C32; proposed bounded rows/text/numbers, relationship recheck, D12 |


### W25

Primary owning tasks: GYMOS-MIG-052. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID / triggering control | V1 input and validation / source | State and side effects explicitly called | V1 result and UI handling / proposed contract |
|---|---|---|---|
| W25 / T05 Save Meal Plan | `saveMealPlan`, same`:78`; T-rel; typed `{clientId,name,entries:[{dayOfWeek,mealType,foodItem,calories?,protein?,carbs?,fats?}]}` without runtime schema. UI client/title/≥1 entry; dayOfWeek=1 for rows, no day selector | Nested meal+entries create; audit PLAN_ASSIGNED; no notification/credits/revenue/pay. No edit/delete | Success+planId or auth/unassigned/Failed to save meal plan; navigate profile only on success. C33; validate meal enum/day/nutrients, D12 |


### W26

Primary owning tasks: GYMOS-MIG-030. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID / triggering control | V1 input and validation / source | State and side effects explicitly called | V1 result and UI handling / proposed contract |
|---|---|---|---|
| W26 / O12 Check Expiries | `checkMembershipExpiries`, `actions/members.ts:155`; no form inputs; O+G. Find ACTIVE memberships with endDate<now, not expired packs | Loop membership EXPIRED, user EXPIRED, audit MEMBER_UPDATED separately; no outer transaction, no catch, no notification or financial effect. Count is memberships processed, not distinct members. An older expired membership can mark user expired despite another current membership; risk from query | `{success:true,count}` or authorization error/throw mid-loop; UI shows count, returned auth error not presented. C44; explicit asOf, unique-member summary/partial failure policy; D06. Never run on live data to inspect behavior |


### W27

Primary owning tasks: GYMOS-MIG-029. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID / triggering control | V1 input and validation / source | State and side effects explicitly called | V1 result and UI handling / proposed contract |
|---|---|---|---|
| W27 / O12 Session Fees→Save | `updateSessionRates`, `actions/gym-config.ts:149`–`:191`; default>=0, optional overrides numeric>=0 or blank. **Verified source + EV01:** the form helper normalizes blank/whitespace/absent values to an empty string; installed Zod 3.25.76 takes the first `z.coerce.number().min(0)` union branch and returns **0**, not the literal blank | Source passes **0** for both blank optional overrides to `prisma.gym.update`; its clear-to-null condition is false for parsed 0. Thus a successful V1 save sets a zero override rather than clearing it. Audit PAY_RATES_UPDATED; existing booked fees/sold pack prices untouched; no revenue/pay/notification. Actual persistence was not exercised | Success or validation/auth/Failed to update PT session rates. **Intended V2 behavior change C41:** web action maps a blank optional field to explicit null so it uses the standard-rate fallback; intentional numeric 0 stays zero. This corrects V1 behavior, not a parity assertion; EV01/AT06 |


### W28

Primary owning tasks: GYMOS-MIG-029. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID / triggering control | V1 input and validation / source | State and side effects explicitly called | V1 result and UI handling / proposed contract |
|---|---|---|---|
| W28 / O12 Pay Rates→Save | `updateTrainerPayRates`, same`:111`; parseFloat three percentages/100; only NaN rejected (no server bounds) | Update level1BaseRate/level2BaseRate/offShiftPremium; audit PAY_RATES_UPDATED; no record repricing in this action, but W19 subsequently reads current rates | Success or Invalid rate percentages/auth/Failed to update pay rates. C42:explicit fractions/bounds and snapshot policy D10; refresh future pay previews/config, not silently historical pay |


### W29

Primary owning tasks: GYMOS-MIG-029. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID / triggering control | V1 input and validation / source | State and side effects explicitly called | V1 result and UI handling / proposed contract |
|---|---|---|---|
| W29 / O12 Policy→Save | `updateCancellationPolicy`, same`:213`; parseInt window/min duration, NaN→24/20; checkbox on/true booleans. No nonnegative/server bound | Update cancellationWindowHours,minSessionDuration,noShowDeduction,lateCancelDeduction; audit POLICY_UPDATED. W19/W21 use `\|\|` defaults; W20/W21 do **not** consult deduction toggles | Success or auth/Failed to update cancellation policy. C43 validates bounds/zero explicitly; D01/D02/D08 settle enforcement. UI must display actual API policy rather than promise ineffective toggles |


### W30

Primary owning tasks: GYMOS-MIG-054. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID / triggering control | V1 input and validation / source | State and side effects explicitly called | V1 result and UI handling / proposed contract |
|---|---|---|---|
| W30 / O10 Log Expense→Save | `createExpense`, `actions/financials.ts:125`; amount coerce>0, category enum, optional description, date nonempty string, isRecurring literal true; auth throws before try | Create ExpenseRecord; recurring flag is metadata only; **no explicit audit/notification/pay/credential calls** | Success or first schema/generic Failed to log expense; dialog closes on success, inline error otherwise. C51; valid gym-local date and Money; no recurring scheduler promised |


### W31

Primary owning tasks: GYMOS-MIG-055. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID / triggering control | V1 input and validation / source | State and side effects explicitly called | V1 result and UI handling / proposed contract |
|---|---|---|---|
| W31 / O10 Set Budget→Save | `setCategoryBudget`, same`:183`; **required category selector and amount already exist** in `financial-modals.tsx`; category enum, amount>=0; optional month. Form has no month picker; omitted month defaults first day current server month | Upsert gym+category+month amount; no explicit audit/notification or ledger write | Success or first schema/Failed to update category budget. Dialog pending/error/close-on-success. C52 retains current-month default (gym zone proposed), accepts explicit YYYY-MM for future UI; no missing-category defect |


### W32

Primary owning tasks: GYMOS-MIG-062. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID / triggering control | V1 input and validation / source | State and side effects explicitly called | V1 result and UI handling / proposed contract |
|---|---|---|---|
| W32 / O04 Payments→Record Desk Payment→Save | `recordManualPayment`, same`:538`; same-gym member, MEMBERSHIP/ADD_ON enum, amount>0, optional description | Create revenueRecord category/amount/description; member attribution only in description, not linked membership renewal/pack issue. No new entitlement/credential/audit/notification | Success or schema/member/auth/Failed to record payment; dialog inline error/success close. C53; member-linked receipt/renewal semantics D10/D15. Profile Payments rows are not a ledger read |


### W33

Primary owning tasks: GYMOS-MIG-056. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID / triggering control | V1 input and validation / source | State and side effects explicitly called | V1 result and UI handling / proposed contract |
|---|---|---|---|
| W33 / O10 Payroll OPEN→Close→native confirm | `closePayPeriod`, same`:404`; periodId scoped gym; no current-status/version guard | Set CLOSED unconditionally; no payout, record freeze, audit or notification calls | Success or Failed to close pay period; UI ignores returned error. C54; OPEN-only transition and once-only outcome proposed, D11 |


### W34

Primary owning tasks: GYMOS-MIG-056. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID / triggering control | V1 input and validation / source | State and side effects explicitly called | V1 result and UI handling / proposed contract |
|---|---|---|---|
| W34 / O10 Payroll CLOSED→Approve→native confirm | `approvePayPeriod`, same`:420`; gym period, no current-status/version guard | Set APPROVED unconditionally; no bank transfer/payout integration/audit/notification | Success or Failed to approve pay period; UI ignores error. C55; CLOSED-only proposed, approving is not paying, D11 |


### W35

Primary owning tasks: GYMOS-MIG-043. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID / triggering control | V1 input and validation / source | State and side effects explicitly called | V1 result and UI handling / proposed contract |
|---|---|---|---|
| W35 / all dashboard bell / select notification | `markNotificationAsRead`, `actions/notifications.ts:27`; id and current user; silent return if unauthenticated; updateMany id+userId, no affected-count feedback | Set isRead=true; no audit/financial/notification creation; then UI reloads bell and follows link if any | void; no explicit rejection result. C60; authorized recipient + context, safe deep link; idempotent already-read outcome; do not leak another recipient's existence |


### W36

Primary owning tasks: GYMOS-MIG-043. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID / triggering control | V1 input and validation / source | State and side effects explicitly called | V1 result and UI handling / proposed contract |
|---|---|---|---|
| W36 / all dashboard bell / Mark all as read | `markAllNotificationsAsRead`, same`:39`; current user; silent if unauthenticated; all own unread across gyms (no explicit gym predicate) | updateMany isRead=true; no audit/other effects; UI rereads | void. C61 returns changed/unread counts/asOf for declared scope; gym-vs-global scope D18 |


### W37

Primary owning tasks: GYMOS-MIG-015. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID and route / trigger | V1 input, validation and source behavior | V2 boundary and result / refresh |
|---|---|---|
| W37 Appearance / new V2 settings requirement / Save branding | No V1 theme editor; current E04/E05 primary/logo only; no current web editor. No V1 transition/effect to copy | Thin action→E05 **insufficient** expanded C05 proposal; owner +G (support if approved); theme/version result; refresh all gym shell/theme views and public theme read, not every unrelated operational query. D07/D08/D20 |


### W38

Primary owning tasks: GYMOS-MIG-016, GYMOS-MIG-020. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID and route / trigger | V1 input, validation and source behavior | V2 boundary and result / refresh |
|---|---|---|
| W38 Session expiry / every protected read/command / expired credential | V1 `lib/auth.ts:28`, `:31`:12h JWT, account recheck after5min on auth callback; proxy reads JWT and role/mustChange flag, not same account DB check. V2 bearer verifies15min signature/issuer/audience; no refresh endpoint. Missing cookie/login response paths in current web | SSR read returns authenticated expired state; mutating web action preserves nonsecret form inputs and offers login; never auto-retry a command with unknown commit. C01 **proposed**, C02 per D04; optional renewal **proposed only**. No passwords/tokens in return URL |


### W39

Primary owning tasks: GYMOS-MIG-032. Source-observed behavior below is corrected by approved §14.1 and owning task; W26 becomes read/refresh and W32 is deferred.

| Workflow / UI ID and route / trigger | V1 input, validation and source behavior | V2 boundary and result / refresh |
|---|---|---|
| W39 Basic V2 member record / current `/gyms/:slug` / Add member | No standalone V1 equivalent: E08 accepts name/optional email, creates tenant record, returns basic row; web redirects and E07 rereads. No credential, membership or pack effects | Preserve thin action→E08 **existing**, never call it complete registration. Register/link later via C12 after D03; distinguish duplicate email from already-linked identity; refresh basic list only plus new full list once supported |

## Page-data read dependency register

Every29 page-route read and direct Prisma loader is covered here in addition to the route dossiers. Finance has six dependencies, not a single generic read. Source-observed query limits/side effects below are not target defaults; tasks replace them with typed authorized pure reads and honest labels.
| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-R00 / R00 `/` | `app/page.tsx:4`→auth/redirect | Session role; login if absent; role destinations in W04 | C01, E06; proposed role-aware entry; no operational data |

Owning tasks: GYMOS-MIG-002, GYMOS-MIG-003, GYMOS-MIG-013, GYMOS-MIG-016, GYMOS-MIG-019, GYMOS-MIG-020, GYMOS-MIG-072, GYMOS-MIG-073; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-A01 / A01 `/login` | Client form + proxy, no page DB loader; Auth.js authorize on submit | Query callbackUrl/error; HTML required/email; same-origin callback filter. Proxy may redirect existing token | E01 insufficient + C01; W01. No member-list read |

Owning tasks: GYMOS-MIG-002, GYMOS-MIG-003, GYMOS-MIG-013, GYMOS-MIG-016, GYMOS-MIG-019, GYMOS-MIG-020, GYMOS-MIG-072, GYMOS-MIG-073; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-A02 / A02 `/change-password` | `app/(auth)/change-password/page.tsx:5`→auth | Signed-in fullName and mustChangePassword; no additional page read | C01/C03; W03 |

Owning tasks: GYMOS-MIG-002, GYMOS-MIG-003, GYMOS-MIG-013, GYMOS-MIG-016, GYMOS-MIG-017, GYMOS-MIG-019, GYMOS-MIG-020, GYMOS-MIG-072, GYMOS-MIG-073; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-S01 / S01 `/admin` | `dashboard/admin/page.tsx:6`→getSuperAdminData; `actions/admin.ts:9` | A; gyms + subscriptions + owner names/emails + counts of all users/sessions + support cookie; totalMembers is all users | E02 insufficient→C07; support C04. Registry count/summaries/context |

Owning tasks: GYMOS-MIG-002, GYMOS-MIG-021, GYMOS-MIG-022, GYMOS-MIG-023, GYMOS-MIG-024, GYMOS-MIG-025, GYMOS-MIG-026, GYMOS-MIG-059; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-O01 / O01 `/owner` | `dashboard/owner/page.tsx:6`→getOwnerDashboardData; `actions/dashboard.ts:7` | O; stats/today sessions/cumulative revenue/low packs/no-shows/trainer roster; details section 8. Manual/30s refresh | C08; owner dashboard and all metric series |

Owning tasks: GYMOS-MIG-058; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-O02 / O02 `/owner/members` | `dashboard/owner/members/page.tsx:6`:user.findMany and membershipPlan.findMany | O; gym members newest first, latest-created membership+plan take 1; loads unused plans prop; all rows, no server page | E07 insufficient→C09; list/status/search/25-row visual pager and full-filter summary |

Owning tasks: GYMOS-MIG-032, GYMOS-MIG-035; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-O03 / O03 `/owner/members/new` | `dashboard/owner/members/new/page.tsx:6`:membershipPlan.findMany | O; all gym plans sorted ascending price; wrapper no registration side effect | C11; plan picker. C12/W09 command separate |

Owning tasks: GYMOS-MIG-002, GYMOS-MIG-004, GYMOS-MIG-017, GYMOS-MIG-028, GYMOS-MIG-030, GYMOS-MIG-031, GYMOS-MIG-035; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-O04 / O04 `/owner/members/:id` | `dashboard/owner/members/[id]/page.tsx:11`:user.findFirst | O; id+gym+member role; all memberships+plans newest, all packs newest, last 5 sessions+trainer. Missing→plain text | C10; profile/latest membership/pack/session list. Billing rows synthesized, not transactions; W11/W14/W32 |

Owning tasks: GYMOS-MIG-030, GYMOS-MIG-032, GYMOS-MIG-033, GYMOS-MIG-034, GYMOS-MIG-035; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-O05 / O05 `/owner/trainers` | `dashboard/owner/trainers/page.tsx:6`:user.findMany | O; gym trainers newest-created; specialisations/level/shift/status; no server page | C15; searchable paged trainer roster |

Owning tasks: GYMOS-MIG-037; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-O06 / O06 `/owner/trainers/new` | `dashboard/owner/trainers/new/page.tsx:3` | No feature data read; auth/layout/proxy plus command gate; default form fields local | C01/C06; C13/W10 submit; no unnecessary loader API |

Owning tasks: GYMOS-MIG-002, GYMOS-MIG-003, GYMOS-MIG-004, GYMOS-MIG-005, GYMOS-MIG-013, GYMOS-MIG-016, GYMOS-MIG-017, GYMOS-MIG-018, GYMOS-MIG-019, GYMOS-MIG-020, GYMOS-MIG-023, GYMOS-MIG-025, GYMOS-MIG-036, GYMOS-MIG-072, GYMOS-MIG-073; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-O07 / O07 `/owner/trainers/:id` | `dashboard/owner/trainers/[id]/page.tsx:11`:user.findFirst + pTSession.findMany distinct clients | O; id+gym+trainer role; last 10 sessions/client; related-client count over SCHEDULED/ACTIVE/COMPLETED. Completed stat only last 10; rating fallback 5 | C16; trainer profile/stats/shift/level/bio; W12/W13 |

Owning tasks: GYMOS-MIG-037, GYMOS-MIG-038; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-O08 / O08 `/owner/sessions` | `dashboard/owner/sessions/page.tsx:6`:pTSession/user/user.findMany | O; all gym sessions+client/trainer newest scheduled; all trainer id/names; all members with latest-started membership+plan take 1 and all packs. No server paging | C20 owner sessions + C63 monthly overview + C15 options; preserve all-time top totals vs day/month filters; W22 |

Owning tasks: GYMOS-MIG-037, GYMOS-MIG-040, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-O09 / O09 `/owner/sessions/book` | `dashboard/owner/sessions/book/page.tsx:6`:eligible user and active trainer queries | O; members with some ACTIVE pack remaining>0, all matching balances; active trainers id/name/shifts. No date/expiry/member-status filter here | C21; eligible member/trainer pickers, authoritative eligibility rechecked by C22/W15 |

Owning tasks: GYMOS-MIG-002, GYMOS-MIG-040, GYMOS-MIG-041, GYMOS-MIG-048; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-O10 / O10 `/owner/financials` | `dashboard/owner/financials/page.tsx:11`:six parallel actions | O; **all six load regardless of selected tab**: getRevenueOverview/getExpenses/getBudgetVsActual/getDeferredRevenue/getCurrentPayPeriodInfo/generatePnL | C45–C50; independent read panels with common asOf/period contract; payroll GET must not create data |

Owning tasks: GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-054, GYMOS-MIG-055, GYMOS-MIG-056, GYMOS-MIG-057, GYMOS-MIG-061; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-O11 / O11 `/owner/analytics` | `dashboard/owner/analytics/page.tsx:6`→getAnalyticsData; action`:28` | O;30-day-lower-bound trainer/session aggregation,22-shift-day capacity estimate,6 month signup series; no UI date picker | C56;3 chart series; no implicit attendance/check-in records |

Owning tasks: GYMOS-MIG-059; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-O12 / O12 `/owner/gym-config` | `dashboard/owner/gym-config/page.tsx:6`:gym.findUnique include membershipPlans | O; full gym config + plans created-desc; missing→plain text | C38 + C11/C06;5 tab fields/plan table, W07/W08/W26–W29 |

Owning tasks: GYMOS-MIG-002, GYMOS-MIG-003, GYMOS-MIG-005, GYMOS-MIG-013, GYMOS-MIG-015, GYMOS-MIG-018, GYMOS-MIG-019, GYMOS-MIG-023, GYMOS-MIG-025, GYMOS-MIG-027, GYMOS-MIG-028, GYMOS-MIG-029, GYMOS-MIG-030, GYMOS-MIG-072, GYMOS-MIG-073; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-O13 / O13 `/owner/audit-log` | `dashboard/owner/audit-log/page.tsx:6`→getAuditLogs; action`:7` | O; gym, optional actionType, page default 1, size 20, created-desc; user names/email; total count/pages | C57; server filter/page read, not mutation; client filter resets page 1 |

Owning tasks: GYMOS-MIG-043, GYMOS-MIG-060, GYMOS-MIG-061; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-O14 / O14 `/owner/subscription` | `dashboard/owner/subscription/page.tsx:6`→getGymSubscription; action`:7` | O; subscription lookup; **creates GROWTH/ACTIVE/monthly/last 4=4242 + next date30d if absent** | C58 proposed pure read; return explicit absent state; no synthetic payment details. Lifecycle initialization D11/D14 |

Owning tasks: GYMOS-MIG-062; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-T00 / T00 `/trainer` | `dashboard/trainer/page.tsx:3` | Redirect `/trainer/schedule`; no independent dashboard data | C01/C06 + role entry; then RD-T01 |

Owning tasks: GYMOS-MIG-002, GYMOS-MIG-003, GYMOS-MIG-005, GYMOS-MIG-013, GYMOS-MIG-016, GYMOS-MIG-018, GYMOS-MIG-019, GYMOS-MIG-020, GYMOS-MIG-023, GYMOS-MIG-025, GYMOS-MIG-042, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-072, GYMOS-MIG-073; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-T01 / T01 `/trainer/schedule` | `dashboard/trainer/schedule/page.tsx:5`:pTSession.findMany | self trainerId=session.id, include client, ascending scheduledAt, **all dates**, no page-local role/gym filter beyond shell/proxy | C37 trainer own sessions; requests, active timer and terminal cards; W17–W20/W23 |

Owning tasks: GYMOS-MIG-042, GYMOS-MIG-044, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-072, GYMOS-MIG-074, GYMOS-MIG-075; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-T02 / T02 `/trainer/clients` | `dashboard/trainer/clients/page.tsx:6`:user.findMany | T-rel +G; active pack take 1 no ordering; most recent scheduled session with self take 1; no page/order on client array | C30; relationship-filtered clients, credits/latest-session summaries. E07 all-gym list is insufficient |

Owning tasks: GYMOS-MIG-050, GYMOS-MIG-072, GYMOS-MIG-075; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-T03 / T03 `/trainer/clients/:id` | `dashboard/trainer/clients/[id]/page.tsx:11`:user.findFirst | T-rel +G; active pack take 1; last 10 self sessions; last 2 self workout plans/exercises and last 2 meals/entries; last 5 bodyMetrics fetched but **not displayed** | C31;4 tabs, privacy-scoped data. Omit unused bodyMetrics from proposed response; no absent web progress feature |

Owning tasks: GYMOS-MIG-050, GYMOS-MIG-051, GYMOS-MIG-052; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-T04 / T04 `/trainer/plans/workout/new` | `dashboard/trainer/plans/workout/new/page.tsx:6`:user.findMany | T-rel +G eligible clients; query clientId prefill only, not authority; draft examples local | C30 option projection; C32/W24 save; validate selected client remains eligible |

Owning tasks: GYMOS-MIG-050, GYMOS-MIG-051, GYMOS-MIG-072, GYMOS-MIG-075; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-T05 / T05 `/trainer/plans/meal/new` | `dashboard/trainer/plans/meal/new/page.tsx:6`:same related-client query | T-rel +G; clientId prefill; dayOfWeek 1 local, no day picker | C30 options; C33/W25 save |

Owning tasks: GYMOS-MIG-050, GYMOS-MIG-052, GYMOS-MIG-072, GYMOS-MIG-075; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-T06 / T06 `/trainer/earnings` | `dashboard/trainer/earnings/page.tsx:5`:payRecord.findMany | self trainerId=session.id, include session/client; all records created-desc. Totals calculated client-side; no period filter | C34; own earnings totals/full filter plus paged rows; no payout-status claim from count |

Owning tasks: GYMOS-MIG-046, GYMOS-MIG-048, GYMOS-MIG-049, GYMOS-MIG-056, GYMOS-MIG-072, GYMOS-MIG-075; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-M00 / M00 `/member` | `dashboard/member/page.tsx:3` | Redirect `/member/trainers`; no independent dashboard | C01/C06 + role entry; then RD-M01 |

Owning tasks: GYMOS-MIG-002, GYMOS-MIG-003, GYMOS-MIG-005, GYMOS-MIG-013, GYMOS-MIG-016, GYMOS-MIG-018, GYMOS-MIG-019, GYMOS-MIG-020, GYMOS-MIG-023, GYMOS-MIG-025, GYMOS-MIG-039, GYMOS-MIG-072, GYMOS-MIG-073; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-M01 / M01 `/member/trainers` | `dashboard/member/trainers/page.tsx:5`:user.findMany | own gym from session, ACTIVE trainers name-asc; selected public biography/level/specs/shifts/rating, years fetched not shown; no page-local role gate | C35; member-safe directory, not E07; name search |

Owning tasks: GYMOS-MIG-039, GYMOS-MIG-072, GYMOS-MIG-074; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-M02 / M02 `/member/trainers/:id/book` | `dashboard/member/trainers/[id]/book/page.tsx:10`:trainer findFirst + sessionPack.findFirst | own gym/self; active same-gym trainer; first ACTIVE positive-balance pack with **no order**; remaining or 0. Missing trainer/no gym plain text | C36; trainer summary + self available credits/eligibility; C23/W16 command |

Owning tasks: GYMOS-MIG-042, GYMOS-MIG-048, GYMOS-MIG-072, GYMOS-MIG-074; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-M03 / M03 `/member/sessions` | `dashboard/member/sessions/page.tsx:5`:pTSession.findMany | self clientId=session.id; include trainer; all dates/statuses scheduled-desc; no explicit page-local G/role predicate | C37 member own sessions; withdraw/cancel W21, notes read-only |

Owning tasks: GYMOS-MIG-042, GYMOS-MIG-044, GYMOS-MIG-047, GYMOS-MIG-072, GYMOS-MIG-074, GYMOS-MIG-075; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-L01 / L01 all routes | `app/layout.tsx`, globals CSS | Static platform metadata/fonts/canvas; no dynamic business read | Platform fallback; C06/E04 only where gym context known |

Owning tasks: GYMOS-MIG-002, GYMOS-MIG-003, GYMOS-MIG-005, GYMOS-MIG-011, GYMOS-MIG-013, GYMOS-MIG-018, GYMOS-MIG-019, GYMOS-MIG-023, GYMOS-MIG-025, GYMOS-MIG-072, GYMOS-MIG-073; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-L02 / L02 all dashboard | `dashboard/layout.tsx:13`:auth→getEffectiveGymId→gym.findUnique | Session id/name/role, selected gym name/subscription status; warn SUSPENDED/GRACE_PERIOD. Does not initialize subscription | C01/C06/C58; role/gym shell, banners, identity and support context |

Owning tasks: GYMOS-MIG-002, GYMOS-MIG-003, GYMOS-MIG-005, GYMOS-MIG-013, GYMOS-MIG-016, GYMOS-MIG-018, GYMOS-MIG-019, GYMOS-MIG-020, GYMOS-MIG-023, GYMOS-MIG-025, GYMOS-MIG-043, GYMOS-MIG-062, GYMOS-MIG-072, GYMOS-MIG-073; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-N01 / shared bell | `components/layout/NotificationBell.tsx:16`→getUserNotifications; action`:6` | Current user;5 newest notifications + count of **all** unread for user, not explicit gym filter; absent session returns empty | C59; server-side token; poll20s or explicit reread, D18 cross-gym notification policy |

Owning tasks: GYMOS-MIG-043; follow approved corrections and feature acceptance.

| Read ID / UI ID / V1 route | V1 loader or direct read (source) | Inputs, access and exact data scope | V2 contract; affected read state |
|---|---|---|---|
| RD-X / X01/X02/X03 | dashboard error.tsx/not-found.tsx; owner/loading.tsx | No feature read. reset retries rendering; return fixed `/owner` in V1; skeleton local. Pages with missing records often return plain text instead | Appropriate read adapter on retry; proposed role+gym return path. No new command/API for error/empty/skeleton |

Owning tasks: GYMOS-MIG-012, GYMOS-MIG-013, GYMOS-MIG-019; follow approved corrections and feature acceptance.

## Exported Server Action disposition register

44 exports across14 files, inspected by name/path/line. Every operation moves to Nest business services or an explicit withdrawal/deferral; no V1 business action copied into web. Direct Prisma page loaders are covered in route/component dossiers, not silently excluded.

| V1 export:source line | Feature | Contract responsibilities | Disposition | Tasks |
|---|---|---|---|---|
| [changePassword](</Users/esanduepa/Desktop/Projects/gymos/app/actions/account.ts:30>) | A02 | C03 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-003, GYMOS-MIG-016, GYMOS-MIG-017, GYMOS-MIG-020, GYMOS-MIG-073 |
| [getSuperAdminData](</Users/esanduepa/Desktop/Projects/gymos/app/actions/admin.ts:9>) | S01 | C07 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-024, GYMOS-MIG-059 |
| [setImpersonatedGym](</Users/esanduepa/Desktop/Projects/gymos/app/actions/admin.ts:50>) | S01 | C04 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-002, GYMOS-MIG-024 |
| [getAnalyticsData](</Users/esanduepa/Desktop/Projects/gymos/app/actions/analytics.ts:28>) | O11 | C56 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-059 |
| [getAuditLogs](</Users/esanduepa/Desktop/Projects/gymos/app/actions/audit.ts:7>) | O13 | C57 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-043, GYMOS-MIG-060 |
| [getOwnerDashboardData](</Users/esanduepa/Desktop/Projects/gymos/app/actions/dashboard.ts:7>) | O01 | C08 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-058 |
| [getRevenueOverview](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:39>) | O10, O04 | C45 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-057 |
| [createExpense](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:125>) | O10, O04 | C51 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-054 |
| [getExpenses](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:163>) | O10, O04 | C46 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-054, GYMOS-MIG-057 |
| [setCategoryBudget](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:183>) | O10, O04 | C52 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-055 |
| [getBudgetVsActual](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:226>) | O10, O04 | C47 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-055, GYMOS-MIG-057 |
| [getDeferredRevenue](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:268>) | O10, O04 | C48 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-057 |
| [getCurrentPayPeriodInfo](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:329>) | O10, O04 | C49 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-046, GYMOS-MIG-048, GYMOS-MIG-049, GYMOS-MIG-056, GYMOS-MIG-057 |
| [closePayPeriod](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:404>) | O10, O04 | C54 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-056 |
| [approvePayPeriod](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:420>) | O10, O04 | C55 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-002, GYMOS-MIG-056 |
| [generatePnL](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:437>) | O10, O04 | C50 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-057 |
| [recordManualPayment](</Users/esanduepa/Desktop/Projects/gymos/app/actions/financials.ts:538>) | O10, O04 | C53 | Defer outside MVP; hidden controls | GYMOS-MIG-062 |
| [updateGymProfile](</Users/esanduepa/Desktop/Projects/gymos/app/actions/gym-config.ts:23>) | O12 | C39 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-004, GYMOS-MIG-027 |
| [createMembershipPlan](</Users/esanduepa/Desktop/Projects/gymos/app/actions/gym-config.ts:70>) | O12 | C40 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-028 |
| [updateTrainerPayRates](</Users/esanduepa/Desktop/Projects/gymos/app/actions/gym-config.ts:111>) | O12 | C42 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-029 |
| [updateSessionRates](</Users/esanduepa/Desktop/Projects/gymos/app/actions/gym-config.ts:162>) | O12 | C41 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-029 |
| [updateCancellationPolicy](</Users/esanduepa/Desktop/Projects/gymos/app/actions/gym-config.ts:213>) | O12 | C43 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-029 |
| [createMember](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts:21>) | O02, O03, O04, O12 | C12 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-002, GYMOS-MIG-004, GYMOS-MIG-017, GYMOS-MIG-031, GYMOS-MIG-035 |
| [updateMemberStatus](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts:116>) | O02, O03, O04, O12 | C14 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-033 |
| [checkMembershipExpiries](</Users/esanduepa/Desktop/Projects/gymos/app/actions/members.ts:155>) | O02, O03, O04, O12 | C44 | Intentionally remove mutation; date-derived refresh (C44 withdrawn) | GYMOS-MIG-030 |
| [getUserNotifications](</Users/esanduepa/Desktop/Projects/gymos/app/actions/notifications.ts:6>) | SHARED | C59 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-043 |
| [markNotificationAsRead](</Users/esanduepa/Desktop/Projects/gymos/app/actions/notifications.ts:27>) | SHARED | C60 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-043 |
| [markAllNotificationsAsRead](</Users/esanduepa/Desktop/Projects/gymos/app/actions/notifications.ts:39>) | SHARED | C61 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-043 |
| [issueSessionPack](</Users/esanduepa/Desktop/Projects/gymos/app/actions/packs.ts:17>) | O04 | C19 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-034, GYMOS-MIG-035 |
| [saveWorkoutPlan](</Users/esanduepa/Desktop/Projects/gymos/app/actions/plans.ts:23>) | T03, T04, T05 | C32 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-051 |
| [saveMealPlan](</Users/esanduepa/Desktop/Projects/gymos/app/actions/plans.ts:78>) | T03, T04, T05 | C33 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-052 |
| [bookSession](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:182>) | O08, O09, T01, M02, M03 | C22 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-002, GYMOS-MIG-040, GYMOS-MIG-041, GYMOS-MIG-048 |
| [requestSession](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:280>) | O08, O09, T01, M02, M03 | C23 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-042, GYMOS-MIG-048, GYMOS-MIG-072, GYMOS-MIG-074 |
| [respondToSessionRequest](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:382>) | O08, O09, T01, M02, M03 | C24 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-002, GYMOS-MIG-040, GYMOS-MIG-042, GYMOS-MIG-048, GYMOS-MIG-072, GYMOS-MIG-075 |
| [startSession](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:484>) | O08, O09, T01, M02, M03 | C25 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-040, GYMOS-MIG-045, GYMOS-MIG-072, GYMOS-MIG-075 |
| [endSession](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:515>) | O08, O09, T01, M02, M03 | C26 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-002, GYMOS-MIG-040, GYMOS-MIG-046, GYMOS-MIG-048, GYMOS-MIG-072, GYMOS-MIG-075 |
| [handleNoShow](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:623>) | O08, O09, T01, M02, M03 | C27 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-040, GYMOS-MIG-047, GYMOS-MIG-048, GYMOS-MIG-075 |
| [cancelSession](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:673>) | O08, O09, T01, M02, M03 | C28 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-002, GYMOS-MIG-040, GYMOS-MIG-047, GYMOS-MIG-048, GYMOS-MIG-072, GYMOS-MIG-074 |
| [overrideSessionStatus](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:739>) | O08, O09, T01, M02, M03 | C26, C27, C28 | Replace with explicit C26/C27/C28; arbitrary setter removed | GYMOS-MIG-002, GYMOS-MIG-040, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-048, GYMOS-MIG-072, GYMOS-MIG-074, GYMOS-MIG-075 |
| [updateSessionNotes](</Users/esanduepa/Desktop/Projects/gymos/app/actions/sessions.ts:770>) | O08, O09, T01, M02, M03 | C29 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-045, GYMOS-MIG-075 |
| [getGymSubscription](</Users/esanduepa/Desktop/Projects/gymos/app/actions/subscription.ts:7>) | O14 | C58 | Defer outside MVP; hidden controls | GYMOS-MIG-062 |
| [createTrainer](</Users/esanduepa/Desktop/Projects/gymos/app/actions/trainers.ts:23>) | O05, O06, O07 | C13 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-002, GYMOS-MIG-004, GYMOS-MIG-017, GYMOS-MIG-036 |
| [updateTrainerStatus](</Users/esanduepa/Desktop/Projects/gymos/app/actions/trainers.ts:92>) | O05, O06, O07 | C17 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-038 |
| [approveShiftHours](</Users/esanduepa/Desktop/Projects/gymos/app/actions/trainers.ts:123>) | O05, O06, O07 | C18 | Correct/reimplement via Nest; thin transport only in web | GYMOS-MIG-037 |

H01 Auth.js catchall → tasks016/020, E01/C01/C03. H02 CSV handler → task061/C62. V1 auth, proxy, authz, pricing, CSV/audit helpers are integration evidence, not transplantable backend code.
## Database entity and enum disposition register

All20 current models and14 enums are accounted for. Field-by-field allocation/constraints for248 declared fields remain normative in Database map §6; ownership below is fresh-schema responsibility, not copying records/IDs. Four V1 SQL migrations and two V2 initial migrations were statically inspected; live application is unverified.

| Kind | V1 declaration | Master/Tenant destination | Disposition | Tasks |
|---|---|---|---|---|
| enum | [Role](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:10>) | Master GlobalRole + GymAccess.GymRole; no tenant/global single V1 role | Adapt; remove role identity coupling and use explicit lifecycle enums | GYMOS-MIG-003, GYMOS-MIG-018 |
| enum | [MemberStatus](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:17>) | Tenant | Adapt; remove role identity coupling and use explicit lifecycle enums | GYMOS-MIG-003, GYMOS-MIG-030, GYMOS-MIG-033 |
| enum | [TrainerLevel](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:24>) | Tenant | Adapt; remove role identity coupling and use explicit lifecycle enums | GYMOS-MIG-036, GYMOS-MIG-037, GYMOS-MIG-040 |
| enum | [SessionStatus](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:29>) | Tenant | Adapt; remove role identity coupling and use explicit lifecycle enums | GYMOS-MIG-040, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047 |
| enum | [SessionType](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:39>) | Tenant | Adapt; remove role identity coupling and use explicit lifecycle enums | GYMOS-MIG-040, GYMOS-MIG-041, GYMOS-MIG-042 |
| enum | [ShiftStatus](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:45>) | Tenant | Adapt; remove role identity coupling and use explicit lifecycle enums | GYMOS-MIG-029, GYMOS-MIG-037, GYMOS-MIG-040 |
| enum | [PackStatus](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:50>) | Tenant | Adapt; remove role identity coupling and use explicit lifecycle enums | GYMOS-MIG-034, GYMOS-MIG-040 |
| enum | [PayPeriodStatus](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:56>) | Tenant | Adapt; remove role identity coupling and use explicit lifecycle enums | GYMOS-MIG-040, GYMOS-MIG-056 |
| enum | [RevenueCategory](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:62>) | Tenant | Adapt; remove role identity coupling and use explicit lifecycle enums | GYMOS-MIG-040, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-053 |
| enum | [ExpenseCategory](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:68>) | Tenant | Adapt; remove role identity coupling and use explicit lifecycle enums | GYMOS-MIG-054, GYMOS-MIG-055 |
| model | [Gym](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:78>) | Master Gym registry/theme/localization; Tenant GymProfile/policy/rates | Split | GYMOS-MIG-005, GYMOS-MIG-021, GYMOS-MIG-023, GYMOS-MIG-027, GYMOS-MIG-029 |
| model | [User](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:117>) | Master User identity+GymAccess; Tenant Member/Trainer (no password) | Split | GYMOS-MIG-003, GYMOS-MIG-016, GYMOS-MIG-018, GYMOS-MIG-031, GYMOS-MIG-036 |
| model | [MembershipPlan](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:167>) | Tenant MembershipPlan | Reimplement | GYMOS-MIG-028 |
| model | [Membership](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:183>) | Tenant Membership with date-derived expiry and no-overlap | Correct known defect | GYMOS-MIG-030, GYMOS-MIG-031 |
| model | [SessionPack](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:201>) | Tenant SessionPack + credit reservation/settlement ledger | Correct known defect | GYMOS-MIG-034, GYMOS-MIG-040 |
| model | [PTSession](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:218>) | Tenant Session + confirmation snapshots and effect-source keys | Correct known defect | GYMOS-MIG-040, GYMOS-MIG-041, GYMOS-MIG-042, GYMOS-MIG-045, GYMOS-MIG-046, GYMOS-MIG-047 |
| model | [WorkoutPlan](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:250>) | Tenant WorkoutPlan | Reimplement | GYMOS-MIG-051 |
| model | [WorkoutExercise](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:269>) | Tenant WorkoutExercise | Reimplement | GYMOS-MIG-051 |
| model | [MealPlan](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:283>) | Tenant MealPlan | Reimplement | GYMOS-MIG-052 |
| model | [MealPlanEntry](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:301>) | Tenant MealPlanEntry | Adapt; resolve weekday convention | GYMOS-MIG-052 |
| model | [ProgressPhoto](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:316>) | Tenant future ProgressPhoto; no rendered V1 workflow | Defer; no MVP table merely for parity | GYMOS-MIG-062 |
| model | [BodyMetric](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:327>) | Tenant future BodyMetric; T03 fetch unused, no rendered workflow | Defer; no MVP table merely for parity | GYMOS-MIG-062 |
| model | [PayPeriod](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:340>) | Tenant PayPeriod with weekly/monthly bounds and transitions | Correct known defect | GYMOS-MIG-040, GYMOS-MIG-046, GYMOS-MIG-056 |
| model | [PayRecord](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:355>) | Tenant PayRecord / immutable later adjustment, source uniqueness | Correct known defect | GYMOS-MIG-040, GYMOS-MIG-046, GYMOS-MIG-056 |
| model | [RevenueRecord](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:374>) | Tenant operational earned value ledger; payment settlement future | Correct known defect | GYMOS-MIG-040, GYMOS-MIG-046, GYMOS-MIG-047, GYMOS-MIG-053 |
| model | [ExpenseRecord](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:390>) | Tenant ExpenseRecord; recurring marker only | Reimplement | GYMOS-MIG-054 |
| model | [CategoryBudget](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:406>) | Tenant CategoryBudget | Reimplement | GYMOS-MIG-055 |
| enum | [AuditActionType](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:419>) | Tenant business taxonomy + Master platform taxonomy; split, not tenant-only | Adapt; remove role identity coupling and use explicit lifecycle enums | GYMOS-MIG-004, GYMOS-MIG-043, GYMOS-MIG-060 |
| model | [AuditLog](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:444>) | Tenant business AuditLog; Master platform/support/provision AuditLog | Split | GYMOS-MIG-004, GYMOS-MIG-043, GYMOS-MIG-060 |
| enum | [SubscriptionTier](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:460>) | Master | Defer with Master subscription metadata | GYMOS-MIG-062 |
| enum | [SubscriptionStatus](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:467>) | Master | Defer with Master subscription metadata | GYMOS-MIG-062 |
| model | [GymSubscription](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:474>) | Master future PlatformSubscription metadata; no billing MVP | Defer; no MVP table merely for parity | GYMOS-MIG-062 |
| enum | [NotificationType](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:488>) | Tenant | Adapt; remove role identity coupling and use explicit lifecycle enums | GYMOS-MIG-042, GYMOS-MIG-043 |
| model | [Notification](</Users/esanduepa/Desktop/Projects/gymos/prisma/schema.prisma:499>) | Tenant selected-gym Notification, master identity reference | Correct known defect | GYMOS-MIG-042, GYMOS-MIG-043 |

## API contract register

E01–E08 below are source-existing method/path pairs; C01–C63 are proposed responsibilities, including expansions of E routes. There are59 required MVP C IDs,1 conditional API logout C02,1 withdrawn C44 mutation and2 deferred C53/C58. IDs are not counts of HTTP operations: C04 start/end, C05 GET/PATCH and variants group methods. Additional explicit operations follow. Common DTO/error/auth rules are Master Plan §§7,15,17.

| ID | Existing method/path | Disposition / tasks |
|---|---|---|
| E01 | POST `/auth/login` | Keep credential validation/token service; expand session/forced-change, role/gym selection (C01/C03). Current web redirects to first gym.; GYMOS-MIG-016, GYMOS-MIG-020 |
| E02 | GET `/admin/gyms` | Expand to authorized paged registry and true totals (C07).; GYMOS-MIG-024 |
| E03 | POST `/admin/gyms` | Keep provisioning foundation; add idempotent recovery, currency/time-zone choice and one-role access rules. No database provisioning was run for this document.; GYMOS-MIG-021, GYMOS-MIG-022, GYMOS-MIG-023 |
| E04 | GET `/gyms/:slug/theme` | Reuse primary color/HTTPS logo read; apply V1 screen design (C05).; GYMOS-MIG-011, GYMOS-MIG-015 |
| E05 | PATCH `/gyms/:slug/theme` | Reuse primary color/HTTPS logo validation; add version/audit/web editor (C05). Extended presets are future.; GYMOS-MIG-015 |
| E06 | GET `/gyms/:slug/access` | Reuse active gym-access check; richer role-safe shell/actor projection is C06.; GYMOS-MIG-018, GYMOS-MIG-019 |
| E07 | GET `/gyms/:slug/members` | Replace capped 100-row basic list with authorized page/filter/total (C09); trainer client roster uses C30.; GYMOS-MIG-032 |
| E08 | POST `/gyms/:slug/members` | Basic tenant contact record only; **does not** enroll a member or create access. Full registration is C12. Do not wire V1 registration form to E08.; GYMOS-MIG-031, GYMOS-MIG-032 |

Diagnostic existing GET/ greeting is retained as scaffold/liveness only; no readiness/tenant health claim.

### C01 — Proposed MVP

- Method/path: GET `/auth/session`.
- UI IDs: A01/A02/R00/L02; web binding: server read adapter; owner: master + context.
- Proposed DTO label: SessionIdentityDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-002, GYMOS-MIG-003, GYMOS-MIG-013, GYMOS-MIG-016, GYMOS-MIG-019, GYMOS-MIG-020, GYMOS-MIG-072, GYMOS-MIG-073.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested method and path | Authorization and request/query | Proposed `Read<data>` / domain errors beyond common rules |
|---|---|---|
| C01 **proposed** GET `/auth/session` | Authenticated identity; usable while forced change. Optional selected slug validated against access/support | SessionIdentity including all permitted gym choices and normalized role/actor links.401 expired; context removed→403 and cleared selection. No refresh token implied |


### C02 — Conditional API logout; web cookie logout existing

- Method/path: POST `/auth/logout`.
- UI IDs: A01; web binding: web sign-out; API optional; owner: master + context.
- Proposed DTO label: LogoutResultDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-020.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested endpoint | Request and required actor/scope | Proposed success data / specific rejections / effects and refresh |
|---|---|---|
| C02 **proposed, conditional D04** POST `/auth/logout` | Authenticated current session; no arbitrary target identity; optional allSessions only if separately authorized | `{revoked:true,scope}`; repeat safe; clear cookie even if API unavailable, report revocation uncertainty. Cookie-only W02 needs no API today |


### C03 — Proposed MVP

- Method/path: POST `/auth/password/change`.
- UI IDs: A02; web binding: thin Server Action; owner: master + context.
- Proposed DTO label: ChangePasswordDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-003, GYMOS-MIG-016, GYMOS-MIG-017, GYMOS-MIG-020, GYMOS-MIG-073.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested endpoint | Request and required actor/scope | Proposed success data / specific rejections / effects and refresh |
|---|---|---|
| C03 **proposed** POST `/auth/password/change` | Self even forced-change; `{currentPassword,newPassword,confirmPassword}`; V1 strength minimum retained or approved policy, confirmation/new≠current, verify current | `{requiresRelogin:true,mustChangePassword:false}`;422 weak/mismatch/current invalid,429 attempts. No password returned/logged. Invalidate session according D04 and all private views |


### C04 — Proposed MVP

- Method/path: POST `/admin/support-sessions`.
- UI IDs: S01; web binding: start/end Server Actions; owner: master + context.
- Proposed DTO label: SupportSessionDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-002, GYMOS-MIG-024.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested endpoint | Request and required actor/scope | Proposed success data / specific rejections / effects and refresh |
|---|---|---|
| C04 **proposed** POST `/admin/support-sessions`; DELETE `/admin/support-sessions/:id` | A; start `{gymSlug,reason,requestedScope}`; end own active support context ID; validate permitted scope/gym/status | `{contextId,effectiveGymSlug,allowedRoles,permissionScope,expiresAt,destination}` start, `{ended:true}` end.403 denied/expired,404 gym/context,409 conflicting context. Audited original actor; opaque server-held token, no forged gym cookie. D05 |


### C05 — Proposed MVP

- Method/path: GET/PATCH `/gyms/:slug/theme`.
- UI IDs: O12/L02; web binding: server read + theme Server Action; owner: master theme.
- Proposed DTO label: GymThemeDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-011, GYMOS-MIG-013, GYMOS-MIG-015, GYMOS-MIG-023, GYMOS-MIG-073.
- MVP writable brand fields primaryColor/logoUrl only; internal baseline preset does not expand editor.

| ID / label / suggested endpoint | Request and required actor/scope | Proposed success data / specific rejections / effects and refresh |
|---|---|---|
| C05 **insufficient** expanded GET/PATCH `/gyms/:slug/theme` | GET E04 public limited, expanded private shell C06; PATCH OWNER+G (support D05), `{expectedVersion,theme:{primaryColor,logoUrl?}}` for MVP; expanded fields future only | Versioned normalized theme;400 invalid color/HTTPS URL/enum/unsupported fields,409 stale. E05 currently primary/logo only; expansion not implemented. Public-safe read field policy/brand fallback D20; refresh theme/context/shell |


### C06 — Proposed MVP

- Method/path: GET `/gyms/:slug/context`.
- UI IDs: L02/R00; web binding: server read adapter; owner: master + context.
- Proposed DTO label: GymContextDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-002, GYMOS-MIG-003, GYMOS-MIG-005, GYMOS-MIG-013, GYMOS-MIG-018, GYMOS-MIG-019, GYMOS-MIG-023, GYMOS-MIG-025, GYMOS-MIG-072, GYMOS-MIG-073.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested method and path | Authorization and request/query | Proposed `Read<data>` / domain errors beyond common rules |
|---|---|---|
| C06 **proposed** GET `/gyms/:slug/context` | G; minimal role-safe shell for O/T/M or approved support; no page requires member list to obtain context | GymContext; no linked actor→explicit onboarding-required state, suspended/grace banner distinguished from access denial. D04/D05/D07–D09 |


### C07 — Proposed MVP

- Method/path: GET `/admin/gyms`.
- UI IDs: S01; web binding: server read adapter; owner: master + context.
- Proposed DTO label: GymRegistryPageDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-024, GYMOS-MIG-059.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested method and path | Authorization and request/query | Proposed `Read<data>` / domain errors beyond common rules |
|---|---|---|
| C07 **insufficient** expanded E02 GET `/admin/gyms` | A; page/pageSize/q/status; stable createdAt-desc,id | Page of `{id,slug,name,status,owner:{name,email}?,subscription:{tier,status}?,memberCount,trainerCount,sessionCount}` plus full-filter/platform totals. Counts distinguish tenant members from all accounts; failed/provisioning gyms explicit; no tenant DB secrets. Accessing selected gym still requires C04/E06 |


### C08 — Proposed MVP

- Method/path: GET `/gyms/:slug/dashboard`.
- UI IDs: O01; web binding: server read adapter; owner: tenant.
- Proposed DTO label: OwnerDashboardDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-058.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested method and path | Authorization and request/query | Proposed `Read<data>` / domain errors beyond common rules |
|---|---|---|
| C08 **proposed** GET `/gyms/:slug/dashboard` | O+G; optional explicit localDate (UI currently today) | `{asOf,window,stats:{membersInGym,activeTrainers,todayRevenue,activeSessions},revenueSeries,lowCreditAlerts,noShowAlerts,todaySessions,trainerCards,metricDefinitions}`. Define query windows and proxies D19; compact cards limited with total/hasMore; zero vs unavailable distinguished |


### C09 — Proposed MVP

- Method/path: GET `/gyms/:slug/members`.
- UI IDs: O02; web binding: server read adapter; owner: tenant.
- Proposed DTO label: MemberPageDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-032, GYMOS-MIG-035.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested method and path | Authorization and request/query | Proposed `Read<data>` / domain errors beyond common rules |
|---|---|---|
| C09 **insufficient** expanded E07 GET `/gyms/:slug/members` | O+G; q(name/email/phone),status,page/pageSize; joined fields gym-scoped | `Page<MemberSummary>` with full-filter status totals. Current API only 100 basic records: no true totals/paging/detail. Trainer use is C30, not this all-gym projection |


### C10 — Proposed MVP

- Method/path: GET `/gyms/:slug/members/:memberId`.
- UI IDs: O04; web binding: server read adapter; owner: tenant.
- Proposed DTO label: MemberProfileDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-030, GYMOS-MIG-032, GYMOS-MIG-035.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested method and path | Authorization and request/query | Proposed `Read<data>` / domain errors beyond common rules |
|---|---|---|
| C10 **proposed** GET `/gyms/:slug/members/:memberId` | O+G, nested member role checked; membershipPage/packPage default 1, pageSize 25 max 100; **billingPage default 1, billingPageSize default 25 max 100**, independent of both source pages | `{member:MemberSummary,profile:{dateOfBirth,emergencyContact?,healthNotes?,joinedAt},memberships:Page<Membership>,packs:Page<Pack>,recentSessions:{items:Session[],limit:5,totalCount},billing:DerivedBillingPage}`; membership/pack pages created-desc/id with totalCount; session preview fixed 5. **Entitlement/pack history only in MVP, without PAID/receipt/cash labels.** Section 10.2.1 supplies sort and totals; linked payments are future scope; actual linked payments require D10;400 malformed page,404 forged/out-of-gym ID |


### C11 — Proposed MVP

- Method/path: GET `/gyms/:slug/membership-plans`.
- UI IDs: O03/O12; web binding: server read adapter; owner: tenant.
- Proposed DTO label: MembershipPlanPageDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-028, GYMOS-MIG-030.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested method and path | Authorization and request/query | Proposed `Read<data>` / domain errors beyond common rules |
|---|---|---|
| C11 **proposed** GET `/gyms/:slug/membership-plans` | O+G; page/pageSize/q, sort price-asc for registration or created-desc config via allowlisted sort | `Page<MembershipPlan>`. For select, support search/paging and GET `/gyms/:slug/membership-plans/:planId` for selected plan (C11 **proposed** resource variant) so off-page prefill resolves; no unlimited hidden select assumption |


### C12 — Proposed MVP

- Method/path: POST `/gyms/:slug/member-registrations`.
- UI IDs: O03; web binding: thin Server Action; owner: master access + tenant actor.
- Proposed DTO label: MemberRegistrationDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-002, GYMOS-MIG-004, GYMOS-MIG-017, GYMOS-MIG-031, GYMOS-MIG-035.
- No payment or full-fee earned record on registration; only agreed entitlement snapshot.

| ID / label / suggested endpoint | Request and required actor/scope | Proposed success data / specific rejections / effects and refresh |
|---|---|---|
| C12 **proposed** POST `/gyms/:slug/member-registrations` | O+G; `{fullName,email,phone,dateOfBirth,planId,emergencyContact?,healthNotes?}`; same-gym selectable plan, verified reuse of existing login across gyms; otherwise one-time owner-visible temporary password with forced change | `{memberId,membershipId,identityLinkState,credentialDelivery:{state,temporaryPassword?},operationState}`; first response secret only approved policy.409 existing registration/link conflict;422 plan invalid/ineligible;503 enrollment incomplete with operationId/recovery. Creates membership entitlement, immutable agreed-price snapshot and audit once; does not record cash received or recognize the full membership price at registration. Earned membership value is spread across active dates. No pack. No reuse of E08 as full registration |


### C13 — Proposed MVP

- Method/path: POST `/gyms/:slug/trainer-registrations`.
- UI IDs: O06; web binding: thin Server Action; owner: master access + tenant actor.
- Proposed DTO label: TrainerRegistrationDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-002, GYMOS-MIG-004, GYMOS-MIG-017, GYMOS-MIG-036.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested endpoint | Request and required actor/scope | Proposed success data / specific rejections / effects and refresh |
|---|---|---|
| C13 **proposed** POST `/gyms/:slug/trainer-registrations` | O+G; `{fullName,email,phone,level:LEVEL_1\|LEVEL_2,specialisations:string[],yearsExperience?,shiftStart?,shiftEnd?,bio?}`; no caller identity ID | `{trainerId,identityLinkState,credentialDelivery,operationState}`; same duplicate/one-time rules as C12. Validate experience nonnegative, shift semantics D08; create active trainer +audit once, no pay or member entitlement |


### C14 — Proposed MVP

- Method/path: POST `/gyms/:slug/members/:memberId/status`.
- UI IDs: O04; web binding: thin Server Action; owner: master access + tenant actor.
- Proposed DTO label: MemberStatusDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-033.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested endpoint | Request and required actor/scope | Proposed success data / specific rejections / effects and refresh |
|---|---|---|
| C14 **proposed** POST `/gyms/:slug/members/:memberId/status` | O+G; `{status:ACTIVE\|SUSPENDED,expectedVersion,reason?}`; same-gym member; any added INACTIVE/EXPIRED control separately scoped | `{memberId,status,version,affectedMembershipIds,accessEffect}`;409 stale/invalid member state,422 conflicting entitlements; on suspension cancel affected future bookings and release holds free in one tenant transaction; access is revoked. Do not rewrite past settlement or fabricate a refund |


### C15 — Proposed MVP

- Method/path: GET `/gyms/:slug/trainers`.
- UI IDs: O05/O09; web binding: server read adapter; owner: tenant.
- Proposed DTO label: TrainerPageDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-037.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested method and path | Authorization and request/query | Proposed `Read<data>` / domain errors beyond common rules |
|---|---|---|
| C15 **proposed** GET `/gyms/:slug/trainers` | O+G; q/name/email,status,level,page/pageSize, safe sort; `projection=options` owner booking only | `Page<TrainerSummary>`, roster owner contact fields, summary counts. Booking active-only options do not authorize inactive command; command rechecks. Member directory uses C35 |


### C16 — Proposed MVP

- Method/path: GET `/gyms/:slug/trainers/:trainerId`.
- UI IDs: O07; web binding: server read adapter; owner: tenant.
- Proposed DTO label: TrainerProfileDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-037.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested method and path | Authorization and request/query | Proposed `Read<data>` / domain errors beyond common rules |
|---|---|---|
| C16 **proposed** GET `/gyms/:slug/trainers/:trainerId` | O+G | `{trainer,profile:{email,phone,biography?,joinedAt},recentSessions:{items,limit:10,totalCount},stats:{relatedClientCount,completedInLoadedWindow,totalCompleted?,rating}}`; identify last 10 vs total; no fallback 5 presented as real rating.404 cross-gym |


### C17 — Proposed MVP

- Method/path: POST `/gyms/:slug/trainers/:trainerId/status`.
- UI IDs: O07; web binding: thin Server Action; owner: master access + tenant actor.
- Proposed DTO label: TrainerStatusDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-038.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested endpoint | Request and required actor/scope | Proposed success data / specific rejections / effects and refresh |
|---|---|---|
| C17 **proposed** POST `/gyms/:slug/trainers/:trainerId/status` | O+G; `{status:ACTIVE\|DEACTIVATED,expectedVersion,reason?}` | `{trainerId,status,version,accessEffect,affectedBookingsPolicy}`;409 stale,422 blocking active work if adopted. On deactivation cancel affected future bookings and release holds free; do not rewrite past pay or settlement |


### C18 — Proposed MVP

- Method/path: PUT `/gyms/:slug/trainers/:trainerId/shift`.
- UI IDs: O07; web binding: thin Server Action; owner: tenant.
- Proposed DTO label: TrainerShiftDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-037.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested endpoint | Request and required actor/scope | Proposed success data / specific rejections / effects and refresh |
|---|---|---|
| C18 **proposed** PUT `/gyms/:slug/trainers/:trainerId/shift` | O+G; `{start:HH:mm,end:HH:mm,overnight:boolean,expectedVersion}` | `{trainerId,shift,timeZone,version}`;422 invalid shift/overnight policy; no rewrite of historical session shift/pay. D08 |


### C19 — Proposed MVP

- Method/path: POST `/gyms/:slug/members/:memberId/session-packs`.
- UI IDs: O04; web binding: thin Server Action; owner: tenant.
- Proposed DTO label: SessionPackIssueDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-034, GYMOS-MIG-035.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested endpoint | Request and required actor/scope | Proposed success data / specific rejections / effects and refresh |
|---|---|---|
| C19 **proposed** POST `/gyms/:slug/members/:memberId/session-packs` | O+G; `{totalSessions:integer>=1,price:Money,validityDays:integer>=1}`; reject foreign/currency/invalid count | `{pack:Pack,availableCredits}`;422 member status/entitlement policy D06. Credit grant once, agreed sale-price snapshot and audit once; no cash receipt and no upfront earned PT revenue. Available credits exclude holds; pack value is earned in equal shares when a credit is consumed. Payment capture is later scope |


### C20 — Proposed MVP

- Method/path: GET `/gyms/:slug/sessions`.
- UI IDs: O08; web binding: server read adapter; owner: tenant.
- Proposed DTO label: OwnerSessionPageDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-040, GYMOS-MIG-044.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested method and path | Authorization and request/query | Proposed `Read<data>` / domain errors beyond common rules |
|---|---|---|
| C20 **proposed** GET `/gyms/:slug/sessions` | O+G; date or bounded from/to,memberId?,trainerId?,trainerStatus?,q?,status?,page/pageSize,sort scheduledAt+id | `Page<Session>` plus filter-wide/day totals and separately labeled all-time totals if UI needs them. Validate date and nested IDs; don't load all sessions merely to filter one day. Includes More overlay query by member+month |


### C21 — Proposed MVP

- Method/path: GET `/gyms/:slug/session-booking-options`.
- UI IDs: O09; web binding: server read adapter; owner: tenant.
- Proposed DTO label: SessionBookingOptionsDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-041.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested method and path | Authorization and request/query | Proposed `Read<data>` / domain errors beyond common rules |
|---|---|---|
| C21 **proposed** GET `/gyms/:slug/session-booking-options` | O+G; qMembers/qTrainers, memberPage/memberPageSize and trainerPage/trainerPageSize (default 1/25,max 100), optional localDate/type; selected IDs fetched securely if off-page | `{members:Page<{memberId,name,availableCredits,eligibility}>,trainers:Page<TrainerSummary>,policy,rateInfo,asOf}`. Eligibility/quote nonbinding; no reservation/write. No eligible members returns empty+reason, not 500 |


### C22 — Proposed MVP

- Method/path: POST `/gyms/:slug/sessions/bookings`.
- UI IDs: O09; web binding: thin Server Action; owner: tenant.
- Proposed DTO label: SessionBookingDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-002, GYMOS-MIG-040, GYMOS-MIG-041, GYMOS-MIG-048.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested endpoint | Request and required actor/scope | Proposed success data / specific rejections / effects and refresh |
|---|---|---|
| C22 **proposed** POST `/gyms/:slug/sessions/bookings` | O+G; `{memberId,trainerId,localDate,localTime,timeZone,offset?,type:IN_PERSON\|VIRTUAL\|INTRODUCTORY,durationMinutes,notes?}` | `{session:Session,creditReservation?,feeQuote:Money}` SCHEDULED;409 overlap/duplicate,422 inactive/no-credit/past/shift/time rules; same-gym party checks and atomic collision gate. Atomically hold one usable pack credit at direct booking, snapshot trainer level/rate/shift and fee; no trainer pay or earned revenue until settlement. D08 |


### C23 — Proposed MVP

- Method/path: POST `/gyms/:slug/me/session-requests`.
- UI IDs: M02; web binding: thin Server Action; owner: tenant.
- Proposed DTO label: SessionRequestDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-042, GYMOS-MIG-048, GYMOS-MIG-072, GYMOS-MIG-074.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested endpoint | Request and required actor/scope | Proposed success data / specific rejections / effects and refresh |
|---|---|---|
| C23 **proposed** POST `/gyms/:slug/me/session-requests` | M+G self; same schedule fields +trainerId, **no memberId** | `{session:Session,notificationOutcome:NotificationOutcome}` PENDING_CONFIRMATION;409 duplicate/overlap,422 no credit/inactive trainer/past/invalid time. Require active membership covering scheduled date and an unexpired pack with an available credit, but do not hold at request. Notify assigned trainer and audit once; no confirmed-client access, earned revenue or pay yet |


### C24 — Proposed MVP

- Method/path: POST `/gyms/:slug/sessions/:id/respond`.
- UI IDs: T01; web binding: thin Server Action; owner: tenant.
- Proposed DTO label: SessionResponseDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-002, GYMOS-MIG-040, GYMOS-MIG-042, GYMOS-MIG-048, GYMOS-MIG-072, GYMOS-MIG-075.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested endpoint | Request and required actor/scope | Proposed success data / specific rejections / effects and refresh |
|---|---|---|
| C24 **proposed** POST `/gyms/:slug/sessions/:id/respond` | T+G+assigned trainer; `{decision:ACCEPT\|DECLINE,reason?,expectedVersion}` | `{session:Session,decision,notificationOutcome:NotificationOutcome}`;409 stale/not pending/collision,422 if scheduled-date membership or usable pack eligibility fails. ACCEPT→SCHEDULED with one atomic pack-credit hold and trainer level/rate/shift snapshot; DECLINE→DECLINED without a hold. Recheck membership covering scheduled date and pack eligibility. Notify member+audit once; no earned revenue or pay yet |


### C25 — Proposed MVP

- Method/path: POST `/gyms/:slug/sessions/:id/start`.
- UI IDs: T01/O08; web binding: thin Server Action; owner: tenant.
- Proposed DTO label: SessionStartDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-040, GYMOS-MIG-045, GYMOS-MIG-072, GYMOS-MIG-075.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested endpoint | Request and required actor/scope | Proposed success data / specific rejections / effects and refresh |
|---|---|---|
| C25 **proposed** POST `/gyms/:slug/sessions/:id/start` | T+G+assigned or O+G if owner action supported; `{expectedVersion}` | `{session:Session,startedAt}`;409 not scheduled/stale/other active if selected,422 too early per D01. No charge/pay on start; audit policy D16. API controls allowedActions/time, not client clock |


### C26 — Proposed MVP

- Method/path: POST `/gyms/:slug/sessions/:id/complete`.
- UI IDs: T01/O08; web binding: thin Server Action; owner: tenant.
- Proposed DTO label: SessionCompleteDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-002, GYMOS-MIG-040, GYMOS-MIG-046, GYMOS-MIG-048, GYMOS-MIG-072, GYMOS-MIG-075.
- Controlling correction: ACTIVE+startedAt only; any copied older overrideReason/SCHEDULED exception below is superseded and must not be implemented.

> | C26 **proposed** POST `/gyms/:slug/sessions/:id/complete` | Assigned T or O+G; `{expectedVersion}`; ACTIVE+startedAt only; no scheduled exception, no client fee/pay input | `{session,creditEffect:{packId?,delta,balance},recognizedRevenue:Money,trainerPay:{recordId,amount,periodId},auditState}`;409 terminal/stale,422 min duration/no-start/invalid hold. Only ACTIVE sessions with startedAt may complete. Consume the held credit once; create earned pack value and trainer pay once using the confirmation snapshot. Open that weekly/monthly pay period on its first completed-session pay. No completion of SCHEDULED sessions |


### C27 — Proposed MVP

- Method/path: POST `/gyms/:slug/sessions/:id/no-show`.
- UI IDs: T01/O08; web binding: thin Server Action; owner: tenant.
- Proposed DTO label: SessionNoShowDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-040, GYMOS-MIG-047, GYMOS-MIG-048, GYMOS-MIG-075.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested endpoint | Request and required actor/scope | Proposed success data / specific rejections / effects and refresh |
|---|---|---|
| C27 **proposed** POST `/gyms/:slug/sessions/:id/no-show` | Assigned T or O+G; `{expectedVersion,reason?}`; D02 determines valid source statuses/time cutoffs | `{session,creditEffect,recognizedRevenue,auditState}`;409 terminal/conflicting intent,422 unless SCHEDULED and server time is at least scheduled start +15 minutes. Consume one held credit once and record its earned value on a distinct no-show line; no trainer pay. Same committed no-show replay/no-op never charges twice |


### C28 — Proposed MVP

- Method/path: POST `/gyms/:slug/sessions/:id/cancel`.
- UI IDs: M03/O08/T01; web binding: thin Server Action; owner: tenant.
- Proposed DTO label: SessionCancelDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-002, GYMOS-MIG-040, GYMOS-MIG-047, GYMOS-MIG-048, GYMOS-MIG-072, GYMOS-MIG-074.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested endpoint | Request and required actor/scope | Proposed success data / specific rejections / effects and refresh |
|---|---|---|
| C28 **proposed** POST `/gyms/:slug/sessions/:id/cancel` | M self, assigned T or O+G; `{expectedVersion,reason?,acknowledgedConsequenceVersion?}` | `{session,isLateCancel,deductedCredits,creditEffect,recognizedRevenue:Money,cutoff,policyVersion}`.409 stale/quote changed,422 active/terminal not cancellable. Pending withdrawal is free; confirmed cancellation at or before cutoff is free and releases the hold. Strictly inside the window, consume one credit only if the gym late-cancel toggle is on; otherwise release it. Charged value is a distinct earned line and never generates trainer pay. If quote changes, require renewed confirmation before charging |


### C29 — Proposed MVP

- Method/path: PATCH `/gyms/:slug/sessions/:id/notes`.
- UI IDs: T01/O08; web binding: thin Server Action; owner: tenant.
- Proposed DTO label: SessionNotesDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-045, GYMOS-MIG-075.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested endpoint | Request and required actor/scope | Proposed success data / specific rejections / effects and refresh |
|---|---|---|
| C29 **proposed** PATCH `/gyms/:slug/sessions/:id/notes` | Assigned T/O+G; `{notes,expectedVersion}`; allowed states/privacy D12 | `{sessionId,notes,version}`;409 stale,422 wrong edit state/text; no financial effects, no invented private note audience. Refresh member-visible notes and histories |


### C30 — Proposed MVP

- Method/path: GET `/gyms/:slug/me/clients`.
- UI IDs: T02/T04/T05; web binding: server read adapter; owner: tenant.
- Proposed DTO label: TrainerClientPageDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-050, GYMOS-MIG-072, GYMOS-MIG-075.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested method and path | Authorization and request/query | Proposed `Read<data>` / domain errors beyond common rules |
|---|---|---|
| C30 **proposed** GET `/gyms/:slug/me/clients` | T+G; derive trainer; q/page/pageSize, `projection=options` for builder | `Page<MemberSummary>` with related latest session and usable-pack balance; relationship SCHEDULED/ACTIVE/COMPLETED or approved replacement D06. No pending-only/unassigned client. Options omit health data |


### C31 — Proposed MVP

- Method/path: GET `/gyms/:slug/me/clients/:memberId`.
- UI IDs: T03; web binding: server read adapter; owner: tenant.
- Proposed DTO label: TrainerClientProfileDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-050, GYMOS-MIG-051, GYMOS-MIG-052.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested method and path | Authorization and request/query | Proposed `Read<data>` / domain errors beyond common rules |
|---|---|---|
| C31 **proposed** GET `/gyms/:slug/me/clients/:memberId` | T+G+current relationship | `{client:{name,contact fields required by T03,dateOfBirth,healthNotes?,emergencyContact?},packSummary,recentSessions:{items,limit:10,totalCount},workouts:{items:PlanViews[],limit:2,hasMore},meals:{items,limit:2,hasMore}}`; self-trainer plans/sessions only. No bodyMetrics fetched for invisible UI. Relationship removal→404/403 per safe policy |


### C32 — Proposed MVP

- Method/path: POST `/gyms/:slug/me/clients/:memberId/workout-plans`.
- UI IDs: T04; web binding: thin Server Action; owner: tenant.
- Proposed DTO label: WorkoutPlanCreateDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-051.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested endpoint | Request and required actor/scope | Proposed success data / specific rejections / effects and refresh |
|---|---|---|
| C32 **proposed** POST `/gyms/:slug/me/clients/:memberId/workout-plans` | T+G+relationship; `{name,description?,exercises:[{name,sets:integer>=1,reps?:integer>=0,weight?:number>=0,duration?:number>=0,notes?}]}`;≥1≤100 exercises | `{plan:WorkoutView}`;422 empty/invalid rows,404 unassigned/foreign member. Derive trainer; create plan+rows+audit once; no row-level draft command/notification unless D18 |


### C33 — Proposed MVP

- Method/path: POST `/gyms/:slug/me/clients/:memberId/meal-plans`.
- UI IDs: T05; web binding: thin Server Action; owner: tenant.
- Proposed DTO label: MealPlanCreateDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-052.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested endpoint | Request and required actor/scope | Proposed success data / specific rejections / effects and refresh |
|---|---|---|
| C33 **proposed** POST `/gyms/:slug/me/clients/:memberId/meal-plans` | T+G+relationship; `{name,entries:[{dayOfWeek:1..7,mealType:Breakfast\|Lunch\|Dinner\|Snack\|Pre-Workout\|Post-Workout,foodItem,calories?,protein?,carbs?,fats?}]}`;≥1≤100, nutrients finite nonnegative | `{plan:MealView}`;422 invalid row/day/enum,404 unassigned. UI initially sends day 1; defaults/existing examples D12; audit once |


### C34 — Proposed MVP

- Method/path: GET `/gyms/:slug/me/earnings`.
- UI IDs: T06; web binding: server read adapter; owner: tenant.
- Proposed DTO label: TrainerEarningsDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-046, GYMOS-MIG-048, GYMOS-MIG-049, GYMOS-MIG-072, GYMOS-MIG-075.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested method and path | Authorization and request/query | Proposed `Read<data>` / domain errors beyond common rules |
|---|---|---|
| C34 **proposed** GET `/gyms/:slug/me/earnings` | T+G; derive trainer; page/pageSize, optional bounded period if added explicitly | `{summary:{totalEarned,sessionCount,averagePerSession,inShiftTotal,offShiftTotal},records:Page<PayRecord>,periodBasis}`. Summary over full agreed filter; distinguish earned vs approved vs paid; no pay/payout mutations |


### C35 — Proposed MVP

- Method/path: GET `/gyms/:slug/me/trainer-directory`.
- UI IDs: M01; web binding: server read adapter; owner: tenant.
- Proposed DTO label: MemberTrainerDirectoryDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-039, GYMOS-MIG-072, GYMOS-MIG-074.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested method and path | Authorization and request/query | Proposed `Read<data>` / domain errors beyond common rules |
|---|---|---|
| C35 **proposed** GET `/gyms/:slug/me/trainer-directory` | M+G; active trainers only; q(name),page/pageSize | `Page<member-safe TrainerSummary>`. No owner contact/pay fields; missing biography/rating shown as absent. Safe request href built by web |


### C36 — Proposed MVP

- Method/path: GET `/gyms/:slug/me/session-request-options`.
- UI IDs: M02; web binding: server read adapter; owner: tenant.
- Proposed DTO label: MemberSessionRequestOptionsDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-042, GYMOS-MIG-074.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested method and path | Authorization and request/query | Proposed `Read<data>` / domain errors beyond common rules |
|---|---|---|
| C36 **proposed** GET `/gyms/:slug/me/session-request-options` | M+G; trainerId required, same gym ACTIVE trainer; no caller-specified member | `{trainer:member-safe TrainerSummary,packs:PackSummary,availableCredits,allowedTypes,durationConstraints,policy,timeZone,eligibility,asOf}`.404 inactive/foreign trainer; zero credit valid blocked form, not a thrown read error. Selection/reservation D06 |


### C37 — Proposed MVP

- Method/path: GET `/gyms/:slug/me/sessions`.
- UI IDs: T01/M03; web binding: server read adapter; owner: tenant.
- Proposed DTO label: OwnSessionPageDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-042, GYMOS-MIG-044, GYMOS-MIG-072, GYMOS-MIG-074, GYMOS-MIG-075.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested method and path | Authorization and request/query | Proposed `Read<data>` / domain errors beyond common rules |
|---|---|---|
| C37 **proposed** GET `/gyms/:slug/me/sessions` | T or M+G; derive party; status/from/to/page/pageSize; role-specific default sort | `Page<Session>` with pending/active/upcoming/terminal groups or separately paged group queries and full group counts. T gets client details necessary for schedule; M only own session/trainer/notes. Active banner from full filter, not first page. No all-gym selector |


### C38 — Proposed MVP

- Method/path: GET `/gyms/:slug/configuration`.
- UI IDs: O12; web binding: server read adapter; owner: tenant.
- Proposed DTO label: GymConfigurationDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-027.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested method and path | Authorization and request/query | Proposed `Read<data>` / domain errors beyond common rules |
|---|---|---|
| C38 **proposed** GET `/gyms/:slug/configuration` | O+G | `{version,profile:{name,address?,phone?,email?,payPeriod},sessionRates:{default,level2:null-or-Money,intro:null-or-Money},payRates:{level1Fraction,level2Fraction,offShiftFraction},policy:{windowHours,minDurationMinutes,noShowDeduction,lateCancelDeduction},capabilities}`; plan list C11, appearance C05/C06; expose actually enforced capabilities |

Approved correction: noShowDeduction is not an editable toggle in MVP; eligible no-show always consumes1 held credit. Read capability is fixed true; C43 command omits this input and strict validation rejects an attempt to vary it. Display that policy read-only or hide obsolete input. lateCancelDeduction remains editable and governs late cancellation. Task029 owns this correction.


### C39 — Proposed MVP

- Method/path: PATCH `/gyms/:slug/configuration/profile`.
- UI IDs: O12; web binding: thin Server Action; owner: master access + tenant actor.
- Proposed DTO label: GymProfileUpdateDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-004, GYMOS-MIG-027.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested endpoint | Request and required actor/scope | Proposed success data / specific rejections / effects and refresh |
|---|---|---|
| C39 **proposed** PATCH `/gyms/:slug/configuration/profile` | O+G; `{name,address?,phone?,email?,payPeriod:WEEKLY\|MONTHLY,expectedVersion}` | `{profile,version}`;400 invalid email/enum,409 stale. Audit+shell/registry/config refresh. Payroll schedule changes do not rewrite periods without D11 |


### C40 — Proposed MVP

- Method/path: POST `/gyms/:slug/membership-plans`.
- UI IDs: O12; web binding: thin Server Action; owner: tenant.
- Proposed DTO label: MembershipPlanCreateDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-028.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested endpoint | Request and required actor/scope | Proposed success data / specific rejections / effects and refresh |
|---|---|---|
| C40 **proposed** POST `/gyms/:slug/membership-plans` | O+G; `{name,description?,price:Money,durationDays:integer>=1}` | `{plan:MembershipPlan}`;422 amount/duration,409 duplicate if adopted. Audit; refresh plans/options. No plan edit/delete endpoint inferred |


### C41 — Proposed MVP

- Method/path: PUT `/gyms/:slug/configuration/session-rates`.
- UI IDs: O12; web binding: thin Server Action; owner: tenant.
- Proposed DTO label: SessionRatesUpdateDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-029.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested endpoint | Request and required actor/scope | Proposed success data / specific rejections / effects and refresh |
|---|---|---|
| C41 **proposed** PUT `/gyms/:slug/configuration/session-rates` | O+G; `{default:Money,level2:Money\|null,intro:Money\|null,expectedVersion}` | `{rates,version}`;422 negative/currency,409 stale. **Intentional V2 behavior change:** thin action converts a blank optional form field to null; null clears to standard fallback, explicit zero stays 0. V1 blank parses/saves 0 (EV01); booking fee precedence remains API-owned. Audit; no repricing existing sold/booked records |


### C42 — Proposed MVP

- Method/path: PUT `/gyms/:slug/configuration/pay-rates`.
- UI IDs: O12; web binding: thin Server Action; owner: tenant.
- Proposed DTO label: PayRatesUpdateDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-029.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested endpoint | Request and required actor/scope | Proposed success data / specific rejections / effects and refresh |
|---|---|---|
| C42 **proposed** PUT `/gyms/:slug/configuration/pay-rates` | O+G; `{level1Fraction,level2Fraction,offShiftFraction,expectedVersion}` | `{rates,version,effectiveFrom}`;422 out-of-range/combined rate policy,409 stale. Audit; historical snapshots/when applied D10 |


### C43 — Proposed MVP

- Method/path: PUT `/gyms/:slug/configuration/session-policy`.
- UI IDs: O12; web binding: thin Server Action; owner: tenant.
- Proposed DTO label: SessionPolicyUpdateDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-029.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

> | C43 **proposed** PUT `/gyms/:slug/configuration/session-policy` | O+G; `{windowHours:integer>=0,minDurationMinutes:integer>=0,lateCancelDeduction:boolean,expectedVersion}` | `{policy,policyVersion,enforcedCapabilities}`;422 bounds/policy conflicts,409 stale. Audit; zero supported explicitly instead of `\|\|` replacement; frontend may not promise unenforced toggle |

Approved correction: noShowDeduction is not an editable toggle in MVP; eligible no-show always consumes1 held credit. Read capability is fixed true; C43 command omits this input and strict validation rejects an attempt to vary it. Display that policy read-only or hide obsolete input. lateCancelDeduction remains editable and governs late cancellation. Task029 owns this correction.


### C44 — Withdrawn mutation; derived read/refresh only

- Method/path: Legacy POST `/gyms/:slug/memberships/check-expiries` withdrawn for MVP.
- UI IDs: O12; web binding: refresh derived expiry; retire mutation; owner: tenant.
- Proposed DTO label: DerivedExpirySummaryDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-030.
- The source mutation below is withdrawn; no membership-expiry write endpoint in MVP.

| ID / label / suggested endpoint | Request and required actor/scope | Proposed success data / specific rejections / effects and refresh |
|---|---|---|
| C44 **withdrawn for MVP; derived read/refresh instead of POST** `/gyms/:slug/memberships/check-expiries` | O+G; no arbitrary gym/member filter; optional approved asOf only for controlled tooling, not normal UI | `{asOf,expiredMembershipCount,affectedMemberCount,affectedMemberIds}` is a derived read result; no status mutation, concurrency write or expiry job is required. derive expiry from membership dates; no member-status EXPIRED write or account logout solely for term expiry. Repeat read/check is safe; no pack expiry conflation |


### C45 — Proposed MVP

- Method/path: GET `/gyms/:slug/financials/revenue`.
- UI IDs: O10/O01; web binding: server read adapter; owner: tenant.
- Proposed DTO label: OperationalRevenueDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-057.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested method and path | Scope and query | Proposed response and contract-specific requirements |
|---|---|---|
| C45 **proposed** GET `/gyms/:slug/financials/revenue` | O+G; from/to local dates, same explicit accounting period across panels | `{period,earned:{membership,completedSession,noShow,lateCancel,expiredUnusedSeparate},cashReceived:null,dailyTrend,trainerLevelSplit,offShiftPremiumTotal,recognitionBasis,asOf}`. MVP operational earned values use term dates and equal pack share per consumed credit; no cash total without payment records. Expired unused value is separate, accounting treatment pending Finance |


### C46 — Proposed MVP

- Method/path: GET `/gyms/:slug/financials/expenses`.
- UI IDs: O10; web binding: server read adapter; owner: tenant.
- Proposed DTO label: ExpensePageDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-054, GYMOS-MIG-057.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested method and path | Scope and query | Proposed response and contract-specific requirements |
|---|---|---|
| C46 **proposed** GET `/gyms/:slug/financials/expenses` | O+G; from/to,category?,page/pageSize | `{records:Page<Expense>,totalsByCategory,total}`; no recurring generation. Category enum shared with C47/C51/C52; valid empty periods |


### C47 — Proposed MVP

- Method/path: GET `/gyms/:slug/financials/budgets`.
- UI IDs: O10; web binding: server read adapter; owner: tenant.
- Proposed DTO label: BudgetSummaryDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-055, GYMOS-MIG-057.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested method and path | Scope and query | Proposed response and contract-specific requirements |
|---|---|---|
| C47 **proposed** GET `/gyms/:slug/financials/budgets` | O+G; month YYYY-MM default current gym month | `{month,rows:[{category,budget:Money,actual:Money,variance:Money,overBudget,version}],totals}`; all 7 expense categories, not paged; D10 zero-budget variance meaning |


### C48 — Proposed MVP

- Method/path: GET `/gyms/:slug/financials/deferred-revenue`.
- UI IDs: O10/O04; web binding: server read adapter; owner: tenant.
- Proposed DTO label: DeferredRevenueDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-049, GYMOS-MIG-053, GYMOS-MIG-057.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested method and path | Scope and query | Proposed response and contract-specific requirements |
|---|---|---|
| C48 **proposed** GET `/gyms/:slug/financials/deferred-revenue` | O+G; asOf policy explicit, pack status/member filters?,page/pageSize | `{summary:{agreedPackValue,earnedCompleted,earnedNoShow,earnedLateCancel,heldValue,unconsumedActiveValue,expiredUnusedValue},packs:Page<...>,method}`; no cash claim. Totals use full filter; hold is not earned; expired unused value stays separate until Finance decides treatment |


### C49 — Proposed MVP

- Method/path: GET `/gyms/:slug/payroll/current`.
- UI IDs: O10; web binding: server read adapter; owner: tenant.
- Proposed DTO label: CurrentPayrollDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-046, GYMOS-MIG-048, GYMOS-MIG-049, GYMOS-MIG-056, GYMOS-MIG-057.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested method and path | Scope and query | Proposed response and contract-specific requirements |
|---|---|---|
| C49 **proposed** GET `/gyms/:slug/payroll/current` | O+G; trainer page/pageSize; optional periodId for selected read, checked gym | `{period:PayPeriod\|null,trainers:Page<{trainerId,name,sessionCount,inShiftCount,offShiftCount,gross:Money}>,totals,canClose,canApprove}`; GET cannot create period; first completed-session pay creates it. Null state disables close/approve; no automatic payout claim |


### C50 — Proposed MVP

- Method/path: GET `/gyms/:slug/financials/profit-and-loss`.
- UI IDs: O10; web binding: server read adapter; owner: tenant.
- Proposed DTO label: OperationalProfitLossDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-057.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested method and path | Scope and query | Proposed response and contract-specific requirements |
|---|---|---|
| C50 **proposed** GET `/gyms/:slug/financials/profit-and-loss` | O+G; from/to and comparison window | `{period,operationalEarnedCategories,expenseCategories,payrollExpense,operationalResult,previousComparison,method,cashReceived:null}` for MVP. No formal net-profit/cash claim until finance basis and payments exist; never double-count salary expense and pay records |


### C51 — Proposed MVP

- Method/path: POST `/gyms/:slug/financials/expenses`.
- UI IDs: O10; web binding: thin Server Action; owner: tenant.
- Proposed DTO label: ExpenseCreateDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-054.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested endpoint | Request and required actor/scope | Proposed success data / specific rejections / effects and refresh |
|---|---|---|
| C51 **proposed** POST `/gyms/:slug/financials/expenses` | O+G; `{amount:Money,category:RENT\|UTILITIES\|EQUIPMENT\|MARKETING\|SALARIES\|MAINTENANCE\|OTHER,date:localDate,description?,isRecurring:boolean}` | `{expense:Expense}`;422 nonpositive/date/range/currency; no recurring job or payout. Audit future policy D16; finance/chart refresh |


### C52 — Proposed MVP

- Method/path: PUT `/gyms/:slug/financials/budgets/:category`.
- UI IDs: O10; web binding: thin Server Action; owner: tenant.
- Proposed DTO label: CategoryBudgetUpsertDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-055.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested endpoint | Request and required actor/scope | Proposed success data / specific rejections / effects and refresh |
|---|---|---|
| C52 **proposed** PUT `/gyms/:slug/financials/budgets/:category` | O+G; `{amount:Money,month?:YYYY-MM,expectedVersion?}`; category7enum; omitted current gym month | `{budget:{category,month,amount,version},created:boolean}`;422 negative/bad month,409 stale. Unique gym/category/month upsert semantics; repeat same request no duplicate; financial chart refresh |


### C53 — Deferred; no MVP implementation

- Method/path: Earlier POST `/gyms/:slug/members/:memberId/desk-payments` shape withdrawn; linked-payment contract TBD.
- UI IDs: O04 future; web binding: future only; hidden in MVP; owner: tenant.
- Proposed DTO label: FutureLinkedPaymentDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-062.
- Historical proposed DTO rows below are future reference only, not an MVP contract; future linked-payment design replaces generic desk payment.

| ID / label / suggested endpoint | Request and required actor/scope | Proposed success data / specific rejections / effects and refresh |
|---|---|---|
| C53 **proposed** POST `/gyms/:slug/members/:memberId/desk-payments` | O+G+member; `{type:MEMBERSHIP\|ADD_ON,amount:Money,description?}` | **Future, outside MVP:** this V1-style generic desk-payment shape is superseded by the linked-payment design in section 14. Do not implement or expose as an MVP cash/receipt action |


### C54 — Proposed MVP

- Method/path: POST `/gyms/:slug/payroll/periods/:id/close`.
- UI IDs: O10; web binding: thin Server Action; owner: tenant.
- Proposed DTO label: PayPeriodCloseDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-056.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested endpoint | Request and required actor/scope | Proposed success data / specific rejections / effects and refresh |
|---|---|---|
| C54 **proposed** POST `/gyms/:slug/payroll/periods/:id/close` | O+G; `{expectedVersion}`; same-gym OPEN period | `{period:PayPeriod,totals,closed:true}`;409 stale/not OPEN/competing write,422 incomplete period if policy. No payout; coordinate with concurrent completions in the same tenant DB. Approved corrections go into later open-period adjustments |


### C55 — Proposed MVP

- Method/path: POST `/gyms/:slug/payroll/periods/:id/approve`.
- UI IDs: O10; web binding: thin Server Action; owner: tenant.
- Proposed DTO label: PayPeriodApproveDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-002, GYMOS-MIG-056.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested endpoint | Request and required actor/scope | Proposed success data / specific rejections / effects and refresh |
|---|---|---|
| C55 **proposed** POST `/gyms/:slug/payroll/periods/:id/approve` | O+G; `{expectedVersion}`; same-gym CLOSED period | `{period:PayPeriod,approved:true,paid:false}`;409 stale/not CLOSED. No bank transfer. Audit/notification future rules D16/D18, period refresh |


### C56 — Proposed MVP

- Method/path: GET `/gyms/:slug/analytics`.
- UI IDs: O11; web binding: server read adapter; owner: tenant.
- Proposed DTO label: AnalyticsDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-059.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested method and path | Scope and query | Proposed response and contract-specific requirements |
|---|---|---|
| C56 **proposed** GET `/gyms/:slug/analytics` | O+G; fixed window metadata matching approved UI, optional filters only when scoped | `{window,capacityByTrainer,peakHours,signupsByMonth,metricDefinitions,asOf}`; labels identify estimates/proxies. No row paging for fixed bounded series; chart result has actual period upper/lower bounds D19 |


### C57 — Proposed MVP

- Method/path: GET `/gyms/:slug/audit`.
- UI IDs: O13/S01 support; web binding: server read adapter; owner: tenant.
- Proposed DTO label: AuditPageDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-043, GYMOS-MIG-060.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested method and path | Scope and query | Proposed response and contract-specific requirements |
|---|---|---|
| C57 **proposed** GET `/gyms/:slug/audit` | O+G; actionType allowlisted,page default 1,size 20; optional bounded time filter if UI added | `Page<Audit>` + availableActionTypes; actor permitted display only, no password/hash/token/health-note detail leaks. Stable created-desc/id; source IDs match changed resources, support preserves original actor D16 |


### C58 — Deferred; no MVP implementation

- Method/path: GET `/gyms/:slug/subscription`.
- UI IDs: O14 future; web binding: future only; hidden in MVP; owner: master billing.
- Proposed DTO label: FutureSubscriptionDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-062.
- Future read only if commissioned; O14 hidden in MVP and no synthetic default billing row.

| ID / label / suggested method and path | Scope and query | Proposed response and contract-specific requirements |
|---|---|---|
| C58 **proposed** GET `/gyms/:slug/subscription` | O+G; shell C06 can include minimal status for T/M only if permitted | **Future only:** pure master subscription read returning actual data or null; no synthetic tier/card/invoice. Hide O14 from MVP navigation and do not implement billing from this map |


### C59 — Proposed MVP

- Method/path: GET `/gyms/:slug/me/notifications`.
- UI IDs: L02; web binding: server read + same-origin bell GET; owner: tenant.
- Proposed DTO label: NotificationPageDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-043.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested method and path | Scope and query | Proposed response and contract-specific requirements |
|---|---|---|
| C59 **proposed** GET `/gyms/:slug/me/notifications` | **Stage 5 minimum:** authenticated G recipient, no caller-supplied recipientId; selected-gym recipient scope is approved; limit default 5 max 100. Cursor/unreadOnly filtering optional later | `{items:Notification[],unreadCount,nextCursor?,asOf}`; count full approved scope, no read marking. **Required with C23/C24 in stage 5:** HIRE_REQUEST to assigned trainer and SESSION_BOOKED/SESSION_DECLINED to requesting member, deduplicated delivery outcome, role/gym-safe target and read+mark C60/C61. Stage 6 consumes this baseline and verifies no unapproved lifecycle notification. Global support/registry `/me/notifications` variant remains conditional D18, not implemented |


### C60 — Proposed MVP

- Method/path: POST `/gyms/:slug/me/notifications/:id/read`.
- UI IDs: L02; web binding: thin Server Action; owner: tenant.
- Proposed DTO label: NotificationReadDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-043.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested endpoint | Request and required actor/scope | Proposed success data / specific rejections / effects and refresh |
|---|---|---|
| C60 **proposed** POST `/gyms/:slug/me/notifications/:id/read` | Authenticated G recipient, no userId; empty body | `{notificationId,isRead:true,unreadCount,asOf}`; already read successful no-op; nonexistent/foreign 404. Same scope as C59, D18; reread bell, no domain audit unless selected. **Minimum stage 5; regression stage 6, not stage 10.** |


### C61 — Proposed MVP

- Method/path: POST `/gyms/:slug/me/notifications/read-all`.
- UI IDs: L02; web binding: thin Server Action; owner: tenant.
- Proposed DTO label: NotificationReadAllDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-043.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested endpoint | Request and required actor/scope | Proposed success data / specific rejections / effects and refresh |
|---|---|---|
| C61 **proposed** POST `/gyms/:slug/me/notifications/read-all` | Authenticated G recipient; `{through?:ISOInstant}` to avoid marking newly arrived unseen entries if adopted | `{changedCount,unreadCount,asOf,through}`; repeat no-op; D18 approved scope. C59 global variant requires same explicit global mark variant; never guess gym from notification href. **Minimum stage 5; regression stage 6, not stage 10.** |


### C62 — Proposed MVP

- Method/path: GET `/gyms/:slug/exports/:kind`.
- UI IDs: O10/O13; web binding: authenticated web GET download; owner: tenant.
- Proposed DTO label: CsvExportDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-002, GYMOS-MIG-061.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested method and path | Scope and query | Proposed response and contract-specific requirements |
|---|---|---|
| C62 **proposed** GET `/gyms/:slug/exports/:kind` | O+G; kind financials/payroll/sessions/audit strict enum; from/to or selected date/filter; audit page/pageSize by current UI; `scope=current-page\|all-filtered` allowlist: finance/payroll all filtered up to safety limit; audit visible page | `text/csv` attachment UTF-8 BOM, no-store, safe filename; same filtering/auth/financial definitions as C20/C45/C46/C49/C57; validated date/pagination and bounded export size with explicit 422 limit response; review exact cap.401/403/404/400/422 range-too-large/503; no CSV if error. Read only unless export audit approved D16; tokens never in URL/body/file |


### C63 — Proposed MVP

- Method/path: GET `/gyms/:slug/member-session-overview`.
- UI IDs: O08; web binding: server read adapter; owner: tenant.
- Proposed DTO label: MemberSessionOverviewPageDto; request/response field details and validation/authorization below. These labels are not existing files/types.
- Tasks: GYMOS-MIG-044.
- Approved map §14.1 and owning task scope control over any older unresolved wording.

| ID / label / suggested method and path | Authorization and request/query | Proposed `Read<data>` / domain errors beyond common rules |
|---|---|---|
| C63 **proposed** GET `/gyms/:slug/member-session-overview` | O+G; YYYY-MM,q(name/email),page/pageSize | Page of `{member:MemberSummary,latestMembership?,packTotals:{total,remaining,used,basis},monthSessionCounts:{pending,scheduled,completed,missed,cancelled,declined},matchingSessionCount}` plus full-filter totals. Define lifetime vs selected-month basis; More reads C20. Prevent all-member/all-session join in browser |

## Supplemental proposed operations

These are required target responsibilities absent from E01–E08 and not new evidence of implementation. Their route/DTO shape must be frozen in the owning task after relevant decision; shared auth/error/version/idempotency rules apply. The source API map has no exact final count for these or future variants.

| Proposed method/path | DTO / validation / result | Authorization | Tasks |
|---|---|---|---|
| GET /admin/operations/:operationId | OperationStatusDto: kind/state/step/safe resource IDs/version/retryable, no secret/DB URL; opaque ID validated;404 foreign;503 authority unavailable | Original initiator or explicit platform recovery permission | GYMOS-MIG-021, GYMOS-MIG-022, GYMOS-MIG-024 |
| POST /admin/operations/:operationId/retry | RetryOperationDto expectedVersion+idempotencyKey; no target-name override;202 operation/safe outcome;409 lease/digest/state | Explicit platform recovery permission | GYMOS-MIG-021, GYMOS-MIG-022 |
| DELETE /admin/support-sessions/:id | EndSupportDto expectedVersion; audit/clear context; no gym mutation | Original support actor; SUPER_ADMIN | GYMOS-MIG-024 |
| POST /admin/gyms/:id/status | GymStatusCommand target SUSPENDED/ACTIVE, reason, expectedVersion/key; verified reactivation only | SUPER_ADMIN | GYMOS-MIG-025 |
| POST /gyms/:slug/enrollments/:operationId/credentials/reissue | CredentialReissueDto reason/version/key; hash-only durable storage; first one-time handoff, never replay secret;409 already acknowledged/current result | OWNER with current gym/recovery authorization; existing identity password not reset through link | GYMOS-MIG-017, GYMOS-MIG-031, GYMOS-MIG-036 |
| GET /gyms/:slug/enrollments/:operationId | EnrollmentStatusDto safe step/publication/repair metadata; no plaintext | Current OWNER only, not registered/public directory | GYMOS-MIG-031, GYMOS-MIG-036 |
| POST /gyms/:slug/members/:memberId/memberships | RenewMembershipDto planId/expectedVersion/key; no overlapping term; agreed price/date snapshot;201/202 safe result | OWNER with current gym and same-gym Member | GYMOS-MIG-030 |
| GET /gyms/:slug/sessions/:id/cancellation-quote | CancellationQuoteDto policyVersion/quoteExpiry/cutoff/deductedCredits/current state-version; pure GET; C28 acknowledges current consequence | Self MEMBER, assigned TRAINER or OWNER within approved cancellation permission | GYMOS-MIG-047 |
| POST /gyms/:slug/payroll/adjustments | Proposed only after DEC-08: source approved record, reason, signed decimal delta/current period/key; no mutation of approved base | OWNER with finance permission | GYMOS-MIG-056 |
| GET /health/live; GET /health/ready | Process liveness vs aggregate dependency/worker/pool readiness; bounded safe response, no URLs/secrets/tenant list | Liveness minimally public; detailed diagnostics internal/authorized | GYMOS-MIG-067, GYMOS-MIG-069 |

Future password recovery/email-reset, payment/refund/subscription commands, external push and global inbox require new commissioning; they are not implicit parity endpoints. Existing gym creation owner-password DTO is intentionally adapted to generated/verified identity target under tasks021/023; compatibility reviewed rather than silently broken.
