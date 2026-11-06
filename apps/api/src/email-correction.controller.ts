import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Headers, NotFoundException, Param, Post, Req, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import argon2 from 'argon2';
import { emailCorrectionAdminListSchema, emailCorrectionCloseSchema, emailCorrectionItemSchema, emailCorrectionListSchema, emailCorrectionSubmitSchema, idempotencyKeySchema } from '@gymos/contracts';
import { DatabaseService } from './database.service.js';
import { identityFromAuthorization } from './auth-token.js';
import { requestDigest } from './operations/primitives.js';
import { appendMasterVersionAudit } from './operations/transaction-audit.js';
import { SuperAdminGuard, type PlatformRequest } from './super-admin.guard.js';
import { Throttle } from '@nestjs/throttler';

function invalid(): never { throw new UnprocessableEntityException('Enter a valid email correction request'); }
function item(row: { id: string; requestedEmail: string; state: 'PENDING'|'WITHDRAWN'|'CLOSED'; resolution: 'FOLLOW_UP_RECORDED'|'CLOSED_NO_CHANGE'|null; version: number; submittedAt: Date; resolvedAt: Date|null }) {
  return { id: row.id, requestedEmail: row.requestedEmail, state: row.state, resolution: row.resolution, version: row.version,
    submittedAt: row.submittedAt.toISOString(), resolvedAt: row.resolvedAt?.toISOString() ?? null };
}

