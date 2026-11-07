CREATE TABLE "ProfileCommandReceipt" (
    "id" TEXT NOT NULL,
    "actorIdentityId" TEXT NOT NULL,
    "commandKind" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestDigest" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resultVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProfileCommandReceipt_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProfileCommandReceipt_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProfileCommandReceipt_command_check" CHECK ("commandKind" = 'UPDATE_ACCOUNT_PROFILE'),
    CONSTRAINT "ProfileCommandReceipt_key_check" CHECK (length("idempotencyKey") BETWEEN 16 AND 128 AND "idempotencyKey" ~ '^[!-~]+$'),
    CONSTRAINT "ProfileCommandReceipt_digest_check" CHECK ("requestDigest" ~ '^d1:[a-f0-9]{64}$'),
    CONSTRAINT "ProfileCommandReceipt_result_version_check" CHECK ("resultVersion" >= 1)
);

CREATE UNIQUE INDEX "ProfileCommandReceipt_actorIdentityId_commandKind_idempotencyKey_key"
    ON "ProfileCommandReceipt"("actorIdentityId", "commandKind", "idempotencyKey");
CREATE INDEX "ProfileCommandReceipt_actorIdentityId_createdAt_idx"
    ON "ProfileCommandReceipt"("actorIdentityId", "createdAt");

CREATE FUNCTION "ProfileCommandReceipt_immutable_fn"() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'ProfileCommandReceipt records are immutable';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "ProfileCommandReceipt_immutable"
    BEFORE UPDATE OR DELETE ON "ProfileCommandReceipt"
    FOR EACH ROW EXECUTE FUNCTION "ProfileCommandReceipt_immutable_fn"();
