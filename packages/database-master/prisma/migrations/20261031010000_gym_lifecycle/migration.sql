BEGIN;
CREATE TABLE "GymLifecycleIntent" (
 "operationId" TEXT PRIMARY KEY REFERENCES "Operation"("id") ON DELETE RESTRICT,
 "expectedGymVersion" INTEGER NOT NULL CHECK ("expectedGymVersion">=0),
 "target" TEXT NOT NULL CHECK ("target" IN ('ACTIVE','SUSPENDED')),
 "reason" TEXT NOT NULL CHECK (length("reason") BETWEEN 10 AND 500),
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE FUNCTION gymos_lifecycle_intent_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Lifecycle intent is immutable and retained' USING ERRCODE='23514'; END; $$;
CREATE TRIGGER "GymLifecycleIntent_immutable" BEFORE UPDATE OR DELETE ON "GymLifecycleIntent" FOR EACH ROW EXECUTE FUNCTION gymos_lifecycle_intent_guard();
COMMIT;
