# Segment 03 handoff — 31 October 2026

Status: **IN PROGRESS — tasks 021–026 implemented and locally verified; final all-11 hosted checks pending.** Automated completion and owner manual acceptance are separate. Segment 02 owner manual acceptance remains **PENDING**, as expressly allowed by the owner. No Segment 04 implementation was started.

## Review boundary

One attached worktree; separate branch `codex/segment-03-platform-lifecycle`, based on Segment 02 `0c969eb7a6b89322e0eba582b031bbc2d7dba115`. Historical checkpoints: reservation `daeff3c`, worker `277a24f`, owner activation `736cfec`, registry/support `2d87e8c`, lifecycle `1240072`. The final schema rollout and integrated regression changes follow these checkpoints.

[PR #3](https://github.com/EsanduEpa/gymos-v2/pull/3) is draft and unmerged. Implementation revision: [`5052c7a`](https://github.com/EsanduEpa/gymos-v2/commit/5052c7a0af552983f06553fc3fd41266962a6acc). Base must be `codex/segment-02-identity-shell`. [PR #2](https://github.com/EsanduEpa/gymos-v2/pull/2) depends on [PR #1](https://github.com/EsanduEpa/gymos-v2/pull/1); both were inspected in signed-in Google Chrome and remain draft/unmerged at `0c969eb` and `e45a334`, respectively. No Segment 03 work was added to those branches. After owner-authorized prerequisite merges, retarget this PR and recheck all 11 jobs on the latest revision. Resolve review conversations and obtain explicit owner merge authorization. The private plan does not enforce branch protection; the [manual safeguard](SEGMENT_01_FINALIZATION.md#owner-approved-manual-merge-safeguard--30-october-2026) applies. Nothing here authorizes merging.

## Verified implementation

- [021](evidence/GYMOS-MIG-021.md): strict idempotent reservation, canonical slug, server-generated target, durable operation, safe pending/status/retry UI. Invalid/forbidden requests cannot create physical databases.
- [022](evidence/GYMOS-MIG-022.md): bounded controlled worker, immutable pinned artifact, positive original ownership, physical lock, database-clock fenced leases, recoverable checkpoints and reconciliation. Unknown targets remain repair-required; no destructive compensation.
- [023](evidence/GYMOS-MIG-023.md): verified current-password consent for existing identities, unchanged existing password, reciprocal access/config/receipt proof, default Classic theme, atomic Master activation, original-actor one-time credential issue/reissue/acknowledgment. Partial gyms stay unavailable.
- [024](evidence/GYMOS-MIG-024.md): paginated Master registry and explicitly refreshed bounded count snapshots; honest freshness/unavailable state. Reasoned, audited, expiring selected-gym read-only support, persistent viewing banner and exit; ordinary commands/private health/person records/secrets are excluded. No cross-tenant request fanout.
- [025](evidence/GYMOS-MIG-025.md): versioned reasoned suspension blocks admission before draining; failures stay blocked, data/terms preserved. Reactivation verifies actual schema/binding/owner before publishing. Other gyms remain available.
- [026](evidence/GYMOS-MIG-026.md): explicit pinned Master deploy and tenant canary/batch runner; supported mixed V2 manifests, actual installed history/catalog evidence, per-target checkpoints, explicit fresh canary approval, evidence-reviewed repair, failed-ledger refusal. No request/build/startup performs DDL.

[Platform runbook](runbooks/platform-lifecycle.md) contains controlled CLI commands, expected states, local ownership safeguards, manifest pins, support/privacy rules and recovery limits. New Master/tenant SQL is additive; applied migration files were not rewritten. The old tenant manifest remains immutable and supported.

## Local verification

Node 24.22.0, pnpm 9.15.0, production Next.js 16.4.2, Chromium, owned disposable local PostgreSQL 17. All commands below exited 0 in their final runs. No V1 execution/modification, real provider mutation or real customer fixtures. Resource cleanup is asserted by each harness.

| Command | Final result |
|---|---|
| `pnpm build:workspace` | Packages, Nest and production web build passed |
| `pnpm lint:workspace` | Passed |
| `pnpm typecheck:workspace` | Passed |
| `pnpm check:workspace`; `git diff --check` | Passed |
| `pnpm test:unit` | Contracts 24, client 14, theme 5, API 19, pools 25 passed |
| `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.platform.ts --disableConsoleIntercept` | 31/31: reservation 3, worker 7, owner 3, support 5, lifecycle 4, rollout 9 |
| `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.operations.ts --disableConsoleIntercept` | Operation foundation 10/10 |
| `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:recovery:owned` | Encrypted isolated recovery 1/1; 8 databases/container/manifest cleaned |
| `GYMOS_TEST_ALLOW_DOCKER=1 pnpm test:isolated` | Browser 10/10; 7 databases/container/manifest cleaned |

Identity 10/10 and tenancy 20/20 passed during owner/schema integration; final hosted jobs rerun both. Actual rollout fixtures contain old four-migration and current five-migration schemas. Tests cover duplicate/conflicting/concurrent intents, role/gym rejection, fault boundaries, external-success/Master response loss, expired leases, unknown ownership, consent/reuse, private support denial, held work during suspension, healthy Gym B, failed canary/migration/marker/checkpoint, checksum tamper and reviewed repair. The least-privilege worker test uses a dedicated CREATEDB/CREATEROLE login without superuser; its missing generated-role membership was corrected and the test passes. The current encrypted restore drill verifies new targets, switch/rollback and unchanged Gym B; local timings do not establish managed-provider DR.

Browser checks use real HTTP/cookies and persistent fixture data. The harness now waits for session listeners and restarts only its owned API between scenarios to isolate in-memory request budgets. A separate live 429 scenario proves limits remain enabled. An earlier fixed count assumed no prior fixture writes; it now checks actual stored counts. No guard, rate limit or assertion was weakened. Captures cover current admin pending, registry/support desktop and 320px, and suspension/reactivation. Auth-suite tracing/automatic screenshots are disabled; one-time credentials are not captured. Historical evidence images from prior segments were restored.

## Hosted verification

[Run 41172077267](https://github.com/EsanduEpa/gymos-v2/actions/runs/41172077267) at `5052c7a` passed 10/11 jobs, including the browser and all database suites; dependency review failed closed. Diagnosis reproduced locally: pnpm9 JSON audit exits1 for any advisory before applying the display severity threshold. Its valid response had two moderate, zero high and zero critical advisories; the previous validator incorrectly classified that response as unverifiable. The installed pnpm9.15 source confirms this control flow. The validator now checks all five nonnegative integer counts and exit consistency; malformed/error/process failure responses still fail, and high/critical findings still block the proposed revision. Eight regression tests pass and run inside the existing unit job. No job or audit threshold was removed. The owner specifically approved npm audit metadata egress after automatic review blocked local reproduction. Base/proposed live audits then exited0 with no high/critical findings; moderate findings remain visible. Final all-11 verification is pending on the corrected revision. A successful earlier revision never bypasses checks for later commits.

## Pending owner checks and limitations

Use only disposable V2 identities/resources and the runbook; never operate on a real provider for this review.

1. On `/admin`, reserve a unique gym and retry the same intent; inspect one pending operation and safe progress. Use the owned controlled worker to finish; verify one owner/access/theme and complete the one-time handoff without saving a secret in evidence.
2. Select Gym A with a reason; confirm the persistent viewing banner, summary-only read surface, disabled selected action and explicit exit. Switch to Gym B and confirm A's context disappears. Try Tab/Shift+Tab/Escape at 320px. Confirm no editing/private health screen is available in support.
3. With an owner tab open, confirm a reasoned suspension, then focus/navigate that tab; private access must stop while Gym B works. Reactivate after verified health and confirm existing data returns.
4. Run the owned canary example: inspect the pause, explicit fresh approval, remaining batch and recorded installed version. Inspect failed-marker/ledger evidence and the documented repair boundary; do not resolve migration history automatically.
5. Complete the separate Segment 02 manual shell/session checks, still pending. Inspect latest PR checks/conversations before considering any merge.

Task 087 remains open for provider/capacity/environment/topology/release choices. Current drain/admission guarantees are for the bounded local process under test; distributed deployment coordination is not claimed. Restore ownership bootstrap for a new managed-provider target needs a separately reviewed positive ownership record; this runner will not adopt an unknown restored database. Supported-browser/OS/full feature visual acceptance remains task 065. No billing, support editing, new business domain, deployment or independent specialist review is claimed. Esandu retains decision review and manual acceptance responsibility.
