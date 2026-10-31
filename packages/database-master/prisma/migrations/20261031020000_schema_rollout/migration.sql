ALTER TYPE "OperationKind" ADD VALUE 'ROLLOUT_TENANT_SCHEMA';
CREATE TABLE "SchemaRollout" (
 "id" TEXT PRIMARY KEY, "actorIdentityId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
 "idempotencyKey" TEXT NOT NULL, "requestDigest" TEXT NOT NULL, "targetVersion" TEXT NOT NULL, "targetDigest" TEXT NOT NULL,
 "orderedGymIds" JSONB NOT NULL, "batchSize" INTEGER NOT NULL CHECK ("batchSize" BETWEEN 1 AND 25),
 "state" TEXT NOT NULL DEFAULT 'CANARY_PENDING' CHECK ("state" IN ('CANARY_PENDING','CANARY_READY','BATCH_READY','STOPPED_REPAIR','COMPLETE')),
 "version" INTEGER NOT NULL DEFAULT 0 CHECK ("version">=0), "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE ("actorIdentityId","idempotencyKey"), CHECK ("requestDigest" ~ '^d1:[a-f0-9]{64}$' AND "targetDigest" ~ '^[a-f0-9]{64}$'),
 CHECK (jsonb_typeof("orderedGymIds")='array' AND jsonb_array_length("orderedGymIds") BETWEEN 1 AND 100)
);
CREATE TABLE "SchemaRolloutTarget" (
 "operationId" TEXT PRIMARY KEY REFERENCES "Operation"("id") ON DELETE RESTRICT,
 "rolloutId" TEXT NOT NULL REFERENCES "SchemaRollout"("id") ON DELETE RESTRICT,
 "ordinal" INTEGER NOT NULL CHECK ("ordinal">=0), "databaseName" TEXT NOT NULL,
 "ownershipOperationId" TEXT NOT NULL REFERENCES "Operation"("id") ON DELETE RESTRICT,
 "sourceOperationId" TEXT NOT NULL REFERENCES "Operation"("id") ON DELETE RESTRICT,
 "sourceVersion" TEXT NOT NULL, "sourceDigest" TEXT NOT NULL CHECK ("sourceDigest" ~ '^[a-f0-9]{64}$'),
 "expectedGymVersion" INTEGER NOT NULL CHECK ("expectedGymVersion">=0), UNIQUE ("rolloutId","ordinal")
);
CREATE TABLE "SchemaRepairReview" (
 "id" TEXT PRIMARY KEY, "operationId" TEXT NOT NULL REFERENCES "SchemaRolloutTarget"("operationId") ON DELETE RESTRICT,
 "actorIdentityId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
 "approvedAttempt" INTEGER NOT NULL CHECK ("approvedAttempt">1), "reason" TEXT NOT NULL CHECK (length("reason") BETWEEN 10 AND 500),
 "observedVersion" TEXT NOT NULL, "observedDigest" TEXT NOT NULL CHECK ("observedDigest" ~ '^[a-f0-9]{64}$'),
 "schemaEvidenceDigest" TEXT NOT NULL CHECK ("schemaEvidenceDigest" ~ '^[a-f0-9]{64}$'),
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE ("operationId","approvedAttempt")
);
CREATE FUNCTION gymos_schema_intent_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Schema target/review evidence is immutable and retained' USING ERRCODE='23514'; END; $$;
CREATE TRIGGER "SchemaRolloutTarget_immutable" BEFORE UPDATE OR DELETE ON "SchemaRolloutTarget" FOR EACH ROW EXECUTE FUNCTION gymos_schema_intent_guard();
CREATE TRIGGER "SchemaRepairReview_immutable" BEFORE UPDATE OR DELETE ON "SchemaRepairReview" FOR EACH ROW EXECUTE FUNCTION gymos_schema_intent_guard();
CREATE FUNCTION gymos_schema_rollout_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' OR (to_jsonb(NEW)-ARRAY['state','version']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','version']) OR NEW."version"<>OLD."version"+1 OR OLD."state"='COMPLETE' THEN
 RAISE EXCEPTION 'Rollout intent/progress is immutable or stale' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER "SchemaRollout_guard" BEFORE UPDATE OR DELETE ON "SchemaRollout" FOR EACH ROW EXECUTE FUNCTION gymos_schema_rollout_guard();
CREATE TABLE "SchemaRolloutApproval" (
 "id" TEXT PRIMARY KEY, "rolloutId" TEXT NOT NULL REFERENCES "SchemaRollout"("id") ON DELETE RESTRICT,
 "expectedVersion" INTEGER NOT NULL CHECK ("expectedVersion">=0), "actorIdentityId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
 "reason" TEXT NOT NULL CHECK (length("reason") BETWEEN 10 AND 500), "canaryEvidenceDigest" TEXT NOT NULL CHECK ("canaryEvidenceDigest" ~ '^[a-f0-9]{64}$'),
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE ("rolloutId","expectedVersion")
);
CREATE TRIGGER "SchemaRolloutApproval_immutable" BEFORE UPDATE OR DELETE ON "SchemaRolloutApproval" FOR EACH ROW EXECUTE FUNCTION gymos_schema_intent_guard();
CREATE TABLE "MasterSchemaState" (
 "id" TEXT PRIMARY KEY CHECK ("id"='current'), "templateVersion" TEXT NOT NULL,
 "manifestDigest" TEXT NOT NULL CHECK ("manifestDigest" ~ '^[a-f0-9]{64}$'), "schemaEvidenceDigest" TEXT NOT NULL CHECK ("schemaEvidenceDigest" ~ '^[a-f0-9]{64}$'),
 "verifiedAt" TIMESTAMPTZ(3) NOT NULL, "version" INTEGER NOT NULL DEFAULT 0 CHECK ("version">=0)
);
CREATE TABLE "MasterSchemaDeployment" (
 "id" TEXT PRIMARY KEY, "manifestDigest" TEXT NOT NULL UNIQUE CHECK ("manifestDigest" ~ '^[a-f0-9]{64}$'),
 "templateVersion" TEXT NOT NULL, "schemaEvidenceDigest" TEXT NOT NULL CHECK ("schemaEvidenceDigest" ~ '^[a-f0-9]{64}$'),
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER "MasterSchemaDeployment_immutable" BEFORE UPDATE OR DELETE ON "MasterSchemaDeployment" FOR EACH ROW EXECUTE FUNCTION gymos_schema_intent_guard();
