export function dateString(value: Date): string { return value.toISOString().slice(0, 10); }
export function asDate(value: string): Date { return new Date(`${value}T00:00:00.000Z`); }
export function addLocalDays(value: string, count: number): string {
  const date = asDate(value); date.setUTCDate(date.getUTCDate() + count); return dateString(date);
}
export function gymLocalDate(timeZone: string, at = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export type MembershipEligibilityInput = {
  memberId: string;
  memberStatus: string;
  version: number;
  asOfLocalDate: string;
  terms: Array<{ id: string; startDate: string; endDateExclusive: string; agreedPrice: string; currency: string; planNameSnapshot: string }>;
};
export function deriveMembershipEligibility(input: MembershipEligibilityInput) {
  const active = input.terms.find(term => term.startDate <= input.asOfLocalDate && input.asOfLocalDate < term.endDateExclusive);
  const future = input.terms.filter(term => term.startDate > input.asOfLocalDate).sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  const latestPast = input.terms.filter(term => term.endDateExclusive <= input.asOfLocalDate).sort((a, b) => b.endDateExclusive.localeCompare(a.endDateExclusive))[0];
  const selected = active ?? future ?? latestPast;
  const suspended = input.memberStatus === 'SUSPENDED';
  const inactive = input.memberStatus === 'INACTIVE';
  const status = active ? suspended ? 'SUSPENDED' : inactive ? 'INACTIVE' : 'ACTIVE' : future ? 'NOT_STARTED' : latestPast ? 'EXPIRED' : 'NONE';
  const reason = active ? suspended ? 'MEMBER_SUSPENDED' : inactive ? 'MEMBER_INACTIVE' : 'ACTIVE_TERM' : future ? 'FUTURE_TERM' : latestPast ? 'EXPIRED_TERM' : 'NO_TERM';
  return {
    memberId: input.memberId, status, eligible: status === 'ACTIVE', reason, asOfLocalDate: input.asOfLocalDate,
    term: selected ? { id: selected.id, startDate: selected.startDate, endDateExclusive: selected.endDateExclusive,
      agreedPrice: selected.agreedPrice, currency: selected.currency, planName: selected.planNameSnapshot } : null,
    version: input.version,
  };
}
