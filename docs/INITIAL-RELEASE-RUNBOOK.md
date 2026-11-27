# GymOS testing pilot runbook

Release GymOS as an owner-operated web app. The Owner collects one membership payment, records it in the gym’s existing cashbook, and enrolls or renews the member with PT credits included in the plan. Membership terms are the only source of new PT credits at launch. In-app notifications cover new member applications and trainer shift requests and their approval or decline. Start every applicable gate as **Pending** for the chosen testing build.

This pilot is for invited testers using synthetic data. Complete the applicable workflow, access, isolation and Owner checks before sharing the build. When testers need a hosted URL, verify HTTPS, health, sign-in and gym isolation on the approved test host. Backup retention, a hosted restore rehearsal and recovery targets belong to the production release review. Keep the pilot and production decisions separate.

**First development priority.** Start with bundled PT credits. Plan configuration and the API already support included credits on enrollment and renewal. Connect the existing Owner renewal API to **Members → member profile → Membership & Packs**, close the standalone top-up paths for launch, and verify the bundled flow before moving to the notification work. Member application notices already exist for all three events. Trainer shift notices still need implementation.

| Order | Work | Who signs off |
| --- | --- | --- |
| 0 | Confirm launch decisions, pin the candidate and prepare test data | Product owner and release lead |
| 1 | Build the Owner renewal action and verify bundled membership sales | Developer and gym Owner |
| 2 | Verify booking, credits, trainer pay and payroll | Tester and gym Owner |
| 3 | Deliver and verify request and decision notifications, account access, gym isolation and privacy | Developer, tester and privacy decision owner |
| 4 | Verify the hosted pilot if testers need remote access. Rehearse recovery before client release. | Deployment operator |
| 5 | Run the Owner walkthrough and make the pilot decision | Gym Owner and release lead |

## 0. Confirm scope and prepare the candidate

1. Set each launch plan's total price and included PT credits per term. The gym's existing cashbook process is the record of payments and cash collected. GymOS records the membership entitlement, included credits and operational values.
2. Confirm manual PT start and completion for launch. Include phone QR or virtual PT only if the Owner will offer them and can complete the corresponding checks in step 2. Verify that any deferred delivery option is unavailable to launch users. Agree and publish the no-show rule before sign-off. Current behavior uses one credit for a qualifying no-show, with automatic eligibility 15 minutes after the scheduled start of an unstarted session.
3. Defer in-app cash collection records and receipts, standalone PT top-ups, card checkout, automated GymOS subscription billing for manually invoiced gyms, biometrics and attendance, native apps, wearables, AI, reviews, rewards and advanced analytics. Use in-app delivery for the launch notifications. Leave `GYMOS_PAYHERE_CHECKOUT_ENABLED` and `GYMOS_PAYHERE_MEMBERSHIP_SANDBOX_ENABLED` unset on both web and API. Inspect the Member membership page and Owner subscription page as both roles. Hide or disable unfinished checkout or recurring billing actions.
4. Record the Git revision, build identifiers, Master and tenant manifest versions, reviewer, intended host and gym timezone. After a blocking fix, pin the replacement revision and rerun affected checks and the final Owner walkthrough on that build.
5. Use the owned synthetic environment for all local browser acceptance on `http://localhost:3002`, with API 3003. Use Alpha for ordinary actions and Beta for isolation. Keep separate browser profiles for each role and separate synthetic records for enrollment, renewal, recovery, completion, cancellations, no-show and payroll. Record opening balances, expected dates and the configured trainer rate before changing records. Follow the setup, sync and restart procedure after source or schema changes. [Testing setup](manual-testing.md)
6. Build and run the applicable checks from the repository root. These checks supplement the browser runs. The `*:owned` and isolated browser commands use disposable synthetic resources. [CI checks](../.github/workflows/ci.yml)

```sh
pnpm install --frozen-lockfile
pnpm check:workspace
pnpm prepare:checks
pnpm build:workspace
pnpm typecheck:workspace
pnpm lint:workspace
pnpm test:unit
pnpm --dir apps/api test:e2e
GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:pt:owned
GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:finance:owned
GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:cf:owned
GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:recovery:owned
GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:isolated
```

