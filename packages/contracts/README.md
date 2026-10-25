# Shared API contracts

GYMOS-MIG-002 provides transport schemas, role/identity references and strict DTO factories. Feature tasks own complete request/response schemas and business bounds. These modules do not implement controllers, authorization, financial rules or frontend screens.

Build `@gymos/contracts` before `@gymos/api-client`; run each package's typecheck and test scripts. Builds only compile TypeScript and never access databases. Existing API and web applications are unchanged and do not yet consume these packages.

`legacy` describes the exact E01–E08 JSON responses, including the current capped100 member array and basic-contact create. It does not certify runtime behavior or turn E08 into enrollment. New envelopes must be introduced through a coordinated owning-task change; existing callers keep current unprefixed paths and shapes until then.

All object schemas reject unknown fields. Do not substitute permissive records/unknown schemas for public feature projections. Define owner/related-trainer/member/support projections independently; strict validation does not itself authorize a caller. Never serialize Prisma records, hashes, connection metadata or private health notes through core identity DTOs.

Money is a decimal string plus a three-letter currency syntax. Supported currencies, precision, rounding and semantic bounds remain DEC-06/feature responsibilities. No conversion through JavaScript Number is permitted for monetary calculations. Signed Money exists for approved variance/adjustment representations; ordinary Money is nonnegative.

Page metadata is full-filter count with stable ordering established by the feature; common page size25/max100, audit20 at its boundary. Empty/out-of-range pages retain correct totals. Domain summary fields must be explicitly added by a feature schema, not passed as raw JSON.

The core identity reference uses `identityId`; gym access keys remain `(identityId,gymId)`. A Member/Trainer link has its own actor ID and explicit kind. No invented surrogate access ID, same-gym multi-role support, credential-recovery policy or approved DEC-02 choice is implied.
