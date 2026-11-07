import { Body, ConflictException, Controller, ForbiddenException, Get, Headers, NotFoundException, Param, Patch, Req, ServiceUnavailableException, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import type { Request } from 'express';
import type { PrismaClient } from './generated/tenant/client.js';
import { accountProfileSchema, idempotencyKeySchema, ownerMemberProfileCorrectionSchema, profileCommandResultSchema,
  selfMemberProfileSchema, selfTrainerProfileSchema, updateAccountProfileSchema, updateSelfMemberProfileSchema,
  updateSelfTrainerProfileSchema } from '@gymos/contracts';
import { DatabaseService } from './database.service.js';
import { identityFromAuthorization } from './auth-token.js';
import { appendMasterVersionAudit, appendTenantAudit } from './operations/transaction-audit.js';
import { protectedIntentFingerprint, requestDigest } from './operations/primitives.js';
import { GymAccessGuard, type GymRequest } from './gym-access.guard.js';
import { TenantSchemaGateService } from './tenancy/tenant-schema-gate.service.js';
import { withGymAccessFence } from './identity/gym-access-fence.js';

function invalid(): never { throw new UnprocessableEntityException('Enter valid profile fields and the current profile version'); }
function replay(receipt: { requestDigest: string; resourceId: string | null; safeResult: unknown }, digest: string, resourceId: string) {
  if (receipt.requestDigest !== digest || receipt.resourceId !== resourceId) throw new ConflictException('This profile save key was already used for different changes');
  const parsed = profileCommandResultSchema.safeParse(receipt.safeResult);
  if (!parsed.success) throw new ConflictException('The earlier profile save result is unavailable');
  return profileCommandResultSchema.parse({ ...parsed.data, replayed: true });
}

@Controller('auth/profile')
export class AccountProfileController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  async get(@Req() request: Request) {
    const identity = await identityFromAuthorization(request.headers.authorization);
    const user = await this.database.master.user.findUnique({ where: { id: identity.userId },
      select: { id: true, email: true, displayName: true, globalRole: true, version: true, authVersion: true, mustChangePassword: true } });
    const gymAccount = identity.gymAccountId ? await this.database.master.gymAccount.findUnique({ where: { id: identity.gymAccountId },
      include: { gym: { select: { name: true } } } }) : null;
    if (!user || (!gymAccount && (user.authVersion !== identity.authVersion || user.mustChangePassword))
      || (identity.gymAccountId && (!gymAccount || gymAccount.userId !== user.id || gymAccount.authVersion !== identity.authVersion || gymAccount.status !== 'ACTIVE' || gymAccount.mustChangePassword))) {
      throw new ForbiddenException('Current account access is required');
    }
    return accountProfileSchema.parse({ identityId: user.id, email: user.email, username: gymAccount?.username ?? null,
      gymName: gymAccount?.gym.name ?? null, displayName: gymAccount ? gymAccount.displayName : user.displayName,
      globalRole: user.globalRole, version: gymAccount ? gymAccount.version : user.version });
  }

  @Patch()
  async update(@Req() request: Request, @Headers('idempotency-key') key: unknown, @Body() body: unknown) {
    const identity = await identityFromAuthorization(request.headers.authorization);
    if (!identity.sessionId) throw new ForbiddenException('Sign in again to update your profile');
    const parsed = updateAccountProfileSchema.safeParse({ ...(typeof body === 'object' && body !== null ? body : {}), idempotencyKey: key });
    if (!parsed.success) invalid();
    const commandKind = identity.gymAccountId ? 'UPDATE_GYM_ACCOUNT_PROFILE' : 'UPDATE_ACCOUNT_PROFILE';
    const resourceId = identity.gymAccountId ?? identity.userId;
    const digest = requestDigest({ displayName: parsed.data.displayName, expectedVersion: parsed.data.expectedVersion, gymAccountId: identity.gymAccountId ?? null });
    return this.database.master.$transaction(async tx => {
      if (identity.gymAccountId) await tx.$queryRaw`SELECT "id" FROM "GymAccount" WHERE "id" = ${identity.gymAccountId} AND "userId" = ${identity.userId} FOR UPDATE`;
      else await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${identity.userId} FOR UPDATE`;
      const receipt = await tx.profileCommandReceipt.findUnique({ where: { actorIdentityId_commandKind_idempotencyKey: {
        actorIdentityId: identity.userId, commandKind, idempotencyKey: parsed.data.idempotencyKey,
      } } });
      if (receipt) return replay({ requestDigest: receipt.requestDigest, resourceId: receipt.resourceId,
        safeResult: { version: receipt.resultVersion, replayed: false } }, digest, resourceId);
      if (identity.gymAccountId) {
        const account = await tx.gymAccount.findFirst({ where: { id: identity.gymAccountId, userId: identity.userId, authVersion: identity.authVersion, status: 'ACTIVE', mustChangePassword: false },
          select: { id: true, version: true } });
        if (!account) throw new ForbiddenException('Gym account access changed; sign in again');
        if (account.version !== parsed.data.expectedVersion) throw new ConflictException('Your gym account profile changed; reload before saving');
        const changed = await tx.gymAccount.updateMany({ where: { id: account.id, version: account.version }, data: { displayName: parsed.data.displayName, version: { increment: 1 } } });
        if (changed.count !== 1) throw new ConflictException('Your gym account profile changed; reload before saving');
        const nextVersion = account.version + 1;
        await tx.profileCommandReceipt.create({ data: { actorIdentityId: identity.userId, commandKind,
          idempotencyKey: parsed.data.idempotencyKey, requestDigest: digest, resourceId, resultVersion: nextVersion } });
        await appendMasterVersionAudit(tx, { actorIdentityId: identity.userId, eventCode: 'GYM_ACCOUNT_DISPLAY_NAME_UPDATED',
          resourceType: 'GYM_ACCOUNT', resourceId, committedVersion: nextVersion, transition: { from: String(account.version), to: String(nextVersion), version: nextVersion } });
        return profileCommandResultSchema.parse({ version: nextVersion, replayed: false });
      }
      const user = await tx.user.findUnique({ where: { id: identity.userId }, select: { id: true, version: true, authVersion: true, mustChangePassword: true } });
      if (!user || user.authVersion !== identity.authVersion || user.mustChangePassword) throw new ForbiddenException('Account access changed; sign in again');
      if (user.version !== parsed.data.expectedVersion) throw new ConflictException('Your account profile changed; reload before saving');
      const updated = await tx.user.updateMany({ where: { id: user.id, version: parsed.data.expectedVersion },
        data: { displayName: parsed.data.displayName, version: { increment: 1 } } });
      if (updated.count !== 1) throw new ConflictException('Your account profile changed; reload before saving');
      const nextVersion = user.version + 1;
      await tx.profileCommandReceipt.create({ data: { actorIdentityId: identity.userId, commandKind: 'UPDATE_ACCOUNT_PROFILE',
        idempotencyKey: parsed.data.idempotencyKey, requestDigest: digest, resourceId: identity.userId, resultVersion: nextVersion } });
      await appendMasterVersionAudit(tx, { actorIdentityId: identity.userId, eventCode: 'ACCOUNT_DISPLAY_NAME_UPDATED',
        resourceType: 'IDENTITY_PROFILE', resourceId: identity.userId, committedVersion: nextVersion,
        transition: { from: String(user.version), to: String(nextVersion), version: nextVersion } });
      return profileCommandResultSchema.parse({ version: nextVersion, replayed: false });
    });
  }
}

type MemberLink = { userId: string; tenantActorId: string; enrollmentOperationId: string };

@Controller('gyms/:slug')
@UseGuards(GymAccessGuard)
export class GymProfileController {
  constructor(private readonly database: DatabaseService, private readonly tenantGate: TenantSchemaGateService) {}

  private async selfProfileTenant(access: NonNullable<GymRequest['gymAccess']>, work: (tenant: PrismaClient) => Promise<unknown>) {
    if (!access.actor || access.actor.kind !== access.role) throw new ForbiddenException('A verified gym profile is required');
    return this.tenantGate.withVerifiedTenant(access, async tenant => withGymAccessFence(this.database.master, [
      { identityId: access.identityId, gymId: access.gymId, role: access.role as 'MEMBER' | 'TRAINER', tenantActorId: access.actor!.id },
    ], async () => work(tenant)));
  }

  @Get('me/profile')
  async getMine(@Req() request: GymRequest) {
    const access = request.gymAccess;
    if (!access || !['MEMBER', 'TRAINER'].includes(access.role)) throw new ForbiddenException('Member or trainer access is required');
    return this.selfProfileTenant(access, async tenant => {
      if (access.role === 'MEMBER' && access.actor?.kind === 'MEMBER') {
        const row = await tenant.member.findFirst({ where: { id: access.actor.id, identityId: access.identityId, registrationState: 'COMPLETE' },
          select: { id: true, fullName: true, phone: true, emergencyContact: true, dateOfBirth: true, version: true } });
        if (!row) throw new NotFoundException('Member profile not found');
        return selfMemberProfileSchema.parse({ memberId: row.id, fullName: row.fullName, phone: row.phone,
          emergencyContact: row.emergencyContact, dateOfBirth: row.dateOfBirth?.toISOString().slice(0, 10) ?? null, version: row.version });
      }
      if (access.role === 'TRAINER' && access.actor?.kind === 'TRAINER') {
        const row = await tenant.trainer.findFirst({ where: { id: access.actor.id, identityId: access.identityId, registrationState: 'COMPLETE' },
          select: { id: true, fullName: true, phone: true, bio: true, specialisations: true, yearsExperience: true, version: true } });
        if (!row) throw new NotFoundException('Trainer profile not found');
        return selfTrainerProfileSchema.parse({ trainerId: row.id, fullName: row.fullName, phone: row.phone,
          biography: row.bio, specialisations: row.specialisations, yearsExperience: row.yearsExperience, version: row.version });
      }
      throw new ForbiddenException('Profile role does not match gym access');
    });
  }

  @Patch('me/profile')
  async updateMine(@Req() request: GymRequest, @Headers('idempotency-key') key: unknown, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access || !['MEMBER', 'TRAINER'].includes(access.role) || !access.actor || access.actor.kind !== access.role) throw new ForbiddenException('Member or trainer access is required');
    const headerKey = idempotencyKeySchema.safeParse(key);
    if (!headerKey.success) invalid();
    return this.selfProfileTenant(access, async tenant => {
      if (access.role === 'MEMBER' && access.actor?.kind === 'MEMBER') {
        const parsed = updateSelfMemberProfileSchema.safeParse({ ...(typeof body === 'object' && body !== null ? body : {}), idempotencyKey: headerKey.data });
        if (!parsed.success) invalid();
        const memberId = access.actor.id;
        const digest = requestDigest({ phone: parsed.data.phone, emergencyContact: parsed.data.emergencyContact, expectedVersion: parsed.data.expectedVersion });
        return tenant.$transaction(async tx => {
          const prior = await tx.commandReceipt.findUnique({ where: { actorIdentityId_commandKind_idempotencyKey: {
            actorIdentityId: access.identityId, commandKind: 'UPDATE_SELF_MEMBER_PROFILE', idempotencyKey: parsed.data.idempotencyKey,
          } } });
          if (prior) return replay({ requestDigest: prior.requestDigest, resourceId: prior.resourceId, safeResult: prior.safeResult }, digest, memberId);
          const member = await tx.member.findFirst({ where: { id: memberId, identityId: access.identityId, registrationState: 'COMPLETE' } });
          if (!member) throw new NotFoundException('Member profile not found');
          if (member.version !== parsed.data.expectedVersion) throw new ConflictException('Your gym profile changed; reload before saving');
          const update = await tx.member.updateMany({ where: { id: member.id, identityId: access.identityId, version: member.version },
            data: { phone: parsed.data.phone, emergencyContact: parsed.data.emergencyContact, version: { increment: 1 } } });
          if (update.count !== 1) throw new ConflictException('Your gym profile changed; reload before saving');
          const version = member.version + 1;
          const receipt = await tx.commandReceipt.create({ data: { actorIdentityId: access.identityId, commandKind: 'UPDATE_SELF_MEMBER_PROFILE',
            idempotencyKey: parsed.data.idempotencyKey, requestDigest: digest, resourceType: 'MEMBER', resourceId: member.id,
            state: 'COMMITTED', safeResult: { version, replayed: false }, committedAt: new Date() } });
          await appendTenantAudit(tx, { masterGymId: access.gymId, receiptId: receipt.id, actorIdentityId: access.identityId,
            eventCode: 'MEMBER_SELF_PROFILE_UPDATED', resourceType: 'MEMBER_PROFILE', resourceId: member.id,
            transition: { from: String(member.version), to: String(version), version } });
          return profileCommandResultSchema.parse({ version, replayed: false });
        });
      }
      if (access.role === 'TRAINER' && access.actor?.kind === 'TRAINER') {
        const parsed = updateSelfTrainerProfileSchema.safeParse({ ...(typeof body === 'object' && body !== null ? body : {}), idempotencyKey: headerKey.data });
        if (!parsed.success) invalid();
        const trainerId = access.actor.id;
        const digest = requestDigest({ phone: parsed.data.phone, biography: parsed.data.biography, specialisations: parsed.data.specialisations,
          yearsExperience: parsed.data.yearsExperience, expectedVersion: parsed.data.expectedVersion });
        return tenant.$transaction(async tx => {
          const prior = await tx.commandReceipt.findUnique({ where: { actorIdentityId_commandKind_idempotencyKey: {
            actorIdentityId: access.identityId, commandKind: 'UPDATE_SELF_TRAINER_PROFILE', idempotencyKey: parsed.data.idempotencyKey,
          } } });
          if (prior) return replay({ requestDigest: prior.requestDigest, resourceId: prior.resourceId, safeResult: prior.safeResult }, digest, trainerId);
          const trainer = await tx.trainer.findFirst({ where: { id: trainerId, identityId: access.identityId, registrationState: 'COMPLETE' } });
          if (!trainer) throw new NotFoundException('Trainer profile not found');
          if (trainer.version !== parsed.data.expectedVersion) throw new ConflictException('Your gym profile changed; reload before saving');
          const update = await tx.trainer.updateMany({ where: { id: trainer.id, identityId: access.identityId, version: trainer.version },
            data: { phone: parsed.data.phone, bio: parsed.data.biography, specialisations: parsed.data.specialisations,
              yearsExperience: parsed.data.yearsExperience, version: { increment: 1 } } });
          if (update.count !== 1) throw new ConflictException('Your gym profile changed; reload before saving');
          const version = trainer.version + 1;
          const receipt = await tx.commandReceipt.create({ data: { actorIdentityId: access.identityId, commandKind: 'UPDATE_SELF_TRAINER_PROFILE',
            idempotencyKey: parsed.data.idempotencyKey, requestDigest: digest, resourceType: 'TRAINER', resourceId: trainer.id,
            state: 'COMMITTED', safeResult: { version, replayed: false }, committedAt: new Date() } });
          await appendTenantAudit(tx, { masterGymId: access.gymId, receiptId: receipt.id, actorIdentityId: access.identityId,
            eventCode: 'TRAINER_SELF_PROFILE_UPDATED', resourceType: 'TRAINER_PROFILE', resourceId: trainer.id,
            transition: { from: String(trainer.version), to: String(version), version } });
          return profileCommandResultSchema.parse({ version, replayed: false });
        });
      }
      throw new ForbiddenException('Profile role does not match gym access');
    });
  }

  private async publishedMember(tenant: PrismaClient, gymId: string, memberId: string): Promise<MemberLink> {
    const link = await this.database.master.gymAccess.findFirst({ where: { gymId, role: 'MEMBER', actorKind: 'MEMBER',
      linkStatus: { in: ['ACTIVE', 'REVOKED'] }, tenantActorId: memberId, enrollmentOperationId: { not: null } },
      select: { userId: true, tenantActorId: true, enrollmentOperationId: true } });
    if (!link?.tenantActorId || !link.enrollmentOperationId) throw new NotFoundException('Member not found');
    const operation = await this.database.master.operation.findFirst({ where: { id: link.enrollmentOperationId, gymId,
      kind: 'REGISTER_MEMBER', state: 'COMPLETE', subjectIdentityId: link.userId, tenantActorId: memberId, tenantCommandReceiptId: { not: null } },
      select: { id: true, actorIdentityId: true, tenantCommandReceiptId: true } });
    if (!operation) throw new NotFoundException('Member not found');
    const receipt = await tenant.commandReceipt.findFirst({ where: { sourceMasterOperationId: operation.id, id: operation.tenantCommandReceiptId!,
      commandKind: 'REGISTER_MEMBER', state: 'COMMITTED', resourceType: 'MEMBER', resourceId: memberId, actorIdentityId: operation.actorIdentityId }, select: { id: true } });
    if (!receipt) throw new NotFoundException('Member not found');
    return { userId: link.userId, tenantActorId: link.tenantActorId, enrollmentOperationId: link.enrollmentOperationId };
  }

  @Patch('members/:memberId/profile')
  async correctMember(@Req() request: GymRequest, @Param('memberId') memberId: string, @Headers('idempotency-key') key: unknown, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Only a gym owner can correct official member fields');
    const headerKey = idempotencyKeySchema.safeParse(key);
    const parsed = ownerMemberProfileCorrectionSchema.safeParse({ ...(typeof body === 'object' && body !== null ? body : {}), idempotencyKey: key });
    if (!headerKey.success || !parsed.success || parsed.data.idempotencyKey !== headerKey.data) invalid();
    return this.tenantGate.withVerifiedTenant(access, async tenant => {
      const binding = await this.publishedMember(tenant, access.gymId, memberId);
      return withGymAccessFence(this.database.master, [{ identityId: access.identityId, gymId: access.gymId, role: 'OWNER' }], async () => {
        const fingerprintKey = process.env.JWT_SECRET;
        if (!fingerprintKey || fingerprintKey.length < 32) throw new ServiceUnavailableException('Member profile updates are unavailable');
        const protectedHealthNotes = protectedIntentFingerprint(JSON.stringify(parsed.data.healthNotes === undefined ? ['absent']
          : parsed.data.healthNotes === null ? ['null'] : ['value', parsed.data.healthNotes]),
        `member-profile-note:${access.gymId}:${access.identityId}:${memberId}:${parsed.data.idempotencyKey}`,
        createHmac('sha256', fingerprintKey).update('gymos-member-profile-note-fingerprint-v1').digest());
        const digest = requestDigest({ fullName: parsed.data.fullName, dateOfBirth: parsed.data.dateOfBirth, phone: parsed.data.phone,
          emergencyContact: parsed.data.emergencyContact, expectedVersion: parsed.data.expectedVersion, reason: parsed.data.reason }, protectedHealthNotes);
        return tenant.$transaction(async tx => {
          const prior = await tx.commandReceipt.findUnique({ where: { actorIdentityId_commandKind_idempotencyKey: {
            actorIdentityId: access.identityId, commandKind: 'CORRECT_MEMBER_PROFILE', idempotencyKey: parsed.data.idempotencyKey,
          } } });
          if (prior) return replay({ requestDigest: prior.requestDigest, resourceId: prior.resourceId, safeResult: prior.safeResult }, digest, memberId);
          const member = await tx.member.findFirst({ where: { id: memberId, identityId: binding.userId,
            enrollmentOperationId: binding.enrollmentOperationId, registrationState: 'COMPLETE' } });
          if (!member) throw new NotFoundException('Member not found');
          if (member.version !== parsed.data.expectedVersion) throw new ConflictException('Member profile changed; reload before correcting it');
          const updated = await tx.member.updateMany({ where: { id: member.id, identityId: binding.userId,
            enrollmentOperationId: binding.enrollmentOperationId, version: member.version }, data: {
              fullName: parsed.data.fullName,
              dateOfBirth: parsed.data.dateOfBirth ? new Date(`${parsed.data.dateOfBirth}T00:00:00.000Z`) : null,
              phone: parsed.data.phone, emergencyContact: parsed.data.emergencyContact, healthNotes: parsed.data.healthNotes,
              version: { increment: 1 },
            } });
          if (updated.count !== 1) throw new ConflictException('Member profile changed; reload before correcting it');
          const version = member.version + 1;
          const receipt = await tx.commandReceipt.create({ data: { actorIdentityId: access.identityId, commandKind: 'CORRECT_MEMBER_PROFILE',
            idempotencyKey: parsed.data.idempotencyKey, requestDigest: digest, resourceType: 'MEMBER', resourceId: memberId,
            state: 'COMMITTED', safeResult: { version, replayed: false }, committedAt: new Date() } });
          await appendTenantAudit(tx, { masterGymId: access.gymId, receiptId: receipt.id, actorIdentityId: access.identityId,
            eventCode: 'OWNER_MEMBER_PROFILE_CORRECTED', resourceType: 'MEMBER_PROFILE', resourceId: member.id,
            transition: { from: String(member.version), to: String(version), version, reasonCode: parsed.data.reason } });
          await tx.notification.create({ data: { recipientIdentityId: binding.userId, sourceEventKey: `profile-correction:${receipt.id}`,
            eventCode: 'MEMBER_PROFILE_CORRECTED', title: 'Membership profile updated',
            message: 'A gym owner updated your membership profile. Review your profile details.', linkKind: 'MEMBER_PROFILE', resourceId: member.id } });
          return profileCommandResultSchema.parse({ version, replayed: false });
        });
      });
    });
  }
}
