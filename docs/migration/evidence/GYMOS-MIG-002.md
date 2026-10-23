# GYMOS-MIG-002 — Shared contracts and typed transport evidence

Recorded23 October2026 on `codex/gymos-mig-001-010`. Prerequisite001 baseline passed before source changes. Scope: pure shared packages, compatibility/decision documentation and tests; no controllers/pages/Prisma models or database operations.

## Delivered

- `packages/contracts`: strict read/page/command/failure/Money/date/identity/actor/composite-access schemas and approved idempotency-key syntax. Legacy export covers all E01–E08 response shapes without changing current callers.
- `packages/api-client`: injectable typed fetch, runtime response parsing, no-store/manual redirects, safe header/origin validation, no token logging and no automatic command retries. Unknown outcomes remain nonretryable until reconciliation.
- [Contract/compatibility boundary](../contracts/CORE_CONTRACTS.md) records field/error/page conventions and each current endpoint's auth/shape/evolution owner. Domain authorization and business bounds remain in their feature tasks.
- Shared package manifests/exports/TypeScript configurations, package README files and focused Node tests. No new third-party library/version was introduced; Zod4.6.7 and TypeScript6.0.3 reuse the installed/locked versions. Lockfile adds workspace importers and package-manager peer-key normalization, without a dependency version upgrade.
- DEC-01–DEC-12 triaged; project owner explicitly approved [DEC-02](../decisions/DEC-02.md), [DEC-04](../decisions/DEC-04.md) and [DEC-05](../decisions/DEC-05.md). Other decision families remain open. These approvals do not authorize production deployment/V1 edits/remote rotation.

## Verification

[Exact command results](GYMOS-MIG-002/command-results.json) and numbered logs record six successful commands: contracts/client builds, both no-emit typechecks and both test suites. **29 tests passed:17 contract tests and12 transport tests; zero failed/skipped.** Tests cover all eight legacy pairs, strict secret rejection, independent actor IDs, decimal/date validation, accurate pagination, malformed coercions,16–128-character key boundaries, current long-slug compatibility, safe URL/token handling, conflicts, explicit unknown outcomes,5xx/network/HTML/redirect failures and no retries.

Independent source review found unsafe retry classification, key-syntax mismatch, credential-bearing native header errors, permissive page coercion, absent forced-change classification and legacy slug restriction. All were corrected with regression cases. The initial post-review build exposed a Zod pipeline input-type incompatibility; [attempt-1](GYMOS-MIG-002/attempt-1/command-results.json) preserves that failure. Replacing broad coercion with explicit decimal-digit/number normalization passed the final build/typecheck/test run.

The first offline install refused an outdated lock; a second offline attempt reported an incomplete local store. An authorized registry-enabled `pnpm install --ignore-scripts --no-frozen-lockfile` restored the workspace and linked the new packages using existing versions. No package lifecycle/database scripts were executed. Ignored package `dist` output is build evidence, not committed source.

Not applicable: real DB/API role/browser/visual tests, because no endpoint, authorization implementation or screen changes in this task. Fixture contracts do not certify live endpoint security. No screenshot/runtime-domain success is claimed. V1 unchanged. Existing API/web runtime revalidation belongs to the final affected-change checks for this tranche.

Task002 acceptance is satisfied for the specified shared-core scope. Feature-specific schemas/handlers, enrollment/forced-change APIs and all financial/session logic remain with their owning tasks. Next003 requires approved DEC-02/task078 (now recorded);004/005/006 additionally consume approved080/081.
