# GYMOS-MIG-025 — Suspension/reactivation checkpoint

31 October 2026; following registry/support revision `2d87e8c`. Implemented and locally verified; final hosted verification and owner manual acceptance remain pending.

Platform lifecycle commands require an expected Gym version, 10–500 character reason and stable idempotency key. An immutable private lifecycle intent binds the operation; public status contains only allowlisted state/version/target metadata. A repeated key resumes/replays its original intent. Different intent, stale version, conflicting in-flight operation, wrong role and foreign operation are rejected. Required status/operation audits retain the original actor and reference the reason-bearing intent.

Suspension publishes Master SUSPENDED before draining local tenant leases. New ordinary API reads/writes and old tokens cannot bypass it. Existing leases settle before success; a failed/late drain leaves the gym blocked with a resumable operation. Administrative reads pause during the controlled transition, share the existing pool budget, and cannot race pool reopening. Explicit read-only support remains available after the transition. Master-local theme writes recheck access inside the status-serialized transaction. No gym database, history, identity or member/trainer business status is deleted/rewritten.

Reactivation drains first, fully verifies the actual installed migration/catalog manifest, then checks binding, VERIFIED SchemaState, recorded operation/version/digest and active OWNER access. It publishes ACTIVE with a version CAS/audit only after those checks; it does not migrate or infer billing entitlement. Failed health stays SUSPENDED. Resume rechecks health and cannot skip it based on a prior checkpoint. Registry recovery controls expose the original incomplete operation. Confirmation UI preserves reason/key, reports unknown outcomes, and requires explicit confirmation.

Local verification, all exit 0:

- Workspace build; API/web lint and TypeScript; diff checks.
- Owned lifecycle integration 4/4: held live lease while status blocks new access, old token/cached pool denial, reads/writes/theme denial, same-key replay/digest conflict, stale/wrong role/foreign cases, bad marker503, missing owner, drain failure, lease expiry/fencing and all status/checkpoint/response-loss boundaries. Each final status version/audit occurs once; Gym B and retained member data remain unchanged. Six databases/container cleaned.
- Combined platform integration 21/21 across reservation, worker, owner, support and lifecycle; all five owned environments cleaned.
- Pool/admission regression 25/25; operation/guard regression 8/8.
- Real browser lifecycle journey 1/1: reason validation/confirmation, 320px dialog, suspension denies old owner navigation, B stays ACTIVE, verified reactivation restores the same owner session. Six databases/container/manifest cleaned. [Confirmation](GYMOS-MIG-025/suspend-confirmation-320.png), [reactivated registry](GYMOS-MIG-025/reactivated-registry.png) visually inspected.

The initial lifecycle run exposed an unsupported PostgreSQL void result from a new advisory-lock query. It now uses the foundation's `SELECT 1 ... FROM pg_advisory_xact_lock` form. The test's held request also now releases during cleanup on assertion failure. Its first stuck disposable container was explicitly identified by exact run/name/label, PostgreSQL image, local Unix Docker context and loopback binding, then removed; no unknown/provider resource was targeted.

Queued ordinary business work remains unavailable while Master is SUSPENDED and must reauthorize after reactivation. Only explicit reviewed maintenance/support paths bypass suspended pool admission, with their own checks. This evidence covers the owned local API process; provider topology, capacity, cross-instance rollout/drain coordination and deployment approval remain task 087 release gates. No production/distributed-drain capability is claimed. Task 026 controlled schema lifecycle remains pending; Segment 03 is not complete.
