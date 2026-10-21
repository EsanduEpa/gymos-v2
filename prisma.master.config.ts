import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "packages/database-master/prisma/schema.prisma",
  migrations: {
    path: "packages/database-master/prisma/migrations",
  },
  datasource: {
    url: env("MASTER_DATABASE_URL"),
  },
});
