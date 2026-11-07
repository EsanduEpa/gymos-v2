-- Append-only owner adjustments preserve every original allocation, settlement and earning.
ALTER TYPE "PackCreditMovementKind" ADD VALUE 'CORRECTION';
DROP INDEX "TrainerPayCorrection_sessionId_key";
CREATE INDEX "TrainerPayCorrection_sessionId_idx" ON "TrainerPayCorrection"("sessionId");
ALTER TABLE "RevenueRecord" ADD COLUMN "reversesId" TEXT;
CREATE UNIQUE INDEX "RevenueRecord_reversesId_key" ON "RevenueRecord"("reversesId");
ALTER TABLE "RevenueRecord" ADD CONSTRAINT "RevenueRecord_reversesId_fkey" FOREIGN KEY ("reversesId") REFERENCES "RevenueRecord"("id") ON DELETE RESTRICT;
ALTER TABLE "RevenueRecord" DROP CONSTRAINT "RevenueRecord_amount_check";
ALTER TABLE "RevenueRecord" ADD CONSTRAINT "RevenueRecord_signed_amount_check" CHECK (
  "currency" IN ('LKR','USD') AND (("reversesId" IS NULL AND "amount" >= 0) OR ("reversesId" IS NOT NULL AND "amount" <= 0))
);
CREATE FUNCTION gymos_validate_revenue_reversal() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."reversesId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "RevenueRecord" r WHERE r.id=NEW."reversesId" AND r."reversesId" IS NULL
      AND r."sessionId"=NEW."sessionId" AND r.currency=NEW.currency AND r.category=NEW.category AND r.amount=-NEW.amount
  ) THEN RAISE EXCEPTION 'Revenue reversal must exactly compensate its source' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "RevenueRecord_reversal_source_check" BEFORE INSERT ON "RevenueRecord" FOR EACH ROW EXECUTE FUNCTION gymos_validate_revenue_reversal();
