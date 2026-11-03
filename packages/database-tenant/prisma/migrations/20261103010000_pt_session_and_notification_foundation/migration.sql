BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE "PTSessionState" AS ENUM ('PENDING_CONFIRMATION', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'MISSED', 'CANCELLED', 'DECLINED');
CREATE TYPE "SessionType" AS ENUM ('IN_PERSON', 'VIRTUAL', 'INTRODUCTORY');
CREATE TYPE "SessionCreditHoldState" AS ENUM ('HELD', 'CONSUMED', 'RELEASED');
CREATE TYPE "PackCreditMovementKind" AS ENUM ('ISSUE', 'HOLD', 'RELEASE', 'CONSUME', 'EXPIRE');
CREATE TYPE "SessionSettlementKind" AS ENUM ('COMPLETED', 'MISSED', 'LATE_CANCELLED', 'FREE_CANCELLED', 'WITHDRAWN', 'LIFECYCLE_RELEASE');
CREATE TYPE "OperationalEarningCategory" AS ENUM ('COMPLETED_SESSION', 'MISSED_LATE', 'LATE_CANCEL', 'EXPIRED_UNUSED', 'MEMBERSHIP_DAILY');
CREATE TYPE "PayPeriodState" AS ENUM ('OPEN', 'CLOSED', 'APPROVED');
CREATE TYPE "NotificationLinkKind" AS ENUM ('OWNER_SESSIONS', 'TRAINER_SCHEDULE', 'MEMBER_SESSIONS', 'TRAINER_REQUESTS');

CREATE TABLE "PTSession" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "trainerId" TEXT NOT NULL,
  "state" "PTSessionState" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
  "version" INTEGER NOT NULL DEFAULT 0,
  "type" "SessionType" NOT NULL DEFAULT 'IN_PERSON',
  "scheduledStartAt" TIMESTAMPTZ(3) NOT NULL,
  "scheduledEndAt" TIMESTAMPTZ(3) NOT NULL,
  "gymTimezone" TEXT NOT NULL,
  "fee" DECIMAL(19,4) NOT NULL,
  "currency" TEXT NOT NULL,
  "confirmationRate" DECIMAL(9,6),
  "confirmationLevel" "TrainerLevel",
  "confirmationShiftStart" TEXT,
  "confirmationShiftEnd" TEXT,
  "configurationVersion" INTEGER NOT NULL,
  "confirmedAt" TIMESTAMPTZ(3),
  "startedAt" TIMESTAMPTZ(3),
  "endedAt" TIMESTAMPTZ(3),
  "notes" TEXT,
  "createdByIdentityId" TEXT NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PTSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PTSession_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PTSession_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PTSession_bounds_check" CHECK ("scheduledEndAt" > "scheduledStartAt" AND "scheduledEndAt" <= "scheduledStartAt" + INTERVAL '480 minutes'),
  CONSTRAINT "PTSession_value_check" CHECK ("fee" >= 0 AND "currency" IN ('LKR','USD') AND "version" >= 0 AND "configurationVersion" >= 0),
  CONSTRAINT "PTSession_shift_snapshot_check" CHECK (("confirmationShiftStart" IS NULL) = ("confirmationShiftEnd" IS NULL)),
  CONSTRAINT "PTSession_confirmation_snapshot_check" CHECK (("confirmedAt" IS NULL AND "confirmationRate" IS NULL AND "confirmationLevel" IS NULL) OR ("confirmedAt" IS NOT NULL AND "confirmationRate" IS NOT NULL AND "confirmationLevel" IS NOT NULL)),
  CONSTRAINT "PTSession_state_shape_check" CHECK (
    ("state" = 'PENDING_CONFIRMATION' AND "confirmedAt" IS NULL AND "startedAt" IS NULL AND "endedAt" IS NULL)
    OR ("state" = 'SCHEDULED' AND "confirmedAt" IS NOT NULL AND "startedAt" IS NULL AND "endedAt" IS NULL)
    OR ("state" = 'DECLINED' AND "confirmedAt" IS NULL AND "startedAt" IS NULL AND "endedAt" IS NULL)
    OR ("state" = 'ACTIVE' AND "confirmedAt" IS NOT NULL AND "startedAt" IS NOT NULL AND "endedAt" IS NULL)
    OR ("state" = 'COMPLETED' AND "confirmedAt" IS NOT NULL AND "startedAt" IS NOT NULL AND "endedAt" IS NOT NULL)
    OR ("state" = 'MISSED' AND "confirmedAt" IS NOT NULL AND "startedAt" IS NULL AND "endedAt" IS NOT NULL)
    OR ("state" = 'CANCELLED' AND "endedAt" IS NOT NULL AND "startedAt" IS NULL)
  ),
  CONSTRAINT "PTSession_notes_length_check" CHECK ("notes" IS NULL OR char_length("notes") <= 4000)
);

