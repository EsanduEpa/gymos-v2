import { z } from 'zod';

const journalDate = z.iso.date().refine(value => value >= '0001-01-01');
const shortNumber = (max: number) => z.number().min(0).max(max)
  .refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.00001);

export const fitnessGoalSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('WEIGHT'), target: shortNumber(700).positive() }),
  z.strictObject({ type: z.literal('STRENGTH'), target: shortNumber(1000).positive(), exercise: z.string().trim().min(1).max(120) }),
  z.strictObject({ type: z.literal('SESSIONS'), target: z.number().int().min(1).max(100) }),
]);

export const soloWorkoutSchema = z.strictObject({
  date: journalDate,
  durationMinutes: z.number().int().min(1).max(1440),
  notes: z.string().trim().max(4000),
  exercises: z.array(z.strictObject({ name: z.string().trim().min(1).max(120), weightKg: shortNumber(1000).nullable() })).min(1).max(50),
});

export const dailyNutritionSchema = z.strictObject({
  date: journalDate,
  calories: z.number().int().min(0).max(100_000),
  protein: shortNumber(10_000),
  carbs: shortNumber(10_000),
  fat: shortNumber(10_000),
});

const version = z.number().int().nonnegative().max(2_147_483_647);
export const trainingJournalWriteSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('GOAL'), expectedVersion: version.nullable(), data: fitnessGoalSchema }),
  z.strictObject({ kind: z.literal('SOLO'), expectedVersion: version.nullable(), id: z.uuid(), data: soloWorkoutSchema }),
  z.strictObject({ kind: z.literal('FOOD'), expectedVersion: version.nullable(), data: dailyNutritionSchema }),
]);

const page = z.string().regex(/^[1-9]\d{0,5}$/).transform(Number).default(1);
export const trainingJournalQuerySchema = z.strictObject({
  date: journalDate.optional(), workout: z.uuid().optional(), workoutPage: page, foodPage: page,
});

export const trainingJournalSchema = z.strictObject({
  today: journalDate,
  timeZone: z.string(),
  date: journalDate,
  goals: z.array(z.strictObject({
    data: fitnessGoalSchema, version,
    current: z.number().nonnegative().nullable(),
    weeks: z.array(z.strictObject({ startingOn: journalDate, value: z.number().nonnegative().nullable() })).length(8),
  })).max(3),
  solo: z.array(z.strictObject({ id: z.uuid(), data: soloWorkoutSchema, version })).max(10),
  food: z.array(z.strictObject({ data: dailyNutritionSchema, version })).max(10),
  selectedWorkout: z.strictObject({ id: z.uuid(), data: soloWorkoutSchema, version }).nullable(),
  selectedFood: z.strictObject({ data: dailyNutritionSchema, version }).nullable(),
  moreWorkouts: z.boolean(),
  moreFood: z.boolean(),
});

export const trainingJournalResultSchema = z.strictObject({ version });
export type FitnessGoal = z.infer<typeof fitnessGoalSchema>;
export type TrainingJournal = z.infer<typeof trainingJournalSchema>;
