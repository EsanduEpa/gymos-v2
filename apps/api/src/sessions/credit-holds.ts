import { creditUnits, eligibleUnits } from './credit-unit-projection.js';
import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Prisma as TenantPrisma } from '../generated/tenant/client.js';
import { canonicalJson, reference } from '../operations/primitives.js';
import { derivePackCreditBalance } from './session-state.js';

export type ReservationInput = {
  masterGymId: string;
  sessionId: string;
  memberId: string;
  trainerId: string;
  scheduledLocalDate: string;
  explicitPackId?: string;
  actorIdentityId: string;
  receiptId: string;
};

function sourceKey(masterGymId: string, sessionId: string, effect: string) {
  const digest = createHash('sha256').update(canonicalJson([reference(masterGymId), reference(sessionId), effect])).digest('hex');
  return `pc1:${digest}`;
}

async function lockActorRows(tx: TenantPrisma.TransactionClient, memberId: string, trainerId: string) {
  const [member] = await tx.$queryRaw<{ id: string; status: string; registrationState: string }[]>`SELECT "id", "status"::text, "registrationState"::text FROM "Member" WHERE "id" = ${memberId} FOR UPDATE`;
  if (!member || member.status !== 'ACTIVE' || member.registrationState !== 'COMPLETE') throw new UnprocessableEntityException('Member is not eligible for a session');
  const [trainer] = await tx.$queryRaw<{ id: string; status: string; registrationState: string }[]>`SELECT "id", "status"::text, "registrationState"::text FROM "Trainer" WHERE "id" = ${trainerId} FOR UPDATE`;
  if (!trainer || trainer.status !== 'ACTIVE' || trainer.registrationState !== 'COMPLETE') throw new UnprocessableEntityException('Trainer is not eligible for a session');
}

function localDate(value: string) {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new UnprocessableEntityException('Enter a valid gym-local session date');
  }
  return new Date(`${value}T00:00:00.000Z`);
}

async function packBalance(tx: TenantPrisma.TransactionClient, packId: string, issuedCredits: number) {
  const rows = await tx.packCreditMovement.findMany({ where: { packId }, select: { availableDelta: true, heldDelta: true, consumedDelta: true, expiredDelta: true } });
  return derivePackCreditBalance(issuedCredits, rows.map(row => ({ available: row.availableDelta, held: row.heldDelta,
    consumed: row.consumedDelta, expired: row.expiredDelta })));
}

/**
 * Caller owns the outer tenant transaction and has created the SCHEDULED PTSession row.
 * Lock order for reservation is Member -> Trainer -> SessionPack. All booking/acceptance
 * consumers must use this helper so the final available-credit check is serialized.
 */
export async function reserveSessionCredit(tx: TenantPrisma.TransactionClient, input: ReservationInput) {
  const session = await tx.pTSession.findUnique({ where: { id: input.sessionId }, select: {
    memberId: true, trainerId: true, state: true, scheduledStartAt: true, currency: true,
  } });
  if (!session || session.memberId !== input.memberId || session.trainerId !== input.trainerId || session.state !== 'SCHEDULED') {
    throw new ConflictException('Session is no longer eligible for credit reservation');
  }
  await lockActorRows(tx, input.memberId, input.trainerId);
  const date = localDate(input.scheduledLocalDate);
  const term = await tx.membershipTerm.findFirst({ where: { memberId: input.memberId, startDate: { lte: date }, endDateExclusive: { gt: date } }, select: { id: true } });
  if (!term) throw new UnprocessableEntityException('Member has no active membership for this session date');
  let selectedUnit = eligibleUnits(await creditUnits(tx, input.memberId), input.scheduledLocalDate).find(unit => unit.currency === session.currency && (!input.explicitPackId || unit.packId === input.explicitPackId));
  if (!selectedUnit) throw new UnprocessableEntityException('No eligible session-pack credit is available for this date');
  await tx.$queryRaw`SELECT "id" FROM "SessionPack" WHERE "id" = ${selectedUnit.packId} FOR UPDATE`;
  selectedUnit = eligibleUnits(await creditUnits(tx, input.memberId), input.scheduledLocalDate).find(unit => unit.packId === selectedUnit!.packId && unit.creditOrdinal === selectedUnit!.creditOrdinal);
  if (!selectedUnit) throw new ConflictException('The selected credit changed; refresh and try again');
  const selected = await tx.sessionPack.findUniqueOrThrow({ where: { id: selectedUnit.packId } });
  if (selected.creditAllocationPolicyVersion !== 'DEC-06-v1') throw new ConflictException('Pack credit allocation requires review');
  const creditOrdinal = selectedUnit.creditOrdinal;
  const creditValueMinorUnits = selectedUnit.valueMinorUnits;

  const existing = await tx.sessionCreditHold.findUnique({ where: { sessionId: input.sessionId } });
  if (existing) throw new ConflictException('A credit hold already exists for this session');
  const hold = await tx.sessionCreditHold.create({ data: { sessionId: input.sessionId, packId: selected.id, state: 'HELD',
    creditOrdinal, creditValueMinorUnits } });
  await tx.packCreditMovement.create({ data: {
    packId: selected.id, holdId: hold.id, kind: 'HOLD', creditOrdinal, availableDelta: -1, heldDelta: 1, consumedDelta: 0, expiredDelta: 0,
    sourceKey: sourceKey(input.masterGymId, input.sessionId, 'HOLD'), receiptId: input.receiptId, actorIdentityId: input.actorIdentityId,
  } });
  return { holdId: hold.id, packId: selected.id, creditOrdinal, creditValueMinorUnits, version: hold.version };
}

