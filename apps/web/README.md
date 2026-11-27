# GymOS web

The Next.js app serves the Super Admin, Gym Owner, Trainer and Member workspaces. Server-side requests use `GYMOS_API_URL` to reach the GymOS API. Use `GYMOS_WEB_ORIGIN` for the browser origin.

From the repository root, `pnpm build:deploy:web` builds the web app and its shared workspace dependencies. Production TypeScript checking uses `tsconfig.json`. The workspace type check uses `tsconfig.test.json` to also validate browser fixtures that import compiled API modules.

- [Local setup and architecture](../../README.md)
- [Manual acceptance testing on port 3002](../../docs/manual-testing.md)
- [Vercel deployment runbook](../../docs/DEPLOY-VERCEL-RENDER-NEON.md#6-create-the-vercel-frontend)