## 1. Manual sales and renewals with included PT credits

### Build the membership-only credit flow

1. Add **Renew membership** to the active member's **Membership & Packs** tab. Read plans from the Owner's `GET /gyms/:slug/configuration` endpoint and show only active plans for the selected gym. Show price and currency, duration, included credits and the start policy. Explain that a same-plan renewal queues after the last covered term. Use the API-confirmed dates in the success result.
2. Connect the form through an authorized web server action to `POST /gyms/:slug/members/:memberId/memberships`. Reuse `renewMembershipSchema` and the existing endpoint. Send the selected plan, current member version, start policy and a stable request key. Use `NEXT_AVAILABLE` for a queued same-plan renewal. An immediate start uses the gym-local date and must respect existing same-plan coverage.
3. Keep one request key for retries of the same command, including a lost response. On a stale member, refresh and let the Owner review the updated details before confirming another command. The current API checks the member version and reads the latest plan terms. If the saved price and duration must match the offer shown at confirmation, validate the reviewed plan version when the API creates the term. After success, reload member history and pack information so the Owner can verify the result. Preserve the existing role and gym checks, term snapshots and audit.
4. Cover the normal Owner browser journey and a double submit or lost-response retry. Use the existing API coverage for immediate and queued policies, and exercise denial for another gym or role through the web entry point. Use the [member profile](../apps/web/src/components/members/member-profile-tabs.tsx), [membership API](../apps/api/src/configuration.controller.ts) and [shared configuration contracts](../packages/contracts/src/configuration.ts).
5. Hide or disable standalone **Issue pack** and top-up controls and enforce the same launch restriction at the API entry points that create a standalone pack. Keep allowance creation through enrollment and renewal. Preserve historical credit records and approved session corrections. When the included balance is exhausted, show the actual balance and booking eligibility. A queued renewal provides credits from the next term's start. [Pack issuance](../apps/api/src/packs.controller.ts)

### Verify a bundled membership sale and renewal

1. As Alpha Owner, create an active membership plan with a known total price, currency and duration. Set **Included PT credits per term** in Gym Configuration. For example, set six credits on a 30-day plan. Create a zero-credit plan as a negative test.
2. Record one synthetic payment for the plan in the chosen cashbook. Enroll a new member with that plan and complete the one-time credential handoff. Also exercise enrollment by approving a synthetic member application for the plan as part of step 3. A completed enrollment creates one term and one linked PT allowance automatically. Confirm the Owner can finish the sale without using **Issue pack** or collecting a second payment.
3. In the Owner and Member views, verify the total plan price, term dates and included PT balance. Verify that the six credits are available for eligible appointment dates in the term and that newly issued credits start with zero held and zero consumed. The internal pack carries zero separate sale value. If the interface describes it as a separate purchase, relabel it as included with membership. Verify that the zero-credit plan creates no allowance.
4. Record one payment for a renewal. Renew the active same plan and verify the next term starts at the previous exclusive end date. The new allowance follows the new term's start and expiry. Check that credits cannot be used for a session before that allowance's start or on its exclusive end date. Old unused credits follow their original expiry. Test replay to verify one term and one linked allowance, and edit a plan to verify the original term retains its agreed price and credit entitlement.
5. Review the records and audit for the gym, Owner, member, term and linked allowance. Reconcile one membership charge per term with the gym's existing cashbook. Verify that the Owner cannot issue a standalone top-up through the browser or API, and that an exhausted balance blocks booking confirmation when no eligible credit is available. Use included credits for the booking and payroll checks in step 2. [Allowance implementation](../apps/api/src/membership-pt-allowance.ts) · [Browser scenarios E06–E10](END-TO-END-MANUAL-SCENARIOS.md#2-owner-setup-people-and-applications)

**Pass when** the cashbook accounts for one payment per initial or renewed term, the member receives the correct PT allowance automatically once per term, and the standalone issuance paths reject top-ups. For this release, use the bundled issuance check above in place of the standalone pack issue in E09.

## 2. PT booking through payroll

