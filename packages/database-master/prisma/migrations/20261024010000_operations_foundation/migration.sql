BEGIN;

CREATE TYPE "OperationKind" AS ENUM ('PROVISION_GYM', 'REGISTER_MEMBER', 'REGISTER_TRAINER', 'UPDATE_GYM_PROFILE', 'CHANGE_ACCESS');

CREATE TYPE "OperationState" AS ENUM ('PENDING', 'MASTER_PREPARED', 'TENANT_COMMITTED', 'COMPLETE', 'FAILED_RETRYABLE', 'FAILED_FINAL', 'REPAIR_REQUIRED');

CREATE TABLE "Operation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "kind" "OperationKind" NOT NULL,
  "actorIdentityId" TEXT NOT NULL,
  "scopeKey" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "requestDigest" TEXT NOT NULL,
  "requestedSlug" TEXT,
  "supportContextId" TEXT,
  "gymId" TEXT,
  "subjectIdentityId" TEXT,
  "ownerThemeId" TEXT,
  "databaseName" TEXT,
  "intendedTenantTemplateVersion" TEXT,
  "intendedTenantManifestDigest" TEXT,
  "appliedTenantTemplateVersion" TEXT,
  "appliedTenantManifestDigest" TEXT,
  "tenantSchemaVerifiedAt" TIMESTAMPTZ(3),
  "tenantActorId" TEXT,
  "tenantCommandReceiptId" TEXT,
  "tenantMembershipId" TEXT,
  "completedSteps" JSONB NOT NULL DEFAULT '{}',
  "state" "OperationState" NOT NULL DEFAULT 'PENDING',
  "step" TEXT NOT NULL DEFAULT 'PENDING',
  "version" INTEGER NOT NULL DEFAULT 0,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "leaseToken" TEXT,
  "leaseExpiresAt" TIMESTAMPTZ(3),
  "leaseRequiresReconciliation" BOOLEAN NOT NULL DEFAULT false,
  "safeResult" JSONB,
  "errorCode" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "lastAttemptAt" TIMESTAMPTZ(3)
);

CREATE UNIQUE INDEX "Operation_databaseName_key" ON "Operation" ("databaseName");

CREATE UNIQUE INDEX "Operation_actorIdentityId_scopeKey_kind_idempotencyKey_key" ON "Operation" ("actorIdentityId", "scopeKey", "kind", "idempotencyKey");

CREATE INDEX "Operation_state_leaseExpiresAt_idx" ON "Operation" ("state", "leaseExpiresAt");

CREATE INDEX "Operation_gymId_createdAt_idx" ON "Operation" ("gymId", "createdAt");

CREATE TABLE "PlatformAuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "eventKey" TEXT NOT NULL,
  "contentDigest" TEXT NOT NULL,
  "actorIdentityId" TEXT NOT NULL,
  "originalActorIdentityId" TEXT,
  "gymId" TEXT,
  "operationId" TEXT,
  "eventCode" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "transition" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "PlatformAuditLog_eventKey_key" ON "PlatformAuditLog" ("eventKey");

CREATE INDEX "PlatformAuditLog_gymId_createdAt_id_idx" ON "PlatformAuditLog" ("gymId", "createdAt", "id");

CREATE INDEX "PlatformAuditLog_actorIdentityId_createdAt_idx" ON "PlatformAuditLog" ("actorIdentityId", "createdAt");

ALTER TABLE "Operation" ADD CONSTRAINT "Operation_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Operation" ADD CONSTRAINT "Operation_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Operation" ADD CONSTRAINT "Operation_subjectIdentityId_fkey" FOREIGN KEY ("subjectIdentityId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Operation" ADD CONSTRAINT "Operation_ownerThemeId_fkey" FOREIGN KEY ("ownerThemeId") REFERENCES "Theme" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlatformAuditLog" ADD CONSTRAINT "PlatformAuditLog_actorIdentityId_fkey" FOREIGN KEY ("actorIdentityId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlatformAuditLog" ADD CONSTRAINT "PlatformAuditLog_originalActorIdentityId_fkey" FOREIGN KEY ("originalActorIdentityId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlatformAuditLog" ADD CONSTRAINT "PlatformAuditLog_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PlatformAuditLog" ADD CONSTRAINT "PlatformAuditLog_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Append after Prisma-generated additive create-table DDL. Never rewrite applied SQL.
CREATE UNIQUE INDEX "Operation_provision_request_key_claim" ON "Operation" ("actorIdentityId", "kind", "idempotencyKey") WHERE "kind" = 'PROVISION_GYM';
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_version_nonnegative" CHECK ("version" >= 0 AND "attemptCount" >= 0);
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_digest_format" CHECK ("requestDigest" ~ '^d1:[a-f0-9]{64}$');
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_key_format" CHECK (length("idempotencyKey") BETWEEN 16 AND 128 AND "idempotencyKey" !~ '[^!-~]');
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_lease_pair" CHECK (("leaseToken" IS NULL) = ("leaseExpiresAt" IS NULL));
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_steps_object" CHECK (jsonb_typeof("completedSteps") = 'object');
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_provision_fields" CHECK ("kind" <> 'PROVISION_GYM' OR ("requestedSlug" IS NOT NULL AND "scopeKey" = 'provision-gym:' || "requestedSlug" AND "requestedSlug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND "databaseName" ~ '^gymos_[a-f0-9]{32}$' AND "databaseName" IS NOT NULL AND "intendedTenantTemplateVersion" IS NOT NULL AND "intendedTenantManifestDigest" ~ '^[a-f0-9]{64}$' AND "intendedTenantManifestDigest" IS NOT NULL));
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_complete_result" CHECK ("state" <> 'COMPLETE' OR ("safeResult" IS NOT NULL AND "leaseToken" IS NULL));
ALTER TABLE "PlatformAuditLog" ADD CONSTRAINT "PlatformAuditLog_event_format" CHECK ("eventKey" ~ '^(ma1|mv1):[a-f0-9]{64}$' AND "contentDigest" ~ '^[a-f0-9]{64}$');