@Controller('auth/profile/email-correction-requests')
export class EmailCorrectionController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  async own(@Req() request: Request) {
    const identity = await identityFromAuthorization(request.headers.authorization);
    const rows = await this.database.master.identityEmailCorrectionRequest.findMany({ where: { identityId: identity.userId }, orderBy: { submittedAt: 'desc' }, take: 20 });
    return emailCorrectionListSchema.parse(rows.map(item));
  }

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async submit(@Req() request: Request, @Headers('idempotency-key') key: unknown, @Body() body: unknown) {
    const identity = await identityFromAuthorization(request.headers.authorization);
    if (!identity.sessionId) throw new ForbiddenException('Sign in again to request an email correction');
    const parsed = emailCorrectionSubmitSchema.safeParse(body);
    const parsedKey = idempotencyKeySchema.safeParse(key);
    if (!parsed.success || !parsedKey.success) invalid();
    const digest = requestDigest({ requestedEmail: parsed.data.requestedEmail });
    try {
      return await this.database.master.$transaction(async tx => {
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${identity.userId} FOR UPDATE`;
        const user = await tx.user.findUnique({ where: { id: identity.userId }, select: { email: true, passwordHash: true, authVersion: true, mustChangePassword: true } });
        if (!user || user.authVersion !== identity.authVersion || user.mustChangePassword) throw new ForbiddenException('Current account access is required');
        if (!await argon2.verify(user.passwordHash, parsed.data.currentPassword)) throw new BadRequestException('Current password was not accepted');
        if (parsed.data.requestedEmail === user.email) throw new ConflictException('That address is already your login email');
        const prior = await tx.identityEmailCorrectionRequest.findUnique({ where: { identityId_idempotencyKey: { identityId: identity.userId, idempotencyKey: parsedKey.data } } });
        if (prior) {
          if (prior.requestDigest !== digest) throw new ConflictException('This request key was already used');
          return emailCorrectionItemSchema.parse(item(prior));
        }
        if (await tx.user.findUnique({ where: { email: parsed.data.requestedEmail }, select: { id: true } })) throw new ConflictException('That address cannot be requested; contact support for help');
        const row = await tx.identityEmailCorrectionRequest.create({ data: { identityId: identity.userId, requestedEmail: parsed.data.requestedEmail,
          idempotencyKey: parsedKey.data, requestDigest: digest } });
        await appendMasterVersionAudit(tx, { actorIdentityId: identity.userId, eventCode: 'IDENTITY_EMAIL_CORRECTION_REQUESTED',
          resourceType: 'EMAIL_CORRECTION_REQUEST', resourceId: row.id, committedVersion: 0, transition: { to: 'PENDING', version: 0 } });
        return emailCorrectionItemSchema.parse(item(row));
      });
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ConflictException || error instanceof ForbiddenException) throw error;
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') throw new ConflictException('A pending request already exists for this account or address');
      throw error;
    }
  }

  @Post(':id/withdraw')
  async withdraw(@Req() request: Request, @Param('id') id: string) {
    const identity = await identityFromAuthorization(request.headers.authorization);
    return this.database.master.$transaction(async tx => {
      const row = await tx.identityEmailCorrectionRequest.findFirst({ where: { id, identityId: identity.userId } });
      if (!row) throw new NotFoundException('Request not found');
      if (row.state !== 'PENDING') throw new ConflictException('This request is already closed');
      const updated = await tx.identityEmailCorrectionRequest.updateMany({ where: { id, identityId: identity.userId, state: 'PENDING', version: row.version },
        data: { state: 'WITHDRAWN', version: { increment: 1 }, resolvedAt: new Date() } });
      if (updated.count !== 1) throw new ConflictException('This request changed; refresh its status');
      await appendMasterVersionAudit(tx, { actorIdentityId: identity.userId, eventCode: 'IDENTITY_EMAIL_CORRECTION_WITHDRAWN',
        resourceType: 'EMAIL_CORRECTION_REQUEST', resourceId: row.id, committedVersion: row.version + 1,
        transition: { from: 'PENDING', to: 'WITHDRAWN', version: row.version + 1 } });
      return emailCorrectionItemSchema.parse(item({ ...row, state: 'WITHDRAWN', version: row.version + 1, resolvedAt: new Date() }));
    });
  }
}

@Controller('admin/email-correction-requests')
@UseGuards(SuperAdminGuard)
export class AdminEmailCorrectionController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  async list() {
    const rows = await this.database.master.identityEmailCorrectionRequest.findMany({ where: { state: 'PENDING' }, orderBy: { submittedAt: 'asc' }, take: 100,
      include: { identity: { select: { id: true, email: true, displayName: true } } } });
    return emailCorrectionAdminListSchema.parse(rows.map(row => ({ ...item(row), identityId: row.identity.id, currentEmail: row.identity.email, displayName: row.identity.displayName })));
  }

  @Post(':id/close')
  async close(@Req() request: PlatformRequest, @Param('id') id: string, @Body() body: unknown) {
    const parsed = emailCorrectionCloseSchema.safeParse(body);
    if (!parsed.success || !request.platformIdentity) invalid();
    const reviewerIdentityId = request.platformIdentity.identityId;
    return this.database.master.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${reviewerIdentityId} FOR UPDATE`;
      const reviewer = await tx.user.findUnique({ where: { id: reviewerIdentityId }, select: { globalRole: true, authVersion: true, mustChangePassword: true } });
      if (!reviewer || reviewer.globalRole !== 'SUPER_ADMIN' || reviewer.authVersion !== request.platformIdentity?.authVersion || reviewer.mustChangePassword) {
        throw new ForbiddenException('Platform review access changed; sign in again');
      }
      const row = await tx.identityEmailCorrectionRequest.findUnique({ where: { id } });
      if (!row) throw new NotFoundException('Request not found');
      const updated = await tx.identityEmailCorrectionRequest.updateMany({ where: { id, state: 'PENDING', version: parsed.data.expectedVersion },
        data: { state: 'CLOSED', resolution: parsed.data.resolution, resolvedAt: new Date(), resolvedByIdentityId: reviewerIdentityId, version: { increment: 1 } } });
      if (updated.count !== 1) throw new ConflictException('This request changed; refresh the queue');
      await appendMasterVersionAudit(tx, { actorIdentityId: reviewerIdentityId, eventCode: 'IDENTITY_EMAIL_CORRECTION_CLOSED',
        resourceType: 'EMAIL_CORRECTION_REQUEST', resourceId: row.id, committedVersion: row.version + 1,
        transition: { from: 'PENDING', to: 'CLOSED', version: row.version + 1, reasonCode: parsed.data.resolution } });
      return emailCorrectionItemSchema.parse(item({ ...row, state: 'CLOSED', resolution: parsed.data.resolution, version: row.version + 1, resolvedAt: new Date() }));
    });
  }
}