-- Signed correction accruals can be negative; approved source facts remain unchanged.
ALTER TABLE "TrainerPayPeriod" DROP CONSTRAINT "TrainerPayPeriod_version_check";
ALTER TABLE "TrainerPayPeriod" ADD CONSTRAINT "TrainerPayPeriod_signed_total_check" CHECK ("version" >= 0);
ALTER TABLE "TrainerPayCorrection" DROP CONSTRAINT "TrainerPayCorrection_provenance_check";
ALTER TABLE "TrainerPayCorrection" ADD CONSTRAINT "TrainerPayCorrection_provenance_v2_check" CHECK (
  char_length("currency")=3 AND char_length("reason") BETWEEN 1 AND 500 AND "sourcePeriodVersion">=0
  AND (("sourcePeriodState"='OPEN' AND "originalPeriodId"="correctionPeriodId" AND "sourcePeriodApprovedAt" IS NULL AND "sourcePeriodApprovedByIdentityId" IS NULL)
    OR ("sourcePeriodState"='CLOSED' AND "originalPeriodId"<>"correctionPeriodId" AND "sourcePeriodApprovedAt" IS NULL AND "sourcePeriodApprovedByIdentityId" IS NULL)
    OR ("sourcePeriodState"='APPROVED' AND "originalPeriodId"<>"correctionPeriodId" AND "sourcePeriodApprovedAt" IS NOT NULL AND "sourcePeriodApprovedByIdentityId" IS NOT NULL))
);
CREATE TABLE "PTSessionAdjustment" (
  "id" TEXT PRIMARY KEY, "sessionId" TEXT NOT NULL REFERENCES "PTSession"("id") ON DELETE RESTRICT,
  "replacementSessionId" TEXT REFERENCES "PTSession"("id") ON DELETE RESTRICT,
  "receiptId" TEXT NOT NULL REFERENCES "CommandReceipt"("id") ON DELETE RESTRICT,
  "sourceEventId" TEXT REFERENCES "SessionStateEvent"("id") ON DELETE RESTRICT,
  "kind" TEXT NOT NULL, "initiatedBy" TEXT NOT NULL, "reason" TEXT NOT NULL, "actorIdentityId" TEXT NOT NULL,
  "committedVersion" INTEGER NOT NULL, "fromState" "PTSessionState" NOT NULL, "toState" "PTSessionState" NOT NULL,
  "effectiveSettlementKind" "SessionSettlementKind", "creditConsumed" BOOLEAN,
  "previousStartedAt" TIMESTAMPTZ(3), "previousEndedAt" TIMESTAMPTZ(3), "actualStartedAt" TIMESTAMPTZ(3), "actualEndedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PTSessionAdjustment_shape_check" CHECK (
    "kind" IN ('RESCHEDULE','CORRECTION','REMEDY','CANCELLATION') AND "initiatedBy" IN ('MEMBER','TRAINER','GYM')
    AND char_length("reason") BETWEEN 1 AND 500 AND "committedVersion">=1
    AND (("kind"='RESCHEDULE')=("replacementSessionId" IS NOT NULL))
    AND (("effectiveSettlementKind" IS NULL)=("creditConsumed" IS NULL))
    AND ("actualStartedAt" IS NULL OR ("actualEndedAt" IS NOT NULL AND "actualEndedAt">"actualStartedAt"))
  )
);
ALTER TABLE "PTSessionAdjustment" ALTER CONSTRAINT "PTSessionAdjustment_replacementSessionId_fkey" DEFERRABLE INITIALLY IMMEDIATE;
CREATE UNIQUE INDEX "PTSessionAdjustment_receiptId_key" ON "PTSessionAdjustment"("receiptId");
CREATE UNIQUE INDEX "PTSessionAdjustment_replacementSessionId_key" ON "PTSessionAdjustment"("replacementSessionId");
CREATE UNIQUE INDEX "PTSessionAdjustment_sessionId_committedVersion_key" ON "PTSessionAdjustment"("sessionId","committedVersion");
CREATE INDEX "PTSessionAdjustment_sessionId_createdAt_id_idx" ON "PTSessionAdjustment"("sessionId","createdAt","id");
CREATE TABLE "PTCreditRemedy" (
  "id" TEXT PRIMARY KEY, "adjustmentId" TEXT NOT NULL REFERENCES "PTSessionAdjustment"("id") ON DELETE RESTRICT,
  "sourceHoldId" TEXT NOT NULL REFERENCES "SessionCreditHold"("id") ON DELETE RESTRICT,
  "packId" TEXT NOT NULL REFERENCES "SessionPack"("id") ON DELETE RESTRICT, "creditOrdinal" INTEGER NOT NULL,
  "originalEndDateExclusive" DATE NOT NULL, "newEndDateExclusive" DATE NOT NULL, "valueMinorUnits" BIGINT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PTCreditRemedy_shape_check" CHECK ("creditOrdinal">0 AND "valueMinorUnits">=0 AND "newEndDateExclusive">"originalEndDateExclusive")
);
CREATE UNIQUE INDEX "PTCreditRemedy_adjustmentId_key" ON "PTCreditRemedy"("adjustmentId");
CREATE UNIQUE INDEX "PTCreditRemedy_sourceHoldId_key" ON "PTCreditRemedy"("sourceHoldId");
CREATE INDEX "PTCreditRemedy_packId_creditOrdinal_newEndDateExclusive_idx" ON "PTCreditRemedy"("packId","creditOrdinal","newEndDateExclusive");
CREATE INDEX "PackCreditMovement_packId_creditOrdinal_idx" ON "PackCreditMovement"("packId","creditOrdinal");
ALTER TABLE "PackCreditMovement" ADD COLUMN "adjustmentId" TEXT REFERENCES "PTSessionAdjustment"("id") ON DELETE RESTRICT;
ALTER TABLE "PackCreditMovement" DROP CONSTRAINT "PackCreditMovement_shape_check";
ALTER TABLE "PackCreditMovement" ADD CONSTRAINT "PackCreditMovement_conserved_shape_check" CHECK (
  ("kind"::text='ISSUE' AND "availableDelta">0 AND "heldDelta"=0 AND "consumedDelta"=0 AND "expiredDelta"=0 AND "holdId" IS NULL)
  OR ("kind"::text='HOLD' AND "availableDelta"=-1 AND "heldDelta"=1 AND "consumedDelta"=0 AND "expiredDelta"=0 AND "holdId" IS NOT NULL)
  OR ("kind"::text='RELEASE' AND "availableDelta"=1 AND "heldDelta"=-1 AND "consumedDelta"=0 AND "expiredDelta"=0 AND "holdId" IS NOT NULL)
  OR ("kind"::text='CONSUME' AND "availableDelta"=0 AND "heldDelta"=-1 AND "consumedDelta"=1 AND "expiredDelta"=0 AND "holdId" IS NOT NULL)
  OR ("kind"::text='EXPIRE' AND "availableDelta"<0 AND "heldDelta"=0 AND "consumedDelta"=0 AND "expiredDelta"=-"availableDelta" AND "holdId" IS NULL)
  OR ("kind"::text='EXPIRE' AND "availableDelta"=0 AND "heldDelta"<0 AND "consumedDelta"=0 AND "expiredDelta"=-"heldDelta" AND "holdId" IS NOT NULL)
  OR ("kind"::text='CORRECTION' AND "holdId" IS NOT NULL AND "creditOrdinal" IS NOT NULL AND "adjustmentId" IS NOT NULL
    AND "availableDelta" BETWEEN -1 AND 1 AND "heldDelta" BETWEEN -1 AND 1 AND "consumedDelta" BETWEEN -1 AND 1 AND "expiredDelta" BETWEEN -1 AND 1
    AND "availableDelta"+"heldDelta"+"consumedDelta"+"expiredDelta"=0
    AND abs("availableDelta")+abs("heldDelta")+abs("consumedDelta")+abs("expiredDelta")=2)
);
CREATE TRIGGER "PTSessionAdjustment_append_only" BEFORE UPDATE OR DELETE ON "PTSessionAdjustment" FOR EACH ROW EXECUTE FUNCTION gymos_forbid_session_ledger_rewrite();
CREATE TRIGGER "PTCreditRemedy_append_only" BEFORE UPDATE OR DELETE ON "PTCreditRemedy" FOR EACH ROW EXECUTE FUNCTION gymos_forbid_session_ledger_rewrite();
CREATE FUNCTION gymos_validate_credit_remedy() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "SessionCreditHold" h JOIN "PTSessionAdjustment" a ON a.id=NEW."adjustmentId"
    WHERE h.id=NEW."sourceHoldId" AND h."packId"=NEW."packId" AND h."creditOrdinal"=NEW."creditOrdinal"
      AND h."creditValueMinorUnits"=NEW."valueMinorUnits" AND a."sessionId"=h."sessionId" AND a.kind IN ('REMEDY','RESCHEDULE'))
  THEN RAISE EXCEPTION 'Remedy must preserve its source allocation and value' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "PTCreditRemedy_source_check" BEFORE INSERT ON "PTCreditRemedy" FOR EACH ROW EXECUTE FUNCTION gymos_validate_credit_remedy();