export async function resolveSessionCreditHold(tx: TenantPrisma.TransactionClient, input: {
  masterGymId: string; sessionId: string; receiptId: string; actorIdentityId: string;
  resolution: 'CONSUME' | 'RELEASE'; gymLocalDate: string;
}) {
  const hold = await tx.sessionCreditHold.findUnique({ where: { sessionId: input.sessionId }, include: { pack: true } });
  if (!hold) throw new ConflictException('Session has no held pack credit');
  await tx.$queryRaw`SELECT "id" FROM "SessionPack" WHERE "id" = ${hold.packId} FOR UPDATE`;
  const currentHold = await tx.sessionCreditHold.findUnique({ where: { id: hold.id } });
  if (!currentHold || currentHold.state !== 'HELD') throw new ConflictException('Session credit hold has already been resolved');
  const unit = (await creditUnits(tx, hold.pack.memberId)).find(unit => unit.packId === hold.packId && unit.creditOrdinal === hold.creditOrdinal);
  if (!unit || unit.held !== 1) throw new ConflictException('The original held credit is inconsistent');
  const expiryDate = unit.effectiveEndDateExclusive.toISOString().slice(0, 10);
  const expiredAtResolution = input.resolution === 'RELEASE' && localDate(input.gymLocalDate) >= unit.effectiveEndDateExclusive;
  const kind = input.resolution === 'CONSUME' ? 'CONSUME' : expiredAtResolution ? 'EXPIRE' : 'RELEASE';
  await tx.packCreditMovement.create({ data: {
    packId: hold.packId, holdId: hold.id, kind,
    creditOrdinal: hold.creditOrdinal,
    availableDelta: kind === 'RELEASE' ? 1 : 0,
    heldDelta: -1,
    consumedDelta: kind === 'CONSUME' ? 1 : 0,
    expiredDelta: kind === 'EXPIRE' ? 1 : 0,
    sourceKey: sourceKey(input.masterGymId, input.sessionId, input.resolution), receiptId: input.receiptId,
    actorIdentityId: input.actorIdentityId,
  } });
  const nextState = input.resolution === 'CONSUME' ? 'CONSUMED' : 'RELEASED';
  const updated = await tx.sessionCreditHold.update({ where: { id: hold.id, version: currentHold.version, state: 'HELD' },
    data: { state: nextState, resolvedAt: new Date(), version: { increment: 1 } } });
  const balance = await packBalance(tx, hold.packId, hold.pack.issuedCredits);
  return { holdId: hold.id, packId: hold.packId, creditOrdinal: hold.creditOrdinal, creditValueMinorUnits: hold.creditValueMinorUnits,
    state: updated.state, balance, expiredAtResolution, expiryDate };
}
