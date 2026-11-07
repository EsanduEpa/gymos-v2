CREATE TYPE "IdentityEmailCorrectionState" AS ENUM ('PENDING', 'WITHDRAWN', 'CLOSED');
CREATE TYPE "IdentityEmailCorrectionResolution" AS ENUM ('FOLLOW_UP_RECORDED', 'CLOSED_NO_CHANGE');

CREATE TABLE "IdentityEmailCorrectionRequest" (
    "id" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "requestedEmail" TEXT NOT NULL,
    "state" "IdentityEmailCorrectionState" NOT NULL DEFAULT 'PENDING',
    "resolution" "IdentityEmailCorrectionResolution",
    "version" INTEGER NOT NULL DEFAULT 0,
    "idempotencyKey" TEXT NOT NULL,
    "requestDigest" TEXT NOT NULL,
    "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMPTZ(3),
    "resolvedByIdentityId" TEXT,
    CONSTRAINT "IdentityEmailCorrectionRequest_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "IdentityEmailCorrectionRequest_identity_fkey" FOREIGN KEY ("identityId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "IdentityEmailCorrectionRequest_reviewer_fkey" FOREIGN KEY ("resolvedByIdentityId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "IdentityEmailCorrectionRequest_email_check" CHECK (length("requestedEmail") BETWEEN 3 AND 254 AND "requestedEmail" = lower(btrim("requestedEmail")) AND "requestedEmail" ~ '^[!-~]+$'),
    CONSTRAINT "IdentityEmailCorrectionRequest_key_check" CHECK (length("idempotencyKey") BETWEEN 16 AND 128 AND "idempotencyKey" ~ '^[!-~]+$'),
    CONSTRAINT "IdentityEmailCorrectionRequest_digest_check" CHECK ("requestDigest" ~ '^d1:[a-f0-9]{64}$'),
    CONSTRAINT "IdentityEmailCorrectionRequest_version_check" CHECK ("version" >= 0),
    CONSTRAINT "IdentityEmailCorrectionRequest_state_check" CHECK (("state" = 'PENDING' AND "resolution" IS NULL AND "resolvedAt" IS NULL AND "resolvedByIdentityId" IS NULL) OR ("state" = 'WITHDRAWN' AND "resolution" IS NULL AND "resolvedAt" IS NOT NULL AND "resolvedByIdentityId" IS NULL) OR ("state" = 'CLOSED' AND "resolution" IS NOT NULL AND "resolvedAt" IS NOT NULL AND "resolvedByIdentityId" IS NOT NULL))
);

CREATE UNIQUE INDEX "IdentityEmailCorrectionRequest_identityId_idempotencyKey_key" ON "IdentityEmailCorrectionRequest"("identityId", "idempotencyKey");
CREATE UNIQUE INDEX "IdentityEmailCorrectionRequest_one_pending_identity" ON "IdentityEmailCorrectionRequest"("identityId") WHERE "state" = 'PENDING';
CREATE UNIQUE INDEX "IdentityEmailCorrectionRequest_one_pending_email" ON "IdentityEmailCorrectionRequest"("requestedEmail") WHERE "state" = 'PENDING';
CREATE INDEX "IdentityEmailCorrectionRequest_identityId_submittedAt_id_idx" ON "IdentityEmailCorrectionRequest"("identityId", "submittedAt", "id");
CREATE INDEX "IdentityEmailCorrectionRequest_state_submittedAt_id_idx" ON "IdentityEmailCorrectionRequest"("state", "submittedAt", "id");

CREATE FUNCTION "IdentityEmailCorrectionRequest_immutable_fn"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'IdentityEmailCorrectionRequest records cannot be deleted'; END IF;
  IF NEW."identityId" IS DISTINCT FROM OLD."identityId" OR NEW."requestedEmail" IS DISTINCT FROM OLD."requestedEmail" OR NEW."idempotencyKey" IS DISTINCT FROM OLD."idempotencyKey" OR NEW."requestDigest" IS DISTINCT FROM OLD."requestDigest" OR NEW."submittedAt" IS DISTINCT FROM OLD."submittedAt" THEN
    RAISE EXCEPTION 'IdentityEmailCorrectionRequest request facts are immutable';
  END IF;
  IF OLD."state" <> 'PENDING' OR NEW."state" NOT IN ('WITHDRAWN', 'CLOSED') OR NEW."version" <> OLD."version" + 1 THEN
    RAISE EXCEPTION 'IdentityEmailCorrectionRequest transition is invalid';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "IdentityEmailCorrectionRequest_immutable" BEFORE UPDATE OR DELETE ON "IdentityEmailCorrectionRequest" FOR EACH ROW EXECUTE FUNCTION "IdentityEmailCorrectionRequest_immutable_fn"();
