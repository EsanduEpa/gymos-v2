ALTER TYPE "OperationKind" ADD VALUE IF NOT EXISTS 'CHANGE_TRAINER_ACCESS';

CREATE TABLE "TrainerLifecycleIntent" (
  "operationId" TEXT NOT NULL,
  "trainerId" TEXT NOT NULL,
  "expectedAccessVersion" INTEGER NOT NULL,
  "expectedTrainerVersion" INTEGER NOT NULL,
  "targetStatus" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainerLifecycleIntent_pkey" PRIMARY KEY ("operationId"),
  CONSTRAINT "TrainerLifecycleIntent_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TrainerLifecycleIntent_expectedVersion_check" CHECK ("expectedTrainerVersion" >= 0),
  CONSTRAINT "TrainerLifecycleIntent_accessVersion_check" CHECK ("expectedAccessVersion" >= 0),
  CONSTRAINT "TrainerLifecycleIntent_targetStatus_check" CHECK ("targetStatus" IN ('ACTIVE', 'DEACTIVATED')),
  CONSTRAINT "TrainerLifecycleIntent_reason_check" CHECK (char_length(btrim("reason")) BETWEEN 1 AND 500)
);
CREATE INDEX "TrainerLifecycleIntent_trainerId_createdAt_idx" ON "TrainerLifecycleIntent"("trainerId", "createdAt");
