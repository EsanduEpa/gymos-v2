BEGIN;

-- Inventory only: never rewrite/merge a conflicting development identity.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "User"
    WHERE "email" COLLATE "C" !~ '^[!-~]+$'
       OR "email" COLLATE "C" <> lower(btrim("email") COLLATE "C")
  ) OR EXISTS (
    SELECT lower(btrim("email") COLLATE "C") FROM "User"
    GROUP BY lower(btrim("email") COLLATE "C") HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Identity canonical-email preflight failed; review a redacted read-only inventory before a separately approved repair';
  END IF;
END $$;

CREATE TYPE "AccessLinkStatus" AS ENUM ('PENDING', 'ACTIVE', 'FAILED', 'REVOKED');
CREATE TYPE "ActorKind" AS ENUM ('MEMBER', 'TRAINER');
ALTER TABLE "User"
  ADD COLUMN "displayName" TEXT,
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "passwordChangedAt" TIMESTAMPTZ(3),
  ADD COLUMN "credentialExpiresAt" TIMESTAMPTZ(3),
  ADD CONSTRAINT "User_email_canonical_check" CHECK (
    "email" COLLATE "C" ~ '^[!-~]+$'
    AND "email" COLLATE "C" = lower(btrim("email") COLLATE "C")
  ),
  ADD CONSTRAINT "User_security_versions_check" CHECK ("authVersion" >= 0 AND "version" >= 0);
CREATE UNIQUE INDEX "User_email_normalized_key" ON "User" ((lower(btrim("email") COLLATE "C")));

ALTER TABLE "GymAccess"
  ADD COLUMN "linkStatus" "AccessLinkStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "actorKind" "ActorKind",
  ADD COLUMN "tenantActorId" TEXT,
  ADD COLUMN "enrollmentOperationId" TEXT,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0,
  ADD CONSTRAINT "GymAccess_version_check" CHECK ("version" >= 0),
  ADD CONSTRAINT "GymAccess_actor_shape_check" CHECK (
    ("role" = 'OWNER' AND "actorKind" IS NULL AND "tenantActorId" IS NULL)
    OR ("role" = 'MEMBER' AND ("actorKind" IS NULL OR "actorKind" = 'MEMBER')
      AND ("linkStatus" <> 'ACTIVE' OR ("actorKind" IS NOT NULL AND "actorKind" = 'MEMBER' AND "tenantActorId" IS NOT NULL AND "enrollmentOperationId" IS NOT NULL)))
    OR ("role" = 'TRAINER' AND ("actorKind" IS NULL OR "actorKind" = 'TRAINER')
      AND ("linkStatus" <> 'ACTIVE' OR ("actorKind" IS NOT NULL AND "actorKind" = 'TRAINER' AND "tenantActorId" IS NOT NULL AND "enrollmentOperationId" IS NOT NULL)))
  );
CREATE UNIQUE INDEX "GymAccess_gymId_actorKind_tenantActorId_key" ON "GymAccess"("gymId", "actorKind", "tenantActorId");
-- Preserve the existing authorized OWNER slice, without publishing unlinked roles.
UPDATE "GymAccess" a SET "linkStatus" = 'ACTIVE'
FROM "Gym" g WHERE a."gymId" = g."id" AND a."role" = 'OWNER' AND g."status" = 'ACTIVE';

CREATE TABLE "EnrollmentProof" (
  "id" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "gymId" TEXT NOT NULL,
  "role" "GymRole" NOT NULL,
  "enrollmentOperationId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "authVersion" INTEGER NOT NULL,
  "issuedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "consumedAt" TIMESTAMPTZ(3),
  CONSTRAINT "EnrollmentProof_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EnrollmentProof_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "EnrollmentProof_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "EnrollmentProof_security_check" CHECK (
    "authVersion" >= 0 AND "tokenHash" ~ '^[0-9a-f]{64}$' AND "expiresAt" > "issuedAt"
    AND ("consumedAt" IS NULL OR "consumedAt" >= "issuedAt")
  )
);
CREATE UNIQUE INDEX "EnrollmentProof_tokenHash_key" ON "EnrollmentProof"("tokenHash");
CREATE UNIQUE INDEX "EnrollmentProof_identityId_gymId_role_enrollmentOperationId_key" ON "EnrollmentProof"("identityId", "gymId", "role", "enrollmentOperationId");
CREATE INDEX "EnrollmentProof_expiresAt_idx" ON "EnrollmentProof"("expiresAt");
COMMIT;
