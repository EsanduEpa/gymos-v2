import { createHash, randomUUID } from 'node:crypto';
import { Body, ConflictException, Controller, ForbiddenException, NotFoundException, Param, Post, Req, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { issueSessionPackInputSchema, issueSessionPackResultSchema } from '@gymos/contracts';
import { canonicalJson, OperationConflictError, requestDigest } from './operations/primitives.js';
import { CommandReceiptFoundationService } from './operations/receipt.service.js';
import { decimalToMinorUnits, derivePackCreditBalance } from './sessions/session-state.js';
import { DatabaseService } from './database.service.js';
import { GymAccessGuard, type GymRequest } from './gym-access.guard.js';
import { addLocalDays, gymLocalDate } from './membership-rules.js';
import { TenantSchemaGateService } from './tenancy/tenant-schema-gate.service.js';

function sourceKey(gymId: string, receiptId: string, packId: string) {
  return `sp1:${createHash('sha256').update(canonicalJson([gymId, receiptId, packId, 'ISSUE'])).digest('hex')}`;
}

@Controller('gyms/:slug/members')
@UseGuards(GymAccessGuard)
export class PacksController {
  constructor(private readonly database: DatabaseService, private readonly tenantGate: TenantSchemaGateService) {}

  @Post(':memberId/session-packs')
  async issue(@Req() request: GymRequest, @Param('memberId') memberId: string, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Only gym owners can issue session packs');
    const parsed = issueSessionPackInputSchema.safeParse(body);
    if (!parsed.success) throw new UnprocessableEntityException('Enter a valid credit count, validity, price and currency');
    const input = parsed.data;
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const member = await tenant.member.findUnique({ where: { id: memberId },
        select: { id: true, status: true, registrationState: true, identityId: true, enrollmentOperationId: true } });
      if (!member) throw new NotFoundException('Member not found');
      if (member.registrationState === 'COMPLETE') {
        const published = await this.database.master.operation.findFirst({ where: { id: member.enrollmentOperationId ?? '',
          gymId: access.gymId, kind: 'REGISTER_MEMBER', state: 'COMPLETE', tenantActorId: member.id,
          subjectIdentityId: member.identityId, tenantCommandReceiptId: { not: null } }, select: { id: true } });
        if (!published) throw new NotFoundException('Member not found');
      }
      if (member.status !== 'ACTIVE') throw new ConflictException('Session packs can be issued only to active members');
      const configuration = await tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { timezone: true, currency: true } });
      if (!configuration?.timezone || !configuration.currency) throw new UnprocessableEntityException('Gym currency and timezone must be configured');
      if (input.currency !== configuration.currency) throw new UnprocessableEntityException('Pack currency must match the gym currency');
      const startDate = gymLocalDate(configuration.timezone);
      const endDateExclusive = addLocalDays(startDate, input.validityDays);
      const packId = randomUUID();
      const totalMinorUnits = decimalToMinorUnits(input.price);
      const creditBaseMinorUnits = totalMinorUnits / BigInt(input.credits);
      const creditRemainder = Number(totalMinorUnits % BigInt(input.credits));
      let command;
      try { command = await new CommandReceiptFoundationService(tenant).execute({ masterGymId: access.gymId,
        actorIdentityId: access.identityId, commandKind: 'ISSUE_SESSION_PACK', idempotencyKey: input.idempotencyKey,
        normalizedIntent: { gymId: access.gymId, memberId: member.id, credits: input.credits,
          validityDays: input.validityDays, price: input.price, currency: input.currency, startDate, endDateExclusive } },
      async (tx, receipt) => {
        await tx.$queryRaw`SELECT "id" FROM "Member" WHERE "id" = ${member.id} FOR UPDATE`;
        const current = await tx.member.findUnique({ where: { id: member.id }, select: { status: true, version: true } });
        if (!current || current.status !== 'ACTIVE') throw new ConflictException('Member is no longer eligible for a session pack');
        const digest = requestDigest({ memberId: member.id, credits: input.credits, validityDays: input.validityDays,
          price: input.price, currency: input.currency, startDate, endDateExclusive });
        const pack = await tx.sessionPack.create({ data: { id: packId, memberId: member.id, issuedCredits: input.credits,
          price: input.price, currency: input.currency, validityDays: input.validityDays,
          totalMinorUnits, creditBaseMinorUnits, creditRemainder, creditAllocationPolicyVersion: 'DEC-06-v1',
          startDate: new Date(`${startDate}T00:00:00.000Z`), endDateExclusive: new Date(`${endDateExclusive}T00:00:00.000Z`),
          commandReceiptId: receipt.id, actorIdentityId: access.identityId, idempotencyKey: input.idempotencyKey, requestDigest: digest } });
        await tx.packCreditMovement.create({ data: { packId: pack.id, kind: 'ISSUE', availableDelta: input.credits,
          heldDelta: 0, consumedDelta: 0, expiredDelta: 0, sourceKey: sourceKey(access.gymId, receipt.id, pack.id),
          receiptId: receipt.id, actorIdentityId: access.identityId } });
        return { result: { resourceIds: [pack.id] }, resourceType: 'SESSION_PACK', resourceId: pack.id,
          audits: [{ actorIdentityId: access.identityId, eventCode: 'SESSION_PACK_ISSUED', resourceType: 'SESSION_PACK', resourceId: pack.id,
            transition: { to: 'ISSUED', version: 0 } }] };
      }); } catch (error) {
        if (error instanceof OperationConflictError) throw new ConflictException('Pack issue conflicts with an earlier request');
        throw error;
      }
      const packIdFromReceipt = command.result.resourceIds?.[0];
      if (!packIdFromReceipt) throw new ConflictException('Pack issuance receipt is incomplete');
      const issued = await tenant.sessionPack.findUnique({ where: { id: packIdFromReceipt }, include: { creditMovements: {
        select: { availableDelta: true, heldDelta: true, consumedDelta: true, expiredDelta: true } } } });
      if (!issued) throw new ConflictException('Pack issuance receipt references a missing pack');
      const ledgerBalance = derivePackCreditBalance(issued.issuedCredits, issued.creditMovements.map(row => ({ available: row.availableDelta,
        held: row.heldDelta, consumed: row.consumedDelta, expired: row.expiredDelta })));
      const today = gymLocalDate(configuration.timezone);
      const expired = today >= issued.endDateExclusive.toISOString().slice(0, 10);
      const balance = expired ? { ...ledgerBalance, available: 0, expired: ledgerBalance.expired + ledgerBalance.available } : ledgerBalance;
      const status = balance.available + balance.held === 0 ? 'DEPLETED' : expired ? 'EXPIRED' : 'ACTIVE';
      return issueSessionPackResultSchema.parse({ receiptId: command.receiptId, replayed: command.replayed, pack: {
        id: issued.id, issuedCredits: issued.issuedCredits, validityDays: issued.validityDays, price: issued.price.toString(),
        currency: issued.currency, startDate: issued.startDate.toISOString().slice(0, 10),
        endDateExclusive: issued.endDateExclusive.toISOString().slice(0, 10), status, balance,
      } });
    });
  }
}
