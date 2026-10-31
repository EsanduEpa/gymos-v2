import { addLocalDays, deriveMembershipEligibility, gymLocalDate } from './membership-rules.js';

const term = { id: 'term_1', startDate: '2024-02-28', endDateExclusive: '2024-03-01', agreedPrice: '0.00', currency: 'LKR', planNameSnapshot: 'Zero' };

describe('membership date rules', () => {
  it('uses an inclusive start and exclusive end, including zero price', () => {
    expect(deriveMembershipEligibility({ memberId: 'm1', memberStatus: 'ACTIVE', version: 4, asOfLocalDate: '2024-02-28', terms: [term] }))
      .toMatchObject({ status: 'ACTIVE', eligible: true, term: { agreedPrice: '0.00' } });
    expect(deriveMembershipEligibility({ memberId: 'm1', memberStatus: 'ACTIVE', version: 4, asOfLocalDate: '2024-03-01', terms: [term] }))
      .toMatchObject({ status: 'EXPIRED', eligible: false });
  });

  it('keeps the original end date during suspension and picks the next future term', () => {
    const suspended = deriveMembershipEligibility({ memberId: 'm1', memberStatus: 'SUSPENDED', version: 5, asOfLocalDate: '2024-02-29', terms: [term] });
    expect(suspended).toMatchObject({ status: 'SUSPENDED', eligible: false, term: { endDateExclusive: '2024-03-01' } });
    const future = { ...term, id: 'term_2', startDate: '2024-04-01', endDateExclusive: '2024-05-01' };
    expect(deriveMembershipEligibility({ memberId: 'm1', memberStatus: 'ACTIVE', version: 6, asOfLocalDate: '2024-03-01', terms: [future, { ...future, id: 'term_3', startDate: '2024-06-01' }] }))
      .toMatchObject({ status: 'NOT_STARTED', term: { id: 'term_2' } });
    expect(deriveMembershipEligibility({ memberId: 'm1', memberStatus: 'INACTIVE', version: 6, asOfLocalDate: '2024-02-29', terms: [term] }))
      .toMatchObject({ status: 'INACTIVE', eligible: false, reason: 'MEMBER_INACTIVE' });
  });

  it('derives gym-local dates through DST and advances leap days as calendar dates', () => {
    expect(gymLocalDate('America/New_York', new Date('2024-03-10T04:59:00.000Z'))).toBe('2024-03-09');
    expect(gymLocalDate('America/New_York', new Date('2024-03-10T05:01:00.000Z'))).toBe('2024-03-10');
    expect(addLocalDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addLocalDays('2024-02-29', 1)).toBe('2024-03-01');
  });
});
