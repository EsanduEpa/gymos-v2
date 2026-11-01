BEGIN;
CREATE TABLE "GymRegistrySummary" (
 "gymId" TEXT PRIMARY KEY REFERENCES "Gym"("id") ON DELETE RESTRICT,
 "memberCount" INTEGER, "trainerCount" INTEGER, "observedAt" TIMESTAMPTZ(3),
 "schemaVersion" TEXT, "health" TEXT NOT NULL DEFAULT 'UNAVAILABLE', "version" INTEGER NOT NULL DEFAULT 0,
 CHECK ("memberCount" >= 0 AND "trainerCount" >= 0 AND "version" >= 0),
 CHECK ("health" IN ('VERIFIED','UNAVAILABLE','REPAIR_REQUIRED'))
);
CREATE TABLE "SupportSession" (
 "id" TEXT PRIMARY KEY, "tokenHash" TEXT NOT NULL UNIQUE,
 "actorIdentityId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
 "authVersion" INTEGER NOT NULL, "gymId" TEXT NOT NULL REFERENCES "Gym"("id") ON DELETE RESTRICT,
 "scope" TEXT NOT NULL CHECK ("scope"='GYM_SUMMARY_READ'),
 "reasonCode" TEXT NOT NULL CHECK ("reasonCode" ~ '^[A-Z][A-Z0-9_]{1,49}$'),
 "explanation" TEXT NOT NULL CHECK (length("explanation") BETWEEN 10 AND 500),
 "issuedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "expiresAt" TIMESTAMPTZ(3) NOT NULL,
 "revokedAt" TIMESTAMPTZ(3), "revocationReason" TEXT, "version" INTEGER NOT NULL DEFAULT 0,
 CHECK ("tokenHash" ~ '^[a-f0-9]{64}$' AND "authVersion">=0 AND "version">=0),
 CHECK ("expiresAt"="issuedAt"+interval '15 minutes'),
 CHECK (("revokedAt" IS NULL)=("revocationReason" IS NULL))
);
CREATE INDEX "SupportSession_actorIdentityId_revokedAt_idx" ON "SupportSession"("actorIdentityId","revokedAt");
CREATE INDEX "SupportSession_expiresAt_idx" ON "SupportSession"("expiresAt");
CREATE TABLE "SupportEvent" (
 "id" TEXT PRIMARY KEY, "eventKey" TEXT NOT NULL UNIQUE,
 "supportSessionId" TEXT NOT NULL REFERENCES "SupportSession"("id") ON DELETE RESTRICT,
 "originalActorIdentityId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
 "gymId" TEXT NOT NULL REFERENCES "Gym"("id") ON DELETE RESTRICT,
 "scope" TEXT NOT NULL CHECK ("scope"='GYM_SUMMARY_READ'), "route" TEXT NOT NULL,
 "outcome" TEXT NOT NULL, "reasonReference" TEXT NOT NULL,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK ("reasonReference"="supportSessionId")
);
CREATE INDEX "SupportEvent_gymId_createdAt_idx" ON "SupportEvent"("gymId","createdAt");
CREATE FUNCTION gymos_support_session_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Support evidence is retained' USING ERRCODE='23514'; END IF;
 IF (to_jsonb(NEW)-ARRAY['revokedAt','revocationReason','version']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['revokedAt','revocationReason','version'])
 OR NEW."version"<>OLD."version"+1 OR OLD."revokedAt" IS NOT NULL OR NEW."revokedAt" IS NULL THEN
 RAISE EXCEPTION 'Support context is immutable except revocation' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER "SupportSession_immutable" BEFORE UPDATE OR DELETE ON "SupportSession" FOR EACH ROW EXECUTE FUNCTION gymos_support_session_guard();
CREATE FUNCTION gymos_support_event_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Support events are append only' USING ERRCODE='23514'; END; $$;
CREATE TRIGGER "SupportEvent_append_only" BEFORE UPDATE OR DELETE ON "SupportEvent" FOR EACH ROW EXECUTE FUNCTION gymos_support_event_guard();
COMMIT;