1. Confirm the gym timezone, Trainer availability, membership and included-credit eligibility, fixed pay and any in-shift or off-shift rate adjustment. Use a member with the bundled allowance as the only eligible credit source. Record the starting balance and payroll totals. Reserve separate records for exception cases.
2. As Member, request an eligible booking at least two hours and at most 14 days ahead. While pending, compare counts and confirm the slot is held without a credit hold. As Trainer, accept it. Verify one held credit and the same booking and saved pay terms in the authorized views. Also create one direct Owner booking to verify the second entry point.
3. At an eligible delivery time, have the trainer use **Start** and then **Complete** after the configured minimum elapsed time. Capture the active and completed states. Confirm that one included credit moves from held to consumed, the saved fixed trainer pay appears once in **Earnings** and the Owner's reports, and the completion creates no separate PT sale or duplicate membership revenue. Check member-visible notes. Use real policy timing or an approved prepared synthetic appointment on the test instance.
4. Use separate bookings to test the outcomes below. Record the quote before confirming and compare the after-state with the booked policy. Verify the audit history and the net credit and pay. [PT policy and worker behavior](PT-OPERATIONS.md)

   | Case | Expected outcome |
   | --- | --- |
   | Free early member cancellation | The held credit returns to availability. Trainer pay stays zero. |
   | Late member cancellation | One credit is consumed under the current deduction policy. Trainer pay stays zero. |
   | Unstarted no-show | The scheduled worker settles one credit once after eligibility. Trainer pay stays zero. |
   | Gym-initiated move or cancellation | Member value is preserved per the quote. A move has one valid replacement reservation and no extra member debit. |
   | Incorrect outcome | The Owner uses the reasoned correction flow. Original evidence remains in history and the compensating effect produces the correct net balance and pay. |

5. In **Financials → Payroll periods**, match the period dates, currency, session entries, corrections and exact total against the trainer's earnings and the underlying eligible session outcomes. Export the payroll report and compare it with the screen. Use **Close for review**, compare the locked total, then **Approve period**. Verify OPEN → CLOSED → APPROVED and an audit entry for each transition. Payroll approval records the obligation. Payout is handled separately. Check that later corrections preserve the closed or approved period.
6. If QR ships, scan on a phone for both start and completion, then verify expired, wrong-booking and repeated scans leave balances correct. If virtual PT ships, opt in as the trainer, request/book the virtual format, complete the session through the browser and verify equivalent credit and pay plus opt-in enforcement. [Browser scenarios E11–E17 and E21](END-TO-END-MANUAL-SCENARIOS.md)

**Pass when** both booking paths work, every exception reconciles, the ordinary completion consumes exactly one credit and creates exactly one qualifying pay entry, and the Owner closes and approves the matching total.

## 3. Account access, request notifications and privacy

### In-app request and decision notifications

| Workflow | New request | Approved | Declined |
| --- | --- | --- | --- |
| Member application | The gym Owner receives an in-app notice linking to the application queue. | The applicant receives an in-app notice linking to their application after enrollment completes. | The applicant receives an in-app notice linking to their updated application status. |
| Trainer shift request | The gym Owner receives an in-app notice linking to the pending shift review. | The requesting trainer receives an in-app notice linking to their approved shift. | The requesting trainer receives an in-app notice linking to their shift details. The existing hours stay in effect. |

1. **Member applications.** Reuse and verify the existing Owner new-application notice and applicant approval and rejection notices. Check that approval agrees with published gym access and the included PT credits. Test both final decisions on separate applications. Pending, failed and declined applications must never send an approval notice. [Member application service](../apps/api/src/member-applications.service.ts)
2. **Trainer shifts.** Add tenant notices for committed submission, approval and decline. Send the submission to the authorized Owner of the selected gym and the decision to the requesting trainer. Write each notice in the same transaction as its event and use the existing notification helper with a stable key tied to the command receipt. Use typed links to the Owner review and trainer shift details so the bell and history open the right pages. [Shift workflow](../apps/api/src/trainers.controller.ts) · [Notification helper](../apps/api/src/notifications.service.ts) · [Notification links](../packages/contracts/src/notifications.ts)
3. Run both workflows as separate Owner and requester accounts. Check the new-request notice before acting, then approve one request and decline another in each workflow. Verify one notice per recipient and committed event, correct unread counts, working links and mark-as-read behavior. Replay the actions and try a stale decision to check duplicate prevention. Verify another gym and unrelated accounts receive no notices. Confirm approved shift hours affect applicable new booking rules while existing booking terms retain their snapshots. [Browser scenarios E08, E10 and E25](END-TO-END-MANUAL-SCENARIOS.md)

