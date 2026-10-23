BEGIN;

CREATE TYPE "CommandReceiptState" AS ENUM ('RUNNING', 'COMMITTED', 'REJECTED');

CREATE TABLE "CommandReceipt" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "actorIdentityId" TEXT NOT NULL,
  "commandKind" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestDigest" TEXT NOT NULL,
  "resourceType" TEXT,
  "resourceId" TEXT,
  "sourceMasterOperationId" TEXT,
  "state" "CommandReceiptState" NOT NULL DEFAULT 'RUNNING',
  "safeResult" JSONB,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "committedAt" TIMESTAMPTZ(3)
);

CREATE UNIQUE INDEX "CommandReceipt_sourceMasterOperationId_key" ON "CommandReceipt" ("sourceMasterOperationId");

CREATE UNIQUE INDEX "CommandReceipt_actorIdentityId_commandKind_idempotencyKey_key" ON "CommandReceipt" ("actorIdentityId", "commandKind", "idempotencyKey");

CREATE INDEX "CommandReceipt_state_createdAt_idx" ON "CommandReceipt" ("state", "createdAt");

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "eventKey" TEXT NOT NULL,
  "contentDigest" TEXT NOT NULL,
  "receiptId" TEXT NOT NULL,
  "actorIdentityId" TEXT NOT NULL,
  "originalActorIdentityId" TEXT,
  "eventCode" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "transition" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "AuditLog_eventKey_key" ON "AuditLog" ("eventKey");

CREATE INDEX "AuditLog_createdAt_id_idx" ON "AuditLog" ("createdAt", "id");

CREATE INDEX "AuditLog_actorIdentityId_createdAt_idx" ON "AuditLog" ("actorIdentityId", "createdAt");

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "CommandReceipt" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Append after Prisma-generated additive create-table DDL.
ALTER TABLE "CommandReceipt" ADD CONSTRAINT "CommandReceipt_digest_format" CHECK ("requestDigest" ~ '^d1:[a-f0-9]{64}$');
ALTER TABLE "CommandReceipt" ADD CONSTRAINT "CommandReceipt_key_format" CHECK (length("idempotencyKey") BETWEEN 16 AND 128 AND "idempotencyKey" !~ '[^!-~]');
ALTER TABLE "CommandReceipt" ADD CONSTRAINT "CommandReceipt_commit_result" CHECK ("state" <> 'COMMITTED' OR ("safeResult" IS NOT NULL AND "committedAt" IS NOT NULL));
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_event_format" CHECK ("eventKey" ~ '^ta1:[a-f0-9]{64}$' AND "contentDigest" ~ '^[a-f0-9]{64}$');
CREATE FUNCTION gymos_guard_receipt_immutability() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."actorIdentityId" IS DISTINCT FROM OLD."actorIdentityId" OR NEW."commandKind" IS DISTINCT FROM OLD."commandKind" OR NEW."idempotencyKey" IS DISTINCT FROM OLD."idempotencyKey" OR NEW."requestDigest" IS DISTINCT FROM OLD."requestDigest" OR NEW."sourceMasterOperationId" IS DISTINCT FROM OLD."sourceMasterOperationId" THEN
    RAISE EXCEPTION 'Receipt intent cannot change' USING ERRCODE = '23514';
  END IF;
  IF OLD."state" <> 'RUNNING' AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'Final receipt is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "CommandReceipt_immutable_intent" BEFORE UPDATE ON "CommandReceipt" FOR EACH ROW EXECUTE FUNCTION gymos_guard_receipt_immutability();
CREATE FUNCTION gymos_forbid_audit_rewrite() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Audit history is append-only' USING ERRCODE = '23514'; END;
$$;
CREATE TRIGGER "AuditLog_append_only" BEFORE UPDATE OR DELETE ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION gymos_forbid_audit_rewrite();


CREATE FUNCTION gymos_forbid_receipt_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Receipt retention prohibits deletion' USING ERRCODE = '23514'; END;
$$;
CREATE TRIGGER "CommandReceipt_retained" BEFORE DELETE ON "CommandReceipt" FOR EACH ROW EXECUTE FUNCTION gymos_forbid_receipt_delete();
COMMIT;
