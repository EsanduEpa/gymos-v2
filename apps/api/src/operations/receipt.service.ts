import type { Prisma, PrismaClient, CommandReceipt } from '../generated/tenant/client.js';
import { canonicalJson, idempotencyKey, OperationConflictError, OperationIntegrityError,
  reference, requestDigest, safeResult, type SafeResult } from './primitives.js';
import { appendTenantAudit, type AuditInput } from './transaction-audit.js';

type Tx = Prisma.TransactionClient;
export class CommandReceiptFoundationService {
  // Caller resolves/gates this exact tenant client and actor/context beforehand.
  // No database name, recipient or actor authority comes from a browser DTO.
  constructor(private readonly tenant: PrismaClient) {}

  async execute(input: {
    masterGymId: string; actorIdentityId: string; commandKind: string; idempotencyKey: string;
    normalizedIntent: unknown; sourceMasterOperationId?: string; supportContextId?: string;
  }, effects: (tx: Tx, receipt: CommandReceipt) => Promise<{
    result: SafeResult; audits: AuditInput[]; resourceType?: string; resourceId?: string;
  }>) {
    for (const value of [input.masterGymId, input.actorIdentityId, input.commandKind]) reference(value);
    idempotencyKey(input.idempotencyKey);
    if (input.sourceMasterOperationId) reference(input.sourceMasterOperationId);
    const digest = requestDigest({ commandVersion: '1', masterGymId: input.masterGymId,
      actorIdentityId: input.actorIdentityId, commandKind: input.commandKind,
      supportContextId: input.supportContextId ?? null,
      sourceMasterOperationId: input.sourceMasterOperationId ?? null, intent: input.normalizedIntent });
    return this.tenant.$transaction(async tx => {
      // Lock EVERY unique claim in sorted order, including source operation, so
      // concurrent retries with another key cannot create a second local actor.
      const keys = [canonicalJson(['receipt', input.actorIdentityId, input.commandKind, input.idempotencyKey])];
      if (input.sourceMasterOperationId) keys.push(canonicalJson(['enrollment', input.sourceMasterOperationId]));
      for (const key of keys.sort()) await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
      const candidates = await tx.commandReceipt.findMany({ where: { OR: [
        { actorIdentityId: input.actorIdentityId, commandKind: input.commandKind, idempotencyKey: input.idempotencyKey },
        ...(input.sourceMasterOperationId ? [{ sourceMasterOperationId: input.sourceMasterOperationId }] : []),
      ] } });
      if (candidates.length > 1) throw new OperationIntegrityError('Receipt key and source operation disagree');
      const previous = candidates[0];
      if (previous) {
        if (previous.requestDigest !== digest || previous.actorIdentityId !== input.actorIdentityId
          || previous.commandKind !== input.commandKind || previous.sourceMasterOperationId !== (input.sourceMasterOperationId ?? null)) throw new OperationConflictError();
        if (previous.state !== 'COMMITTED') throw new OperationConflictError('Receipt requires explicit recovery');
        return { receiptId: previous.id, result: safeResult(previous.safeResult), replayed: true };
      }
      const receipt = await tx.commandReceipt.create({ data: {
        actorIdentityId: input.actorIdentityId, commandKind: input.commandKind,
        idempotencyKey: input.idempotencyKey, requestDigest: digest,
        sourceMasterOperationId: input.sourceMasterOperationId ?? null,
      } });
      // All business state, required notification insertions and domain unique
      // constraints belong inside this callback/local transaction. Different-key
      // business duplicates need domain uniqueness (040), not just a receipt.
      const outcome = await effects(tx, receipt);
      const result = safeResult(outcome.result);
      if (!outcome.audits.length) throw new OperationIntegrityError('Required command audit is missing');
      for (const [index, audit] of outcome.audits.entries()) {
        if (audit.actorIdentityId !== input.actorIdentityId) throw new OperationIntegrityError('Audit actor differs from command actor');
        await appendTenantAudit(tx, { ...audit, masterGymId: input.masterGymId,
          receiptId: receipt.id, eventOrdinal: index });
      }
      const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
      await tx.commandReceipt.update({ where: { id: receipt.id }, data: {
        state: 'COMMITTED', safeResult: result as Prisma.InputJsonValue, committedAt: now,
        resourceType: outcome.resourceType ? reference(outcome.resourceType) : null,
        resourceId: outcome.resourceId ? reference(outcome.resourceId) : null,
      } });
      return { receiptId: receipt.id, result, replayed: false };
    });
  }
}
