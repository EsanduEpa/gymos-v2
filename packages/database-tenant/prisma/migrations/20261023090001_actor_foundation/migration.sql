BEGIN;
CREATE TYPE "MemberRegistrationState" AS ENUM ('BASIC', 'PENDING', 'COMPLETE', 'FAILED');
CREATE TYPE "TrainerRegistrationState" AS ENUM ('PENDING', 'COMPLETE', 'FAILED');
CREATE TYPE "TrainerStatus" AS ENUM ('ACTIVE', 'DEACTIVATED');
ALTER TABLE "Member"
  ADD COLUMN "identityId" TEXT,
  ADD COLUMN "registrationState" "MemberRegistrationState" NOT NULL DEFAULT 'BASIC',
  ADD COLUMN "enrollmentOperationId" TEXT,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0,
  ADD CONSTRAINT "Member_registration_check" CHECK (
    "version" >= 0
    AND ("registrationState" <> 'BASIC' OR ("identityId" IS NULL AND "enrollmentOperationId" IS NULL))
    AND ("registrationState" <> 'COMPLETE' OR ("identityId" IS NOT NULL AND "enrollmentOperationId" IS NOT NULL))
  );
CREATE UNIQUE INDEX "Member_identityId_key" ON "Member"("identityId");
CREATE UNIQUE INDEX "Member_enrollmentOperationId_key" ON "Member"("enrollmentOperationId");
CREATE TABLE "Trainer" (
  "id" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "identityId" TEXT,
  "registrationState" "TrainerRegistrationState" NOT NULL DEFAULT 'PENDING',
  "enrollmentOperationId" TEXT,
  "status" "TrainerStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Trainer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Trainer_registration_check" CHECK (
    "version" >= 0 AND ("registrationState" <> 'COMPLETE' OR ("identityId" IS NOT NULL AND "enrollmentOperationId" IS NOT NULL))
  )
);
CREATE UNIQUE INDEX "Trainer_identityId_key" ON "Trainer"("identityId");
CREATE UNIQUE INDEX "Trainer_enrollmentOperationId_key" ON "Trainer"("enrollmentOperationId");
COMMIT;
