BEGIN;

ALTER TABLE "WorkoutPlan"
  ADD COLUMN "scheduledDate" DATE,
  ADD COLUMN "scheduledWeekdays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  ADD CONSTRAINT "WorkoutPlan_schedule_check" CHECK (
    "scheduledWeekdays" <@ ARRAY[1,2,3,4,5,6,7]
    AND cardinality("scheduledWeekdays") <= 7
    AND ("scheduledDate" IS NULL OR cardinality("scheduledWeekdays") = 0)
  );

ALTER TABLE "WorkoutExercise"
  ADD COLUMN "restSeconds" INTEGER,
  ADD CONSTRAINT "WorkoutExercise_restSeconds_check" CHECK ("restSeconds" BETWEEN 0 AND 3600);

CREATE TABLE "WorkoutExerciseCompletion" (
  "planId" TEXT NOT NULL,
  "localDate" DATE NOT NULL,
  "planRevision" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "completedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkoutExerciseCompletion_pkey" PRIMARY KEY ("planId", "localDate", "planRevision", "sortOrder"),
  CONSTRAINT "WorkoutExerciseCompletion_planId_fkey" FOREIGN KEY ("planId") REFERENCES "WorkoutPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "WorkoutExerciseCompletion_shape_check" CHECK ("planRevision" ~ '^d1:[a-f0-9]{64}$' AND "sortOrder" BETWEEN 0 AND 99)
);

COMMIT;