CREATE INDEX "PTSession_memberId_scheduledStartAt_id_idx" ON "PTSession"("memberId", "scheduledStartAt", "id");
CREATE INDEX "PTSession_trainerId_scheduledStartAt_id_idx" ON "PTSession"("trainerId", "scheduledStartAt", "id");
CREATE INDEX "PTSession_state_scheduledStartAt_id_idx" ON "PTSession"("state", "scheduledStartAt", "id");
ALTER TABLE "PTSession" ADD CONSTRAINT "PTSession_member_interval_excl" EXCLUDE USING gist ("memberId" WITH =, tstzrange("scheduledStartAt", "scheduledEndAt", '[)') WITH &&) WHERE ("state" IN ('SCHEDULED','ACTIVE'));
ALTER TABLE "PTSession" ADD CONSTRAINT "PTSession_trainer_interval_excl" EXCLUDE USING gist ("trainerId" WITH =, tstzrange("scheduledStartAt", "scheduledEndAt", '[)') WITH &&) WHERE ("state" IN ('SCHEDULED','ACTIVE'));

CREATE TABLE "SessionStateEvent" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "fromState" "PTSessionState",
  "toState" "PTSessionState" NOT NULL,
  "committedVersion" INTEGER NOT NULL,
  "actorIdentityId" TEXT NOT NULL,
  "receiptId" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SessionStateEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SessionStateEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PTSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SessionStateEvent_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "CommandReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SessionStateEvent_version_check" CHECK ("committedVersion" >= 0)
);
CREATE UNIQUE INDEX "SessionStateEvent_sessionId_committedVersion_key" ON "SessionStateEvent"("sessionId", "committedVersion");
CREATE UNIQUE INDEX "SessionStateEvent_eventKey_key" ON "SessionStateEvent"("eventKey");
CREATE INDEX "SessionStateEvent_sessionId_createdAt_id_idx" ON "SessionStateEvent"("sessionId", "createdAt", "id");

CREATE TABLE "SessionCreditHold" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "packId" TEXT NOT NULL,
  "state" "SessionCreditHoldState" NOT NULL DEFAULT 'HELD',
  "heldAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMPTZ(3),
  "version" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "SessionCreditHold_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SessionCreditHold_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PTSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SessionCreditHold_packId_fkey" FOREIGN KEY ("packId") REFERENCES "SessionPack"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SessionCreditHold_state_shape_check" CHECK (("state" = 'HELD' AND "resolvedAt" IS NULL) OR ("state" <> 'HELD' AND "resolvedAt" IS NOT NULL)),
  CONSTRAINT "SessionCreditHold_version_check" CHECK ("version" >= 0)
);
CREATE UNIQUE INDEX "SessionCreditHold_sessionId_key" ON "SessionCreditHold"("sessionId");
CREATE INDEX "SessionCreditHold_packId_state_heldAt_id_idx" ON "SessionCreditHold"("packId", "state", "heldAt", "id");

