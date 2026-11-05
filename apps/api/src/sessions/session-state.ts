export type SessionState =
  | 'PENDING_CONFIRMATION'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'MISSED'
  | 'CANCELLED'
  | 'DECLINED'
  | 'EXPIRED';

export type SessionCommand =
  | 'OWNER_BOOK'
  | 'MEMBER_REQUEST'
  | 'TRAINER_ACCEPT'
  | 'TRAINER_DECLINE'
  | 'SYSTEM_EXPIRE_REQUEST'
  | 'MEMBER_WITHDRAW'
  | 'START'
  | 'COMPLETE'
  | 'NO_SHOW'
  | 'CANCEL'
  | 'LIFECYCLE_RELEASE'
  | 'UPDATE_NOTES';

export type SessionActorRole = 'OWNER' | 'TRAINER' | 'MEMBER' | 'SYSTEM';

export function requestExpiryInstant(createdAt: Date, scheduledStartAt: Date): Date {
  if (!Number.isFinite(createdAt.getTime()) || !Number.isFinite(scheduledStartAt.getTime()) || scheduledStartAt <= createdAt) throw new RangeError('Invalid request expiry inputs');
  return new Date(Math.min(createdAt.getTime() + 12 * 60 * 60_000, scheduledStartAt.getTime() - 60 * 60_000));
}

export function requestCanBeAccepted(now: Date, expiresAt: Date): boolean {
  return Number.isFinite(now.getTime()) && Number.isFinite(expiresAt.getTime()) && now < expiresAt;
}

const TRANSITIONS: Readonly<Record<SessionCommand, Readonly<{ from: readonly (SessionState | null)[]; roles: readonly SessionActorRole[]; to: SessionState | null }>>> = {
  OWNER_BOOK: { from: [null], roles: ['OWNER'], to: 'SCHEDULED' },
  MEMBER_REQUEST: { from: [null], roles: ['MEMBER'], to: 'PENDING_CONFIRMATION' },
  TRAINER_ACCEPT: { from: ['PENDING_CONFIRMATION'], roles: ['TRAINER'], to: 'SCHEDULED' },
  TRAINER_DECLINE: { from: ['PENDING_CONFIRMATION'], roles: ['TRAINER'], to: 'DECLINED' },
  SYSTEM_EXPIRE_REQUEST: { from: ['PENDING_CONFIRMATION'], roles: ['SYSTEM'], to: 'EXPIRED' },
  MEMBER_WITHDRAW: { from: ['PENDING_CONFIRMATION'], roles: ['MEMBER'], to: 'CANCELLED' },
  START: { from: ['SCHEDULED'], roles: ['TRAINER', 'OWNER'], to: 'ACTIVE' },
  COMPLETE: { from: ['ACTIVE'], roles: ['TRAINER', 'OWNER'], to: 'COMPLETED' },
  NO_SHOW: { from: ['SCHEDULED'], roles: ['TRAINER', 'OWNER'], to: 'MISSED' },
  CANCEL: { from: ['SCHEDULED'], roles: ['MEMBER', 'TRAINER', 'OWNER'], to: 'CANCELLED' },
  LIFECYCLE_RELEASE: { from: ['PENDING_CONFIRMATION', 'SCHEDULED'], roles: ['SYSTEM'], to: 'CANCELLED' },
  UPDATE_NOTES: { from: ['COMPLETED'], roles: ['TRAINER', 'OWNER'], to: 'COMPLETED' },
};

/** Command-specific state machine. There is deliberately no arbitrary status setter. */
export function transitionSession(input: {
  state: SessionState | null;
  command: SessionCommand;
  actorRole: SessionActorRole;
}): SessionState | null {
  const transition = TRANSITIONS[input.command];
  if (!transition.roles.includes(input.actorRole) || !transition.from.includes(input.state)) return null;
  return transition.to;
}

/** Half-open interval intersection: sessions touching at an endpoint do not collide. */
export function sessionIntervalsOverlap(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  if (!Number.isFinite(a.start) || !Number.isFinite(a.end) || !Number.isFinite(b.start) || !Number.isFinite(b.end)
    || a.end <= a.start || b.end <= b.start) throw new RangeError('Invalid session interval');
  return a.start < b.end && b.start < a.end;
}

