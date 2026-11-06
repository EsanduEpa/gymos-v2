import { z } from 'zod';
import { newPasswordSchema } from './credentials.js';
const id = z.string().min(1).max(128).regex(/^[A-Za-z0-9_:-]+$/);
const email = z.string().trim().max(254).email().transform(value => value.toLowerCase());
const name = z.string().trim().min(2).max(120);
const phone = z.string().trim().min(1).max(40);
const instant = z.iso.datetime({ offset: true });
export const publicMemberApplicationInputSchema = z.strictObject({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  fullName: name, email, phone,
  password: newPasswordSchema,
  consent: z.literal(true),
});
export const memberApplicationInputSchema = z.strictObject({
  fullName: name, phone, consent: z.literal(true),
});
export const memberApplicationSubmittedSchema = z.strictObject({ submitted: z.literal(true) });
export const memberApplicationNoticeSchema = z.strictObject({ id, applicationId: id, gymSlug: z.string().min(1).max(100), eventCode: z.enum(['APPLICANT_SUBMITTED','APPLICANT_APPROVED','APPLICANT_REJECTED','APPLICANT_WITHDREW','OWNER_NEW_APPLICATION','OWNER_APPLICATION_WITHDREW']),
  title: z.string().min(1).max(120), message: z.string().max(300), linkKind: z.enum(['MEMBER_APPLICATIONS','OWNER_APPLICATIONS']),
  createdAt: instant, readAt: instant.nullable() });
export const memberApplicationNoticeListSchema = z.strictObject({ items: z.array(memberApplicationNoticeSchema).max(50), unreadCount: z.number().int().nonnegative() });
export const memberApplicationNoticeReadSchema = z.strictObject({ id, readAt: instant });
export const memberApplicationStatusSchema = z.strictObject({
  id, gymSlug: z.string().min(1).max(100), gymName: z.string().min(1).max(160),
  fullName: name, state: z.enum(['PENDING','PROCESSING','APPROVED','REJECTED','WITHDRAWN','RECOVERY_REQUIRED']),
  createdAt: instant, applicantReason: z.string().max(240).nullable(), canWithdraw: z.boolean(),
  enrollmentOperationId: id.nullable(), consentRecorded: z.boolean(), membershipPlanId: id.nullable(), dateOfBirth: z.iso.date().nullable(),
  membershipPlanName: z.string().max(80).nullable(), membershipPrice: z.string().max(32).nullable(),
  membershipCurrency: z.enum(['LKR','USD']).nullable(), membershipDurationDays: z.number().int().positive().nullable(),
});
export const memberApplicationListQuerySchema = z.strictObject({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(25) });
export const memberApplicationQueueSchema = z.strictObject({
  items: z.array(z.strictObject({ id, identityId: id, fullName: name, email: z.string().email(), phone,
    state: z.enum(['PENDING','PROCESSING','APPROVED','REJECTED','WITHDRAWN','RECOVERY_REQUIRED']),
    version: z.number().int().nonnegative(), createdAt: instant, applicantReason: z.string().max(240).nullable(),
    membershipPlanId: id.nullable(), dateOfBirth: z.iso.date().nullable(),
  membershipPlanName: z.string().max(80).nullable(), membershipPrice: z.string().max(32).nullable(),
  membershipCurrency: z.enum(['LKR','USD']).nullable(), membershipDurationDays: z.number().int().positive().nullable(), privateNote: z.string().max(2000).nullable() })).max(100),
  page: z.number().int().min(1), pageSize: z.number().int().min(1).max(100), totalCount: z.number().int().nonnegative(),
});
export const memberApplicationDecisionSchema = z.discriminatedUnion('decision', [
  z.strictObject({ decision: z.literal('APPROVE'), expectedVersion: z.number().int().nonnegative(), membershipPlanId: id, dateOfBirth: z.iso.date() }),
  z.strictObject({ decision: z.literal('REJECT'), expectedVersion: z.number().int().nonnegative(),
    applicantReason: z.string().trim().max(240).optional(), privateNote: z.string().trim().max(2000).optional() }),
]);
export const memberApplicationDecisionResultSchema = z.strictObject({ id, state: z.enum(['PROCESSING','APPROVED','REJECTED']), version: z.number().int().nonnegative(),
  enrollmentOperationId: id.optional() });
export type PublicMemberApplicationInput = z.infer<typeof publicMemberApplicationInputSchema>;