CREATE TABLE "PackCreditMovement" (
  "id" TEXT NOT NULL,
  "packId" TEXT NOT NULL,
  "holdId" TEXT,
  "kind" "PackCreditMovementKind" NOT NULL,
  "availableDelta" INTEGER NOT NULL,
  "heldDelta" INTEGER NOT NULL,
  "consumedDelta" INTEGER NOT NULL,
  "expiredDelta" INTEGER NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "receiptId" TEXT NOT NULL,
  "actorIdentityId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PackCreditMovement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PackCreditMovement_packId_fkey" FOREIGN KEY ("packId") REFERENCES "SessionPack"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PackCreditMovement_holdId_fkey" FOREIGN KEY ("holdId") REFERENCES "SessionCreditHold"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PackCreditMovement_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "CommandReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PackCreditMovement_shape_check" CHECK (
    ("kind" = 'ISSUE' AND "availableDelta" > 0 AND "heldDelta" = 0 AND "consumedDelta" = 0 AND "expiredDelta" = 0 AND "holdId" IS NULL)
    OR ("kind" = 'HOLD' AND "availableDelta" = -1 AND "heldDelta" = 1 AND "consumedDelta" = 0 AND "expiredDelta" = 0 AND "holdId" IS NOT NULL)
    OR ("kind" = 'RELEASE' AND "availableDelta" = 1 AND "heldDelta" = -1 AND "consumedDelta" = 0 AND "expiredDelta" = 0 AND "holdId" IS NOT NULL)
    OR ("kind" = 'CONSUME' AND "availableDelta" = 0 AND "heldDelta" = -1 AND "consumedDelta" = 1 AND "expiredDelta" = 0 AND "holdId" IS NOT NULL)
    OR ("kind" = 'EXPIRE' AND "availableDelta" < 0 AND "heldDelta" = 0 AND "consumedDelta" = 0 AND "expiredDelta" = -"availableDelta" AND "holdId" IS NULL)
    OR ("kind" = 'EXPIRE' AND "availableDelta" = 0 AND "heldDelta" < 0 AND "consumedDelta" = 0 AND "expiredDelta" = -"heldDelta" AND "holdId" IS NOT NULL)
  )
);
CREATE UNIQUE INDEX "PackCreditMovement_sourceKey_key" ON "PackCreditMovement"("sourceKey");
CREATE INDEX "PackCreditMovement_packId_createdAt_id_idx" ON "PackCreditMovement"("packId", "createdAt", "id");

CREATE TABLE "SessionSettlement" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "kind" "SessionSettlementKind" NOT NULL,
  "creditConsumed" BOOLEAN NOT NULL,
  "creditValue" DECIMAL(19,4) NOT NULL,
  "currency" TEXT NOT NULL,
  "sourceReceiptId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SessionSettlement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SessionSettlement_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PTSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SessionSettlement_sourceReceiptId_fkey" FOREIGN KEY ("sourceReceiptId") REFERENCES "CommandReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SessionSettlement_value_check" CHECK ("creditValue" >= 0 AND "currency" IN ('LKR','USD'))
);
CREATE UNIQUE INDEX "SessionSettlement_sessionId_key" ON "SessionSettlement"("sessionId");

CREATE TABLE "RevenueRecord" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "category" "OperationalEarningCategory" NOT NULL,
  "amount" DECIMAL(19,4) NOT NULL,
  "currency" TEXT NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RevenueRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RevenueRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PTSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "RevenueRecord_amount_check" CHECK ("amount" >= 0 AND "currency" IN ('LKR','USD'))
);
CREATE UNIQUE INDEX "RevenueRecord_sourceKey_key" ON "RevenueRecord"("sourceKey");
CREATE INDEX "RevenueRecord_category_createdAt_id_idx" ON "RevenueRecord"("category", "createdAt", "id");