CREATE FUNCTION gymos_guard_operation_immutability() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."actorIdentityId" IS DISTINCT FROM OLD."actorIdentityId" OR NEW."kind" IS DISTINCT FROM OLD."kind" OR NEW."scopeKey" IS DISTINCT FROM OLD."scopeKey" OR NEW."idempotencyKey" IS DISTINCT FROM OLD."idempotencyKey" OR NEW."requestDigest" IS DISTINCT FROM OLD."requestDigest" OR NEW."requestedSlug" IS DISTINCT FROM OLD."requestedSlug" OR NEW."supportContextId" IS DISTINCT FROM OLD."supportContextId" OR NEW."databaseName" IS DISTINCT FROM OLD."databaseName" OR NEW."intendedTenantTemplateVersion" IS DISTINCT FROM OLD."intendedTenantTemplateVersion" OR NEW."intendedTenantManifestDigest" IS DISTINCT FROM OLD."intendedTenantManifestDigest" THEN
    RAISE EXCEPTION 'Immutable operation intent cannot change' USING ERRCODE = '23514';
  END IF;
  IF (OLD."gymId" IS NOT NULL AND NEW."gymId" IS DISTINCT FROM OLD."gymId") OR (OLD."subjectIdentityId" IS NOT NULL AND NEW."subjectIdentityId" IS DISTINCT FROM OLD."subjectIdentityId") OR (OLD."ownerThemeId" IS NOT NULL AND NEW."ownerThemeId" IS DISTINCT FROM OLD."ownerThemeId") OR (OLD."tenantActorId" IS NOT NULL AND NEW."tenantActorId" IS DISTINCT FROM OLD."tenantActorId") OR (OLD."tenantCommandReceiptId" IS NOT NULL AND NEW."tenantCommandReceiptId" IS DISTINCT FROM OLD."tenantCommandReceiptId") OR (OLD."tenantMembershipId" IS NOT NULL AND NEW."tenantMembershipId" IS DISTINCT FROM OLD."tenantMembershipId") THEN
    RAISE EXCEPTION 'Operation effect ID cannot be rebound' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_each(OLD."completedSteps") AS previous(key,value) WHERE (NEW."completedSteps" -> previous.key) IS DISTINCT FROM previous.value) THEN
    RAISE EXCEPTION 'Committed operation evidence cannot be removed or changed' USING ERRCODE = '23514';
  END IF;
  IF NEW."kind" = 'PROVISION_GYM' AND NEW."gymId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Gym" WHERE "id" = NEW."gymId" AND "slug" = NEW."requestedSlug" AND "databaseName" = NEW."databaseName") THEN
    RAISE EXCEPTION 'Operation Gym target binding mismatch' USING ERRCODE = '23514';
  END IF;
  IF NEW."ownerThemeId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Theme" WHERE "id" = NEW."ownerThemeId" AND "gymId" = NEW."gymId") THEN
    RAISE EXCEPTION 'Operation Theme binding mismatch' USING ERRCODE = '23514';
  END IF;
  IF OLD."state" = 'COMPLETE' AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'Completed operation is immutable' USING ERRCODE = '23514';
  END IF;
  IF NEW."version" <> OLD."version" + 1 THEN
    RAISE EXCEPTION 'Operation update requires next version' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "Operation_immutable_intent" BEFORE UPDATE ON "Operation" FOR EACH ROW EXECUTE FUNCTION gymos_guard_operation_immutability();

CREATE FUNCTION gymos_forbid_audit_rewrite() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Audit history is append-only' USING ERRCODE = '23514'; END;
$$;
CREATE TRIGGER "PlatformAuditLog_append_only" BEFORE UPDATE OR DELETE ON "PlatformAuditLog" FOR EACH ROW EXECUTE FUNCTION gymos_forbid_audit_rewrite();


CREATE FUNCTION gymos_forbid_operation_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Operation retention prohibits deletion' USING ERRCODE = '23514'; END;
$$;
CREATE TRIGGER "Operation_retained" BEFORE DELETE ON "Operation" FOR EACH ROW EXECUTE FUNCTION gymos_forbid_operation_delete();
COMMIT;
