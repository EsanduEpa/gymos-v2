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

Next exact action: PT-02 additive tenant availability/closure schema and manifest, followed by scoped API slot evaluation and themed trainer/owner editor.

### PT-02 — Not started
Next exact action: implement versioned weekly/dated windows, blocks and closures with schema verification; then implement server slot evaluation and mutation review.

### PT-03 — Not started
Next exact action after PT-02: add two-pending limit, absolute expiry and explicit terminal outcome; establish bounded server-side tenant runner before exposing expiry-dependent flows.

### PT-04 — Not started
Next exact action: shared role-authorized booking detail and delivery projection after PT-03.

### PT-05 — Not started
Next exact action: design and test compensating credit/pay behavior before exposing reschedule/correction/remedy controls.

### PT-06 — Not started
Next exact action: extend PT-03 runner with durable reminder claims and event coverage.

### PT-07 — Not started
Next exact action: full owned-database/browser/theme/upgrade verification after PT-01–PT-06 are individually verified.
