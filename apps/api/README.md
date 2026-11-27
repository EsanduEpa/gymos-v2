# GymOS API

The NestJS API owns authorization and business operations for GymOS. Master PostgreSQL stores identities, gym accounts and the gym registry. The API verifies role, gym access and schema compatibility before running gym operations against that gym's PostgreSQL database.

Run setup and workspace checks from the repository root. The hosted API build uses `pnpm build:deploy:api`. The API serves process health at `/healthz` and checks Master connectivity at `/readyz`.

- [Local setup and architecture](../../README.md)
- [Isolated testing environments](../../docs/manual-testing.md)
- [Gym provisioning and workers](../../docs/PROVISIONING-RUNTIME.md)
- [Hosted API runbook](../../docs/DEPLOY-VERCEL-RENDER-NEON.md)
