# DEC-06 — Exact money and operational earning policy

- Status: **Approved by project owner Esandu — 30 October 2026.**
- Prepared: 26 October 2026, Asia/Colombo.
- Resolution task: [GYMOS-MIG-082](../MIGRATION_TASK_SPECS.md#task-id-gymos-mig-082).
- Accountable reviewer: Esandu, project owner; owner explicitly accepts the decision-review responsibilities.
- Authority: Master Plan; Database map DB06; Functionality map F-D07/F-D10.

## Preserved approved requirements

All money is exact and belongs to one gym currency. Membership earning is term based; pack earning is divided across consumed credits. Missed/late and expired-unused amounts are separate operational categories. Issuing entitlement is not a payment event, and payment/subscription processing is outside MVP.

## Proposed decision

| Area | Exact proposed default |
|---|---|
| Supported currencies | Use a deployment allowlist of active ISO 4217 codes whose official minor-unit precision is 0–4. Ship MVP with `LKR` and `USD` enabled. Adding a code is configuration plus a reviewed minor-unit fixture; no FX conversion is provided. |
| Storage/API | Monetary amounts use PostgreSQL/Prisma `Decimal(19,4)`; rates/ratios use `Decimal(9,6)`. APIs use canonical non-exponent decimal strings. Floating-point values are rejected at money boundaries. |
| Validation | Amounts are nonnegative unless the schema explicitly represents a signed correction. Input scale cannot exceed currency minor units for customer-entered prices; calculated storage may use four decimals. |
| Rounding | Final currency amounts use round-half-up at the configured ISO minor unit. Intermediate multiplication/division keeps four decimals and rounds only at the named allocation or reporting boundary. |
| Pack allocation | Convert pack price to integer minor units. Divide by credit count; assign the base quotient to every credit and one additional minor unit to the first `remainder` credits in deterministic consumption order. The allocations always sum exactly to pack price. |
| Consumption order | DEC-07 selects the pack. Within a pack, credit ordinals are immutable; repeated settlement uses the same stored ordinal/allocation. |
| Membership earning | Divide term price in minor units across gym-local covered dates using the same quotient/remainder method. Earlier dates receive residual minor units. Recognize a day's operational earning once for each elapsed covered date. |
| Suspension | Owner-confirmed 30 October 2026: suspension stops eligibility but does not pause or extend the purchased term. Daily membership operational earning continues on the original allocation schedule through the original expiry. This creates no new charge or payment. Memberships and packs cannot be frozen; suspension does not extend expiry or automatically create a refund. |
| Expired unused pack value | Keep it in a separate `EXPIRED_UNUSED` operational report line. MVP creates no revenue/payment/accounting event from expiry. |
| Missed/late value | A settled charged session earns its stored credit allocation and is classified separately from completed-session earning. It is never merged into expired-unused value. |
| Zero budget | Budget `0` is valid. Spend `0` means amount variance `0` and status `ON_TRACK`; spend above `0` means variance equals spend and status `OVER_BUDGET`. Percentage utilization is `null`, not infinity or zero. |
| Reports | Return amount strings, currency, policy/version provenance, time basis and category. Cross-currency totals are forbidden; reports group by currency or reject mixed input. |

## Alternatives and tradeoffs

| Alternative | Tradeoff versus proposal |
|---|---|
| Enable every ISO code immediately | Wider market coverage, but unreviewed minor-unit metadata can produce wrong allocations. The allowlist makes support explicit. |
| Banker's rounding | Can reduce aggregate bias, but customer-facing allocation becomes harder to explain. Deterministic residual allocation already preserves exact totals. |
| Recognize all unused value on suspension/expiry | Produces a simple total, but invents an accounting policy not otherwise approved. Separate operational lines preserve facts. |
| Store integer minor units only | Very strict for settled values, but rates and multi-step calculations still need higher precision. Decimal storage plus integer allocation boundaries is clearer. |

## Schema/API impact

- Gym configuration stores currency once, with a constraint against the deployment allowlist.
- Money columns use `Decimal(19,4)` and carry currency through their aggregate boundary.
- Packs and membership terms store immutable allocation totals/counts and policy versions.
- Earning rows use unique provenance keys and category enums such as `COMPLETED`, `MISSED_LATE`, `UNEARNED` and `EXPIRED_UNUSED`.
- Reports use nullable percentage fields and never serialize numeric money as JSON numbers.

## Expected tests

1. `100.00` across three credits allocates `33.34`, `33.33`, `33.33`; retries preserve the same allocations and exact total.
2. Zero- and three-decimal configured currencies round at their correct minor unit; excess-scale input fails.
3. No report crosses currencies or emits float/scientific notation.
4. Suspension preserves the original expiry and daily membership allocation; pack expiry produces a separate unused line without a payment/revenue event.
5. A charged missed session and completed session keep distinct categories while preserving the same stored credit value.
6. Zero budget produces the defined status/variance and a `null` percentage without divide-by-zero.

These are future implementation tests. No accounting compliance claim or application behavior is made by this proposal.

## Approval record

Project owner Esandu requested finalization on 30 October 2026 after discussing the proposals and confirming the business amendments. Record owner authorization to finalize these proposals with those amendments. No separate accountable reviewer approval is claimed; reviewer sign-off remains pending.

## Project-owner clarification — 30 October 2026

The owner explicitly confirmed continued daily membership earning during suspension, original expiry without freezes/extensions, and no additional payment event. This supersedes the former suspension proposal. Other DEC-06 details and reviewer sign-off remain pending; this clarification is not blanket approval or implementation evidence.

## Finalization boundary — 30 October 2026

Owner authorization is recorded from this conversation. Historical proposal/preparation statements above describe earlier checkpoints. This document approves policy, not feature implementation; the final owner review disposition supersedes the earlier separate-reviewer gate. See [finalization record](../SEGMENT_01_FINALIZATION.md) for current verification and scope.

## Final owner review disposition — 30 October 2026

Esandu explicitly stated that decision review will be performed by the project owner and that this is acceptable. This supersedes the separate-reviewer gate and historical pending-review statements above. DEC-06 is approved under owner review with the recorded amendments. No independent specialist review is claimed. This approves policy, not implementation or production release.
