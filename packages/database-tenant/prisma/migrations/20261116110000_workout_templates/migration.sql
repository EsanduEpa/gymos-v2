CREATE TABLE "WorkoutTemplate" (
  "id" TEXT NOT NULL,
  "trainerId" TEXT NOT NULL,
  "sourcePlanId" TEXT NOT NULL,
  "sourceRevision" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkoutTemplate_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WorkoutTemplate_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "WorkoutTemplate_trainerId_sourcePlanId_sourceRevision_key"
  ON "WorkoutTemplate"("trainerId", "sourcePlanId", "sourceRevision");
CREATE INDEX "WorkoutTemplate_trainerId_createdAt_id_idx"
  ON "WorkoutTemplate"("trainerId", "createdAt" DESC, "id" DESC);
