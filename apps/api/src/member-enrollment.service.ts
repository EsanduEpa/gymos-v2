import { createHmac, randomBytes } from 'node:crypto';
import { Injectable, ConflictException, ForbiddenException, NotFoundException, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import argon2 from 'argon2';
import type { Prisma } from './generated/master/client.js';
import { memberRegistrationResultSchema, type MemberRegistrationInput } from '@gymos/contracts';
import { DatabaseService } from './database.service.js';
import { TenantSchemaGateService } from './tenancy/tenant-schema-gate.service.js';
import { CommandReceiptFoundationService } from './operations/receipt.service.js';
import { OperationFoundationService, createLeaseHeartbeat } from './operations/operation.service.js';
import { appendMasterAudit } from './operations/transaction-audit.js';
import { OperationConflictError, OperationIntegrityError, protectedIntentFingerprint, type CompletedSteps } from './operations/primitives.js';
import { addLocalDays, asDate, dateString, gymLocalDate } from './membership-rules.js';
import { CredentialService } from './identity/credential.service.js';
import type { GymRequest } from './gym-access.guard.js';
import { normalizeIdentityEmail } from './identity/email.js';
import { IdentityFoundationService } from './identity/identity.service.js';

@Injectable()
export class MemberEnrollmentService {
  constructor(
    private readonly database: DatabaseService,
    private readonly tenantGate: TenantSchemaGateService,
    private readonly credentials: CredentialService,
  ) {}

  private async assertOwner(tx: Prisma.TransactionClient, access: NonNullable<GymRequest['gymAccess']>) {
    // These locks make the authorization check a real ordering point with
    // concurrent owner removal and identity revocation. A stale request that
    // starts after either change sees the new state; a change that starts
    // later waits for this bounded Master transaction to finish.
    await tx.$queryRaw`SELECT "id" FROM "Gym" WHERE "id" = ${access.gymId} FOR SHARE`;
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${access.identityId} FOR SHARE`;
    await tx.$queryRaw`SELECT "userId" FROM "GymAccess" WHERE "userId" = ${access.identityId} AND "gymId" = ${access.gymId} FOR SHARE`;
    const [user, link, gym, clock] = await Promise.all([
      tx.user.findUnique({ where: { id: access.identityId }, select: { authVersion: true, mustChangePassword: true, credentialExpiresAt: true } }),
      tx.gymAccess.findUnique({ where: { userId_gymId: { userId: access.identityId, gymId: access.gymId } }, select: { role: true, linkStatus: true, version: true } }),
      tx.gym.findUnique({ where: { id: access.gymId }, select: { status: true } }),
      tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`,
    ]);
    if (!user || user.authVersion !== access.identityVersion || user.mustChangePassword
      || (user.credentialExpiresAt && user.credentialExpiresAt <= clock[0]!.now)
      || link?.role !== 'OWNER' || link.linkStatus !== 'ACTIVE' || link.version !== access.accessVersion || gym?.status !== 'ACTIVE') {
      throw new ForbiddenException('Gym access changed; retry with current access');
    }
  }

  async enroll(access: NonNullable<GymRequest['gymAccess']>, input: MemberRegistrationInput, applicationId?: string) {
    if (access.role !== 'OWNER') throw new ForbiddenException('Only gym owners can register members');
    // Replays do not execute Operation.claim's prepare callback, so authorize
    // every attempt before reading tenant data or resuming an external effect.
    await this.database.master.$transaction(tx => this.assertOwner(tx, access));
    const existingOperation = await this.database.master.operation.findFirst({ where: { actorIdentityId: access.identityId,
      kind: 'REGISTER_MEMBER', gymId: access.gymId, scopeKey: `gym:${access.gymId}`, idempotencyKey: input.idempotencyKey }, select: { id: true } });
    if (!existingOperation) {
      // Reject invalid gym-local plan/date input before creating a durable
      // Master operation or a pending identity. The tenant transaction below
      // repeats these checks under row locks to handle changes after preflight.
      await this.tenantGate.withVerifiedTenant(access, async tenant => {
        await tenant.$queryRaw`SELECT "id" FROM "GymConfiguration" WHERE "id" = 'current' FOR SHARE`;
        const configuration = await tenant.gymConfiguration.findUnique({ where: { id: 'current' } });
        if (!configuration?.currency || !configuration.timezone) throw new UnprocessableEntityException('Gym configuration needs a currency and timezone');
        await tenant.$queryRaw`SELECT "id" FROM "MembershipPlan" WHERE "id" = ${input.membershipPlanId} FOR SHARE`;
        const plan = await tenant.membershipPlan.findUnique({ where: { id: input.membershipPlanId } });
        if (!plan || plan.status !== 'ACTIVE' || plan.currency !== configuration.currency) throw new UnprocessableEntityException('Choose an active membership plan for this gym currency');
        const [clock] = await tenant.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
        if (input.dateOfBirth > gymLocalDate(configuration.timezone, clock!.now)) throw new UnprocessableEntityException('Date of birth cannot be in the future');
      });
    }
    const email = normalizeIdentityEmail(input.email);
    const applicationOffer = applicationId ? await this.database.master.memberApplication.findUnique({ where: { id: applicationId },
      select: { gymId: true, identityId: true, state: true, membershipPlanId: true, membershipPlanName: true, membershipPrice: true,
        membershipCurrency: true, membershipDurationDays: true, membershipPlanVersion: true } }) : null;
    if (applicationId && (!applicationOffer || applicationOffer.gymId !== access.gymId || applicationOffer.state !== 'PROCESSING'
      || applicationOffer.membershipPlanId !== input.membershipPlanId || !applicationOffer.membershipPlanName || !applicationOffer.membershipPrice
      || !applicationOffer.membershipCurrency || !applicationOffer.membershipDurationDays || applicationOffer.membershipPlanVersion === null)) {
      throw new ConflictException('Applicant membership offer is unavailable');
    }
    const fingerprintKey = process.env.JWT_SECRET;
    if (!fingerprintKey || fingerprintKey.length < 32) throw new ServiceUnavailableException('Member enrollment is unavailable');
    const protectedFingerprint = protectedIntentFingerprint(JSON.stringify(input.healthNotes === undefined ? ['absent']
      : input.healthNotes === null ? ['null'] : ['value', input.healthNotes]),
    `member-enrollment:${access.gymId}:${access.identityId}:${input.idempotencyKey}`,
    createHmac('sha256', fingerprintKey).update('gymos-member-enrollment-note-fingerprint-v1').digest());
    const service = new OperationFoundationService(this.database.master);
    let claim;
    try {
      claim = await service.claim({ actorIdentityId: access.identityId, kind: 'REGISTER_MEMBER', gymId: access.gymId,
        idempotencyKey: input.idempotencyKey,
        intent: { fullName: input.fullName, email, phone: input.phone, dateOfBirth: input.dateOfBirth,
          emergencyContact: input.emergencyContact ?? null, membershipPlanId: input.membershipPlanId, ...(applicationId ? { applicationId } : {}) },
        protectedFingerprint,
        prepare: async (tx, operation) => {
          await tx.$queryRaw`SELECT "id" FROM "Gym" WHERE "id" = ${access.gymId} FOR SHARE`;
          await this.assertOwner(tx, access);
          const gym = await tx.gym.findUnique({ where: { id: access.gymId }, select: { status: true } });
          if (gym?.status !== 'ACTIVE') throw new ForbiddenException('Gym is unavailable');
          const existing = await tx.user.findUnique({ where: { email }, select: { id: true } });
          if (existing) {
            await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`member-enrollment:${access.gymId}:${existing.id}`}, 0))`;
            const [identity, gymAccess, pending] = await Promise.all([
              tx.user.findUnique({ where: { id: existing.id }, select: { globalRole: true } }),
              tx.gymAccess.findUnique({ where: { userId_gymId: { userId: existing.id, gymId: access.gymId } }, select: { role: true } }),
              tx.operation.findFirst({ where: { gymId: access.gymId, subjectIdentityId: existing.id, kind: 'REGISTER_MEMBER',
                state: { in: ['PENDING', 'MASTER_PREPARED', 'TENANT_COMMITTED', 'FAILED_RETRYABLE'] } }, select: { id: true } }),
            ]);
            if (!identity || identity.globalRole !== 'USER') throw new ConflictException('This identity cannot join this gym');
            if (gymAccess) throw new ConflictException('This identity already has a role in this gym');
            if (pending) throw new ConflictException('An enrollment for this identity is already awaiting consent or recovery');
            if (applicationId) {
              const application = await tx.memberApplication.findFirst({ where: { id: applicationId, gymId: access.gymId,
                identityId: existing.id, state: 'PROCESSING' }, select: { id: true } });
              if (!application) throw new ConflictException('Applicant consent is unavailable');
              await tx.memberApplication.update({ where: { id: application.id }, data: { enrollmentOperationId: operation.id,
                version: { increment: 1 } } });
              await tx.operation.update({ where: { id: operation.id }, data: { subjectIdentityId: existing.id, version: { increment: 1 } } });
              await appendMasterAudit(tx, { actorIdentityId: access.identityId, operationId: operation.id, gymId: access.gymId,
                stepCode: 'APPLICATION_ENROLLMENT_OFFERED', eventCode: 'MEMBER_APPLICATION_ENROLLMENT_OFFERED', resourceType: 'MEMBER_APPLICATION',
                resourceId: application.id, transition: { to: 'APPLICANT_CONSENT_REQUIRED' } });
              return;
            }
            await tx.operation.update({ where: { id: operation.id }, data: { subjectIdentityId: existing.id, version: { increment: 1 } } });
            await appendMasterAudit(tx, { actorIdentityId: access.identityId, operationId: operation.id, gymId: access.gymId,
              stepCode: 'CONSENT_REQUIRED', eventCode: 'MEMBER_ENROLLMENT_CONSENT_REQUIRED', resourceType: 'IDENTITY', resourceId: existing.id,
              transition: { to: 'PENDING' } });
            return;
          }
          const initialHash = await argon2.hash(randomBytes(32).toString('base64url'), { type: argon2.argon2id });
          const identity = await tx.user.create({ data: { email, displayName: input.fullName, passwordHash: initialHash } });
          await tx.gymAccess.create({ data: { userId: identity.id, gymId: access.gymId, role: 'MEMBER', actorKind: 'MEMBER',
            linkStatus: 'PENDING', enrollmentOperationId: operation.id } });
          await tx.operation.update({ where: { id: operation.id }, data: { subjectIdentityId: identity.id, version: { increment: 1 } } });
          await appendMasterAudit(tx, { actorIdentityId: access.identityId, operationId: operation.id, gymId: access.gymId,
            stepCode: 'MASTER_PREPARED', eventCode: 'MEMBER_ENROLLMENT_PREPARED', resourceType: 'IDENTITY', resourceId: identity.id,
            transition: { to: 'PENDING' } });
        },
      });
    } catch (error) {
      if (error instanceof OperationConflictError) throw new ConflictException('Enrollment key conflicts with a previous request');
      throw error;
    }

    const operationId = claim.operation.id;
    let operation = await this.database.master.operation.findUniqueOrThrow({ where: { id: operationId } });
    if (operation.gymId !== access.gymId || operation.actorIdentityId !== access.identityId || !operation.subjectIdentityId) {
      throw new OperationIntegrityError('Member enrollment operation binding is incomplete');
    }
    // Also covers COMPLETE replay: revoked owners must not read enrollment
    // outcomes or trigger credential handoff by replaying an old request.
    await this.database.master.$transaction(tx => this.assertOwner(tx, access));
    const memberIdentityId = operation.subjectIdentityId;
    if (operation.state === 'FAILED_FINAL' || operation.state === 'REPAIR_REQUIRED') {
      throw new ConflictException('Enrollment requires owner recovery before it can continue');
    }
    const preparedAccess = await this.database.master.gymAccess.findUnique({
      where: { userId_gymId: { userId: memberIdentityId, gymId: access.gymId } },
      select: { role: true, linkStatus: true, enrollmentOperationId: true, actorKind: true, tenantActorId: true },
    });
    if (!preparedAccess) {
      return memberRegistrationResultSchema.parse({ operationId, status: 'PENDING', replayed: claim.replayed, consentRequired: true });
    }
    if (preparedAccess.role !== 'MEMBER' || preparedAccess.enrollmentOperationId !== operationId
      || preparedAccess.linkStatus !== 'PENDING' && preparedAccess.linkStatus !== 'ACTIVE') {
      throw new ConflictException('Enrollment access binding conflicts with this request');
    }
    const consentProof = await this.database.master.enrollmentProof.findUnique({
      where: { identityId_gymId_role_enrollmentOperationId: {
        identityId: memberIdentityId, gymId: access.gymId, role: 'MEMBER', enrollmentOperationId: operationId,
      } }, select: { consumedAt: true },
    });
    if (consentProof && !consentProof.consumedAt) throw new ServiceUnavailableException('Enrollment consent is being recovered');
    const reusedIdentity = Boolean(consentProof?.consumedAt);
    if (operation.state === 'COMPLETE') {
      if (!operation.tenantActorId || !operation.tenantMembershipId) throw new OperationIntegrityError('Completed enrollment is missing its tenant references');
      const term = await this.tenantGate.withVerifiedTenant(access, tenant => tenant.membershipTerm.findUnique({ where: { id: operation.tenantMembershipId! },
        select: { id: true, planNameSnapshot: true, startDate: true, endDateExclusive: true, agreedPrice: true, currency: true } }));
      if (!term) throw new OperationIntegrityError('Committed membership term cannot be read');
      const credential = reusedIdentity ? null : await this.credentials.issueTemporaryCredential({ actorIdentityId: access.identityId, gymId: access.gymId, operationId });
      return memberRegistrationResultSchema.parse({ operationId, memberId: operation.tenantActorId,
        term: { id: term.id, planName: term.planNameSnapshot, startDate: dateString(term.startDate), endDateExclusive: dateString(term.endDateExclusive),
          agreedPrice: term.agreedPrice.toString(), currency: term.currency }, status: 'COMPLETE', replayed: true,
        ...(credential ? { credentialDeliveryVersion: credential.deliveryVersion,
          ...(credential.status === 'ISSUED' ? { temporaryPassword: credential.temporaryPassword, credentialExpiresAt: credential.expiresAt.toISOString() } : {}) } : {}),
      });
    }
    let lease = await service.acquireLease(operationId, operation.version);
    const heartbeat = createLeaseHeartbeat(service, lease);
    const checkpoint = (step: 'MASTER_PREPARED' | 'TENANT_REGISTRATION_COMMITTED' | 'MASTER_ACTIVATED', evidence: {
      gymId: string; subjectIdentityId?: string; tenantActorId?: string; tenantCommandReceiptId?: string; tenantMembershipId?: string;
    }, final = false, effects?: (tx: Prisma.TransactionClient) => Promise<void>) => heartbeat.run(async current => {
      const changed = await service.checkpoint(current, { step, evidence,
        ...(final ? { finalResult: { operationId, state: 'COMPLETE' as const, version: 1, resourceIds: [evidence.tenantActorId!, evidence.tenantMembershipId!], publicationState: 'ACTIVE' as const, refreshScopes: [`people:${evidence.tenantActorId}`] } } : {}),
        ...(effects ? { localEffects: tx => effects(tx) } : {}),
      });
      return { lease: changed.lease, value: undefined };
    });
    try {
      await heartbeat.run(async current => ({ lease: await service.reconcileLease(current, async observed => {
        if (observed.gymId !== access.gymId || observed.subjectIdentityId !== memberIdentityId) throw new OperationIntegrityError('Enrollment recovery binding changed');
        const identity = await this.database.master.user.findUnique({ where: { id: memberIdentityId }, select: { id: true } });
        const link = await this.database.master.gymAccess.findUnique({ where: { userId_gymId: { userId: memberIdentityId, gymId: access.gymId } } });
        if (!identity || link?.enrollmentOperationId !== operationId || link.role !== 'MEMBER') throw new OperationIntegrityError('Prepared identity/access evidence is missing');
        const steps = observed.completedSteps as CompletedSteps;
        if (steps.TENANT_REGISTRATION_COMMITTED) {
          await this.tenantGate.withVerifiedTenant(access, async tenant => {
            const receipt = await tenant.commandReceipt.findUnique({ where: { sourceMasterOperationId: operationId } });
            if (!receipt || receipt.state !== 'COMMITTED' || receipt.id !== observed.tenantCommandReceiptId
              || receipt.resourceId !== observed.tenantActorId || receipt.resourceType !== 'MEMBER') throw new OperationIntegrityError('Tenant enrollment receipt is inconsistent');
          });
        }
      }), value: undefined }));

      operation = await this.database.master.operation.findUniqueOrThrow({ where: { id: operationId } });
      let memberId = operation.tenantActorId;
      let receiptId = operation.tenantCommandReceiptId;
      let termId = operation.tenantMembershipId;
      if (!(operation.completedSteps as CompletedSteps).MASTER_PREPARED) {
        await checkpoint('MASTER_PREPARED', { gymId: access.gymId, subjectIdentityId: memberIdentityId });
        operation = await this.database.master.operation.findUniqueOrThrow({ where: { id: operationId } });
      }
      if (!(operation.completedSteps as CompletedSteps).TENANT_REGISTRATION_COMMITTED) {
        const result = await this.tenantGate.withVerifiedTenant(access, tenant => new CommandReceiptFoundationService(tenant).execute({
          masterGymId: access.gymId, actorIdentityId: access.identityId, commandKind: 'REGISTER_MEMBER',
          idempotencyKey: operationId, sourceMasterOperationId: operationId,
          protectedFingerprint,
          normalizedIntent: { fullName: input.fullName, email, phone: input.phone, dateOfBirth: input.dateOfBirth,
            emergencyContact: input.emergencyContact ?? null, membershipPlanId: input.membershipPlanId },
        }, async (tx, receipt) => {
          await tx.$queryRaw`SELECT "id" FROM "GymConfiguration" WHERE "id" = 'current' FOR SHARE`;
          const configuration = await tx.gymConfiguration.findUnique({ where: { id: 'current' } });
          if (!configuration?.currency || !configuration.timezone) throw new UnprocessableEntityException('Gym configuration needs a currency and timezone');
          await tx.$queryRaw`SELECT "id" FROM "MembershipPlan" WHERE "id" = ${input.membershipPlanId} FOR SHARE`;
          const plan = await tx.membershipPlan.findUnique({ where: { id: input.membershipPlanId } });
          if (!plan || plan.status !== 'ACTIVE' || plan.currency !== configuration.currency) throw new UnprocessableEntityException('Choose an active membership plan for this gym currency');
          if (applicationId && applicationOffer && (plan.version !== applicationOffer.membershipPlanVersion
            || plan.name !== applicationOffer.membershipPlanName || plan.price.toString() !== applicationOffer.membershipPrice
            || plan.currency !== applicationOffer.membershipCurrency || plan.durationDays !== applicationOffer.membershipDurationDays)) {
            throw new ConflictException('The membership offer changed; ask the gym owner to review it');
          }
          const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
          const today = gymLocalDate(configuration.timezone!, clock!.now);
          if (input.dateOfBirth > today) throw new UnprocessableEntityException('Date of birth cannot be in the future');
          const start = today;
          const end = addLocalDays(start, plan.durationDays);
          let member = await tx.member.findUnique({ where: { email } });
          if (member) {
            await tx.$queryRaw`SELECT "id" FROM "Member" WHERE "id" = ${member.id} FOR UPDATE`;
            member = await tx.member.findUnique({ where: { id: member.id } });
            if (!member || member.registrationState !== 'BASIC' || member.identityId !== null || member.enrollmentOperationId !== null) {
              throw new ConflictException('A member record with this email already exists');
            }
            member = await tx.member.update({ where: { id: member.id }, data: { fullName: input.fullName, identityId: memberIdentityId,
              registrationState: 'COMPLETE', enrollmentOperationId: operationId, status: 'ACTIVE', version: { increment: 1 },
              phone: input.phone, dateOfBirth: asDate(input.dateOfBirth), emergencyContact: input.emergencyContact ?? null, healthNotes: input.healthNotes ?? null } });
          } else {
            member = await tx.member.create({ data: { fullName: input.fullName, email, identityId: memberIdentityId,
              registrationState: 'COMPLETE', enrollmentOperationId: operationId, status: 'ACTIVE', phone: input.phone,
              dateOfBirth: asDate(input.dateOfBirth), emergencyContact: input.emergencyContact ?? null, healthNotes: input.healthNotes ?? null } });
          }
          const term = await tx.membershipTerm.create({ data: { memberId: member.id, planId: plan.id, startDate: asDate(start),
            endDateExclusive: asDate(end), agreedPrice: plan.price, currency: plan.currency, planNameSnapshot: plan.name,
            configurationVersion: configuration.version, actorIdentityId: access.identityId, idempotencyKey: operationId,
            requestDigest: receipt.requestDigest } });
          return { result: { operationId, resourceIds: [member.id, term.id], publicationState: 'PENDING', retryable: false,
            refreshScopes: [`people:${member.id}`] }, resourceType: 'MEMBER', resourceId: member.id,
            audits: [{ actorIdentityId: access.identityId, eventCode: 'MEMBER_REGISTERED', resourceType: 'MEMBER', resourceId: member.id,
              transition: { to: 'COMPLETE', version: member.version } }] };
        }));
        memberId = result.result.resourceIds?.[0] ?? null; termId = result.result.resourceIds?.[1] ?? null; receiptId = result.receiptId;
        if (!memberId || !termId) throw new OperationIntegrityError('Member registration receipt is incomplete');
        await checkpoint('TENANT_REGISTRATION_COMMITTED', { gymId: access.gymId, tenantActorId: memberId,
          tenantCommandReceiptId: receiptId, tenantMembershipId: termId });
        operation = await this.database.master.operation.findUniqueOrThrow({ where: { id: operationId } });
      }
      memberId ??= operation.tenantActorId;
      receiptId ??= operation.tenantCommandReceiptId;
      termId ??= operation.tenantMembershipId;
      if (!memberId || !receiptId || !termId) throw new OperationIntegrityError('Member registration checkpoints are incomplete');

      if (!(operation.completedSteps as CompletedSteps).MASTER_ACTIVATED) {
        await checkpoint('MASTER_ACTIVATED', { gymId: access.gymId, tenantActorId: memberId, tenantMembershipId: termId }, true, async tx => {
          await tx.$queryRaw`SELECT "id" FROM "Gym" WHERE "id" = ${access.gymId} FOR SHARE`;
          await this.assertOwner(tx, access);
          const link = await tx.gymAccess.findUnique({ where: { userId_gymId: { userId: memberIdentityId, gymId: access.gymId } } });
          if (!link || link.role !== 'MEMBER' || link.enrollmentOperationId !== operationId
            || (link.linkStatus !== 'PENDING' && link.linkStatus !== 'ACTIVE')) throw new OperationIntegrityError('Member access binding is inconsistent');
          if (link.linkStatus === 'PENDING') {
            const changed = await tx.gymAccess.updateMany({ where: { userId: memberIdentityId, gymId: access.gymId,
              enrollmentOperationId: operationId, linkStatus: 'PENDING', version: link.version },
              data: { linkStatus: 'ACTIVE', actorKind: 'MEMBER', tenantActorId: memberId, version: { increment: 1 } } });
            if (changed.count !== 1) throw new OperationConflictError('Member access changed during enrollment');
          } else if (link.tenantActorId !== memberId || link.actorKind !== 'MEMBER') throw new OperationIntegrityError('Member access reciprocity is invalid');
          await appendMasterAudit(tx, { actorIdentityId: access.identityId, operationId, gymId: access.gymId,
            stepCode: 'MASTER_ACTIVATED', eventCode: 'MEMBER_ACCESS_ACTIVATED', resourceType: 'IDENTITY', resourceId: memberIdentityId,
            transition: { from: 'PENDING', to: 'ACTIVE', version: link.version + 1 } });
        });
      }
    } catch (error) {
      try { lease = await heartbeat.stop(); await service.releaseLease(lease); } catch { /* lease expiry leaves a reconciliation-required operation */ }
      if (error instanceof OperationConflictError) throw new ConflictException('Enrollment outcome is pending recovery; retry with the same request key');
      throw error;
    }
    await heartbeat.stop();

    const complete = await this.database.master.operation.findUniqueOrThrow({ where: { id: operationId } });
    if (complete.state !== 'COMPLETE' || complete.tenantActorId === null || complete.tenantMembershipId === null) {
      throw new OperationIntegrityError('Member enrollment did not reach its terminal checkpoint');
    }
    const term = await this.tenantGate.withVerifiedTenant(access, tenant => tenant.membershipTerm.findUnique({ where: { id: complete.tenantMembershipId! },
      select: { id: true, planNameSnapshot: true, startDate: true, endDateExclusive: true, agreedPrice: true, currency: true } }));
    if (!term) throw new OperationIntegrityError('Committed membership term cannot be read');
    const credential = reusedIdentity ? null : await this.credentials.issueTemporaryCredential({ actorIdentityId: access.identityId, gymId: access.gymId, operationId });
    return memberRegistrationResultSchema.parse({ operationId, memberId: complete.tenantActorId,
      term: { id: term.id, planName: term.planNameSnapshot, startDate: dateString(term.startDate), endDateExclusive: dateString(term.endDateExclusive),
        agreedPrice: term.agreedPrice.toString(), currency: term.currency },
      status: 'COMPLETE', replayed: claim.replayed || credential?.status === 'ALREADY_ISSUED',
      ...(credential ? { credentialDeliveryVersion: credential.deliveryVersion,
        ...(credential.status === 'ISSUED' ? { temporaryPassword: credential.temporaryPassword, credentialExpiresAt: credential.expiresAt.toISOString() } : {}) } : {}),
    });
  }

  async consent(slug: string, operationId: string, input: {
    identityId: string; authVersion: number; currentPassword: string; decision: 'ACCEPT' | 'DECLINE';
  }) {
    const gym = await this.database.master.gym.findUnique({ where: { slug }, select: { id: true, status: true } });
    const operation = await this.database.master.operation.findUnique({ where: { id: operationId },
      select: { id: true, kind: true, gymId: true, subjectIdentityId: true } });
    if (!gym || gym.status !== 'ACTIVE' || !operation || operation.kind !== 'REGISTER_MEMBER'
      || operation.gymId !== gym.id || operation.subjectIdentityId !== input.identityId) {
      throw new NotFoundException('Enrollment consent is unavailable');
    }
    const application = await this.database.master.memberApplication.findUnique({ where: { enrollmentOperationId: operation.id },
      select: { id: true, identityId: true, state: true } });
    if (application && (application.identityId !== input.identityId || application.state !== 'PROCESSING')) {
      throw new NotFoundException('Enrollment consent is unavailable');
    }
    const result = await new IdentityFoundationService(this.database.master).consentEnrollment({
      gymId: gym.id, role: 'MEMBER', enrollmentOperationId: operation.id,
      authenticatedIdentityId: input.identityId, authenticatedAuthVersion: input.authVersion,
      currentPassword: input.currentPassword, decision: input.decision,
    });
    if (application && result.status === 'CONSENT_DECLINED') {
      await this.database.master.memberApplication.updateMany({ where: { id: application.id, state: 'PROCESSING' },
        data: { state: 'WITHDRAWN', version: { increment: 1 } } });
    }
    return { operationId: operation.id, ...result };
  }
}