### Account and privacy checks

1. In separate browser profiles, sign in as Super Admin, Owner, Trainer and Member. Onboard a synthetic member and trainer as Owner, perform first-login password changes, and exercise existing-identity consent if applicable. Confirm that an eligible locked-out account can recover through the authorized flow. Verify denial for the wrong gym and reuse of the one-time link.
2. Test the same routes through Alpha and Beta identities. Try a wrong-role route, a copied URL from the other gym, another member's private record and an unrelated trainer's client page. Verify restricted records stay private, mutations do not occur, and read-only platform support can exit and expire. Test logout and revocation. [Account operations](ACCOUNT-OPERATIONS.md)
3. Record the approved health-note access policy separately from progress-photo access. The member can read and edit their health notes. Their assigned trainer can read the notes through the client profile. Verify intended access as the member, same-gym Owner, qualifying and unrelated trainers, and foreign-gym roles. Confirm that protected values stay out of unauthorized listings, audit payloads and exports. If the approved policy differs, adjust the relevant read/write paths and rerun the matrix.
4. As a synthetic member, upload a test progress photo. Verify viewing as that member and an assigned trainer. Test denial for the Owner, unrelated accounts, crossed gyms, expired links and links reused by a different viewer. Delete it as the member and check that it disappears and an earlier link cannot fetch it from current storage.
5. Before client release, have the privacy decision owner record backup retention, deletion handling after a restore and key custody. Check that the chosen retention matches the actual backup schedule. Test access and deletion with synthetic data and verify that a restore uses the appropriate coaching key and re-applies required deletions before serving restored data. [Security and privacy review](SECURITY-REVIEW.md)

**Pass when** both workflows deliver one correctly scoped in-app notice for each new request, approval or decline to its intended recipient, onboarding and recovery work, and the privacy and gym-isolation checks pass.

## 4. Hosted testing and production recovery

**Testing pilot.** If testers need hosted access, use an approved synthetic environment and verify deployment, HTTPS, health, sign-in and gym isolation. Exercise hosted workflows when the testers will rely on them. The backup and restore steps below apply before client release.

1. Choose the approved hosted rehearsal target with synthetic data and a compatible persistent API process. Record release revisions, schema manifests, worker flags, stable hostnames, backup schedule, and agreed restore time and allowable data loss. Prepare secrets privately. Read the [hosted deployment guide](HOSTED-DEPLOYMENT.md).
2. Before changing schemas, verify the target and take the required Master and tenant backups. Use the documented read-only deployment check, then the approved pinned Master migration for the intended target. For existing tenants, verify bindings and manifest evidence and rehearse the controlled forward rollout on an owned copy. The repository's `schema-rollout.mjs` requires a disposable local run. Use an approved hosted operator procedure for an existing tenant and mark the gate blocked if the procedure or ownership proof is missing.
3. Deploy compatible API and web revisions in a coordinated window. Verify the web `/api/health`, API `/healthz` and Master readiness `/readyz`. Check deployed HTTPS, response headers, same-origin actions, sign-in and downloads. Create a synthetic gym, observe COMPLETE/ACTIVE and the correct installed tenant schema, then complete the Owner handoff. Verify Alpha/Beta isolation on the deployed build.
4. Exercise new requests, approvals and declines for member applications and trainer shifts on the hosted build. Verify Owners and requesters can open their in-app notices. Exercise due request expiry, reminders and no-show handling. Compare Owner Sessions scheduled-work health with worker logs. Rehearse an authorized interruption in the isolated hosted environment, record how the operator detects it, restart, and verify a new successful sweep without duplicate credit, pay or notifications. Complete one PT session using included membership credits and close/review a synthetic payroll period. [Provisioning runtime](PROVISIONING-RUNTIME.md)
5. Restore an actual backup from the intended release environment into new isolated targets for Master and the applicable gym databases. Verify backup identity and integrity before restore, restore privately with the compatible schema and keys, and check Master-to-gym bindings. Confirm representative member records, memberships, pack totals, sessions, trainer pay and audit. Confirm the selected gym is correct and that the other gym is unaffected. Record backup age, time to usable recovery, restored revisions, and reconciliation or repair issues. Keep the rehearsal targets disconnected from live routing and workers.
6. Record the fallback decision if deployment or verification fails. Pause affected writes during investigation when needed. Use a previously verified compatible revision only if its schema and workers remain compatible. Otherwise use the reviewed forward fix or separate authorized recovery process. The local owned recovery drill exercises isolation and validation. Complete the separate rehearsal with the intended hosted backup and operator procedure.