CREATE TABLE "TrainerPayPeriod" (
  "id" TEXT NOT NULL,
  "cadence" "PayPeriod" NOT NULL,
  "localStartDate" DATE NOT NULL,
  "localEndDateExclusive" DATE NOT NULL,
  "timezone" TEXT NOT NULL,
  "utcStartAt" TIMESTAMPTZ(3) NOT NULL,
  "utcEndAt" TIMESTAMPTZ(3) NOT NULL,
  "state" "PayPeriodState" NOT NULL DEFAULT 'OPEN',
  "version" INTEGER NOT NULL DEFAULT 0,
  "calculatedTotal" DECIMAL(19,4) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "TrainerPayPeriod_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TrainerPayPeriod_bounds_check" CHECK ("localEndDateExclusive" > "localStartDate" AND "utcEndAt" > "utcStartAt"),
  CONSTRAINT "TrainerPayPeriod_version_check" CHECK ("version" >= 0 AND "calculatedTotal" >= 0)
);
CREATE UNIQUE INDEX "TrainerPayPeriod_cadence_localStartDate_key" ON "TrainerPayPeriod"("cadence", "localStartDate");
CREATE INDEX "TrainerPayPeriod_state_utcStartAt_id_idx" ON "TrainerPayPeriod"("state", "utcStartAt", "id");

CREATE TABLE "PayRecord" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "periodId" TEXT NOT NULL,
  "amount" DECIMAL(19,4) NOT NULL,
  "currency" TEXT NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "confirmationRate" DECIMAL(9,6) NOT NULL,
  "confirmationLevel" "TrainerLevel" NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PayRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PayRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PTSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PayRecord_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "TrainerPayPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PayRecord_value_check" CHECK ("amount" >= 0 AND "currency" IN ('LKR','USD') AND "confirmationRate" BETWEEN 0 AND 1)
);
CREATE UNIQUE INDEX "PayRecord_sessionId_key" ON "PayRecord"("sessionId");
CREATE UNIQUE INDEX "PayRecord_sourceKey_key" ON "PayRecord"("sourceKey");
CREATE INDEX "PayRecord_periodId_createdAt_id_idx" ON "PayRecord"("periodId", "createdAt", "id");

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "recipientIdentityId" TEXT NOT NULL,
  "sourceEventKey" TEXT NOT NULL,
  "eventCode" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "linkKind" "NotificationLinkKind" NOT NULL,
  "resourceId" TEXT,
  "readAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Notification_content_check" CHECK (char_length("eventCode") BETWEEN 1 AND 80 AND char_length("title") BETWEEN 1 AND 120 AND char_length("message") <= 500)
);
CREATE UNIQUE INDEX "Notification_recipientIdentityId_sourceEventKey_key" ON "Notification"("recipientIdentityId", "sourceEventKey");
CREATE INDEX "Notification_recipientIdentityId_readAt_createdAt_id_idx" ON "Notification"("recipientIdentityId", "readAt", "createdAt", "id");

CREATE FUNCTION gymos_forbid_session_ledger_rewrite() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'append-only session evidence cannot be changed' USING ERRCODE = '55000';
END;
$$;
CREATE TRIGGER "SessionStateEvent_append_only" BEFORE UPDATE OR DELETE ON "SessionStateEvent" FOR EACH ROW EXECUTE FUNCTION gymos_forbid_session_ledger_rewrite();
CREATE TRIGGER "PackCreditMovement_append_only" BEFORE UPDATE OR DELETE ON "PackCreditMovement" FOR EACH ROW EXECUTE FUNCTION gymos_forbid_session_ledger_rewrite();
CREATE TRIGGER "SessionSettlement_append_only" BEFORE UPDATE OR DELETE ON "SessionSettlement" FOR EACH ROW EXECUTE FUNCTION gymos_forbid_session_ledger_rewrite();
CREATE TRIGGER "RevenueRecord_append_only" BEFORE UPDATE OR DELETE ON "RevenueRecord" FOR EACH ROW EXECUTE FUNCTION gymos_forbid_session_ledger_rewrite();
CREATE TRIGGER "PayRecord_append_only" BEFORE UPDATE OR DELETE ON "PayRecord" FOR EACH ROW EXECUTE FUNCTION gymos_forbid_session_ledger_rewrite();

COMMIT;
