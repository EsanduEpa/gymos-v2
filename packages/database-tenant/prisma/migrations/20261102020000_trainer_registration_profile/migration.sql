BEGIN;

CREATE TYPE "TrainerLevel" AS ENUM ('LEVEL_1', 'LEVEL_2');

ALTER TABLE "Trainer"
  ADD COLUMN "email" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "level" "TrainerLevel",
  ADD COLUMN "specialisations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "yearsExperience" INTEGER,
  ADD COLUMN "shiftStart" TEXT,
  ADD COLUMN "shiftEnd" TEXT,
  ADD COLUMN "bio" TEXT,
  ADD CONSTRAINT "Trainer_profile_check" CHECK (
    "version" >= 0
    AND ("yearsExperience" IS NULL OR "yearsExperience" >= 0)
    AND ("shiftStart" IS NULL) = ("shiftEnd" IS NULL)
    AND ("shiftStart" IS NULL OR ("shiftStart" ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$' AND "shiftEnd" ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'))
    AND ("registrationState" <> 'COMPLETE' OR (
      "identityId" IS NOT NULL AND "enrollmentOperationId" IS NOT NULL AND "email" IS NOT NULL
      AND "phone" IS NOT NULL AND "level" IS NOT NULL
    ))
  );

CREATE UNIQUE INDEX "Trainer_email_key" ON "Trainer"("email");
CREATE INDEX "Trainer_registrationState_createdAt_id_idx" ON "Trainer"("registrationState", "createdAt", "id");

COMMIT;