**Pass when** the pinned combination provisions a new gym, scheduled work resumes after interruption, and a backup from the intended setup restores to an isolated environment with the expected balances, access and audit and within the agreed limits.

## 5. Owner walkthrough and release decision

1. Give one gym Owner a short task list and synthetic logins through the approved private process. Have the Owner record one simulated payment using the existing cashbook process, enroll a member, renew a bundled plan, and verify the PT credits appear automatically for both terms. Confirm the Owner sees new requests in the app. Approve one and decline another for each membership and shift workflow. Check the decision notices with the applicants and trainers. Book or review a member request, cancel one booking, and complete another using the included credits. Verify the balance and trainer earnings, then close and review payroll.
2. Observe and record where the Owner needs help, sees misleading information, or cannot complete a task. Fix issues that block work, give access to the wrong person, or produce incorrect membership dates, credits, revenue or pay. Rerun the affected checks and the walkthrough on the final candidate. Record the Owner's acceptance and any explicitly deferred item.
3. Record **GO for testing** when the applicable pilot checks pass on the pinned build and the Owner and release lead sign off. Record **NO-GO for testing** when a required pilot check is failed or blocked.

## Evidence and sign-off

Copy this table for each candidate. Use **Pending**, **Pass**, **Fail**, or **Blocked**. Record applicable conditional checks and the agreed reason for any that are outside launch scope. Keep secrets and private records out of the report. Report historical results separately from the current run. [Release review and evidence log](RELEASE-REVIEW.md)

| Gate | Status | Tester and date | Scenario, expected and actual result | Evidence or blocker |
| --- | --- | --- | --- | --- |
| 1. Manual sales and renewals with included PT credits | Pending | | | |
| 2. PT and payroll | Pending | | | |
| 3. Request and decision notifications, account access and privacy | Pending | | | |
| 4. Deployment and restore | Pending | | | |
| 5. Owner walkthrough | Pending | | | |

```text
Candidate Git revision and web/API deployment IDs
Master schema and tenant manifest versions
Test environments and gym timezone
Confirmed launch decisions and deferred features
GO or NO-GO with reason
Gym Owner sign-off and date
Release lead sign-off and date
```

### Execution record · 2026-11-27

#### Phase 0 · Candidate preparation

- Tested source starts at `b64789ad1524f5146c0988dcf2444d0e628cca70` plus the manual PT scope and synthetic launcher changes in this phase. The local Next.js build ID is `UQx1Pv5u79zfyxsWcvwML`. The SHA-256 of the sorted API JavaScript file checksums is `cee023ba03577f0be80443668b3bf4669cf2540e2415aa2197f16046e6999b15`.
- Master manifest `master-2026-11-18.1` and tenant manifest `tenant-2026-11-19.1`. The owned synthetic Master and all three tenant databases synced successfully. Browser acceptance uses `http://localhost:3002` with API port 3003. Alpha is the working gym, Beta is the isolation control, and the gym-local timezone is `Asia/Colombo`.
- The release implementation assumes a Vercel web deployment, an always-on Render API, and dedicated PostgreSQL. The hosted rehearsal instance, authorization and operator are pending. The checked-in Free demo API sleeps, so it cannot establish scheduled-worker readiness for the release.
- The provisional plans below were selected for this candidate at the requester's direction. The existing cashbook records each payment. GymOS records the term and its credits. Manual in-person PT and in-app request notices are in scope. The approved rule consumes one PT credit for a qualifying no-show and an unstarted confirmed booking becomes eligible 15 minutes after its scheduled start. Members see the rule before submitting a PT request. QR, virtual PT, standalone top-ups, in-app cash collection and receipts, card checkout, automated GymOS billing, biometrics and attendance, native apps, wearables, AI, reviews, rewards and advanced analytics are deferred.
- Codex is the technical reviewer for local execution. Gym Owner acceptance and release decision sign-off remain open.

