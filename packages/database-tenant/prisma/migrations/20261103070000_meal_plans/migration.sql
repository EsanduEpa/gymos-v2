BEGIN;

CREATE TABLE "MealPlan" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "trainerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MealPlan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MealPlan_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MealPlan_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MealPlan_name_length_check" CHECK (char_length("name") BETWEEN 1 AND 120)
);
CREATE INDEX "MealPlan_memberId_createdAt_id_idx" ON "MealPlan"("memberId", "createdAt" DESC, "id" DESC);
CREATE INDEX "MealPlan_trainerId_createdAt_id_idx" ON "MealPlan"("trainerId", "createdAt" DESC, "id" DESC);

CREATE TABLE "MealPlanEntry" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "mealType" TEXT NOT NULL,
  "foodItem" TEXT NOT NULL,
  "calories" INTEGER,
  "proteinGrams" DECIMAL(7,2),
  "carbsGrams" DECIMAL(7,2),
  "fatsGrams" DECIMAL(7,2),
  CONSTRAINT "MealPlanEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MealPlanEntry_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MealPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MealPlanEntry_planId_sortOrder_key" UNIQUE ("planId", "sortOrder"),
  CONSTRAINT "MealPlanEntry_sortOrder_check" CHECK ("sortOrder" BETWEEN 0 AND 99),
  CONSTRAINT "MealPlanEntry_dayOfWeek_check" CHECK ("dayOfWeek" BETWEEN 1 AND 7),
  CONSTRAINT "MealPlanEntry_mealType_check" CHECK ("mealType" IN ('Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-Workout', 'Post-Workout')),
  CONSTRAINT "MealPlanEntry_foodItem_length_check" CHECK (char_length("foodItem") BETWEEN 1 AND 500),
  CONSTRAINT "MealPlanEntry_calories_check" CHECK ("calories" IS NULL OR "calories" BETWEEN 0 AND 100000),
  CONSTRAINT "MealPlanEntry_protein_check" CHECK ("proteinGrams" IS NULL OR "proteinGrams" BETWEEN 0 AND 10000),
  CONSTRAINT "MealPlanEntry_carbs_check" CHECK ("carbsGrams" IS NULL OR "carbsGrams" BETWEEN 0 AND 10000),
  CONSTRAINT "MealPlanEntry_fats_check" CHECK ("fatsGrams" IS NULL OR "fatsGrams" BETWEEN 0 AND 10000)
);
CREATE INDEX "MealPlanEntry_planId_sortOrder_idx" ON "MealPlanEntry"("planId", "sortOrder");

COMMIT;
