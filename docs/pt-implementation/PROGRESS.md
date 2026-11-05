# PT implementation progress

Baseline: 2026-11-06. The working tree initially contained only the user-provided untracked `docs/PT-IMPLEMENTATION-GUIDE.md`; it is preserved. Existing PT code covers owner booking, member requests, trainer decisions, lifecycle, reads and in-app notifications. Baseline booking inputs allowed multiple service types, variable duration and a 365-day horizon; no published availability or pending expiry runner was found.

## Shared data and command design checkpoint

- Availability: tenant-local versioned weekly windows, dated replacements, breaks/blocks and gym closures; mutations require scoped receipt/audit and expected version. Candidate slots are evaluated server-side and revalidated under trainer/member serialization at commit. Existing confirmed/active sessions are preserved; affected changes require an explicit review/resolution.
- PT policy: authoritative API policy for in-person, 60 elapsed minutes, one credit, 2-hour minimum notice, 14-day rolling horizon, 12-hour request lifetime and 24-hour cancellation window. Existing sessions retain stored type, times, fee/rate snapshots and remain readable.
- Pending expiry: absolute `requestExpiresAt`, explicit EXPIRED state/event and bounded indexed lookup. Foreground conflicting commands treat due requests as expired under shared locks even if scheduled work is late.
- Booking details: role-filtered session projection, sanitized state-event timeline and server-computed affordances. No member payroll/audit/receipt internals.
- Reschedule/correction: owner-only quote/commit commands with expected version, reason, idempotent receipt and immutable state/schedule/correction facts; financial changes use compensating credit/pay records and never rewrite approved payroll.
- Expiry remedy: owner-approved source allocation/unit and narrowly scoped expiry eligibility adjustment; no new value, repeated approval idempotent, membership still required on use date.
- Reminder work: durable tenant-local rows keyed by session, schedule revision, kind and recipient; bounded claims, retry/lease and state/revision recheck with notification insert in a transaction.

## Milestones

### PT-01 — Ready for review (not Verified)
Requirement IDs: R01–R03, R05, R11, R13. New owner booking/member request contracts and API guards enforce in-person, 60 minutes, and the rolling two-hour/14-day instant window; acceptance does not apply creation notice and rejects legacy terms excluded by current policy. Creation forms expose the fixed service and late-window notice. Historical read schemas remain broad. Contract tests, typechecks and owned booking integration pass. Exact inclusive-limit test and browser review remain outstanding. No schema migration was needed.

Next exact action: complete PT-02 controlled disposable integration and browser visual verification, then mark Verified only when those pass.

### PT-03 — Implemented, not Verified
Requirement IDs: R06–R07, R11, R13. Added an explicit `EXPIRED` state, tenant-local absolute `requestExpiresAt` and `availabilityVersion`, a backfill for existing pending rows, and the expiry constraint/index in additive migration `20261106020000_pt_request_expiry`. The new tenant manifest is `tenant-2026-11-06.2`; `tenant-2026-11-06.1` remains available as the preceding template. New requests persist the earlier of creation +12 hours or session start −1 hour; at most two live pending requests per member are allowed. Expiry is checked during trainer decision and member withdrawal under the existing member → trainer → session serialization, so a late command cannot accept, decline, or withdraw a due request as if it were live. Expired pending rows no longer block availability, conflict checks, owner booking, lifecycle sweeps, dashboards, or active-request lists. Expiry writes a state event, audit and in-app notifications; it reserves no credit. Owner booking now shares the member → trainer lock order and rejects conflicting pending requests.

Established the PT-03 expiry worker before reminder work: it is bounded, scans active gyms on the installed current tenant manifest, verifies tenant installation evidence, serializes per-gym sweeps, processes a bounded ordered batch, and uses stable local receipts/audit for idempotency and recovery. It is disabled in tests and can be disabled with `PT_EXPIRY_RUNNER_ENABLED=false`.

Fast checks run: contracts build and tests (55 passed); focused API unit tests (18 passed); tenant manifest verifier (1 passed); API and web TypeScript checks; Prisma tenant schema validation; all passed. `git diff --check` is being rerun after documentation edits. Not run: disposable PostgreSQL migration/request/runner/permission/concurrency integration and mobile/desktop browser review in light/dark themes. These are deferred under the user’s quick-check instruction; PT-03 is not Verified based on compilation/unit tests alone.

Next exact action: run `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.sessions.ts test/session-requests/session-requests.integration.test.ts test/sessions/session-lifecycle-cancel.integration.test.ts --disableConsoleIntercept` in an environment that permits the owned Docker socket; then add/run an owned runner integration covering expiry, retry/idempotency, tenant isolation and failure recovery, and do the deferred UI review. Continue with PT-04 only after the user’s requested milestone sequence proceeds; keep PT-03 marked not Verified until that evidence exists.

### PT-04 — Not started
Next exact action: shared role-authorized booking detail and delivery projection after PT-03.

### PT-05 — Not started
Next exact action: design and test compensating credit/pay behavior before exposing reschedule/correction/remedy controls.

### PT-06 — Not started
Next exact action: extend PT-03 runner with durable reminder claims and event coverage.

### PT-07 — Not started
Next exact action: full owned-database/browser/theme/upgrade verification after PT-01–PT-06 are individually verified.

### PT-02 — Implemented, not Verified
Requirement IDs: R04–R05, R13. Added tenant-local PT availability rules (weekly windows, dated replacement windows, trainer blocks and gym-local full-day closures), strict shared read/update/slot contracts and API-client transport. Trainer and owner availability reads/updates are fenced and role scoped; updates lock the trainer, check expected version, use idempotent receipts and audit, and reject edits that invalidate live sessions. Closure replacement is restricted to the explicit 60-day editor range. Slot discovery uses the gym timezone, 15-minute starts, 60 elapsed minutes, two-hour/14-day limits, and trainer/member conflicts. Owner booking and member request writes re-evaluate availability under trainer/member serialization. Added trainer and owner editors and slot selects to request/booking forms using existing controls/theme.

Checks run: availability evaluator unit suite passed (3); tenant manifest verifier passed (1); Prisma tenant schema validation passed; contracts package build passed; API and web typechecks passed; optimized web build passed and includes `/gyms/[slug]/trainer/availability`; `git diff --check` passed. The API availability integration test and existing booking/request disposable suites could not run: the owned harness failed to access `unix:///Users/esanduepa/.docker/run/docker.sock` before creating its disposable database (other suites also require explicit `GYMOS_TEST_ALLOW_DOCKER=1`). No browser screenshots, mobile checks, or both-theme review were performed. PT-02 remains not Verified.

Next exact action: rerun `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.sessions.ts test/sessions/session-availability.integration.test.ts --disableConsoleIntercept` in an environment that permits the owned Docker socket; then run the owner/trainer/member browser checks against rebuilt API/web artifacts, capture desktop and mobile screenshots in both existing themes, fix any failures, and record the evidence before advancing to PT-03.
