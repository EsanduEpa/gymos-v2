ALTER TABLE "TrainerPayPeriod"
  ADD COLUMN "approvedAt" TIMESTAMPTZ(3),
  ADD COLUMN "approvedByIdentityId" TEXT;

ALTER TABLE "TrainerPayPeriod"
  ADD CONSTRAINT "TrainerPayPeriod_approval_provenance_check"
  CHECK (("state" = 'APPROVED' AND "approvedAt" IS NOT NULL AND "approvedByIdentityId" IS NOT NULL)
      OR ("state" <> 'APPROVED' AND "approvedAt" IS NULL AND "approvedByIdentityId" IS NULL));

CREATE TABLE "TrainerPayCorrection" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "originalPeriodId" TEXT NOT NULL,
  "originalEarningId" TEXT NOT NULL,
  "correctionPeriodId" TEXT NOT NULL,
  "amount" DECIMAL(19,4) NOT NULL,
  "currency" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "actorIdentityId" TEXT NOT NULL,
  "sourcePeriodState" "PayPeriodState" NOT NULL,
  "sourcePeriodVersion" INTEGER NOT NULL,
  "sourcePeriodApprovedAt" TIMESTAMPTZ(3),
  "sourcePeriodApprovedByIdentityId" TEXT,
  "sourceKey" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainerPayCorrection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrainerPayCorrection_sessionId_key" ON "TrainerPayCorrection"("sessionId");
CREATE UNIQUE INDEX "TrainerPayCorrection_sourceKey_key" ON "TrainerPayCorrection"("sourceKey");
CREATE INDEX "TrainerPayCorrection_correctionPeriodId_createdAt_id_idx" ON "TrainerPayCorrection"("correctionPeriodId", "createdAt", "id");

CREATE FUNCTION "reject_trainer_pay_correction_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'TrainerPayCorrection rows are append-only' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER "TrainerPayCorrection_append_only"
  BEFORE UPDATE OR DELETE ON "TrainerPayCorrection"
  FOR EACH ROW EXECUTE FUNCTION "reject_trainer_pay_correction_mutation"();

ALTER TABLE "TrainerPayCorrection"
  ADD CONSTRAINT "TrainerPayCorrection_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PTSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "TrainerPayCorrection_originalPeriodId_fkey" FOREIGN KEY ("originalPeriodId") REFERENCES "TrainerPayPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "TrainerPayCorrection_originalEarningId_fkey" FOREIGN KEY ("originalEarningId") REFERENCES "RevenueRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "TrainerPayCorrection_correctionPeriodId_fkey" FOREIGN KEY ("correctionPeriodId") REFERENCES "TrainerPayPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TrainerPayCorrection"
  ADD CONSTRAINT "TrainerPayCorrection_provenance_check"
  CHECK ("originalPeriodId" <> "correctionPeriodId"
    AND char_length("currency") = 3
    AND char_length("reason") BETWEEN 1 AND 500
    AND "sourcePeriodVersion" >= 0
    AND "sourcePeriodState" IN ('CLOSED', 'APPROVED')
    AND (("sourcePeriodState" = 'APPROVED' AND "sourcePeriodApprovedAt" IS NOT NULL AND "sourcePeriodApprovedByIdentityId" IS NOT NULL)
      OR ("sourcePeriodState" = 'CLOSED' AND "sourcePeriodApprovedAt" IS NULL AND "sourcePeriodApprovedByIdentityId" IS NULL)));
