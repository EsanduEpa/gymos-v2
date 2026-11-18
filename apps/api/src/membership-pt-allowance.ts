import type { MembershipTerm, Prisma } from './generated/tenant/client.js';
import { requestDigest } from './operations/primitives.js';
import type { AuditInput } from './operations/transaction-audit.js';

type AllowanceTerm = Pick<MembershipTerm, 'id' | 'memberId' | 'actorIdentityId' | 'currency' |
  'startDate' | 'endDateExclusive' | 'includedPtCredits'>;

/** The caller creates the term and its command receipt in this same transaction. */
export async function issueMembershipPtAllowance(tx: Prisma.TransactionClient, term: AllowanceTerm, receiptId: string): Promise<AuditInput | null> {
  const { id: membershipTermId, memberId, actorIdentityId, currency, startDate, endDateExclusive, includedPtCredits } = term;
  if (includedPtCredits === 0) return null;
  const idempotencyKey = `membership-allowance:${membershipTermId}`;
  const digest = requestDigest({ membershipTermId, memberId, includedPtCredits });
  // PostgreSQL date values are represented as UTC midnight. The pack uses the
  // same half-open gym-local date range as the term and carries zero sale value.
  const validityDays = (endDateExclusive.getTime() - startDate.getTime()) / 86_400_000;
  const pack = await tx.sessionPack.create({ data: {
    memberId, membershipTermId, issuedCredits: includedPtCredits, price: '0', currency,
    totalMinorUnits: 0n, creditBaseMinorUnits: 0n, creditRemainder: 0, creditAllocationPolicyVersion: 'DEC-06-v1',
    startDate, endDateExclusive, validityDays, commandReceiptId: receiptId, actorIdentityId, idempotencyKey, requestDigest: digest,
  }, select: { id: true } });
  await tx.packCreditMovement.create({ data: {
    packId: pack.id, kind: 'ISSUE', availableDelta: includedPtCredits, heldDelta: 0, consumedDelta: 0, expiredDelta: 0,
    sourceKey: idempotencyKey, receiptId, actorIdentityId,
  } });
  return { actorIdentityId, eventCode: 'MEMBER_SESSION_PACK_ISSUED', resourceType: 'SESSION_PACK',
    resourceId: pack.id, transition: { to: 'ISSUED', version: 0 } };
}
