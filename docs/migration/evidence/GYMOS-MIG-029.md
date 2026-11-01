# GYMOS-MIG-029 — Rates, trainer pay and cancellation policy

Status: **Automated verification completed; owner manual acceptance pending.**

## Implementation

- Added exact decimal storage and strict update validation for standard, level 2, and introductory session fees; trainer percentage rates; pay period; cancellation window; late-cancel deduction; and minimum session duration.
- Zero remains valid; blank optional fees remain distinct from zero. Every configuration version is retained by a database trigger, and updates emit tenant audit/command records.
- Added the corresponding V1-order owner form tabs and policy notices. The fixed approved no-show entitlement rule is described and cannot be toggled.

## Verification

- Owned API integration passed checks for zero and null values, 2-place currency precision, percentage bounds, unknown fields, stale versions, and immutable pre-change configuration snapshot values.
- Workspace type check/lint/build and API platform suite passed; the platform suite includes 32/32 passing cases.
- Browser suite passed 11/11, including narrow-screen no-overflow.

Existing session and payroll workflows remain owned by later tasks; this change stores configuration versions and does not implement those out-of-scope workflows.

Hosted verification passed all 11 required jobs on implementation revision `c9af453` in [run 41210839760](https://github.com/EsanduEpa/gymos-v2/actions/runs/41210839760). The draft PR remains unmerged. Owner manual acceptance is a separate pending gate.
