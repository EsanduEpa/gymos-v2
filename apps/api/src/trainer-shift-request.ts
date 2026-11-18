import { UnprocessableEntityException } from '@nestjs/common';
import { pendingTrainerShiftSchema } from '@gymos/contracts';

export function shiftIsValid({ start, end, overnight }: { start: string; end: string; overnight: boolean }) {
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const difference = minutes(end) - minutes(start);
  const duration = (difference + 1440) % 1440;
  if (overnight !== (difference <= 0) || duration < 15 || duration > 960) {
    throw new UnprocessableEntityException('Shift duration must be 15 to 960 minutes and overnight must match the entered times');
  }
}

export function pendingTrainerShift(row: { id: string; start: string; end: string; overnight: boolean; submittedAt: Date } | null) {
  return row ? pendingTrainerShiftSchema.parse({ id: row.id, start: row.start, end: row.end, overnight: row.overnight, submittedAt: row.submittedAt.toISOString() }) : null;
}