| Provisional plan | Total price | Term | Included PT credits |
| --- | --- | --- | --- |
| Monthly | LKR 5,000 | 30 days | 0 |
| Monthly with PT | LKR 15,000 | 30 days | 6 |

Use fresh synthetic records for direct enrollment, application approval, the zero-credit plan, queued renewal, credential recovery, ordinary completion, each cancellation or correction, no-show and payroll. Keep each role in a separate browser profile. Capture the actual start and exclusive end dates at enrollment. An enrollment on 27 November starts the first 30-day term on 27 November and the queued term on 27 December. Their exclusive end dates are 27 December and 26 January respectively. For the bundled plan, the opening balance for each allowance is six available, zero held and zero consumed from its start date. The legacy smoke-test member had seven credits available and zero held. The Alpha smoke-test trainer's quoted in-shift base pay was LKR 1,066 with a 10% off-shift premium. Alpha configuration showed a 24-hour cancellation window and a 21-minute minimum elapsed duration before completion. Recheck rates and balances for the fresh records before confirming bookings.

| Local Phase 0 check | Observed on the rebuilt source |
| --- | --- |
| Frozen install, workspace graph, prepare, build, typecheck, lint | Passed. The frozen install used the workspace's existing pnpm store in offline mode after the local default store prompted to reinstall. |
| Unit and API HTTP | Passed. Contracts 68, theme tokens 5, API units 90, pool tests 25 and API HTTP 3. The HTTP fixtures required loopback access. |
| Owned PT, finance, application and recovery suites | Passed. PT 62, finance 3, applications 5 and recovery 1. The PT suite exercises both disabled launch controls and isolated opt-in coverage for QR and virtual PT. |
| Browser and API on the owned test instance | Passed. Signed in with separate Alpha Owner, Member and Trainer profiles and a Beta Owner profile. The authorized membership and subscription screens rendered without purchase or recurring billing actions. Crossed roles and Beta Owner could not open the restricted Alpha pages. The chosen format was in-person on both booking entry points, the trainer profile omitted virtual opt-in, the member request page showed the no-show rule, and the scan-code API returned 404 with the disabled-feature response. |
| Owned fixture baseline | Passed. All four role logins and credit conservation across Alpha, Beta and Gamma. A concurrent round of browser logins triggered the documented throttle on the first attempt. The baseline passed after the one-minute window reset. |
| Isolated browser suite | Passed. 44 scenarios passed. The opt-in PayHere callback scenario was skipped with payment flags unset. |

| Gate | Status | Tester and date | Scenario, expected and actual result | Evidence or blocker |
| --- | --- | --- | --- | --- |
| 1. Manual sales and renewals with included PT credits | Pending | | | |
| 2. PT and payroll | Pending | | | |
| 3. Request and decision notifications, account access and privacy | Pending | | | |
| 4. Deployment and restore | Pending | | | Approved persistent target and operator required before hosted rehearsal. |
| 5. Owner walkthrough | Pending | | | |

#### Follow-up implementation and focused verification · 2026-11-27

The Phase 0 preparation commit is `caf2e7881263a528539ad1163bf48821e57c28b0`. The follow-up source includes Owner renewals, membership-only PT issuance and trainer shift notices. Its target schema is Master `master-2026-11-18.1` and tenant `tenant-2026-11-27.1`. At the requester's direction, the full regression suites on the follow-up source are deferred to the final verification pass.

