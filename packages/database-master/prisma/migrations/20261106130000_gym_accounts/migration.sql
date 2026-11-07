CREATE TYPE "GymAccountStatus" AS ENUM ('ACTIVE', 'SETUP_REQUIRED', 'DISABLED');

CREATE TABLE "GymAccount" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "gymId" TEXT NOT NULL,
  "username" TEXT,
  "displayName" TEXT,
  "passwordHash" TEXT,
  "status" "GymAccountStatus" NOT NULL DEFAULT 'SETUP_REQUIRED',
  "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  "credentialExpiresAt" TIMESTAMPTZ(3),
  "passwordChangedAt" TIMESTAMPTZ(3),
  "authVersion" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GymAccount_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GymAccount_credential_shape_check" CHECK (
    ("status" = 'ACTIVE' AND "username" IS NOT NULL AND "passwordHash" IS NOT NULL)
    OR ("status" <> 'ACTIVE' AND ("username" IS NULL OR "passwordHash" IS NULL OR "status" = 'DISABLED'))
  )
);

CREATE UNIQUE INDEX "GymAccount_username_key" ON "GymAccount"("username");
CREATE UNIQUE INDEX "GymAccount_userId_gymId_key" ON "GymAccount"("userId", "gymId");
CREATE INDEX "GymAccount_gymId_status_idx" ON "GymAccount"("gymId", "status");
ALTER TABLE "GymAccount" ADD CONSTRAINT "GymAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GymAccount" ADD CONSTRAINT "GymAccount_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GymAccount" ADD CONSTRAINT "GymAccount_userId_gymId_fkey" FOREIGN KEY ("userId", "gymId") REFERENCES "GymAccess"("userId", "gymId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IdentitySession" ADD COLUMN "gymAccountId" TEXT;
CREATE INDEX "IdentitySession_gymAccountId_revokedAt_idx" ON "IdentitySession"("gymAccountId", "revokedAt");
ALTER TABLE "IdentitySession" ADD CONSTRAINT "IdentitySession_gymAccountId_fkey" FOREIGN KEY ("gymAccountId") REFERENCES "GymAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve every historical identity and access link. A credential is copied
-- only when its identity has exactly one gym relationship. Shared identities
-- must establish separate credentials through an explicit verified setup flow.
INSERT INTO "GymAccount" ("id", "userId", "gymId", "username", "displayName", "passwordHash", "status", "mustChangePassword", "credentialExpiresAt", "passwordChangedAt", "authVersion", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, ga."userId", ga."gymId",
  CASE WHEN counts."total" = 1 AND u."globalRole" = 'USER' THEN u."email" ELSE NULL END,
  u."displayName",
  CASE WHEN counts."total" = 1 AND u."globalRole" = 'USER' THEN u."passwordHash" ELSE NULL END,
  CASE WHEN counts."total" = 1 AND u."globalRole" = 'USER' THEN 'ACTIVE'::"GymAccountStatus" ELSE 'SETUP_REQUIRED'::"GymAccountStatus" END,
  CASE WHEN counts."total" = 1 AND u."globalRole" = 'USER' THEN u."mustChangePassword" ELSE false END,
  CASE WHEN counts."total" = 1 AND u."globalRole" = 'USER' THEN u."credentialExpiresAt" ELSE NULL END,
  CASE WHEN counts."total" = 1 AND u."globalRole" = 'USER' THEN u."passwordChangedAt" ELSE NULL END,
  CASE WHEN counts."total" = 1 AND u."globalRole" = 'USER' THEN u."authVersion" ELSE 0 END,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "GymAccess" ga JOIN "User" u ON u."id" = ga."userId"
JOIN (SELECT "userId", COUNT(*) AS "total" FROM "GymAccess" GROUP BY "userId") counts ON counts."userId" = ga."userId";
