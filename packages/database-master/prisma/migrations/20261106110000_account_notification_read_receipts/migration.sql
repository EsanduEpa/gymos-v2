ALTER TYPE "IdentitySecurityEventType" ADD VALUE 'SESSIONS_REVOKED';

CREATE TABLE "IdentitySecurityEventRead" (
  "id" TEXT NOT NULL,
  "securityEventId" TEXT NOT NULL,
  "identityId" TEXT NOT NULL,
  "readAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IdentitySecurityEventRead_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "IdentitySecurityEventRead_securityEventId_key" UNIQUE ("securityEventId"),
  CONSTRAINT "IdentitySecurityEventRead_event_fkey" FOREIGN KEY ("securityEventId") REFERENCES "IdentitySecurityEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "IdentitySecurityEventRead_identity_fkey" FOREIGN KEY ("identityId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "IdentitySecurityEventRead_identityId_readAt_idx" ON "IdentitySecurityEventRead"("identityId", "readAt");

CREATE FUNCTION "IdentitySecurityEventRead_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'Identity security read receipts are append-only' USING ERRCODE = '23514'; END IF;
  IF NOT EXISTS (SELECT 1 FROM "IdentitySecurityEvent" e WHERE e."id" = NEW."securityEventId" AND e."identityId" = NEW."identityId") THEN
    RAISE EXCEPTION 'Identity security read receipt subject does not match its event' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "IdentitySecurityEventRead_append_only" BEFORE INSERT OR UPDATE OR DELETE ON "IdentitySecurityEventRead"
FOR EACH ROW EXECUTE FUNCTION "IdentitySecurityEventRead_guard"();

