import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import {
  bodyReadingSchema, dailyNutritionSchema, fitnessGoalSchema, soloWorkoutSchema, trainingJournalQuerySchema,
  trainingJournalResultSchema, trainingJournalSchema, trainingJournalWriteSchema,
  type FitnessGoal,
} from '@gymos/contracts';
import type { MemberJournalEntry, Prisma } from '../generated/tenant/client.js';
import { addLocalDays, asDate, dateString } from '../membership-rules.js';
import { requestDigest } from '../operations/primitives.js';
import { openCoachingRecord, sealCoachingRecord } from './coaching-records-crypto.js';

function binding(gymId: string, row: Pick<MemberJournalEntry, 'memberId' | 'kind' | 'entryKey' | 'recordedOn'>) {
  return ['journal', gymId, row.memberId, row.kind, row.entryKey, dateString(row.recordedOn)];
}

export async function writeJournal(tx: Prisma.TransactionClient, gymId: string, memberId: string, today: string, input: unknown) {
  const parsed = trainingJournalWriteSchema.safeParse(input);
  if (!parsed.success) throw new UnprocessableEntityException('Check the journal values and try again');
  const entry = parsed.data;
  const date = entry.kind === 'GOAL' ? today : entry.data.date;
  if (date > today) throw new UnprocessableEntityException('Journal entries cannot be dated in the future');
  const key = {
    memberId, kind: entry.kind,
    entryKey: entry.kind === 'GOAL' ? entry.data.type : entry.kind === 'SOLO' ? entry.id : date,
  };
  const schema = entry.kind === 'GOAL' ? fitnessGoalSchema : entry.kind === 'SOLO' ? soloWorkoutSchema : dailyNutritionSchema;
  const lock = JSON.stringify([key.memberId, key.kind, key.entryKey]);
  await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${'journal:' + lock}, 0))`;
  const where = { memberId_kind_entryKey: key };
  const previous = await tx.memberJournalEntry.findUnique({ where });
  if (previous && requestDigest(openCoachingRecord(previous.encryptedData, binding(gymId, previous), schema)) === requestDigest(entry.data)) {
    return trainingJournalResultSchema.parse({ version: previous.version });
  }
  if ((previous?.version ?? null) !== entry.expectedVersion) {
    throw new ConflictException('This entry changed. Reload the journal before saving');
  }

  const record = { ...key, recordedOn: asDate(date) };
  const encryptedData = sealCoachingRecord(entry.data, binding(gymId, record));
  const saved = previous
    ? await tx.memberJournalEntry.update({ where, data: { recordedOn: record.recordedOn, encryptedData, version: { increment: 1 } } })
    : await tx.memberJournalEntry.create({ data: { ...record, encryptedData } });
  return trainingJournalResultSchema.parse({ version: saved.version });
}

type Week = { startingOn: string; endingBefore: string };
function readSolo(gymId: string, row: MemberJournalEntry) {
  return { id: row.entryKey, data: openCoachingRecord(row.encryptedData, binding(gymId, row), soloWorkoutSchema), version: row.version };
}

async function goalProgress(tx: Prisma.TransactionClient, gymId: string, memberId: string, today: string, timeZone: string, rows: MemberJournalEntry[]) {
  if (!rows.length) return [];
  const goals = rows.map(row => ({ version: row.version, data: openCoachingRecord(row.encryptedData, binding(gymId, row), fitnessGoalSchema) }));
  const weekStart = addLocalDays(today, -((asDate(today).getUTCDay() + 6) % 7));
  const weeks = Array.from({ length: 8 }, (_, i): Week => ({
    startingOn: addLocalDays(weekStart, (i - 7) * 7), endingBefore: addLocalDays(weekStart, (i - 6) * 7),
  }));
  const from = weeks[0]!.startingOn;
  const [measurements, workoutRows, sessionDays] = await Promise.all([
    goals.some(goal => goal.data.type === 'WEIGHT') ? tx.memberBodyMeasurement.findMany({
      where: { memberId, measuredOn: { gte: asDate(from), lte: asDate(today) } }, orderBy: { measuredOn: 'asc' },
    }) : [],
    goals.some(goal => goal.data.type !== 'WEIGHT') ? tx.memberJournalEntry.findMany({
      where: { memberId, kind: 'SOLO', recordedOn: { gte: asDate(from), lte: asDate(today) } },
    }) : [],
    goals.some(goal => goal.data.type === 'SESSIONS') ? tx.$queryRaw<{ date: string; count: number }[]>`
      SELECT (("endedAt" AT TIME ZONE ${timeZone})::date)::text AS date, count(*)::int AS count
      FROM "PTSession" WHERE "memberId" = ${memberId} AND state = 'COMPLETED'
        AND "endedAt" >= (${from}::date::timestamp AT TIME ZONE ${timeZone})
        AND "endedAt" < (${addLocalDays(today, 1)}::date::timestamp AT TIME ZONE ${timeZone})
      GROUP BY 1` : [],
  ]);

  const weight = measurements.flatMap(row => {
    const date = dateString(row.measuredOn);
    const reading = openCoachingRecord(row.encryptedData, ['measurement', gymId, memberId, date], bodyReadingSchema);
    return reading.weightKg === null ? [] : [{ date, weight: Number(reading.weightKg) }];
  });
  const workouts = workoutRows.map(row => readSolo(gymId, row).data);
  const inside = (date: string, week: Week) => date >= week.startingOn && date < week.endingBefore;
  const exerciseName = (value: string) => value.toLocaleLowerCase('en');
  function actual(goal: FitnessGoal, week: Week) {
    if (goal.type === 'WEIGHT') return weight.findLast(reading => inside(reading.date, week))?.weight ?? null;
    const solo = workouts.filter(workout => inside(workout.date, week));
    if (goal.type === 'SESSIONS') {
      return solo.length + sessionDays.reduce((sum, item) => sum + (inside(item.date, week) ? item.count : 0), 0);
    }
    let best: number | null = null;
    for (const { exercises } of solo) {
      for (const exercise of exercises) {
        if (exerciseName(exercise.name) === exerciseName(goal.exercise) && exercise.weightKg !== null) {
          best = best === null ? exercise.weightKg : Math.max(best, exercise.weightKg);
        }
      }
    }
    return best;
  }

  return goals.map(goal => {
    const history = weeks.map(week => ({ startingOn: week.startingOn, value: actual(goal.data, week) }));
    const current = goal.data.type === 'SESSIONS' ? history.at(-1)!.value : history.findLast(item => item.value !== null)?.value ?? null;
    return { ...goal, weeks: history, current };
  });
}

export async function readJournal(tx: Prisma.TransactionClient, gymId: string, memberId: string, today: string, timeZone: string, input: unknown) {
  const parsed = trainingJournalQuerySchema.safeParse(input);
  if (!parsed.success) throw new UnprocessableEntityException('Enter a valid journal date or page');
  const { date = today, workout, workoutPage, foodPage } = parsed.data;
  if (date > today) throw new UnprocessableEntityException('Journal entries cannot be dated in the future');
  const rowOrder = [{ recordedOn: 'desc' }, { entryKey: 'desc' }] as const;
  const page = (kind: string, number: number) => tx.memberJournalEntry.findMany({
    where: { memberId, kind },
    orderBy: [...rowOrder], skip: (number - 1) * 10, take: 11,
  });
  const [goalRows, solo, food, selectedWorkout, selectedFood] = await Promise.all([
    tx.memberJournalEntry.findMany({ where: { memberId, kind: 'GOAL' }, orderBy: { entryKey: 'asc' } }),
    page('SOLO', workoutPage), page('FOOD', foodPage),
    workout ? tx.memberJournalEntry.findUnique({ where: { memberId_kind_entryKey: { memberId, kind: 'SOLO', entryKey: workout } } }) : null,
    tx.memberJournalEntry.findUnique({ where: { memberId_kind_entryKey: { memberId, kind: 'FOOD', entryKey: date } } }),
  ]);
  const readFood = (row: MemberJournalEntry) => ({
    data: openCoachingRecord(row.encryptedData, binding(gymId, row), dailyNutritionSchema), version: row.version,
  });
  return trainingJournalSchema.parse({
    today, timeZone, date,
    goals: await goalProgress(tx, gymId, memberId, today, timeZone, goalRows),
    solo: solo.slice(0, 10).map(row => readSolo(gymId, row)),
    food: food.slice(0, 10).map(readFood),
    selectedWorkout: selectedWorkout ? readSolo(gymId, selectedWorkout) : null,
    selectedFood: selectedFood ? readFood(selectedFood) : null,
    moreWorkouts: solo.length > 10, moreFood: food.length > 10,
  });
}