CREATE FUNCTION gymos_validate_credit_correction() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.kind::text='CORRECTION' AND NOT EXISTS (SELECT 1 FROM "SessionCreditHold" h JOIN "PTSessionAdjustment" a ON a.id=NEW."adjustmentId"
   WHERE h.id=NEW."holdId" AND h."packId"=NEW."packId" AND h."creditOrdinal"=NEW."creditOrdinal" AND a."sessionId"=h."sessionId" AND a."receiptId"=NEW."receiptId" AND a."actorIdentityId"=NEW."actorIdentityId")
 THEN RAISE EXCEPTION 'Credit correction must bind its original allocation and owner command' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER "PackCreditMovement_correction_source_check" BEFORE INSERT ON "PackCreditMovement" FOR EACH ROW EXECUTE FUNCTION gymos_validate_credit_correction();
-- Corrections can restore a unit that has a prior terminal fact. Retain every
-- terminal row and enforce its CURRENT conserved buckets instead of forbidding reuse.
DROP INDEX "PackCreditMovement_terminal_ordinal_key";
CREATE INDEX "PackCreditMovement_terminal_history_idx" ON "PackCreditMovement"("packId","creditOrdinal","createdAt","id") WHERE "kind" IN ('CONSUME','EXPIRE');
CREATE VIEW "PTCreditUnitBalance" AS
SELECT p.id AS "packId",p."memberId",p.currency,n.ordinal AS "creditOrdinal",p."startDate",p."endDateExclusive",p."createdAt" AS "packCreatedAt",
  p."creditBaseMinorUnits"+CASE WHEN n.ordinal<=p."creditRemainder" THEN 1 ELSE 0 END AS "valueMinorUnits",
  GREATEST(p."endDateExclusive",COALESCE(r."newEnd",p."endDateExclusive")) AS "effectiveEndDateExclusive",
  (1+COALESCE(m.available,0))::int AS available, COALESCE(m.held,0)::int AS held,COALESCE(m.consumed,0)::int AS consumed,COALESCE(m.expired,0)::int AS expired,
  (COALESCE(b.issued,0)=p."issuedCredits" AND 1+COALESCE(m.available,0) BETWEEN 0 AND 1 AND COALESCE(m.held,0) BETWEEN 0 AND 1
    AND COALESCE(m.consumed,0) BETWEEN 0 AND 1 AND COALESCE(m.expired,0) BETWEEN 0 AND 1
    AND 1+COALESCE(m.available,0)+COALESCE(m.held,0)+COALESCE(m.consumed,0)+COALESCE(m.expired,0)=1) AS consistent
