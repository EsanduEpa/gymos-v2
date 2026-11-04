# Segment 08 execution evidence — 4 November 2026

Continuation from pushed commit `c1c7067` on `codex/segment-08-finance`; continuation commit `91ee6ab` is pushed. Draft review PR [#9](https://github.com/EsanduEpa/gymos-v2/pull/9) is open against `main`. Hosted checks were queried at `91ee6ab`; all 11 were still `in_progress` at inspection. Segment 09 work was not started.

## Implemented task scope

- **049:** Owner operational revenue/deferred and trainer-own earnings reads, strict contracts/client, explicit null cash and no GET-created payroll period.
- **053:** Exact daily membership allocation and separate session-pack available/held/expired value.
- **054–055:** Additive expense/budget schema migration, exact owner expense writes/listing, replay/audit, seven categories and full-month variance.
- **056:** Owner close/approve and owner/trainer period reads; advisory/row locks, versioned receipts/audit, exact total reconciliation and no payout.
- **057:** Six finance panels and full-window P&L; session-linked earning and payroll basis by scheduled source date, membership accrual by local day, salary category separate to prevent double count.
- **058:** Owner-only bounded dashboard and manual/30-second refresh with stale-response sequencing.
- **059:** Three bounded gym-local analytics series and sanitized cached platform summaries with stale/partial suppression and at-most-25 refresh batches.
- **060:** Owner filtered/paged audit screen with strict event taxonomy, stable server order and safe transition fields.
- **061:** Authenticated bounded CSV for revenue, expenses, payroll and current audit page; BOM/CRLF/quoting/formula defense, safe filename, no-store/nosniff and audited export.

## Verified checks

- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:finance:owned`: **3/3 passed** on owned disposable PostgreSQL; cleanup reported six databases dropped, temporary container removed and manifest removed. Added stale/missing/failed platform-cache coverage and 25-row cursor batches; audit stable ordering over 27 same-time rows; expense audit-fault rollback; competing budget create and update races; competing payroll close and idempotent retry. The injected audit failure is expected and all expense/audit/receipt counts remain unchanged.
- `pnpm --dir apps/api exec vitest run --config vitest.config.session-lifecycle.ts test/session-lifecycle/session-lifecycle.integration.test.ts -t "writes a signed correction after a close wins"`: **1/1 passed**; late completion after close yields signed correction provenance.
- `pnpm --dir packages/contracts build && pnpm --dir packages/contracts test`: **54/54 passed**.
- `pnpm --dir apps/api exec vitest run src/finance/finance-arithmetic.spec.ts`: **5/5 passed** (membership/pack arithmetic, CSV bytes/formula safety, trainer shift defaults/overnight).
- `pnpm lint:workspace`: passed, no warnings after cleanup.
- `pnpm typecheck:workspace`: passed.
- `pnpm build:workspace`: passed; Next production build compiled, typechecked and generated 41 pages/routes.
- `pnpm exec prisma validate --schema packages/database-tenant/prisma/schema.prisma`: passed.
- `pnpm check:workspace`: passed (5 packages; workspace graph valid).
- Tenant migration SHA-256 matches template manifest: `6cc8f78e5b4119deea1bca5dee6f64fa6fe9585c948d2d98019fe84953e4cace`.

The finance DB suite verifies expense role denials, precision rejection, replay/audit with one effect, budget replay and variance, full-window P&L reconciliation, membership/session recognition without a cash claim, payroll by source-session date and no payout/duplicate record, trainer privacy, two-gym isolation, >100 expense CSV rows, formula defense, filtered audit CSV and export audit, owner dashboard shape/access, analytics windows/shape/access, and bounded export date rejection.

## Exact remaining acceptance by task

- **049:** implementation and finance DB owner/trainer/foreign-gym/read-purity evidence are complete. Pending visible owner/trainer finance review and independent upstream 046/047 acceptance; task 048 remains outside this scope.
- **053:** implementation and arithmetic/DB reconciliation are complete. Pending explicit source-data matrix for timezone, suspension, expiry, partial and zero allocation dispositions.
- **054:** implementation, invalid precision, replay, foreign-gym denial, rollback fault injection, and stable >page audit fixture are complete. Pending stale-version case review and visible form/access/browser review.
- **055:** implementation, seven categories/full-window variance, duplicate-create and competing update conflicts (one success/one conflict at version 0), and zero budget semantics are complete. Pending month-edge fixture/review plus visible UI.
- **056:** implementation, owner/trainer scope, exact approval reconciliation/no payout, competing close race, idempotent close retry, and signed late-completion correction provenance are complete. Pending explicit configuration-change fixture/review plus visible payroll review.
- **057:** implementation and DB P&L reconciliation are complete. Pending all-six-panel visible review, cross-month visual/chart parity, responsive/loading/empty/error states, and exact currency/window/asOf inspection.
- **058:** implementation and bounded owner DB shape are complete. Pending local-midnight/two-hour boundary fixture, selected-gym switch, overlapping refresh, empty/error labels, and visible review.
- **059:** implementation and fresh/stale/missing/failed platform summary, null-suppression, 25-item cursor continuation, and gym analytics DB shapes are complete. Pending explicit analytics 30-day/six-month edge and zero-denominator fixture, and visible chart/refresh review.
- **060:** implementation and 27-row stable same-time page ordering/filter fixture are complete. Pending redaction/support-original-actor/second-gym specific assertions and visible audit UI review.
- **061:** implementation and owned DB row-cap/formula/BOM/audit/auth cases plus helper CSV quoting tests are complete. Pending visible attachment download verification for MIME/filename/cancellation and browser review.
- **Cross-cutting:** Chrome control became unavailable (`noWindowsAvailable`, followed by `timeoutReached`; state inventory reports “The browser access host is unavailable”), so the visible O01/O10/O11/O13/T06 walkthrough could not be performed. The correct signed-in Chrome window had been confirmed and a GitHub compare/creation form for `main` ← `codex/segment-08-finance` was visible, but that is not an application walkthrough. Hosted check inspection for head `91ee6ab` showed 8 success, 2 in progress (Browser isolation and Owned disposable database), and Build cancelled when superseded. The later docs-only head `5ae753d` had a queued workflow and zero check-runs at inspection. Draft PR creation is complete. No independent owner approval is claimed. No merge or deploy was attempted.

All ten tasks have implementation complete, but remain **In Progress** because their listed acceptance gates are not all satisfied. Segment 09 remains untouched.

## Continuation from ef81213

Commit `3626b00` was pushed to PR #9. Owned finance PostgreSQL passed 3/3 after added allocation, stale conflict, month-edge, local-midnight/two-hour, empty analytics, audit redaction/actor/isolation and CSV header assertions. Web lint, workspace typecheck and web production build passed. A later six-month member-growth boundary fixture exposed and fixed a UTC-naive timestamp comparison; the two affected DB cases passed 2/2. The platform suite reproduced workflow 41806974436's database failure as an outdated unavailable-summary test expectation; the affected support suite passed 5/5 after updating it. Browser isolation reproduced five stale owner-roster route expectations, which were updated for `/owner/members`; the four route-sensitive browser checks passed, then the remaining add-member redirect case passed after a production web rebuild (5 affected checks passing).

Workflow 41806974436 finished **failure** at `ef81213`: 9 jobs succeeded; Owned disposable database tests and Browser isolation test failed. GitHub's available credential returned 403 for job logs, so local equivalent commands supplied the concrete failures. PR #9 remains open and draft. Chrome's browser access host remained unavailable; the native Chrome handle then returned `noWindowsAvailable`, so no application window could be verified or visible walkthrough performed.

## Delegated visible acceptance continuation from `c273c76`

The user delegated agent-performed review on synthetic disposable fixtures. Fixture `apps/api/test/support/visible-walkthrough.fixture.ts` now starts the API and production web app on reserved loopback ports, waits up to 30 seconds for explicit API/web readiness, emits one JSON readiness record with the synthetic users, app/API URLs and stop-file path, holds two isolated synthetic gyms, and cleans the owned container/databases when stopped. Fixture inserts use gym-local payroll boundaries so `TrainerPayPeriod` constraint policy remains intact. Runs confirm cleanup (`droppedDatabases: 6`, container and manifest removed). Never point this fixture at a shared/non-disposable database.

Visible Chrome window `GymOS V2` was confirmed and used one session at a time. On the initial disposable run, owner Alpha showed the local dashboard (`Asia/Colombo`, 06:00–22:00 two-hour windows and LKR 250 completed-session earning; metric copy disclaims physical attendance), and the multi-owner switched Alpha to Beta. Beta showed zero operational revenue and empty windows without Alpha data; refresh was clicked twice. Owner Alpha created a synthetic RENT expense of LKR 125 for Nov 4 and edited the category budget to LKR 500; UI showed LKR 125 actual and -LKR 375 variance. The six tabs Revenue, Expenses, Deferred, Payroll, P&L and Export were reviewed. Payroll showed the Nov monthly open period with LKR 50 and one record, without closing/approving. P&L reconciled LKR 281.02 operational earnings less LKR 125 non-salary expenses and LKR 50 trainer payroll to LKR 106.02 surplus; SALARIES remained separately shown as zero. Revenue labels showed LKR, Nov 1–4 window and `asOf`; the 30-day and six-month Analytics views, audit filter and 20+6 page navigation were reviewed. CSV download completed in Chrome as `gymos-test-gym-alpha-ebab226f610f16d4-revenue-2026-11-01-2026-11-04.csv` (688 bytes, CSV text). Browser exposes no cancellation control after this fast completed download; cancellation propagation is covered by the automated web proxy signal test, but a visible in-progress cancellation was not demonstrated.

The 393×852 iPhone 16 responsive emulation displayed the finance page in a single-column layout, with stacked date filters/cards and wrapped labels. Beta provided visible empty revenue/analytics states; route navigation displayed its loading state. A visible finance error state and a chart-specific mobile layout were not demonstrated, so tasks whose completion condition includes those visible states remain In Progress.

Follow-up at `965446a` confirmed the finance failure-feedback state in Chrome using `?tab=export&exportError=1`: it states that no file was delivered and prompts a corrected retry. A mobile rendering defect was found in the chart rows: labels, counts and units ran together because `.dashboard-chart` had no styles. Added a small responsive grid layout for its existing row children. The web production build compiled and typechecked, and rebuilt Chrome at 393×852 visibly showed separate hour/month labels, right-aligned values and units with row separators. The same follow-up verified six-month analytics empty utilization and populated zero/nonzero chart rows.

The rebuilt visual verification used a second guarded fixture after the first run had already been stopped. Its readiness record used loopback app/API ports and synthetic Alpha/Beta gyms; cleanup again reported six databases dropped, container and manifest removed. A normal-sandbox start attempt was denied Docker socket access before creating resources; the authorized guarded retry succeeded. No shared/project database was used. A transient React hydration console warning appeared on a route transition and disappeared on full navigation; it was not reproduced and remains inconclusive. The finance visible error state is verified. Dashboard refresh error and overlapping response ordering were not conclusively visible. The fast CSV completed before Chrome exposed an in-progress cancellation control; automated cancellation propagation and header checks remain the evidence for that behavior.

During review, trainer login reached the generic “No tools available yet” placeholder even though My earnings was a valid authorized tool. The route itself was not an authorization failure: direct My earnings worked and returned one own LKR 50 row. Diagnosis showed the login server action redirected trainers to `/trainer`, bypassing the route component redirect. Login now routes a single-gym trainer directly to `/trainer/earnings`; dashboard navigation also points its home item there. On the rebuilt disposable app, trainer sign-in visibly landed on My earnings, with one earned session, LKR 50 and an open Nov pay period. The owner revenue page on the rebuilt app displayed membership allocations at local dates Nov 1, 2 and 3 (fixing prior UTC date drift to Oct 31), plus the Nov 4 completed session. Payroll list response validation had separately failed with a Zod issue at `items[0].currency`; the service now returns configured currency and the owned integration test asserts it.

The final routing fix centralizes trainer landing selection for sign-in, home, gym selection and the gym role root. A second rebuilt fixture visibly verified trainer sign-in and manually opening `/trainer` both end at `/trainer/earnings`. That verification fixture was stopped with the recorded stop file and again cleaned six databases, its container and manifest.

Checks after these observed defects: web lint, web typecheck, web production build, API build, API lint (one pre-existing unused `monthStart` warning) passed. Guarded disposable `segment08.integration.test.ts` passed 3/3 after its stale-cache timestamp was made relative to PostgreSQL clock with a two-hour age (the original 1 ms margin was nondeterministic). Cleanup reported six databases dropped and the temporary container and manifest removed. The original 11/11 hosted checks at `c273c76` remain valid for that unchanged revision; they do not validate the fixes below. The corrected revision must receive fresh hosted checks.

| Task | Status after this review | Evidence / open gate |
|---|---|---|
| 049 | In Progress | Visible owner/trainer earnings review complete; independent upstream 046/047 acceptance remains separate and open. |
| 053 | Complete | Timezone, expiry/suspension, partial and zero allocation matrix plus visible values reconciled. |
| 054 | Complete | Stale version behavior and visible expense creation/draft-preserving form review passed. |
| 055 | Complete | February month-edge and visible budget edit/variance review passed. |
| 056 | Complete | Configuration-change snapshot fixture and visible owner/trainer payroll projections passed; no payout claim/action. |
| 057 | Complete | Six panels, cross-month P&L, currency/window/asOf, mobile layout, chart row layout, loading/empty and visible finance error feedback reviewed. |
| 058 | In Progress | Local midnight/two-hour, gym switch, empty state and refresh action reviewed; visible overlapping-response ordering and dashboard refresh-error feedback remain. |
| 059 | Complete | 30-day/six-month edges, zero denominators, chart view, currency/window/asOf and empty second-gym analytics reviewed; boundary DB fixtures pass. |
| 060 | Complete | Visible filters and 20+6 pagination; DB evidence verifies original support actor, redaction and second-gym isolation. |
| 061 | In Progress | Attachment filename/type verified; browser download cancellation UI was unavailable after the 688-byte download completed. Automated proxy cancellation remains covered. |

Review was performed by the agent under the user's explicit delegation. It is not recorded as independent owner approval. No merge, deployment, Segment 09 work or 046/047 task status change occurred.

## Hosted check follow-up

Revision `0cfaa82` triggered workflow `41817359026`. Ten of eleven required checks passed, including the owned disposable database suite; Browser isolation failed on exactly two stale assertions: password-reset trainer login expected the old `/trainer` root instead of `/trainer/earnings`, and role-shell accessibility expected a “Trainer workspace” primary link instead of “My earnings”. Updated those two browser expectations without changing production behavior and reran only those cases locally: **2/2 passed** on guarded disposable PostgreSQL, with cleanup reporting six databases dropped and container/manifest removed. A fresh full hosted run is required for the resulting test-only revision.

At revision `965446a`, workflow `41818221951` had 10/11 required checks passed at first inspection, with Owned disposable database tests still running. This is not the final head after the responsive chart CSS fix. Revision `428a191` is pushed to PR #9; hosted checks are queued/loading and not yet reported as complete. Do not treat the earlier 11/11 `c273c76` run as evidence for the CSS change. Chrome Checks page showed the new PR head `428a191`, but check details were still loading at final inspection.

Cleanup audit also found four abandoned containers bearing `gymos.test.run` labels. Each was a matching `gymos-mig-test-<runId>` PostgreSQL 17 container with tmpfs data, loopback-only random port, 41–59 minutes old and no established client connection; those four containers were removed. The active project Compose database was not touched. The earlier visible fixture run was stopped via its recorded stop-file and reported six databases/container/manifest cleaned. Subsequent fixture runs likewise reported cleanup.
