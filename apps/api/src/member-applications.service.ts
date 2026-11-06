import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import argon2 from 'argon2';
import { Prisma } from './generated/master/client.js';
import type { PublicMemberApplicationInput } from '@gymos/contracts';
import { DatabaseService } from './database.service.js';
import { MemberEnrollmentService } from './member-enrollment.service.js';
import { memberRegistrationResultSchema } from '@gymos/contracts';
import { normalizeIdentityEmail } from './identity/email.js';
import { TenantSchemaGateService } from './tenancy/tenant-schema-gate.service.js';
import { gymLocalDate } from './membership-rules.js';
import { appendMasterVersionAudit } from './operations/transaction-audit.js';
import type { GymRequest } from './gym-access.guard.js';

const unique = (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
@Injectable()
export class MemberApplicationsService {
  constructor(private readonly database: DatabaseService, private readonly enrollment: MemberEnrollmentService,
    private readonly tenantGate: TenantSchemaGateService) {}

  async publicApply(input: PublicMemberApplicationInput) {
    const email = normalizeIdentityEmail(input.email);
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    try {
      await this.database.master.$transaction(async tx => {
        const gym = await tx.gym.findUnique({ where: { slug: input.slug }, select: { id: true, name: true, status: true } });
        if (!gym || gym.status !== 'ACTIVE') throw new NotFoundException('Gym applications are unavailable');
        await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`member-application:${gym.id}:${email}`}, 0))`;
        if (await tx.user.findUnique({ where: { email }, select: { id: true } })) return;
        const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
        const user = await tx.user.create({ data: { email, passwordHash, displayName: input.fullName } });
        const application = await tx.memberApplication.create({ data: { gymId: gym.id, identityId: user.id,
          fullName: input.fullName, phone: input.phone, consentedAt: clock!.now } });
        const owners = await tx.gymAccess.findMany({ where: { gymId: gym.id, role: 'OWNER', linkStatus: 'ACTIVE' }, select: { userId: true } });
        await tx.memberApplicationNotice.createMany({ data: [
          { applicationId: application.id, gymId: gym.id, recipientId: user.id, event: 'APPLICANT_SUBMITTED' },
          ...owners.map(owner => ({ applicationId: application.id, gymId: gym.id, recipientId: owner.userId, event: 'OWNER_NEW_APPLICATION' as const })),
        ], skipDuplicates: true });
        await appendMasterVersionAudit(tx, { actorIdentityId: user.id, gymId: gym.id, eventCode: 'MEMBER_APPLICATION_SUBMITTED',
          resourceType: 'MEMBER_APPLICATION', resourceId: application.id, committedVersion: application.version, transition: { to: 'PENDING', version: application.version } });
      });
    } catch (error) {
      if (unique(error)) return { submitted: true as const };
      throw error;
    }
    return { submitted: true as const };
  }

  async authenticatedApply(slug: string, identityId: string, authVersion: number, input: { fullName: string; phone: string }) {
    try {
      await this.database.master.$transaction(async tx => {
        const gym = await tx.gym.findUnique({ where: { slug }, select: { id: true, status: true } });
        if (!gym || gym.status !== 'ACTIVE') throw new NotFoundException('Gym applications are unavailable');
        await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`member-application:${gym.id}:${identityId}`}, 0))`;
        const [user, access, clock] = await Promise.all([
          tx.user.findUnique({ where: { id: identityId }, select: { globalRole: true, authVersion: true, mustChangePassword: true } }),
          tx.gymAccess.findUnique({ where: { userId_gymId: { userId: identityId, gymId: gym.id } }, select: { role: true } }),
          tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`,
        ]);
        if (!user || user.authVersion !== authVersion || user.mustChangePassword) throw new ForbiddenException('Sign in again to apply');
        if (user.globalRole !== 'USER' || access) return;
        const application = await tx.memberApplication.create({ data: { gymId: gym.id, identityId, fullName: input.fullName,
          phone: input.phone, consentedAt: clock![0]!.now } });
        const owners = await tx.gymAccess.findMany({ where: { gymId: gym.id, role: 'OWNER', linkStatus: 'ACTIVE' }, select: { userId: true } });
        await tx.memberApplicationNotice.createMany({ data: [
          { applicationId: application.id, gymId: gym.id, recipientId: identityId, event: 'APPLICANT_SUBMITTED' },
          ...owners.map(owner => ({ applicationId: application.id, gymId: gym.id, recipientId: owner.userId, event: 'OWNER_NEW_APPLICATION' as const })),
        ], skipDuplicates: true });
        await appendMasterVersionAudit(tx, { actorIdentityId: identityId, gymId: gym.id, eventCode: 'MEMBER_APPLICATION_SUBMITTED',
          resourceType: 'MEMBER_APPLICATION', resourceId: application.id, committedVersion: application.version, transition: { to: 'PENDING', version: application.version } });
      });
    } catch (error) {
      if (unique(error)) return { submitted: true as const };
      throw error;
    }
    return { submitted: true as const };
  }

  async ownApplications(identityId: string, authVersion: number) {
    await this.assertIdentity(identityId, authVersion);
    const rows = await this.database.master.memberApplication.findMany({ where: { identityId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 50,
      select: { id: true, fullName: true, state: true, createdAt: true, applicantReason: true, enrollmentOperationId: true,
        membershipPlanId: true, dateOfBirth: true, membershipPlanName: true, membershipPrice: true, membershipCurrency: true,
        membershipDurationDays: true, gym: { select: { slug: true, name: true } } } });
    const operationIds = rows.flatMap(row => row.enrollmentOperationId ? [row.enrollmentOperationId] : []);
    const proofs = operationIds.length ? await this.database.master.enrollmentProof.findMany({ where: { identityId, enrollmentOperationId: { in: operationIds }, consumedAt: { not: null } }, select: { enrollmentOperationId: true } }) : [];
    const consented = new Set(proofs.map(proof => proof.enrollmentOperationId));
    return rows.map(row => ({ id: row.id, gymSlug: row.gym.slug, gymName: row.gym.name, fullName: row.fullName,
      state: row.state, createdAt: row.createdAt.toISOString(), applicantReason: row.applicantReason,
      canWithdraw: row.state === 'PENDING', enrollmentOperationId: row.enrollmentOperationId,
      consentRecorded: row.enrollmentOperationId ? consented.has(row.enrollmentOperationId) : false,
      membershipPlanId: row.membershipPlanId, dateOfBirth: row.dateOfBirth, membershipPlanName: row.membershipPlanName,
      membershipPrice: row.membershipPrice, membershipCurrency: row.membershipCurrency, membershipDurationDays: row.membershipDurationDays }));
  }

  async applicantNotices(identityId: string, authVersion: number) {
    await this.assertIdentity(identityId, authVersion);
    return this.noticeList(await this.database.master.memberApplicationNotice.findMany({ where: { recipientId: identityId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 50, include: { gym: { select: { slug: true } } } }));
  }

  async ownerNotices(access: NonNullable<GymRequest['gymAccess']>) {
    await this.assertOwner(access);
    return this.noticeList(await this.database.master.memberApplicationNotice.findMany({ where: { gymId: access.gymId, recipientId: access.identityId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 50, include: { gym: { select: { slug: true } } } }));
  }

  async markNoticeRead(identityId: string, authVersion: number, noticeId: string, gymId?: string) {
    await this.assertIdentity(identityId, authVersion);
    const [clock] = await this.database.master.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
    const now = clock!.now;
    const changed = await this.database.master.memberApplicationNotice.updateMany({ where: { id: noticeId, recipientId: identityId,
      ...(gymId ? { gymId } : {}), readAt: null }, data: { readAt: now } });
    if (!changed.count) {
      const existing = await this.database.master.memberApplicationNotice.findFirst({ where: { id: noticeId, recipientId: identityId,
        ...(gymId ? { gymId } : {}) }, select: { id: true, readAt: true } });
      if (!existing) throw new NotFoundException('Application notification not found');
      return { id: noticeId, readAt: existing.readAt!.toISOString() };
    }
    return { id: noticeId, readAt: now.toISOString() };
  }

  private noticeList(rows: Array<{ id: string; applicationId: string; event: string; createdAt: Date; readAt: Date | null; gym: { slug: string } }>) {
    const content: Record<string, { title: string; message: string; linkKind: 'MEMBER_APPLICATIONS' | 'OWNER_APPLICATIONS' }> = {
      APPLICANT_SUBMITTED: { title: 'Application received', message: 'Your application is waiting for the gym owner to review.', linkKind: 'MEMBER_APPLICATIONS' },
      APPLICANT_APPROVED: { title: 'Enrollment approved', message: 'Your membership enrollment is complete. Gym access is available.', linkKind: 'MEMBER_APPLICATIONS' },
      APPLICANT_REJECTED: { title: 'Application update', message: 'The gym owner has updated your application. Review its status for details.', linkKind: 'MEMBER_APPLICATIONS' },
      APPLICANT_WITHDREW: { title: 'Application withdrawn', message: 'Your application has been withdrawn.', linkKind: 'MEMBER_APPLICATIONS' },
      OWNER_NEW_APPLICATION: { title: 'New member application', message: 'A prospective member has applied to join your gym.', linkKind: 'OWNER_APPLICATIONS' },
      OWNER_APPLICATION_WITHDREW: { title: 'Application withdrawn', message: 'An applicant withdrew their request to join your gym.', linkKind: 'OWNER_APPLICATIONS' },
    };
    const items = rows.flatMap(row => {
      const message = content[row.event];
      return message ? [{ id: row.id, applicationId: row.applicationId, gymSlug: row.gym.slug, eventCode: row.event, ...message,
        createdAt: row.createdAt.toISOString(), readAt: row.readAt?.toISOString() ?? null }] : [];
    });
    return { items, unreadCount: items.filter(item => !item.readAt).length };
  }

  async withdraw(identityId: string, authVersion: number, applicationId: string) {
    await this.assertIdentity(identityId, authVersion);
    return this.database.master.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "MemberApplication" WHERE "id" = ${applicationId} AND "identityId" = ${identityId} FOR UPDATE`;
      const application = await tx.memberApplication.findFirst({ where: { id: applicationId, identityId, state: 'PENDING' },
        select: { id: true, gymId: true, version: true } });
      if (!application) throw new NotFoundException('Application is unavailable');
      const changed = await tx.memberApplication.updateMany({ where: { id: applicationId, identityId, state: 'PENDING', version: application.version },
        data: { state: 'WITHDRAWN', version: { increment: 1 } } });
      if (changed.count !== 1) throw new ConflictException('Application changed; reload its status');
      const owners = await tx.gymAccess.findMany({ where: { gymId: application.gymId, role: 'OWNER', linkStatus: 'ACTIVE' }, select: { userId: true } });
      await tx.memberApplicationNotice.createMany({ data: [
        { applicationId, gymId: application.gymId, recipientId: identityId, event: 'APPLICANT_WITHDREW' },
        ...owners.map(owner => ({ applicationId, gymId: application.gymId, recipientId: owner.userId, event: 'OWNER_APPLICATION_WITHDREW' as const })),
      ], skipDuplicates: true });
      await appendMasterVersionAudit(tx, { actorIdentityId: identityId, gymId: application.gymId, eventCode: 'MEMBER_APPLICATION_WITHDRAWN',
        resourceType: 'MEMBER_APPLICATION', resourceId: applicationId, committedVersion: application.version + 1,
        transition: { from: 'PENDING', to: 'WITHDRAWN', version: application.version + 1 } });
      return tx.memberApplication.findUniqueOrThrow({ where: { id: applicationId }, select: { id: true, state: true, version: true } });
    });
  }

  async ownerQueue(access: NonNullable<GymRequest['gymAccess']>, page: number, pageSize: number) {
    await this.assertOwner(access);
    const where = { gymId: access.gymId };
    const [totalCount, items] = await Promise.all([
      this.database.master.memberApplication.count({ where }),
      this.database.master.memberApplication.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize, take: pageSize,
        select: { id: true, identityId: true, fullName: true, phone: true, state: true, version: true, createdAt: true,
          applicantReason: true, privateNote: true, membershipPlanId: true, dateOfBirth: true, membershipPlanName: true,
          membershipPrice: true, membershipCurrency: true, membershipDurationDays: true, identity: { select: { email: true } } } }),
    ]);
    return { items: items.map(({ identity, ...item }) => ({ ...item, email: identity.email, createdAt: item.createdAt.toISOString() })), page, pageSize, totalCount };
  }

  async decide(access: NonNullable<GymRequest['gymAccess']>, applicationId: string,
    input: { decision: 'APPROVE'; expectedVersion: number; membershipPlanId: string; dateOfBirth: string } |
      { decision: 'REJECT'; expectedVersion: number; applicantReason?: string; privateNote?: string }) {
    await this.assertOwner(access);
    if (input.decision === 'APPROVE') {
      const before = await this.database.master.memberApplication.findFirst({ where: { id: applicationId, gymId: access.gymId },
        select: { id: true, state: true, version: true, enrollmentOperationId: true } });
      if (!before) throw new NotFoundException('Application not found');
      if (before.state === 'APPROVED') return { id: before.id, state: before.state, version: before.version,
        enrollmentOperationId: before.enrollmentOperationId ?? undefined };
      if (before.enrollmentOperationId) {
        const operation = await this.database.master.operation.findUnique({ where: { id: before.enrollmentOperationId }, select: { state: true } });
        if (operation?.state === 'COMPLETE') {
          return this.database.master.$transaction(async tx => {
            const updated = await tx.memberApplication.update({ where: { id: before.id }, data: { state: 'APPROVED', version: { increment: 1 } },
              select: { id: true, state: true, version: true, enrollmentOperationId: true, identityId: true } });
            await tx.memberApplicationNotice.createMany({ data: { applicationId: updated.id, gymId: access.gymId,
              recipientId: updated.identityId, event: 'APPLICANT_APPROVED' }, skipDuplicates: true });
            await appendMasterVersionAudit(tx, { actorIdentityId: access.identityId, gymId: access.gymId, eventCode: 'MEMBER_APPLICATION_APPROVED',
              resourceType: 'MEMBER_APPLICATION', resourceId: updated.id, committedVersion: updated.version,
              transition: { from: 'PROCESSING', to: 'APPROVED', version: updated.version } });
            return updated;
          });
        }
      }
    }
    const selectedOffer = input.decision === 'APPROVE' ? await this.tenantGate.withVerifiedTenant(access, async tenant => {
      const [configuration, plan, clock] = await Promise.all([
        tenant.gymConfiguration.findUnique({ where: { id: 'current' }, select: { currency: true, timezone: true } }),
        tenant.membershipPlan.findUnique({ where: { id: input.membershipPlanId } }),
        tenant.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`,
      ]);
      if (!configuration?.currency || !configuration.timezone || !plan || plan.status !== 'ACTIVE' || plan.currency !== configuration.currency) {
        throw new UnprocessableEntityException('Choose an active membership plan for this gym currency');
      }
      if (input.dateOfBirth > gymLocalDate(configuration.timezone, clock[0]!.now)) throw new UnprocessableEntityException('Date of birth cannot be in the future');
      return { name: plan.name, price: plan.price.toString(), currency: plan.currency, durationDays: plan.durationDays, version: plan.version };
    }) : null;
    return this.database.master.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "MemberApplication" WHERE "id" = ${applicationId} AND "gymId" = ${access.gymId} FOR UPDATE`;
      const application = await tx.memberApplication.findFirst({ where: { id: applicationId, gymId: access.gymId } });
      if (!application) throw new NotFoundException('Application not found');
      if (input.decision === 'REJECT') {
        if (application.state !== 'PENDING' || application.version !== input.expectedVersion) throw new ConflictException('Application changed; reload the queue');
        const current = await tx.memberApplication.update({ where: { id: applicationId }, data: { state: 'REJECTED', version: { increment: 1 },
          decidedByIdentityId: access.identityId, applicantReason: input.applicantReason?.trim() || null,
          privateNote: input.privateNote?.trim() || null }, select: { id: true, state: true, version: true } });
        await tx.memberApplicationNotice.createMany({ data: { applicationId, gymId: access.gymId,
          recipientId: application.identityId, event: 'APPLICANT_REJECTED' }, skipDuplicates: true });
        await appendMasterVersionAudit(tx, { actorIdentityId: access.identityId, gymId: access.gymId, eventCode: 'MEMBER_APPLICATION_REJECTED',
          resourceType: 'MEMBER_APPLICATION', resourceId: applicationId, committedVersion: application.version + 1,
          transition: { from: 'PENDING', to: 'REJECTED', version: application.version + 1 } });
        return { ...current, enrollmentOperationId: undefined };
      }
      if (application.state === 'APPROVED') return { id: application.id, state: application.state, version: application.version,
        enrollmentOperationId: application.enrollmentOperationId ?? undefined };
      if (application.state === 'PENDING') {
        if (application.version !== input.expectedVersion) throw new ConflictException('Application changed; reload the queue');
        await tx.memberApplication.update({ where: { id: application.id }, data: { state: 'PROCESSING', version: { increment: 1 },
          membershipPlanId: input.membershipPlanId, dateOfBirth: input.dateOfBirth, decidedByIdentityId: access.identityId,
          membershipPlanName: selectedOffer!.name, membershipPrice: selectedOffer!.price, membershipCurrency: selectedOffer!.currency,
          membershipDurationDays: selectedOffer!.durationDays, membershipPlanVersion: selectedOffer!.version } });
        await appendMasterVersionAudit(tx, { actorIdentityId: access.identityId, gymId: access.gymId, eventCode: 'MEMBER_APPLICATION_OFFERED',
          resourceType: 'MEMBER_APPLICATION', resourceId: application.id, committedVersion: application.version + 1,
          transition: { from: 'PENDING', to: 'PROCESSING', version: application.version + 1 } });
      } else if (application.state !== 'PROCESSING' || application.version !== input.expectedVersion
        || (application.enrollmentOperationId && (application.membershipPlanId !== input.membershipPlanId || application.dateOfBirth !== input.dateOfBirth
          || application.membershipPlanVersion !== selectedOffer?.version || application.membershipPrice !== selectedOffer?.price
          || application.membershipPlanName !== selectedOffer?.name || application.membershipCurrency !== selectedOffer?.currency
          || application.membershipDurationDays !== selectedOffer?.durationDays))) {
        throw new ConflictException('Application decision changed; reload before retrying');
      } else if (application.state === 'PROCESSING' && (!application.enrollmentOperationId
        && (application.membershipPlanId !== input.membershipPlanId || application.dateOfBirth !== input.dateOfBirth
          || application.membershipPlanVersion !== selectedOffer?.version || application.membershipPrice !== selectedOffer?.price))) {
        await tx.memberApplication.update({ where: { id: application.id }, data: { membershipPlanId: input.membershipPlanId, dateOfBirth: input.dateOfBirth,
          membershipPlanName: selectedOffer!.name, membershipPrice: selectedOffer!.price, membershipCurrency: selectedOffer!.currency,
          membershipDurationDays: selectedOffer!.durationDays, membershipPlanVersion: selectedOffer!.version, version: { increment: 1 } } });
        await appendMasterVersionAudit(tx, { actorIdentityId: access.identityId, gymId: access.gymId, eventCode: 'MEMBER_APPLICATION_OFFER_UPDATED',
          resourceType: 'MEMBER_APPLICATION', resourceId: application.id, committedVersion: application.version + 1,
          transition: { from: 'PROCESSING', to: 'PROCESSING', version: application.version + 1 } });
      }
      return { id: application.id, state: 'PROCESSING' as const, version: application.version + (application.state === 'PENDING' ? 1 : 0),
        identityId: application.identityId, fullName: application.fullName, phone: application.phone,
        email: (await tx.user.findUniqueOrThrow({ where: { id: application.identityId }, select: { email: true } })).email,
        membershipPlanId: input.membershipPlanId, dateOfBirth: input.dateOfBirth, enrollmentOperationId: application.enrollmentOperationId,
        membershipPlanName: selectedOffer?.name ?? application.membershipPlanName, membershipPrice: selectedOffer?.price ?? application.membershipPrice,
        membershipCurrency: selectedOffer?.currency ?? application.membershipCurrency, membershipDurationDays: selectedOffer?.durationDays ?? application.membershipDurationDays,
        membershipPlanVersion: application.membershipPlanVersion };
    }).then(async application => {
      if (!('identityId' in application) || typeof application.identityId !== 'string') return application;
      const result = memberRegistrationResultSchema.parse(await this.enrollment.enroll(access, {
        fullName: application.fullName!, email: application.email!, phone: application.phone!, dateOfBirth: application.dateOfBirth!,
        membershipPlanId: application.membershipPlanId!, idempotencyKey: `member-application:${application.id}`,
      }, application.id));
      if (result.status !== 'COMPLETE') {
        const current = await this.database.master.memberApplication.findUniqueOrThrow({ where: { id: application.id }, select: { version: true } });
        return { id: application.id, state: 'PROCESSING' as const, version: current.version, enrollmentOperationId: result.operationId };
      }
      return this.database.master.$transaction(async tx => {
        const changed = await tx.memberApplication.updateMany({ where: { id: application.id, gymId: access.gymId,
          identityId: application.identityId, state: 'PROCESSING', enrollmentOperationId: result.operationId },
          data: { state: 'APPROVED', version: { increment: 1 } } });
        if (changed.count !== 1) throw new ConflictException('Enrollment completed; application status requires recovery');
        const current = await tx.memberApplication.findUniqueOrThrow({ where: { id: application.id },
          select: { id: true, state: true, version: true, enrollmentOperationId: true, identityId: true } });
        await tx.memberApplicationNotice.createMany({ data: { applicationId: current.id, gymId: access.gymId,
          recipientId: current.identityId, event: 'APPLICANT_APPROVED' }, skipDuplicates: true });
        await appendMasterVersionAudit(tx, { actorIdentityId: access.identityId, gymId: access.gymId, eventCode: 'MEMBER_APPLICATION_APPROVED',
          resourceType: 'MEMBER_APPLICATION', resourceId: current.id, committedVersion: current.version,
          transition: { from: 'PROCESSING', to: 'APPROVED', version: current.version } });
        return current;
      });
    });
  }

  private async assertOwner(access: NonNullable<GymRequest['gymAccess']>) {
    const [user, link, gym] = await Promise.all([
      this.database.master.user.findUnique({ where: { id: access.identityId }, select: { authVersion: true, mustChangePassword: true } }),
      this.database.master.gymAccess.findUnique({ where: { userId_gymId: { userId: access.identityId, gymId: access.gymId } }, select: { role: true, linkStatus: true, version: true } }),
      this.database.master.gym.findUnique({ where: { id: access.gymId }, select: { status: true } }),
    ]);
    if (!user || user.authVersion !== access.identityVersion || user.mustChangePassword || link?.role !== 'OWNER'
      || link.linkStatus !== 'ACTIVE' || link.version !== access.accessVersion || gym?.status !== 'ACTIVE') {
      throw new ForbiddenException('Current owner access is required');
    }
  }

  private async assertIdentity(identityId: string, authVersion: number) {
    const user = await this.database.master.user.findUnique({ where: { id: identityId }, select: { authVersion: true, mustChangePassword: true } });
    if (!user || user.authVersion !== authVersion || user.mustChangePassword) throw new ForbiddenException('Sign in again to manage applications');
  }
}
