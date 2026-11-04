export function allocateMembershipMinorUnits(totalMinorUnits: bigint, coveredDays: number, zeroBasedDayIndex: number): bigint {
  if (totalMinorUnits < 0n || !Number.isSafeInteger(coveredDays) || coveredDays < 1
    || !Number.isSafeInteger(zeroBasedDayIndex) || zeroBasedDayIndex < 0 || zeroBasedDayIndex >= coveredDays) {
    throw new RangeError('Invalid membership allocation input');
  }
  const days = BigInt(coveredDays);
  return totalMinorUnits / days + (BigInt(zeroBasedDayIndex) < totalMinorUnits % days ? 1n : 0n);
}

export function allocatePackCreditMinorUnits(baseMinorUnits: bigint, remainder: number, issuedCredits: number, ordinal: number): bigint {
  if (baseMinorUnits < 0n || !Number.isSafeInteger(issuedCredits) || issuedCredits < 1
    || !Number.isSafeInteger(remainder) || remainder < 0 || remainder >= issuedCredits
    || !Number.isSafeInteger(ordinal) || ordinal < 1 || ordinal > issuedCredits) throw new RangeError('Invalid pack allocation input');
  return baseMinorUnits + (ordinal <= remainder ? 1n : 0n);
}
