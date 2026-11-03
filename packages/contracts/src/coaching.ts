import { z } from 'zod';

const idSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_:-]+$/);
const instantSchema = z.iso.datetime({ offset: true });
const pageNumberSchema = z.union([z.number(), z.string().regex(/^[1-9][0-9]*$/)])
  .transform(value => typeof value === 'string' ? Number(value) : value)
  .pipe(z.number().int().min(1).max(1_000_000));
const pageSizeSchema = z.union([z.number(), z.string().regex(/^[1-9][0-9]*$/)])
  .transform(value => typeof value === 'string' ? Number(value) : value)
  .pipe(z.number().int().min(1).max(100));
const decimalString = (max: number, places: number) => z.string()
  .regex(new RegExp(`^(?:0|[1-9]\\d{0,${String(Math.floor(max)).length - 1}})(?:\\.\\d{1,${places}})?$`))
  .refine(value => Number(value) <= max);

export const trainerClientQuerySchema = z.strictObject({
  q: z.string().trim().min(1).max(100).optional(),
  page: pageNumberSchema.default(1),
  pageSize: pageSizeSchema.default(25),
  projection: z.enum(['summary', 'options']).default('summary'),
});

const latestClientSessionSchema = z.strictObject({
  id: idSchema,
  state: z.enum(['SCHEDULED', 'ACTIVE', 'COMPLETED']),
  scheduledStartAt: instantSchema,
  scheduledEndAt: instantSchema,
});
const trainerClientItemSchema = z.strictObject({
  id: idSchema,
  fullName: z.string().min(2).max(120),
  email: z.email().max(254).nullable(),
  phone: z.string().max(40).nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
  latestSession: latestClientSessionSchema.nullable(),
  usablePackBalance: z.strictObject({ available: z.number().int().nonnegative(), held: z.number().int().nonnegative() }).nullable(),
});

export const trainerClientPageSchema = z.strictObject({
  items: z.array(trainerClientItemSchema).max(100),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  totalCount: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  asOf: instantSchema,
  timeZone: z.string().min(1).max(100),
});

const profileSessionSchema = z.strictObject({
  id: idSchema,
  state: z.enum(['SCHEDULED', 'ACTIVE', 'COMPLETED']),
  scheduledStartAt: instantSchema,
  scheduledEndAt: instantSchema,
  notes: z.string().max(4000).nullable(),
});

export const workoutPlanViewSchema = z.strictObject({
  id: idSchema,
  name: z.string().min(1).max(120),
  description: z.string().max(4000).nullable(),
  createdAt: instantSchema,
  exercises: z.array(z.strictObject({
    id: idSchema,
    order: z.number().int().min(0).max(99),
    name: z.string().min(1).max(120),
    sets: z.number().int().min(1).max(100),
    reps: z.number().int().min(1).max(1000).nullable(),
    weightKg: decimalString(1000, 3).nullable(),
    durationMinutes: z.number().int().min(1).max(1440).nullable(),
    notes: z.string().max(4000).nullable(),
  })).max(100),
});
const mealTotalsSchema = z.strictObject({
  calories: z.number().int().min(0).max(10_000_000),
  proteinGrams: decimalString(1_000_000, 2).nullable(),
  carbsGrams: decimalString(1_000_000, 2).nullable(),
  fatsGrams: decimalString(1_000_000, 2).nullable(),
});
export const mealPlanViewSchema = z.strictObject({
  id: idSchema,
  name: z.string().min(1).max(120),
  createdAt: instantSchema,
  entries: z.array(z.strictObject({
    id: idSchema,
    dayOfWeek: z.number().int().min(1).max(7),
    mealType: z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-Workout', 'Post-Workout']),
    foodItem: z.string().min(1).max(500),
    calories: z.number().int().min(0).max(100_000).nullable(),
    proteinGrams: decimalString(10_000, 2).nullable(),
    carbsGrams: decimalString(10_000, 2).nullable(),
    fatsGrams: decimalString(10_000, 2).nullable(),
  })).max(100),
  totals: mealTotalsSchema,
});
const mealPlanEntryCreateSchema = z.strictObject({
  dayOfWeek: z.number().int().min(1).max(7),
  mealType: z.enum(['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-Workout', 'Post-Workout']),
  foodItem: z.string().trim().min(1).max(500),
  calories: z.number().int().min(0).max(100_000).nullable().optional(),
  proteinGrams: decimalString(10_000, 2).nullable().optional(),
  carbsGrams: decimalString(10_000, 2).nullable().optional(),
  fatsGrams: decimalString(10_000, 2).nullable().optional(),
});
export const mealPlanCreateSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  entries: z.array(mealPlanEntryCreateSchema).min(1).max(100),
});
export const memberMealPlanPageSchema = z.strictObject({
  items: z.array(mealPlanViewSchema).max(100),
  page: z.number().int().min(1), pageSize: z.number().int().min(1).max(100),
  totalCount: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative(), hasMore: z.boolean(),
  asOf: instantSchema, timeZone: z.string().min(1).max(100),
});
export const mealPlanCreateResultSchema = z.strictObject({ plan: mealPlanViewSchema, replayed: z.boolean() });
const planHistorySchema = <T extends z.ZodType>(plan: T) => z.strictObject({
  items: z.array(plan).max(2),
  limit: z.literal(2),
  totalCount: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});

const workoutExerciseCreateSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  sets: z.number().int().min(1).max(100),
  reps: z.number().int().min(1).max(1000).nullable().optional(),
  weightKg: decimalString(1000, 3).nullable().optional(),
  durationMinutes: z.number().int().min(1).max(1440).nullable().optional(),
  notes: z.string().nullable().optional().refine(value => value === undefined || value === null || Array.from(value).length <= 4000),
});
export const workoutPlanCreateSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  description: z.string().nullable().optional().refine(value => value === undefined || value === null || Array.from(value).length <= 4000),
  exercises: z.array(workoutExerciseCreateSchema).min(1).max(100),
});

export const memberWorkoutPlansQuerySchema = z.strictObject({ page: pageNumberSchema.default(1), pageSize: pageSizeSchema.default(25) });
export const memberWorkoutPlanPageSchema = z.strictObject({
  items: z.array(workoutPlanViewSchema).max(100),
  page: z.number().int().min(1), pageSize: z.number().int().min(1).max(100),
  totalCount: z.number().int().nonnegative(), totalPages: z.number().int().nonnegative(), hasMore: z.boolean(),
  asOf: instantSchema, timeZone: z.string().min(1).max(100),
});
export const workoutPlanCreateResultSchema = z.strictObject({ plan: workoutPlanViewSchema, replayed: z.boolean() });

export const trainerClientProfileSchema = z.strictObject({
  client: z.strictObject({
    id: idSchema,
    fullName: z.string().min(2).max(120),
    email: z.email().max(254).nullable(),
    phone: z.string().max(40).nullable(),
    dateOfBirth: z.iso.date().nullable(),
    emergencyContact: z.string().max(500).nullable(),
    healthNotes: z.string().max(4000).nullable(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
  }),
  packSummary: z.strictObject({ available: z.number().int().nonnegative(), held: z.number().int().nonnegative(), consumed: z.number().int().nonnegative(), expired: z.number().int().nonnegative() }),
  recentSessions: z.strictObject({ items: z.array(profileSessionSchema).max(10), limit: z.literal(10), totalCount: z.number().int().nonnegative(), hasMore: z.boolean() }),
  workouts: planHistorySchema(workoutPlanViewSchema),
  meals: planHistorySchema(mealPlanViewSchema),
  asOf: instantSchema,
  timeZone: z.string().min(1).max(100),
});

export type TrainerClientQuery = z.infer<typeof trainerClientQuerySchema>;
export type TrainerClientPage = z.infer<typeof trainerClientPageSchema>;
export type TrainerClientProfile = z.infer<typeof trainerClientProfileSchema>;
export type WorkoutPlanCreate = z.infer<typeof workoutPlanCreateSchema>;
export type MemberWorkoutPlansQuery = z.infer<typeof memberWorkoutPlansQuerySchema>;
export type MemberWorkoutPlanPage = z.infer<typeof memberWorkoutPlanPageSchema>;
export type MealPlanCreate = z.infer<typeof mealPlanCreateSchema>;
export type MealPlanView = z.infer<typeof mealPlanViewSchema>;
export type MemberMealPlanPage = z.infer<typeof memberMealPlanPageSchema>;
