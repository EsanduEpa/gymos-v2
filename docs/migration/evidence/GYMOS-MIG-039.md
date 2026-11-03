# GYMOS-MIG-039 — member trainer directory

Status: **In Progress**. The member-safe directory API and responsive V2 directory page are implemented and tested. Task 042 now supplies the selected-gym request route and booking-option policy; the directory link is verified to open that route. Hosted and owner-visible acceptance remain open.

## Implemented

- `GET /gyms/:slug/me/trainer-directory` is MEMBER-only, searches trainer name and pages up to 100 rows.
- Publication requires active Master gym access, a completed `REGISTER_TRAINER` operation, a matching committed tenant receipt, a complete tenant Trainer actor and `ACTIVE` status.
- The strict member DTO contains ID, name, level, specialisations, biography and null rating only. It omits email, phone, Master identity ID, pay, and internal actor fields.
- The slug-scoped member page renders loading/error/empty states, safe trainer cards, name search, paging and request links preserving gym and trainer IDs. Ratings are described as unavailable until member submissions exist.

## Verification

- `pnpm --dir packages/contracts build` — exit 0.
- `pnpm --dir apps/api exec tsc -p tsconfig.json --noEmit` — exit 0.
- `pnpm --dir apps/web exec tsc -p tsconfig.json --noEmit` — exit 0.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/api exec vitest run --config vitest.config.trainers.ts --disableConsoleIntercept` — exit 0; the shared 1/1 disposable integration test verified MEMBER-only access, active publication, hidden deactivated trainer, 100-row paging, and private field omission across 106 enrolled trainers and two gyms. Cleanup removed six owned databases, the container and run manifest.
- `pnpm build:workspace` — exit 0.
- `GYMOS_TEST_ALLOW_DOCKER=1 pnpm --dir apps/web test:e2e --grep 'trainer roster/profile and member directory'` — exit 0; 1/1 guarded two-gym browser test at 390px. It checks no horizontal page overflow, card privacy, the selected trainer ID in the request href, follows the link to `Request a trainer`, submits a pending request, and exercises trainer acceptance/decline and member-visible decline reason. Cleanup dropped six disposable databases and removed the container and run manifest. Detailed Task 042 results are in [042 evidence](GYMOS-MIG-042.md).

## Visual review

Codex reviewed the captured 390px member directory: [member directory screenshot](GYMOS-MIG-039/member-directory-390.png). This was agent review of automated browser output, not an independent owner browser session.

## Remaining acceptance

- Task 042 now supplies the M02 request page/options and guarded API checks for eligibility. The directory browser test follows its selected-gym trainer link; missing/inactive trainer handling remains covered by Task 042's API boundary rather than the directory page journey.
- Re-run on a committed revision, complete owner-visible Chrome review and hosted PR checks before moving to Verified/Completed.
