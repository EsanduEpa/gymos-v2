import { randomUUID } from 'node:crypto';
import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { PrismaClient } from '../generated/tenant/client.js';
import type { TenantGateContext } from '../tenancy/tenant-schema-gate.service.js';
import type { AvailabilityUpdate } from '@gymos/contracts';
import { availabilitySchema, availabilitySlotsSchema } from '@gymos/contracts';
import { DatabaseService } from '../database.service.js';
import { withGymAccessFence } from '../identity/gym-access-fence.js';
import { requestDigest } from '../operations/primitives.js';
import { appendTenantAudit } from '../operations/transaction-audit.js';
import { TenantSchemaGateService } from '../tenancy/tenant-schema-gate.service.js';
import { allowedStartMinutes, resolvedStartSlots, type AvailabilityRule } from './availability-policy.js';

type Access = TenantGateContext & { identityId: string; role: string; slug: string; accessVersion: number; actor: { kind: 'TRAINER' | 'MEMBER'; id: string } | null };
const utcDate = (value: string | Date) => new Date(typeof value === 'string' ? `${value}T00:00:00.000Z` : `${value.toISOString().slice(0, 10)}T00:00:00.000Z`);
const localParts = (date: Date, zone: string) => Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }).formatToParts(date).map(p => [p.type, p.value]));
const weekdayNumber = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();
const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