FROM "SessionPack" p CROSS JOIN LATERAL generate_series(1,p."issuedCredits") n(ordinal)
LEFT JOIN LATERAL (SELECT SUM("availableDelta") AS available,SUM("heldDelta") AS held,SUM("consumedDelta") AS consumed,SUM("expiredDelta") AS expired
  FROM "PackCreditMovement" WHERE "packId"=p.id AND "creditOrdinal"=n.ordinal AND "kind"::text<>'ISSUE') m ON true
LEFT JOIN LATERAL (SELECT SUM("availableDelta") AS issued FROM "PackCreditMovement" WHERE "packId"=p.id AND "kind"='ISSUE') b ON true
LEFT JOIN LATERAL (SELECT MAX("newEndDateExclusive") AS "newEnd" FROM "PTCreditRemedy" WHERE "packId"=p.id AND "creditOrdinal"=n.ordinal) r ON true;
CREATE FUNCTION gymos_lock_credit_pack() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM id FROM "SessionPack" WHERE id=NEW."packId" FOR UPDATE;
 RETURN NEW;
END $$;
CREATE TRIGGER "PackCreditMovement_pack_serialization" BEFORE INSERT ON "PackCreditMovement" FOR EACH ROW EXECUTE FUNCTION gymos_lock_credit_pack();
CREATE FUNCTION gymos_validate_unit_conservation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM "PTCreditUnitBalance" WHERE "packId"=NEW."packId" AND NOT consistent)
 THEN RAISE EXCEPTION 'Each original credit unit must conserve one nonnegative credit across all buckets' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER "PackCreditMovement_unit_conservation" AFTER INSERT ON "PackCreditMovement" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION gymos_validate_unit_conservation();
