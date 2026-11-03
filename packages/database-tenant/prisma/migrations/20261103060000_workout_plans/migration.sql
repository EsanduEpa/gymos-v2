BEGIN;

CREATE TABLE "WorkoutPlan" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "trainerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkoutPlan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WorkoutPlan_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "WorkoutPlan_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "WorkoutPlan_name_length_check" CHECK (char_length("name") BETWEEN 1 AND 120),
  CONSTRAINT "WorkoutPlan_description_length_check" CHECK ("description" IS NULL OR char_length("description") <= 4000)
);
CREATE INDEX "WorkoutPlan_memberId_createdAt_id_idx" ON "WorkoutPlan"("memberId", "createdAt" DESC, "id" DESC);
CREATE INDEX "WorkoutPlan_trainerId_createdAt_id_idx" ON "WorkoutPlan"("trainerId", "createdAt" DESC, "id" DESC);

CREATE TABLE "WorkoutExercise" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "sets" INTEGER NOT NULL,
  "reps" INTEGER,
  "weightKg" DECIMAL(7,3),
  "durationMinutes" INTEGER,
  "notes" TEXT,
  CONSTRAINT "WorkoutExercise_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WorkoutExercise_planId_fkey" FOREIGN KEY ("planId") REFERENCES "WorkoutPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "WorkoutExercise_planId_sortOrder_key" UNIQUE ("planId", "sortOrder"),
  CONSTRAINT "WorkoutExercise_sortOrder_check" CHECK ("sortOrder" BETWEEN 0 AND 99),
  CONSTRAINT "WorkoutExercise_name_length_check" CHECK (char_length("name") BETWEEN 1 AND 120),
  CONSTRAINT "WorkoutExercise_sets_check" CHECK ("sets" BETWEEN 1 AND 100),
  CONSTRAINT "WorkoutExercise_reps_check" CHECK ("reps" IS NULL OR "reps" BETWEEN 1 AND 1000),
  CONSTRAINT "WorkoutExercise_weight_check" CHECK ("weightKg" IS NULL OR "weightKg" BETWEEN 0 AND 1000),
  CONSTRAINT "WorkoutExercise_duration_check" CHECK ("durationMinutes" IS NULL OR "durationMinutes" BETWEEN 1 AND 1440),
  CONSTRAINT "WorkoutExercise_notes_length_check" CHECK ("notes" IS NULL OR char_length("notes") <= 4000)
);
CREATE INDEX "WorkoutExercise_planId_sortOrder_idx" ON "WorkoutExercise"("planId", "sortOrder");

COMMIT;
