# DEC-04 — Recoverable operations, audit and delivery consistency

- Status: **Approved by project owner in this chat on23 October2026.**
- Prepared: 23 October 2026, Asia/Colombo.
- Resolution task: [GYMOS-MIG-080](../MIGRATION_TASK_SPECS.md#task-id-gymos-mig-080).
- Accountable reviewer: project owner with Backend reliability + Security. Actual approving reviewer/date/result: **project owner,23 October2026, “Approve all three proposals.”**
- Authority: [Master Plan](../MIGRATION_EXECUTION_PLAN.md), Database map §§7.1,7.3,8,14.1; DB08–DB10/F-D13/F-D16/F-D18.

## Preserved approved requirements

No distributed ACID transaction is assumed. Master operations, typed reciprocal actor links and tenant receipts coordinate provisioning/enrollment; tenant-local transactions protect session state, holds, settlement, value, pay, required audit and notifications. Pending actors are unpublished. Original support actor is recorded; support remains read-only. Same-key replay and different-key duplicate domain intent cannot create extra effects or replay credentials.

## Proposed decision

| Boundary | Exact proposed default |
|---|---|
| Idempotency scope | Validate a caller-supplied opaque key of16–128 printable ASCII characters without whitespace. Master provisioning scope is permanently `provision-gym:<canonical-slug>`; never change to gymId after creation. Other keys bind original identity, effective gym/support context, command kind and resource scope. Scope/key uniqueness is database-enforced. Store safe correlation IDs separately. |
| Digest | SHA-256 of UTF-8 canonical JSON: validated normalized DTO, fixed schema/command version, recursively lexicographically sorted object keys, array order retained, explicit null retained, omitted fields omitted, integers exact and money decimal strings. Reject nonfinite numbers/unsupported values. Hash-sensitive passwords before they enter digest evidence: store no password or plaintext-bearing request. For credential-bearing provisioning, use a stable operation intent excluding secrets and a separate nonreversible keyed secret-change fingerprint; document lost-response reuse behavior. Same scope/key with different intent409; never log canonical credential material. |
| Claim and lease | Claim by transaction/CAS on version; lease30seconds, heartbeat every10seconds using database time. Only current lease token/version may checkpoint. Lease expiry authorizes reconciliation of original effect IDs, not blind rerun of CREATE/database writes. Losing lease prevents new effects; an in-flight external result must be reconciled before successor work. |
| State/outcomes | Retain the Database map states `PENDING`/`MASTER_PREPARED`/`TENANT_COMMITTED`/`COMPLETE`/`FAILED_RETRYABLE`/`FAILED_FINAL`/`REPAIR_REQUIRED`, with typed completed steps and stable effect IDs. Running ownership is the lease, not a new incompatible state enum.202 means durable pending operation;200/201 committed success;409 conflicting/stale/leased;503 dependency unavailable with operationId and explicit outcome `NOT_STARTED`, `PENDING` or `UNKNOWN`. Unknown outcome is resolved by authorized status/receipt read before retry. COMPLETE replay returns allowlisted safe result, never credential. |
| Tenant transaction | Claim receipt first, then validate/version-lock authoritative resource, perform business effects, append required audit and required selected-gym in-app notification rows, finalize receipt in the same tenant transaction. Required audit/notification insert failure aborts all local effects. Notifications do not need email/push to count as AVAILABLE. Optional future external delivery uses outbox inserted locally; delivery failure never reruns business settlement. |
| Cross-plane enrollment | Master claims operation/identity/PENDING access. Tenant commits actor+term if applicable+audit+receipt. Master verifies receipt and reciprocal tuple, then commits access ACTIVE/platform audit/operation COMPLETE. Only after that may credential handoff occur. Tenant COMPLETE alone is not published. Each failure resumes original IDs/checkpoints; never delete a reused global identity as compensation. |
| Provisioning recovery | Persist immutable target name and pinned template before external create. Reconcile physical database, migration history, binding and original operation marker after crash. Unknown existing database is never adopted/dropped. Mismatched evidence becomes REPAIR_REQUIRED; explicit platform recovery only. |
| Authorization races | Read current Master identity/access/gym immediately before opening the tenant transaction; perform a second current-version check immediately before local commit. If denied, roll back. Revocation between final check and commit remains a cross-database race: record the checked versions, then status orchestration/reconciliation cancels affected future bookings/releases holds exactly once. Never claim immediate global atomic revocation. A strict zero-race guarantee would require a reviewed coordinating lock/token protocol, outside this default. |
| Audit/event keys | Use Database map §7.3 exactly: `ta1:SHA256(canonicalJson([masterGymId,receiptId,eventCode,resourceType,resourceId,eventOrdinal]))`, `ma1:SHA256(canonicalJson([operationId,stepCode,eventCode,resourceType,resourceId,eventOrdinal]))`, or `mv1:SHA256(canonicalJson([resourceType,resourceId,committedVersion,eventCode,eventOrdinal]))`. No ambiguous string concatenation/random defaults. Notification uniqueness additionally binds derived recipient identity+type. UNIQUE keys prevent duplicate events; domain constraints independently prevent duplicate effects. Same key with different canonical content is integrity failure, not skipDuplicates. Audit contains actor, effective gym, support original actor, resource IDs, timestamp and redacted transition; no secret/private health text. |
| Retention | Keep operation metadata, receipts and audit at least90days; no automatic pruning in this tranche. Financial provenance/domain uniqueness keys persist beyond replay retention. Future retention/privacy policy must review longer requirements;90days is a development minimum, not a legal compliance assertion. |
| Safe result | Positive field allowlist only: operationId/state/step/version/resource IDs, publication/notification state, retryability and refresh scope identifiers. No password/hash/token/proof, database name/URL, arbitrary request/audit JSON or health data. Actor/role authorization applies again when retrieving status. |

## Alternatives and tradeoffs

| Alternative | Tradeoff versus proposed default |
|---|---|
| Long synchronous API provisioning | Simpler execution path but request timeouts leave unknown external effects; proposed durable operations permit worker recovery. |
| Audit/notifications after business commit | Better write availability but creates ambiguous failure/duplicates; rejected for required in-app evidence. Optional deliveries can queue safely. |
| Distributed coordinator for all gym writes | Could give stricter revocation serialization, but increases availability/locking complexity. Proposed fail-closed checks plus explicit reconciliation acknowledge remaining race. |
| Short receipt deletion | Less storage but weakens replay/recovery; no automated pruning until retention is reviewed. |

## Implementation impact and expected tests

Affected: GYMOS-MIG-004,005,017,018,021–026,027,031,033,036,038,040–048,056,060,069 and080.004 owns reusable operation/receipt/event-key primitives; actual domain endpoints remain in their slice tasks. Schema adds immutable scope/digest/version/lease/effect IDs, receipt/event uniqueness and safe-result metadata. Command-status/retry authorization is explicit, not a new broad admin bypass.

1. Same key/body after lost response returns one result; changed normalized intent409; another key cannot bypass unique settlement/hold/pay/registration constraints. Arrays with changed order change digest; semantically identical object key order does not.
2. Concurrent claims produce one lease owner. Heartbeat/fencing blocks a stale worker checkpoint; expired leases reconcile actual external success before retry.
3. Inject failure after each Master checkpoint, physical create, tenant commit and final activation. Recovery keeps original target/IDs and never publishes Master-pending actors or repeats money/audit/notification.
4. Required audit/notification insert failure rolls back session/credit/value/pay. Successful request/response produces one selected-gym notification, no arbitrary recipient and no duplicate event on replay.
5. Revocation at each authorization boundary denies or compensates future eligibility according to recorded versions; tests document the final-check/commit race rather than claiming distributed atomicity.
6. Safe status/retry denies foreign caller/context, exposes no secrets and reports pending/unknown distinctly. Day91 retains required records because no pruning job exists.

Tests are future requirements, not executed outcomes. Approval must record actual reviewer/date/result; rejection leaves source unchanged and dependent work blocked pending revision.

## Approval record

The project owner explicitly approved DEC-02, DEC-04 and DEC-05 together in this chat on23 October2026. The defaults above are accepted for dependent implementation; existing MVP scope remains unchanged. This does not authorize production deployment, shared-data reset, external credential rotation or V1 edits.

## Owner-directed trainer access fence — 3 November 2026

The project owner explicitly authorized a stricter serialization boundary for Tasks 038, 041 and 042. Owner booking and trainer acceptance must hold `GymAccess` share locks for the selected owner/member/trainer identities in the same Master transaction that remains open through the local tenant transaction commit. Trainer deactivation takes an update lock on that same trainer `GymAccess` row and revokes it before tenant status and cancellation work. If booking or acceptance wins the lock, it commits before deactivation proceeds and is included in the cancellation sweep; if deactivation wins, the command waits, then fails closed after observing the revoked link. Reactivation publishes ACTIVE access only after tenant status is ACTIVE and cancellation recovery is complete. This is an ordered workflow using two database transactions, not distributed ACID; an interrupted saga remains denied and resumes from its durable operation and tenant receipts. Locks are row- and gym-scoped, so a separate access row for the same identity in another gym remains independent. No network delivery or other unbounded effect may run while a fence lock is held. This amendment does not add payment, fee or rescheduling behavior.