export type PackCreditBalance = { available: number; held: number; consumed: number; expired: number };
export type PackCreditMovement = Pick<PackCreditBalance, 'available' | 'held' | 'consumed' | 'expired'>;

/** DEC-06 quotient/remainder allocation; ordinals are one-based and immutable. */
export function allocatedPackCreditMinorUnits(input: { baseMinorUnits: bigint; remainderMinorUnits: number; issuedCredits: number; ordinal: number }): bigint {
  if (input.baseMinorUnits < 0n || !Number.isSafeInteger(input.remainderMinorUnits) || input.remainderMinorUnits < 0
    || !Number.isSafeInteger(input.issuedCredits) || input.issuedCredits < 1 || input.remainderMinorUnits >= input.issuedCredits
    || !Number.isSafeInteger(input.ordinal) || input.ordinal < 1 || input.ordinal > input.issuedCredits) {
    throw new RangeError('Invalid pack credit allocation');
  }
  return input.baseMinorUnits + (input.ordinal <= input.remainderMinorUnits ? 1n : 0n);
}

export function minorUnitsDecimal(value: bigint, scale = 2): string {
  if (value < 0n || !Number.isSafeInteger(scale) || scale < 0 || scale > 4) throw new RangeError('Invalid minor-unit amount');
  if (scale === 0) return value.toString();
  const divisor = 10n ** BigInt(scale);
  return `${value / divisor}.${(value % divisor).toString().padStart(scale, '0')}`;
}

export function decimalToMinorUnits(value: string, scale = 2): bigint {
  if (!Number.isSafeInteger(scale) || scale < 0 || scale > 4 || !/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(value)) {
    throw new RangeError('Invalid exact monetary amount');
  }
  const [whole, fraction = ''] = value.split('.');
  if (fraction.length > scale) throw new RangeError('Amount exceeds currency minor-unit precision');
  return BigInt(whole!) * (10n ** BigInt(scale)) + BigInt(fraction.padEnd(scale, '0') || '0');
}

/** Validate movement conservation before returning a derived immutable projection. */
export function derivePackCreditBalance(issuedCredits: number, movements: readonly PackCreditMovement[]): PackCreditBalance {
  if (!Number.isSafeInteger(issuedCredits) || issuedCredits < 0) throw new RangeError('Invalid issued credit count');
  const balance = movements.reduce((total, movement) => ({
    available: total.available + movement.available,
    held: total.held + movement.held,
    consumed: total.consumed + movement.consumed,
    expired: total.expired + movement.expired,
  }), { available: 0, held: 0, consumed: 0, expired: 0 });
  if (Object.values(balance).some(value => !Number.isSafeInteger(value) || value < 0)
    || balance.available + balance.held + balance.consumed + balance.expired !== issuedCredits) {
    throw new RangeError('Pack credit movements violate conservation');
  }
  return balance;
}

export type EligibleSessionPack = {
  id: string;
  startDate: string;
  endDateExclusive: string;
  createdAt: Date;
  availableCredits: number;
};

/** DEC-07 order: earliest covered expiry, then earliest purchase time, then stable ID. */
export function selectEligibleSessionPack(
  packs: readonly EligibleSessionPack[],
  gymLocalDate: string,
  explicitPackId?: string,
): EligibleSessionPack | null {
  const parsedDate = new Date(`${gymLocalDate}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(gymLocalDate) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== gymLocalDate) {
    throw new RangeError('Invalid gym-local date');
  }
  const eligible = packs.filter(pack => pack.startDate <= gymLocalDate && gymLocalDate < pack.endDateExclusive && pack.availableCredits > 0);
  if (explicitPackId !== undefined) return eligible.find(pack => pack.id === explicitPackId) ?? null;
  return [...eligible].sort((a, b) => a.endDateExclusive.localeCompare(b.endDateExclusive)
    || a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))[0] ?? null;
}
