import { UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '../generated/tenant/client.js';

type DecimalValue = { toString(): string };
type PaySettings = { level1SessionPay: DecimalValue; level2SessionPay: DecimalValue; offShiftPremium: DecimalValue };
type Trainer = { level: 'LEVEL_1' | 'LEVEL_2' | null; sessionPayOverride: DecimalValue | null };

export function trainerPayForConfirmation(settings: PaySettings, trainer: Trainer, coveredByShift: boolean) {
  const base = new Prisma.Decimal((trainer.sessionPayOverride ?? (trainer.level === 'LEVEL_2' ? settings.level2SessionPay : settings.level1SessionPay)).toString());
  const pay = coveredByShift ? base : base.times(new Prisma.Decimal(settings.offShiftPremium.toString()).plus(1)).toDecimalPlaces(2);
  if (pay.gt('999999999999999.99')) throw new UnprocessableEntityException('Trainer pay exceeds the supported amount. Reduce the base amount or off-shift premium.');
  return pay.toString();
}

function payAmountMinor(creditMinor: bigint, rate: string) {
  const [whole = '0', fraction = ''] = rate.split('.');
  const rateMicro = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, '0') || '0');
  return (creditMinor * rateMicro + 500_000n) / 1_000_000n;
}

export function completedTrainerPayMinor(session: { confirmedTrainerPay?: DecimalValue | null; confirmationRate: DecimalValue }, legacyCreditMinor: bigint) {
  if (session.confirmedTrainerPay == null) return payAmountMinor(legacyCreditMinor, session.confirmationRate.toString());
  const [whole, fraction = ''] = session.confirmedTrainerPay.toString().split('.');
  return BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, '0'));
}
