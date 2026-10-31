# GYMOS-MIG-021 — Provisioning reservation checkpoint

> **Integrated completion — 31 October 2026:** task 021 is Completed. Code/CI revision `0b7c909` passed all 11 hosted checks in [run 41172437503](https://github.com/EsanduEpa/gymos-v2/actions/runs/41172437503), after local platform 31/browser 10/operations 10/recovery 1 and build/lint/type/workspace/unit verification. [Segment 03 handoff](../SEGMENT_03_HANDOFF.md) records exact commands, fixtures, review boundaries and pending owner manual checks. Earlier checkpoints below are historical; owner acceptance and merge are not implied.

Date: 30 October 2026. Branch `codex/segment-03-platform-lifecycle`, based on `0c969eb`. Status: **Implemented reservation boundary; locally verified. Full Segment 03/hosted integration pending.** No owner manual acceptance is claimed.

PRs #1/#2 were inspected in signed-in Chrome: both remain draft/unmerged, at `e45a334` and `0c969eb`. This branch depends on unmerged PR #2 and does not modify its branch. Segment 02 owner manual review is explicitly pending under the owner's Segment 03 authorization.

The existing operation foundation now permits domain preparation inside its key-claim transaction. Reservation creates one generated database target, one PROVISIONING Gym, immutable private provisioning intent, pinned manifest, and required audit atomically. Key lookup precedes Gym/identity duplicate checks. Client input cannot select database targets or supply an owner password. Currency/timezone are required; approved MVP currencies are LKR/USD. Existing identity reuse is reserved for private consent rather than rejected or reset; actual consent/activation belongs to 023. Pending gyms have no owner access or new identity and remain unavailable.

POST `/admin/gyms` returns a strict safe operation projection (202 pending), with guarded status/retry endpoints and current platform-actor checks. Foreign platform callers cannot inspect another actor's operation. No physical database, migration process or password generation runs in the API request. The web form retains a stable request key, maps unknown outcomes to checking the unchanged original request, and displays pending/error/status feedback. The existing registry list remains until task 024's presentation work.

Local verification, Node 24.22.0 / pnpm 9.15.0:

| Command | Result |
|---|---|
| `pnpm exec prisma generate --config prisma.master.config.ts` | 0; client generation only |
| `pnpm build:workspace` | 0 |
| Web/API lint and `pnpm typecheck:workspace` | 0 |
| `pnpm check:workspace` | 0 |
| Contracts tests / API-client tests | 0; 21/21 and 13/13 |
| Owned platform integration (`vitest.config.platform.ts`) | 0; 3/3; four disposable databases/container cleaned |
| Owned operation foundation (`vitest.config.operations.ts`) | 0; 10/10; four disposable databases/container cleaned |
| Owned browser `--grep 'platform form'` | 0; 1/1; six disposable databases/container/manifest cleaned |
| `git diff --check` | 0 |

API checks cover five simultaneous same-key requests (one operation/Gym/intent, zero physical targets and zero new identities), lost-response replay, changed body/slug, different-key slug collision, strict target/password injection rejection, invalid currency/timezone/key, wrong role/revoked token, foreign operation status, sanitized projections, and existing identity password/version unchanged. Browser checks cover real form submission, same-key HTTP replay, status refresh, no target leakage, and 320px overflow. [Pending UI](GYMOS-MIG-021/pending-320.png).

An initial browser attempt failed because a selector omitted hint text in a shared field's accessible label. Corrected the selector; assertions were preserved. No V1 application/database or shared/provider database was executed or modified. This checkpoint does not claim task 022 physical recovery, task 023 owner activation, all 11 hosted verification or Segment 03 completion.
