import { createRequire } from 'node:module';

export const clock = '2026-10-24T12:00:00.000Z';
export const gymA = 'visual-alpha';
export const gymB = 'visual-beta';
export const memberId = 'visual-member-00';
export const trainerId = 'visual-trainer-00';
export const roles = {
  admin: { id: 'visual-admin', role: 'SUPER_ADMIN', gymId: null, fullName: 'Synthetic Platform Admin' },
  owner: { id: 'visual-owner', role: 'GYM_OWNER', gymId: gymA, fullName: 'Synthetic Alpha Owner' },
  trainer: { id: trainerId, role: 'PERSONAL_TRAINER', gymId: gymA, fullName: 'Synthetic Trainer 00' },
  member: { id: memberId, role: 'GYM_MEMBER', gymId: gymA, fullName: 'Synthetic Member 00' },
  beta: { id: 'visual-beta-owner', role: 'GYM_OWNER', gymId: gymB, fullName: 'Synthetic Beta Owner' },
};

// Only a newly owned, loopback database URL may reach this module. No .env is read.
export async function seedV1(copy: string, url: string) {
  const require = createRequire(`${copy}/package.json`);
  const { PrismaClient } = require(`${copy}/generated`);
  const { hash } = require('bcryptjs');
  const db = new PrismaClient({ datasources: { db: { url } } });
  // Login is exercised with a random runtime-only credential; it is never saved.
  const { randomBytes } = await import('node:crypto');
  const password = randomBytes(24).toString('base64url');
  const passwordHash = await hash(password, 4);
  const fixed = { createdAt: new Date(clock), updatedAt: new Date(clock) };
  for (const [id, name] of [[gymA, 'Synthetic Alpha Fitness'], [gymB, 'Synthetic Beta Studio']]) {
    await db.gym.create({ data: { id, name, address: '100 Example Avenue, Fixture City', phone: '000-000-0000', email: `${id}@example.test`, defaultSessionFee: 50, level2SessionFee: 70, introSessionFee: 0, ...fixed } });
    await db.gymSubscription.create({ data: { id: `${id}-subscription`, gymId: id, tier: 'GROWTH', status: 'ACTIVE', nextBillingDate: new Date('2026-11-01'), paymentMethodLast4: '0000', ...fixed } });
    await db.payPeriod.create({ data: { id: `${id}-period`, gymId: id, startDate: new Date('2026-10-01'), endDate: new Date('2026-10-31T23:59:59Z'), status: 'OPEN', ...fixed } });
  }
  await db.membershipPlan.create({ data: { id: 'visual-plan', gymId: gymA, name: 'Synthetic Monthly Membership', description: 'Reference fixture plan', price: 100, durationDays: 30, ...fixed } });
  for (const actor of Object.values(roles).filter(a => !['GYM_MEMBER', 'PERSONAL_TRAINER'].includes(a.role))) {
    await db.user.create({ data: { ...actor, email: `${actor.id}@example.test`, password: passwordHash, specialisations: [], ...fixed } });
  }
  for (let i = 0; i < 28; i++) {
    const suffix = String(i).padStart(2, '0');
    await db.user.create({ data: { id: `visual-trainer-${suffix}`, gymId: gymA, fullName: i === 1 ? 'Synthetic Trainer With A Deliberately Long Display Name' : `Synthetic Trainer ${suffix}`, email: `trainer-${suffix}@example.test`, phone: '000-000-0000', password: passwordHash, role: 'PERSONAL_TRAINER', trainerLevel: i % 2 ? 'LEVEL_2' : 'LEVEL_1', trainerStatus: i === 27 ? 'DEACTIVATED' : 'ACTIVE', shiftStart: '08:00', shiftEnd: '17:00', specialisations: ['Strength', 'Mobility', 'Conditioning'], yearsExperience: 5, ratingAvg: 4.8, bio: 'Synthetic coaching biography for visual reference. '.repeat(i === 1 ? 12 : 2), ...fixed } });
    await db.user.create({ data: { id: `visual-member-${suffix}`, gymId: gymA, fullName: i === 1 ? 'Synthetic Member With A Deliberately Long Display Name' : `Synthetic Member ${suffix}`, email: `member-${suffix}@example.test`, phone: '000-000-0000', password: passwordHash, role: 'GYM_MEMBER', memberStatus: ['ACTIVE', 'ACTIVE', 'EXPIRED', 'SUSPENDED'][i % 4], dateOfBirth: new Date('1995-06-15'), emergencyContact: 'Synthetic contact 000-000-0000', healthNotes: 'Synthetic placeholder only; no personal health information. '.repeat(8), specialisations: [], ...fixed } });
    await db.membership.create({ data: { id: `visual-membership-${suffix}`, userId: `visual-member-${suffix}`, membershipPlanId: 'visual-plan', startDate: new Date('2026-10-01'), endDate: new Date('2026-11-01'), ...fixed } });
    if (i !== 3) await db.sessionPack.create({ data: { id: `visual-pack-${suffix}`, userId: `visual-member-${suffix}`, totalSessions: 10, remainingSessions: i === 0 ? 8 : i % 4, price: 500, purchaseDate: new Date('2026-10-01'), expiryDate: new Date('2026-12-31'), ...fixed } });
    const status = ['SCHEDULED', 'ACTIVE', 'COMPLETED', 'MISSED', 'CANCELLED', 'DECLINED', 'PENDING_CONFIRMATION'][i % 7];
    await db.pTSession.create({ data: { id: `visual-session-${suffix}`, gymId: gymA, clientId: `visual-member-${suffix}`, trainerId, scheduledAt: new Date(`2026-10-24T${String(8 + Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}:00Z`), duration: 60, type: ['IN_PERSON', 'VIRTUAL', 'INTRODUCTORY'][i % 3], status, fee: 50, shiftStatus: i % 2 ? 'OFF_SHIFT' : 'IN_SHIFT', noShow: status === 'MISSED', startedAt: status === 'ACTIVE' ? new Date('2026-10-24T11:30:00Z') : null, notes: 'Synthetic shared session notes.', ...fixed } });
    // Establish a confirmed relationship for every roster fixture, including zero-credit clients.
    if (!['SCHEDULED', 'ACTIVE', 'COMPLETED'].includes(status)) await db.pTSession.create({ data: { id: `visual-history-${suffix}`, gymId: gymA, clientId: `visual-member-${suffix}`, trainerId, scheduledAt: new Date('2026-10-20T09:00Z'), duration: 60, status: 'COMPLETED', fee: 50, ...fixed } });
    await db.auditLog.create({ data: { id: `visual-audit-${suffix}`, gymId: gymA, userId: roles.owner.id, actionType: i % 2 ? 'MEMBER_CREATED' : 'SESSION_CREATED', affectedRecordId: `visual-member-${suffix}`, details: JSON.stringify({ fixture: true, description: 'Synthetic audit detail with long content. '.repeat(8) }), createdAt: new Date(clock) } });
  }
  // Several bookings for one member exercise the monthly More overlay and all member statuses.
  for (let i = 0; i < 8; i++) await db.pTSession.create({ data: { id: `visual-member-history-${i}`, gymId: gymA, clientId: memberId, trainerId, scheduledAt: new Date(`2026-10-${String(25 + i % 6).padStart(2, '0')}T10:00Z`), duration: 60, status: ['SCHEDULED', 'PENDING_CONFIRMATION', 'ACTIVE', 'COMPLETED', 'MISSED', 'CANCELLED', 'DECLINED', 'SCHEDULED'][i], fee: 50, notes: 'Synthetic notes visible to the fixture member.', ...fixed } });
  await db.user.create({ data: { id: 'visual-beta-member', gymId: gymB, email: 'beta-member@example.test', fullName: 'Synthetic Foreign Member', password: passwordHash, role: 'GYM_MEMBER', memberStatus: 'ACTIVE', specialisations: [], ...fixed } });
  await db.workoutPlan.create({ data: { id: 'visual-workout', trainerId, clientId: memberId, name: 'Synthetic Strength Plan', description: 'Fixture plan description', exercises: { create: [{ id: 'visual-exercise', name: 'Synthetic Squat', sets: 3, reps: 10, weight: 20, notes: 'Fixture instruction' }] }, ...fixed } });
  await db.mealPlan.create({ data: { id: 'visual-meal', trainerId, clientId: memberId, name: 'Synthetic Balanced Menu', entries: { create: [{ id: 'visual-meal-entry', dayOfWeek: 1, mealType: 'Breakfast', foodItem: 'Synthetic oats and fruit', calories: 400, protein: 20, carbs: 55, fats: 10 }] }, ...fixed } });
  await db.bodyMetric.create({ data: { id: 'visual-metric', userId: memberId, dateRecorded: new Date(clock), weight: 70, bodyFat: 20, muscleMass: 30, notes: 'Synthetic measurement only' } });
  for (let i = 1; i <= 24; i++) await db.revenueRecord.create({ data: { id: `visual-revenue-${i}`, gymId: gymA, amount: i * 10, category: ['MEMBERSHIP', 'PT_SESSION', 'ADD_ON'][i % 3], date: new Date(`2026-10-${String(i).padStart(2, '0')}T09:00Z`), description: 'Synthetic operational value', ...fixed } });
  for (const [i, category] of ['RENT', 'UTILITIES', 'EQUIPMENT', 'MARKETING', 'SALARIES', 'MAINTENANCE', 'OTHER'].entries()) {
    await db.expenseRecord.create({ data: { id: `visual-expense-${i}`, gymId: gymA, amount: (i + 1) * 100, category, date: new Date('2026-10-10'), description: 'Synthetic expense description', isRecurring: i % 2 === 0, ...fixed } });
    await db.categoryBudget.create({ data: { id: `visual-budget-${i}`, gymId: gymA, category, amount: 350, month: new Date('2026-10-01'), ...fixed } });
  }
  await db.payRecord.create({ data: { id: 'visual-pay', trainerId, payPeriodId: `${gymA}-period`, sessionId: 'visual-session-02', amount: 25, description: 'Synthetic completed session pay', ...fixed } });
  for (let i = 0; i < 28; i++) await db.payRecord.create({ data: { id: `visual-pay-extra-${i}`, trainerId, payPeriodId: `${gymA}-period`, amount: 20, description: 'Synthetic commission fallback', ...fixed } });
  for (const actor of [roles.owner, roles.trainer, roles.member]) await db.notification.create({ data: { id: `visual-notice-${actor.id}`, recipientId: actor.id, type: 'SESSION_BOOKED', title: 'Synthetic session booked', message: 'Reference fixture notification', linkUrl: '/owner/sessions', createdAt: new Date(clock) } });
  return { db, password };
}
