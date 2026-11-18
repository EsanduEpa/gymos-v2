CREATE TABLE "ProfilePhoto" (
  "id" TEXT NOT NULL,
  "memberId" TEXT,
  "trainerId" TEXT,
  "encryptedData" TEXT NOT NULL,
  CONSTRAINT "ProfilePhoto_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProfilePhoto_actor_check" CHECK (("memberId" IS NULL) <> ("trainerId" IS NULL)),
  CONSTRAINT "ProfilePhoto_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProfilePhoto_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ProfilePhoto_memberId_key" ON "ProfilePhoto"("memberId");
CREATE UNIQUE INDEX "ProfilePhoto_trainerId_key" ON "ProfilePhoto"("trainerId");

CREATE TABLE "TrainerShiftRequest" (
  "trainerId" TEXT NOT NULL,
  "id" TEXT NOT NULL,
  "start" TEXT NOT NULL,
  "end" TEXT NOT NULL,
  "overnight" BOOLEAN NOT NULL,
  "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainerShiftRequest_pkey" PRIMARY KEY ("trainerId"),
  CONSTRAINT "TrainerShiftRequest_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TrainerShiftRequest_id_key" ON "TrainerShiftRequest"("id");