The follow-up browser checks ran on the rebuilt and synced synthetic instance at port 3002. Web build ID `BMBh7XZzVMeOKxf6NCyFO`. API build checksum `1b74b7c9050fe0208c5fdf1570cde958b9f82feea191cae64246d4da9f13ed26`, calculated from the sorted JavaScript file checksums. The follow-up application source is now recorded at `9072a60b32e647a7cbf175667141b8c79b5725e2`.

| Gate | Status | Tester and date | Scenario, expected and actual result | Evidence or blocker |
| --- | --- | --- | --- | --- |
| 1. Manual sales and renewals with included PT credits | Pending | Codex, 2026-11-27 | Focused owned API test passed. Enrollment and renewal each issued one zero-value linked allowance. The stale reviewed plan version was rejected and replay returned the existing term. On port 3002, the Owner renewed a fresh synthetic member in the browser. The initial term started 27 November, the renewal started 27 December and expired 26 January. The queued six-credit allowance showed zero available before its start. After the browser lost a committed renewal response, retrying added exactly one term and one allowance in total. The Issue pack control was absent and standalone API issuance returned 403. | Synthetic cashbook reconciliation passed on web build `CPzjA0_QQujILBimNMJhk`. Gym Owner acceptance remains open. |
| 2. PT and payroll | Pending | Codex, 2026-11-27 | Focused owned completion passed for a membership-linked allowance. It consumed one credit, recognized zero additional PT revenue, and recorded the saved LKR 34.50 trainer pay. Four focused exception tests passed for cancellation quotes, worker no-show replay, gym cancellation and correction. The three owned finance tests passed, including a LKR 50.0000 payroll reconciliation and close/approve sequence. On port 3002, a fresh synthetic member and trainer completed first-login password changes. A pending request left all six membership credits available. Trainer acceptance held one credit, and the free cancellation quote and confirmation restored the original 6 available and 0 held. The Owner booked a separate appointment directly and its allowance showed 5 available and 1 held. The test appointments used 29 November 2026 in Asia/Colombo. | The linked delivery, exception and payroll browser walkthrough passed on web build `CPzjA0_QQujILBimNMJhk`. Owner acceptance remains open. |
| 3. Request and decision notifications, account access and privacy | Blocked | Codex, 2026-11-27 | Focused API coverage passed for per-recipient counts, replay, stale decisions, mark-as-read, and foreign gym denial. On port 3002, the Owner opened both shift requests from history and the trainer opened both decision notices at the shift section. Declining the second request preserved the approved 10:00–18:00 hours. The five owned member application tests and all 20 owned identity tests passed. The focused profile API and disposable progress-photo browser checks passed. On port 3002, two fresh applicants generated one Owner notice each. The Owner marked both read and opened the linked records. Each applicant received one decision notice, marked it read and opened the linked status. The approved applicant could open the membership page and had six credits. The declined applicant saw the public reason, had no gym access, and could not see the private Owner note. The Beta Owner session could not see the Alpha notices. The Owner application review now shows the included allowance and cashbook instructions. This copy change was rebuilt on top of `9072a60`, with web build ID `oR8a4Q16PkKqySEAGk6wr` and the same Master and tenant manifests. | The pilot needs acceptance of the approved member-and-trainer health-note policy. Backup, retention and restore checks are deferred to the production review. |
| 4. Deployment and restore | Blocked | Codex, 2026-11-27 | The Phase 0 disposable recovery test passed locally. If invited testers require remote access, verify the hosted pilot build and its required workflows. | The hosted pilot target and operator authorization are pending. The production backup schedule and restore rehearsal are outside the pilot. |
| 5. Owner walkthrough | Blocked | Codex, 2026-11-27 | Requires Owner walkthrough and release lead review on a pinned, verified candidate. | The requester will act as Owner. Pilot walkthrough acceptance and release-lead sign-off remain open. |

Release decision **NO-GO** for `9072a60b32e647a7cbf175667141b8c79b5725e2`. The tested local build still needs the outstanding pilot walkthroughs, test-host verification if applicable, and sign-off.

### Pilot scope and Owner decisions

