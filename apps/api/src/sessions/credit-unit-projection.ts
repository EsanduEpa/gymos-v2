import { ConflictException } from '@nestjs/common';
import type { Prisma } from '../generated/tenant/client.js';

type Reader = Pick<Prisma.TransactionClient, '$queryRaw'>;
export type CreditUnit = { packId: string; memberId: string; currency: string; creditOrdinal: number; startDate: Date; endDateExclusive: Date;
  effectiveEndDateExclusive: Date; packCreatedAt: Date; valueMinorUnits: bigint; available: number; held: number; consumed: number; expired: number; consistent: boolean };
export type CreditTotals = { total: number; available: number; held: number; consumed: number; expired: number };
export async function creditUnits(tx: Reader, memberId: string): Promise<CreditUnit[]> {
  const rows = await tx.$queryRaw<CreditUnit[]>`SELECT * FROM "PTCreditUnitBalance" WHERE "memberId"=${memberId} ORDER BY "effectiveEndDateExclusive","packCreatedAt","packId","creditOrdinal"`;
  if (rows.some(row => !row.consistent)) throw new ConflictException('Credit allocation is inconsistent; owner review is required');
  return rows;
}
export function eligibleUnits(units: CreditUnit[], date: string) {
  return units.filter(unit => unit.available === 1 && unit.startDate.toISOString().slice(0, 10) <= date && unit.effectiveEndDateExclusive.toISOString().slice(0, 10) > date);
}
export async function creditTotals(tx: Reader, memberIds: string[], date: string, onlyStarted = false) {
  const result = new Map<string, CreditTotals>();
  if (!memberIds.length) return result;
  const rows = await tx.$queryRaw<Array<{ memberId: string; total: bigint; available: bigint; held: bigint; consumed: bigint; expired: bigint; consistent: boolean }>>`
    SELECT "memberId",COUNT(*)::bigint AS total,
      SUM(CASE WHEN "effectiveEndDateExclusive">${date}::date AND (NOT ${onlyStarted} OR "startDate"<=${date}::date) THEN available ELSE 0 END)::bigint AS available,
      SUM(held)::bigint AS held,SUM(consumed)::bigint AS consumed,
      SUM(expired+CASE WHEN "effectiveEndDateExclusive"<=${date}::date THEN available ELSE 0 END)::bigint AS expired,
      bool_and(consistent) AS consistent
    FROM "PTCreditUnitBalance" WHERE "memberId"=ANY(${memberIds}::text[]) GROUP BY "memberId"`;
  for (const row of rows) {
    if (!row.consistent) throw new ConflictException('Credit allocation is inconsistent; owner review is required');
    result.set(row.memberId, { total: Number(row.total), available: Number(row.available), held: Number(row.held), consumed: Number(row.consumed), expired: Number(row.expired) });
  }
  return result;
}