@Injectable()
export class SessionAvailabilityService {
  constructor(private readonly db: DatabaseService, private readonly gate: TenantSchemaGateService) {}
  private async binding(tenant: PrismaClient, access: Access, trainerId: string) {
    const trainer = await tenant.trainer.findFirst({ where: { id: trainerId, registrationState: 'COMPLETE', status: 'ACTIVE' }, select: { id: true, identityId: true, version: true } });
    if (!trainer?.identityId) throw new NotFoundException('Trainer not found');
    const link = await this.db.master.gymAccess.findFirst({ where: { gymId: access.gymId, role: 'TRAINER', actorKind: 'TRAINER', tenantActorId: trainerId, userId: trainer.identityId, linkStatus: 'ACTIVE' }, select: { userId: true } });
    if (!link) throw new NotFoundException('Trainer not found');
    if (access.role === 'TRAINER' && (access.actor?.kind !== 'TRAINER' || access.actor.id !== trainerId || trainer.identityId !== access.identityId)) throw new NotFoundException('Trainer not found');
    return { trainer, identityId: link.userId };
  }
  async read(access: Access, trainerId: string, query: { from: string; through: string }) {
    if (query.through <= query.from || new Date(`${query.through}T00:00:00Z`).getTime() - new Date(`${query.from}T00:00:00Z`).getTime() > 60 * 86400000) throw new UnprocessableEntityException('Date range must be ordered and at most 60 days');
    return this.gate.withVerifiedTenant(access, async tenant => {
      const binding = await this.binding(tenant, access, trainerId);
      const targets = access.role === 'OWNER'
        ? [{ identityId: access.identityId, gymId: access.gymId, role: 'OWNER' as const }, { identityId: binding.identityId, gymId: access.gymId, role: 'TRAINER' as const, tenantActorId: trainerId }]
        : [{ identityId: access.identityId, gymId: access.gymId, role: 'TRAINER' as const, tenantActorId: trainerId }];
      return withGymAccessFence(this.db.master, targets, async () => {
        const [config, rules] = await Promise.all([tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { timezone: true } }), tenant.pTAvailabilityRule.findMany({ where: { OR: [{ trainerId }, { kind: 'GYM_CLOSURE' }], localDate: { gte: utcDate(query.from), lte: utcDate(query.through) } }, orderBy: [{ localDate: 'asc' }, { startMinute: 'asc' }] })]);
        if (!config?.timezone) throw new UnprocessableEntityException('Gym time zone is unavailable');
        const weekly = await tenant.pTAvailabilityRule.findMany({ where: { trainerId, kind: 'WEEKLY_WINDOW' } });
        const values = [...weekly, ...rules];
        return availabilitySchema.parse({ trainerId, version: binding.trainer.version, timeZone: config.timezone, asOf: new Date().toISOString(),
          weekly: values.filter(v => v.kind === 'WEEKLY_WINDOW').map(v => ({ weekday: v.weekday!, effectiveFrom: v.effectiveFrom!.toISOString().slice(0, 10), effectiveToExclusive: v.effectiveToExclusive!.toISOString().slice(0, 10), startMinute: v.startMinute!, endMinute: v.endMinute! })),
          dated: values.filter(v => v.kind === 'DATED_WINDOW').map(v => ({ localDate: v.localDate!.toISOString().slice(0, 10), startMinute: v.startMinute!, endMinute: v.endMinute! })),
          blocks: values.filter(v => v.kind === 'BLOCK').map(v => ({ localDate: v.localDate!.toISOString().slice(0, 10), startMinute: v.startMinute!, endMinute: v.endMinute!, reason: v.reason })),
          closures: values.filter(v => v.kind === 'GYM_CLOSURE').map(v => v.localDate!.toISOString().slice(0, 10)) });
      });
    });
  }
  async update(access: Access, trainerId: string, input: AvailabilityUpdate) {
    if (access.role !== 'OWNER' && access.role !== 'TRAINER') throw new ForbiddenException('Trainer or owner access is required');
    if (access.role === 'TRAINER' && input.closures.length) throw new ForbiddenException('Only owners can change gym closure dates');
    return this.gate.withVerifiedTenant(access, async tenant => {
      const binding = await this.binding(tenant, access, trainerId);
      const targets = access.role === 'OWNER'
        ? [{ identityId: access.identityId, gymId: access.gymId, role: 'OWNER' as const }, { identityId: binding.identityId, gymId: access.gymId, role: 'TRAINER' as const, tenantActorId: trainerId }]
        : [{ identityId: access.identityId, gymId: access.gymId, role: 'TRAINER' as const, tenantActorId: trainerId }];
      return withGymAccessFence(this.db.master, targets, () => tenant.$transaction(async tx => {
        await tx.$queryRaw`SELECT "id" FROM "Trainer" WHERE "id" = ${trainerId} FOR UPDATE`;
        const trainer = await tx.trainer.findFirst({ where: { id: trainerId, status: 'ACTIVE', registrationState: 'COMPLETE' } });
        if (!trainer) throw new NotFoundException('Trainer not found');
        const now = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
        const digest = requestDigest({ trainerId, input });
        const previous = await tx.commandReceipt.findUnique({ where: { actorIdentityId_commandKind_idempotencyKey: { actorIdentityId: access.identityId, commandKind: 'UPDATE_PT_AVAILABILITY', idempotencyKey: input.idempotencyKey } } });
        if (previous) {
          if (previous.requestDigest !== digest || previous.resourceId !== trainerId || previous.state !== 'COMMITTED') throw new ConflictException('Availability command key conflicts with an earlier command');
          return availabilitySchema.parse(previous.safeResult);
        }
        if (trainer.version !== input.expectedVersion) throw new ConflictException('Availability changed; reload before saving');
        const startBound = now[0]!.now;
        const gymConfig = await tx.gymConfiguration.findUnique({ where: { id: 'current' }, select: { timezone: true } });
        if (!gymConfig?.timezone) throw new UnprocessableEntityException('Gym time zone is unavailable');
        const priorClosures = access.role === 'OWNER' && input.closureRange ? await tx.pTAvailabilityRule.findMany({ where: { kind: 'GYM_CLOSURE', localDate: { gte: utcDate(input.closureRange.from), lte: utcDate(input.closureRange.through) } }, select: { localDate: true } }) : [];
        const priorClosureDates = new Set(priorClosures.flatMap(row => row.localDate ? [row.localDate.toISOString().slice(0, 10)] : []));
        const newClosureDates = input.closures.filter(date => !priorClosureDates.has(date));
        if (newClosureDates.length) {
          const closureSessions = await tx.pTSession.findMany({ where: { state: { in: ['PENDING_CONFIRMATION', 'SCHEDULED', 'ACTIVE'] },
            AND: [{ OR: [{ state: { not: 'PENDING_CONFIRMATION' } }, { requestExpiresAt: { gt: startBound } }] }], scheduledStartAt: { gte: startBound, lte: new Date(startBound.getTime() + 14 * 86400000) } }, take: 501,
            select: { id: true, scheduledStartAt: true } });
          if (closureSessions.length > 500) throw new ConflictException('Too many live sessions to review closure impact; narrow the closure edit and try again');
          const hit = closureSessions.filter(session => { const p = localParts(session.scheduledStartAt, gymConfig.timezone!); return newClosureDates.includes(`${p.year}-${p.month}-${p.day}`); });
          if (hit.length) throw new ConflictException({ message: 'Gym closures require resolving existing live sessions first', affectedSessionIds: hit.map(session => session.id) });
        }
        const affected = await tx.pTSession.findMany({ where: { trainerId, state: { in: ['PENDING_CONFIRMATION', 'SCHEDULED', 'ACTIVE'] },
          AND: [{ OR: [{ state: { not: 'PENDING_CONFIRMATION' } }, { requestExpiresAt: { gt: startBound } }] }], scheduledEndAt: { gt: startBound } }, select: { id: true, scheduledStartAt: true, scheduledEndAt: true } });
        const rules: Array<{ kind: 'WEEKLY_WINDOW' | 'DATED_WINDOW' | 'BLOCK' | 'GYM_CLOSURE'; weekday: number | null; localDate: string | null; startMinute: number | null; endMinute: number | null; effectiveFrom: string | null; effectiveToExclusive: string | null; reason?: string | null }> = [
          ...input.weekly.flatMap(day => day.windows.map(window => ({ kind: 'WEEKLY_WINDOW' as const, weekday: day.weekday, localDate: null, startMinute: window.startMinute, endMinute: window.endMinute, effectiveFrom: day.effectiveFrom, effectiveToExclusive: day.effectiveToExclusive }))),
          ...input.dated.flatMap(day => day.windows.map(window => ({ kind: 'DATED_WINDOW' as const, weekday: null, localDate: day.localDate, startMinute: window.startMinute, endMinute: window.endMinute, effectiveFrom: null, effectiveToExclusive: null }))),
          ...input.blocks.map(block => ({ kind: 'BLOCK' as const, weekday: null, localDate: block.localDate, startMinute: block.startMinute, endMinute: block.endMinute, effectiveFrom: null, effectiveToExclusive: null, reason: block.reason ?? null })),
          ...(access.role === 'OWNER' ? input.closures.map(localDate => ({ kind: 'GYM_CLOSURE' as const, weekday: null, localDate, startMinute: null, endMinute: null, effectiveFrom: null, effectiveToExclusive: null })) : []),
        ];
        const policyRules = rules.map(rule => ({ ...rule, localDate: rule.localDate ? utcDate(rule.localDate) : null, effectiveFrom: rule.effectiveFrom ? utcDate(rule.effectiveFrom) : null, effectiveToExclusive: rule.effectiveToExclusive ? utcDate(rule.effectiveToExclusive) : null })) as AvailabilityRule[];
        const invalidated = affected.filter(session => {
          const parts = localParts(session.scheduledStartAt, gymConfig.timezone!);
          const localDate = `${parts.year}-${parts.month}-${parts.day}`; const minute = Number(parts.hour) * 60 + Number(parts.minute);
          return !allowedStartMinutes(localDate, policyRules, weekdayNumber(localDate)).includes(minute);
        });
        if (invalidated.length) throw new ConflictException({ message: 'Availability changes require resolving existing live sessions first', affectedSessionIds: invalidated.map(session => session.id) });
          const receipt = await tx.commandReceipt.create({ data: { actorIdentityId: access.identityId, commandKind: 'UPDATE_PT_AVAILABILITY', idempotencyKey: input.idempotencyKey, requestDigest: digest, resourceType: 'TRAINER', resourceId: trainerId, state: 'RUNNING' } });
          await tx.pTAvailabilityRule.deleteMany({ where: { trainerId } });
          if (access.role === 'OWNER' && input.closureRange) await tx.pTAvailabilityRule.deleteMany({ where: { kind: 'GYM_CLOSURE', localDate: { gte: utcDate(input.closureRange.from), lte: utcDate(input.closureRange.through) } } });
          await tx.pTAvailabilityRule.createMany({ data: rules.map(rule => ({ id: randomUUID(), ...rule, trainerId, localDate: rule.localDate ? utcDate(rule.localDate) : null, effectiveFrom: rule.effectiveFrom ? utcDate(rule.effectiveFrom) : null, effectiveToExclusive: rule.effectiveToExclusive ? utcDate(rule.effectiveToExclusive) : null, createdByIdentityId: access.identityId, commandReceiptId: receipt.id, updatedAt: now[0]!.now })) });
          const updated = await tx.trainer.update({ where: { id: trainerId, version: input.expectedVersion }, data: { version: { increment: 1 } } });
          await appendTenantAudit(tx, { masterGymId: access.gymId, receiptId: receipt.id, actorIdentityId: access.identityId, eventCode: 'PT_AVAILABILITY_UPDATED', resourceType: 'TRAINER', resourceId: trainerId, transition: { from: String(input.expectedVersion), to: String(updated.version), version: updated.version } });
        const [config, values] = await Promise.all([tx.gymConfiguration.findUnique({ where: { id: 'current' }, select: { timezone: true } }), tx.pTAvailabilityRule.findMany({ where: { OR: [{ trainerId }, { kind: 'GYM_CLOSURE' }] }, orderBy: [{ localDate: 'asc' }, { startMinute: 'asc' }] })]);
        const result = availabilitySchema.parse({ trainerId, version: input.expectedVersion + 1, timeZone: config!.timezone!, asOf: now[0]!.now.toISOString(),
          weekly: values.filter(v => v.kind === 'WEEKLY_WINDOW').map(v => ({ weekday: v.weekday!, effectiveFrom: v.effectiveFrom!.toISOString().slice(0, 10), effectiveToExclusive: v.effectiveToExclusive!.toISOString().slice(0, 10), startMinute: v.startMinute!, endMinute: v.endMinute! })),
          dated: values.filter(v => v.kind === 'DATED_WINDOW').map(v => ({ localDate: v.localDate!.toISOString().slice(0, 10), startMinute: v.startMinute!, endMinute: v.endMinute! })), blocks: values.filter(v => v.kind === 'BLOCK').map(v => ({ localDate: v.localDate!.toISOString().slice(0, 10), startMinute: v.startMinute!, endMinute: v.endMinute!, reason: v.reason })), closures: values.filter(v => v.kind === 'GYM_CLOSURE').map(v => v.localDate!.toISOString().slice(0, 10)) });
        await tx.commandReceipt.update({ where: { actorIdentityId_commandKind_idempotencyKey: { actorIdentityId: access.identityId, commandKind: 'UPDATE_PT_AVAILABILITY', idempotencyKey: input.idempotencyKey } }, data: { state: 'COMMITTED', committedAt: now[0]!.now, safeResult: result } });
        return result;
      }));
    });
  }
  async slots(access: Access, input: { trainerId: string; localDate: string; memberId?: string; excludeSessionId?: string }) {
    return this.gate.withVerifiedTenant(access, async tenant => {
      const binding = await this.binding(tenant, access, input.trainerId);
      const targets = access.role === 'OWNER'
        ? [{ identityId: access.identityId, gymId: access.gymId, role: 'OWNER' as const }]
        : access.actor?.kind === 'MEMBER' ? [{ identityId: access.identityId, gymId: access.gymId, role: 'MEMBER' as const, tenantActorId: access.actor.id }] : (() => { throw new ForbiddenException('Member access is required'); })();
      return withGymAccessFence(this.db.master, targets, async () => {
        const config = await tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { timezone: true, masterGymId: true } });
        if (!config?.timezone || config.masterGymId !== access.gymId) throw new UnprocessableEntityException('Gym time zone is unavailable');
        const rules = await tenant.pTAvailabilityRule.findMany({ where: { OR: [{ trainerId: input.trainerId }, { kind: 'GYM_CLOSURE', localDate: utcDate(input.localDate) }] } });
        const nowRows = await tenant.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
        const now = nowRows[0]!.now; const startBound = new Date(now.getTime() + 2 * 3600000); const endBound = new Date(now.getTime() + 14 * 86400000);
        const weekday = weekdayNumber(input.localDate); const timeZone = config.timezone;
        const allowed = allowedStartMinutes(input.localDate, rules as AvailabilityRule[], weekday);
        const candidates = resolvedStartSlots(input.localDate, allowed, timeZone).filter(slot => slot.start >= startBound && slot.start <= endBound);
        const dayStartMinute = new Date(`${input.localDate}T00:00:00Z`).getTime();
        const dayZeroOffset = candidates.find(candidate => candidate.localTime === '12:00')?.offset ?? candidates[0]?.offset;
        const dayOffsetMinutes = dayZeroOffset ? (dayZeroOffset[0] === '-' ? -1 : 1) * (Number(dayZeroOffset.slice(1, 3)) * 60 + Number(dayZeroOffset.slice(4, 6))) : 0;
        const localDayStart = new Date(dayStartMinute - dayOffsetMinutes * 60000 - 86400000);
        const localDayEnd = new Date(dayStartMinute - dayOffsetMinutes * 60000 + 2 * 86400000);
        if (input.excludeSessionId) {
          if (access.role !== 'OWNER') throw new ForbiddenException('Only owners can select a replacement slot');
          const source = await tenant.pTSession.findFirst({ where: { id: input.excludeSessionId, trainerId: input.trainerId, memberId: input.memberId ?? '', state: 'SCHEDULED', startedAt: null } });
          if (!source) throw new NotFoundException('Replacement source booking not found');
        }
        const occupied = await tenant.pTSession.findMany({ where: { ...(input.excludeSessionId ? { id: { not: input.excludeSessionId } } : {}), state: { in: ['PENDING_CONFIRMATION', 'SCHEDULED', 'ACTIVE'] },
          AND: [{ OR: [{ state: { not: 'PENDING_CONFIRMATION' } }, { requestExpiresAt: { gt: now } }] }], trainerId: input.trainerId, scheduledStartAt: { lt: localDayEnd }, scheduledEndAt: { gt: localDayStart } }, select: { scheduledStartAt: true, scheduledEndAt: true } });
        const slots = candidates.filter(slot => !occupied.some(row => row.scheduledStartAt < slot.end && row.scheduledEndAt > slot.start));
        let memberId: string | undefined;
        if (access.role === 'MEMBER') memberId = access.actor!.id;
        else if (input.memberId) {
          const member = await tenant.member.findFirst({ where: { id: input.memberId, status: 'ACTIVE', registrationState: 'COMPLETE' }, select: { id: true, identityId: true } });
          if (!member?.identityId || !await this.db.master.gymAccess.findFirst({ where: { gymId: access.gymId, role: 'MEMBER', actorKind: 'MEMBER', tenantActorId: member.id, userId: member.identityId, linkStatus: 'ACTIVE' }, select: { userId: true } })) throw new NotFoundException('Member not found');
          memberId = member.id;
        }
        const memberOccupied = memberId ? await tenant.pTSession.findMany({ where: { memberId, ...(input.excludeSessionId ? { id: { not: input.excludeSessionId } } : {}), state: { in: ['PENDING_CONFIRMATION', 'SCHEDULED', 'ACTIVE'] },
          AND: [{ OR: [{ state: { not: 'PENDING_CONFIRMATION' } }, { requestExpiresAt: { gt: now } }] }], scheduledStartAt: { lt: localDayEnd }, scheduledEndAt: { gt: localDayStart } }, select: { scheduledStartAt: true, scheduledEndAt: true } }) : [];
        const freeForMember = slots.filter(slot => !memberOccupied.some(row => row.scheduledStartAt < slot.end && row.scheduledEndAt > slot.start));
        return availabilitySlotsSchema.parse({ trainerId: input.trainerId, localDate: input.localDate, timeZone: config.timezone, asOf: now.toISOString(), availabilityVersion: binding.trainer.version, durationMinutes: 60,
          slots: freeForMember.map(slot => ({ startAt: slot.start.toISOString(), endAt: slot.end.toISOString(), localTime: slot.localTime, offset: slot.offset })), reason: freeForMember.length ? null : rules.some(r => r.kind === 'GYM_CLOSURE') ? 'CLOSED' : allowed.length ? 'NO_ELIGIBLE_SLOT' : 'NO_AVAILABILITY' });
      });
    });
  }
}
