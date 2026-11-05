CREATE TYPE "PTAvailabilityKind" AS ENUM ('WEEKLY_WINDOW', 'DATED_WINDOW', 'BLOCK', 'GYM_CLOSURE');

CREATE TABLE "PTAvailabilityRule" (
  "id" TEXT NOT NULL,
  "trainerId" TEXT,
  "kind" "PTAvailabilityKind" NOT NULL,
  "weekday" INTEGER,
  "localDate" DATE,
  "startMinute" INTEGER,
  "endMinute" INTEGER,
  "effectiveFrom" DATE,
  "effectiveToExclusive" DATE,
  "reason" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0,
  "createdByIdentityId" TEXT NOT NULL,
  "commandReceiptId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "PTAvailabilityRule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PTAvailabilityRule_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PTAvailabilityRule_commandReceiptId_fkey" FOREIGN KEY ("commandReceiptId") REFERENCES "CommandReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PTAvailabilityRule_shape_check" CHECK (
    "version" >= 0 AND
    (("kind" = 'WEEKLY_WINDOW' AND "trainerId" IS NOT NULL AND "weekday" BETWEEN 0 AND 6 AND "localDate" IS NULL AND "startMinute" >= 0 AND "endMinute" <= 1440 AND "endMinute" > "startMinute" AND "effectiveFrom" IS NOT NULL AND "effectiveToExclusive" > "effectiveFrom") OR
     ("kind" = 'DATED_WINDOW' AND "trainerId" IS NOT NULL AND "weekday" IS NULL AND "localDate" IS NOT NULL AND "startMinute" >= 0 AND "endMinute" <= 1440 AND "endMinute" > "startMinute" AND "effectiveFrom" IS NULL AND "effectiveToExclusive" IS NULL) OR
     ("kind" = 'BLOCK' AND "trainerId" IS NOT NULL AND "weekday" IS NULL AND "localDate" IS NOT NULL AND "startMinute" >= 0 AND "endMinute" <= 1440 AND "endMinute" > "startMinute" AND "effectiveFrom" IS NULL AND "effectiveToExclusive" IS NULL) OR
     ("kind" = 'GYM_CLOSURE' AND "trainerId" IS NULL AND "weekday" IS NULL AND "localDate" IS NOT NULL AND "startMinute" IS NULL AND "endMinute" IS NULL AND "effectiveFrom" IS NULL AND "effectiveToExclusive" IS NULL))
  ),
  CONSTRAINT "PTAvailabilityRule_reason_length_check" CHECK ("reason" IS NULL OR char_length("reason") <= 500),
  CONSTRAINT "PTAvailabilityRule_date_order_check" CHECK ("effectiveToExclusive" IS NULL OR "effectiveToExclusive" > "effectiveFrom")
);
CREATE INDEX "PTAvailabilityRule_trainerId_kind_weekday_effectiveFrom_idx" ON "PTAvailabilityRule"("trainerId", "kind", "weekday", "effectiveFrom");
CREATE INDEX "PTAvailabilityRule_trainerId_localDate_kind_idx" ON "PTAvailabilityRule"("trainerId", "localDate", "kind");
CREATE INDEX "PTAvailabilityRule_localDate_kind_idx" ON "PTAvailabilityRule"("localDate", "kind");
CREATE INDEX "PTAvailabilityRule_commandReceiptId_idx" ON "PTAvailabilityRule"("commandReceiptId");
