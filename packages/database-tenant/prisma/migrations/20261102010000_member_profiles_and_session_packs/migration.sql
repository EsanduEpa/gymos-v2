BEGIN;

ALTER TABLE "Member"
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "dateOfBirth" DATE,
  ADD COLUMN "emergencyContact" TEXT,
  ADD COLUMN "healthNotes" TEXT;

CREATE TYPE "SessionPackStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'DEPLETED');
CREATE TABLE "SessionPack" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "issuedCredits" INTEGER NOT NULL,
  "price" DECIMAL(19,4) NOT NULL,
  "currency" TEXT NOT NULL,
  "validityDays" INTEGER NOT NULL,
  "startDate" DATE NOT NULL,
  "endDateExclusive" DATE NOT NULL,
  "status" "SessionPackStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 0,
  "commandReceiptId" TEXT NOT NULL,
  "actorIdentityId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestDigest" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SessionPack_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SessionPack_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SessionPack_credits_check" CHECK ("issuedCredits" BETWEEN 1 AND 1000),
  CONSTRAINT "SessionPack_price_check" CHECK ("price" >= 0),
  CONSTRAINT "SessionPack_currency_check" CHECK ("currency" IN ('LKR', 'USD')),
  CONSTRAINT "SessionPack_validity_check" CHECK ("validityDays" BETWEEN 1 AND 3650 AND "endDateExclusive" > "startDate"),
  CONSTRAINT "SessionPack_version_check" CHECK ("version" >= 0),
  CONSTRAINT "SessionPack_key_check" CHECK (length("idempotencyKey") BETWEEN 16 AND 128),
  CONSTRAINT "SessionPack_receipt_format_check" CHECK (length("commandReceiptId") BETWEEN 1 AND 128)
);
CREATE UNIQUE INDEX "SessionPack_commandReceiptId_key" ON "SessionPack"("commandReceiptId");
CREATE UNIQUE INDEX "SessionPack_actorIdentityId_idempotencyKey_key" ON "SessionPack"("actorIdentityId", "idempotencyKey");
CREATE INDEX "SessionPack_memberId_endDateExclusive_createdAt_id_idx" ON "SessionPack"("memberId", "endDateExclusive", "createdAt", "id");

COMMIT;
