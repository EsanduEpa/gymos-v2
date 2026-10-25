# GYMOS-MIG-002 — Shared contract and compatibility boundary

Implemented packages: `@gymos/contracts` and `@gymos/api-client`. Existing web/API controllers and response shapes are unchanged by this task. New common envelopes are opt-in building blocks for their owning feature tasks, not newly implemented routes. Build contracts before the client; each package has build, typecheck and test commands. Package builds compile TypeScript only and perform no database operations.

## Common conventions

- Strict objects reject unknown properties, including raw Prisma/password/database/health fields on identity DTOs. Backend projection and authorization are still mandatory; runtime schemas do not grant access.
- Reads use `{data,meta:{requestId,asOf,gymSlug?,currency?,timeZone?}}`; pages use25/default,100/max and full-filter totals. Audit supplies20 at its feature boundary. Query input accepts only integer numbers or decimal digit strings, never booleans/arrays/hex/exponents. Empty/out-of-range pages retain correct totals.
- Money is a nonnegative decimal string plus uppercase three-letter currency syntax; signed Money is separate for approved variance/adjustment DTOs. No Number conversion or precision/currency-support assumption. DEC-06 still controls supported currencies, scale and rounding.
- Identity and typed actor IDs are independent. The GymAccess key remains `(identityId,gymId)`; no fabricated access ID. These are safe core references, not the full C01/session implementation.
- `Idempotency-Key` is16–128 printable nonwhitespace ASCII characters, exactly preserving the approved DEC-04 key. The client never retries a command automatically. Domain handlers must require keys and enforce local receipt/domain uniqueness where specified.
- Future errors:401 unauthenticated;403 forbidden/`PASSWORD_CHANGE_REQUIRED`;404 missing/foreign resource;400 `INVALID_INPUT` for malformed transport;409 conflict/stale;422 `VALIDATION` for domain rejection;429 limited;503 unavailable. This preserves the functionality map's distinction between malformed input and domain rejection. Existing Nest400 errors remain unchanged. The Master Plan's shorthand422 field-validation wording is interpreted at the appropriate domain boundary, rather than breaking current400 callers.
- A network loss, invalid mutation result,5xx mutation or explicit `OUTCOME_UNKNOWN` means reconcile before retry; the client exposes a nonretryable unknown-outcome error even if an upstream envelope incorrectly sets retryable=true. Raw legacy/Nest errors and failed schema bodies are not retained. No global token state/logging, redirect following or token-bearing URLs.

## E01–E08 compatibility

The `@gymos/contracts/legacy` export records actual current response shapes. Fixtures exercise each pair. Source existing paths have no global `/v1` prefix. This task changes neither route registration nor input validation/status behavior; later coordinated slices own evolution.

| Existing operation | Current auth / validation | Response retained | Future owning task |
|---|---|---|---|
| E01 POST `/auth/login` | Anonymous,5/min; strict email/password, Argon2/JWT | accessToken/tokenType/expiresIn/globalRole/gyms{id,slug,name,role} |016/020: reviewed session/forced-change evolution; web token stays server-side |
| E02 GET `/admin/gyms` | Super Admin | Array id/name/slug/status |024: coordinated paged registry; current array not wrapped here |
| E03 POST `/admin/gyms` | Super Admin; strict name/slug/ownerEmail/ownerPassword | id/name/slug/ACTIVE |021–023: durable pending/generated credential/verified reuse; current DTO unchanged |
| E04 GET `/gyms/:slug/theme` | Public ACTIVE gym | slug/name/theme primaryColor/logoUrl |011/015: version/audit/editor; safe public fields only |
| E05 PATCH `/gyms/:slug/theme` | OWNER+current access; hex/HTTPS logo | slug/theme |015: coordinated versioned write; extra theme fields stay deferred |
| E06 GET `/gyms/:slug/access` | Current gym access | gymId/slug/role |018/019: context/actor gates; no database name in DTO |
| E07 GET `/gyms/:slug/members` | OWNER/TRAINER currently | At most100 selected basic contacts, array |032/C09 and050/C30: paged owner/relationship-safe trainer reads |
| E08 POST `/gyms/:slug/members` | OWNER; strict name/optional email | Basic member id/fullName/email/status/createdAt |031/032: retain basic concept; full registration is separate C12 |

Legacy slug validation deliberately has no new100-character cap because current E03 validates syntax without a length bound. The new common slug cap is not silently imposed on old responses. No response fixture is a real HTTP integration or authorization test.

## Decision triage

DEC-02/04/05 received explicit project-owner approval in this chat on23 October2026; see their signed proposal files. Focused resolution tasks078/080/081 record that approval. DEC-01/03/06–12 remain open for their own dependent work. No payment/subscription/global inbox/progress scope is introduced. Exposed V1 credential owner is Esandu; rotation status remains unknown and is tracked under task010.

Existing applications have not been rewired to these packages. Feature-specific DTO fields, pages, controllers, authentication policies and business services remain owned by their task specifications. No database test or screenshot is required to prove these pure shared contract/transport changes; live guards, actor publication and HTTP authorization are tested by their implementation tasks.
