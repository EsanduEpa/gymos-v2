import type { Prisma as MasterPrisma } from '../generated/master/client.js';
import type { Prisma as TenantPrisma } from '../generated/tenant/client.js';
import { canonicalJson, contentDigest, masterOperationAuditKey, masterVersionAuditKey,
  OperationIntegrityError, reference, tenantAuditKey } from './primitives.js';

export type AuditTransition = { from?: string; to?: string; version?: number };
export type AuditInput = {
  actorIdentityId: string; originalActorIdentityId?: string | null;
  eventCode: string; resourceType: string; resourceId: string; eventOrdinal?: number;
  transition: AuditTransition;
};
function clean(input: AuditInput) {
  for (const name of ['actorIdentityId', 'eventCode', 'resourceType', 'resourceId'] as const) reference(input[name]);
  if (input.originalActorIdentityId) reference(input.originalActorIdentityId);
  if (Object.keys(input.transition).some(key => !['from', 'to', 'version'].includes(key))) throw new TypeError('Audit transition contains unsupported details');
  if (input.transition.from !== undefined) reference(input.transition.from);
  if (input.transition.to !== undefined) reference(input.transition.to);
  if (input.transition.version !== undefined && (!Number.isSafeInteger(input.transition.version) || input.transition.version < 0)) throw new TypeError('Invalid transition version');
  canonicalJson(input.transition, true);
  return { actorIdentityId: input.actorIdentityId, originalActorIdentityId: input.originalActorIdentityId ?? null,
    eventCode: input.eventCode, resourceType: input.resourceType, resourceId: input.resourceId,
    transition: input.transition };
}
export async function appendMasterAudit(tx: MasterPrisma.TransactionClient, input: AuditInput & {
  operationId: string; stepCode: string; gymId?: string | null;
}) {
  const data = { ...clean(input), operationId: reference(input.operationId), gymId: input.gymId ?? null };
  const eventKey = masterOperationAuditKey(input);
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${eventKey}, 0))`;
  const existing = await tx.platformAuditLog.findUnique({ where: { eventKey } });
  const digest = contentDigest(data);
  if (existing) {
    if (existing.contentDigest !== digest) throw new OperationIntegrityError('Audit key has different content');
    return existing;
  }
  return tx.platformAuditLog.create({ data: { ...data, eventKey, contentDigest: digest } });
}
export async function appendMasterVersionAudit(tx: MasterPrisma.TransactionClient, input: AuditInput & {
  committedVersion: number; gymId?: string | null;
}) {
  const data = { ...clean(input), operationId: null, gymId: input.gymId ?? null };
  const eventKey = masterVersionAuditKey(input);
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${eventKey}, 0))`;
  const existing = await tx.platformAuditLog.findUnique({ where: { eventKey } });
  const digest = contentDigest(data);
  if (existing) {
    if (existing.contentDigest !== digest) throw new OperationIntegrityError('Audit key has different content');
    return existing;
  }
  // The caller MUST perform aggregate CAS in this same tx before calling this;
  // event keys do not implement result replay for arbitrary Master commands.
  return tx.platformAuditLog.create({ data: { ...data, eventKey, contentDigest: digest } });
}
export async function appendTenantAudit(tx: TenantPrisma.TransactionClient, input: AuditInput & {
  masterGymId: string; receiptId: string;
}) {
  const data = { ...clean(input), receiptId: reference(input.receiptId) };
  const eventKey = tenantAuditKey(input);
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${eventKey}, 0))`;
  const existing = await tx.auditLog.findUnique({ where: { eventKey } });
  const digest = contentDigest(data);
  if (existing) {
    if (existing.contentDigest !== digest) throw new OperationIntegrityError('Audit key has different content');
    return existing;
  }
  return tx.auditLog.create({ data: { ...data, eventKey, contentDigest: digest } });
}