The requester will act as the Owner reviewer. The gym records one payment per term in its cashbook and does not issue a receipt. The member and their assigned trainer may read member health notes. The member enters and updates the notes. The Owner keeps custody of the coaching encryption key. When production recovery is introduced, reapply progress-photo deletions before reopening a restored environment. Backup retention and hosted restore verification are deferred for the synthetic pilot.

Pilot health-note verification passed on the rebuilt and restarted synthetic instance. Web build `CPzjA0_QQujILBimNMJhk` used revision `9072a60` plus the working-tree policy and copy changes. On port 3002, the member could open their health-note field, the Owner profile API withheld the value, and both Owner forms omitted the field. The focused API checks passed for member editing, rejected Owner edits, assigned-trainer access and unrelated or foreign-gym denial. Pilot workflow acceptance and final sign-off remain open.

#### Membership and cashbook walkthrough · 2026-11-27

On the rebuilt synthetic site at port 3002, the Owner recorded two simulated cashbook entries of LKR 15,000 each, one before enrolling a fresh member and one before renewing. The member completed the one-time credential handoff and changed the temporary password. The cashbook total of LKR 30,000 matched two agreed membership amounts of LKR 15,000. The first term started 27 November 2026, and the renewal starts 27 December 2026 and expires 26 January 2027. Each term has one linked six-credit allowance with zero separate sale value and zero held or consumed credits. The queued credits become eligible from the renewal start date. Both terms and their included credits appeared in the member view. The walkthrough used the agreed cashbook-only process without a receipt step. Owner acceptance remains open.

#### PT delivery and payroll walkthrough · 2026-11-27

On web build `CPzjA0_QQujILBimNMJhk` at port 3002, a fresh synthetic trainer started a prepared appointment and the browser showed **Training in progress**. For the elapsed-time check, the test advanced only the newly created fixture’s delivery timestamps to represent the configured minimum duration having passed. The host clock and timing policy stayed in effect. The trainer completed the same appointment in the browser and its note was visible to the member. The balance went from six available before booking to five available and one held at start, then to five available and zero held at completion. The ledger contained one consumption. The session added zero operational PT revenue and exactly one LKR 1,066 trainer pay record.

The Owner downloaded the November payroll CSV in the browser. The completed appointment appeared once with the matching trainer pay. The November period ran from 1 November to before 1 December in Asia/Colombo. It opened at LKR 0, increased to LKR 1,066 after the appointment, and remained at LKR 1,066 through **Close for review** and **Approve period**. Both transitions appeared in the audit log. Approval recorded the obligation through the normal payroll workflow.

The remaining exception cases used separate appointments. A late member cancellation used one credit, and a gym cancellation returned its reserved credit. The scheduled worker settled an unstarted appointment once after the 15-minute cutoff. That settlement consumed one credit. The Owner reviewed and corrected the outcome in the browser, restoring that credit and retaining the original no-show in history. The exception cases created zero trainer pay, and the approved payroll periods retained their totals and versions. A focused disposable regression also passed for signed pay corrections after closed and approved periods. QR and virtual delivery are outside the pilot.

#### Final local pilot verification · 2026-11-27

The Owner reported that their review was complete. The tested web build was `zMgKOI0MOtBmWUfPM-zMO`, built from `9072a60b32e647a7cbf175667141b8c79b5725e2` plus the working-tree changes. The SHA-256 of the final tracked diff against that commit, excluding this runbook, is `17f085d34651ac3a4c1e07280cdcfd65eaa35ac5a1b6d30c3d174595f87473f8`. The only change after building was to the browser test assertion.

Workspace checks, builds, type checks, lint, unit tests, and API HTTP tests passed. Disposable suites passed all 62 PT, 3 finance, 5 application, 1 recovery, and 4 trainer tests. The rebuilt synthetic site passed four sign-ins and checks across all three gym databases.

The browser suite initially recorded 43 passes, one failure, and one skip. The failed assertion still expected the former standalone credit issuance behavior. The corrected scenario passed on the same web build and verified one membership term, one linked pack, and both audit entries. The PayHere callback scenario was skipped with the payment feature disabled for the pilot. All 44 in-scope browser scenarios passed across the full run and focused rerun.

Local verification passed. Release lead sign-off and test-host verification, if remote access is required, remain open.
