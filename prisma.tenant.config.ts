import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "packages/database-tenant/prisma/schema.prisma",
  migrations: {
    path: "packages/database-tenant/prisma/migrations",
  },
  datasource: {
    url: env("TENANT_DATABASE_URL"),
  },
});
