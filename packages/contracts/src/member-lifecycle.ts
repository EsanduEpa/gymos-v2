import { z } from 'zod';

const id = z.string().min(1).max(128).regex(/^[A-Za-z0-9_:-]+$/);
const version = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const memberStatusCommandSchema = z.strictObject({
  targetStatus: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
  expectedVersion: version,
  reason: z.string().trim().min(1).max(500),
});
export const memberLifecycleResultSchema = z.strictObject({
  operationId: id, gymId: id, memberId: id,
  targetStatus: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
  state: z.enum(['PENDING', 'MASTER_PREPARED', 'TENANT_COMMITTED', 'COMPLETE', 'FAILED_RETRYABLE', 'FAILED_FINAL', 'REPAIR_REQUIRED']),
  version, retryable: z.boolean(), cancelledSessionCount: z.number().int().nonnegative(),
});
export type MemberStatusCommand = z.infer<typeof memberStatusCommandSchema>;
export type MemberLifecycleResult = z.infer<typeof memberLifecycleResultSchema>;
