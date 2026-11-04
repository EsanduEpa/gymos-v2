CREATE TYPE "ExpenseCategory" AS ENUM ('RENT','UTILITIES','EQUIPMENT','MARKETING','SALARIES','MAINTENANCE','OTHER');

CREATE TABLE "ExpenseRecord" (
  "id" TEXT NOT NULL,
  "category" "ExpenseCategory" NOT NULL,
  "amount" DECIMAL(19,4) NOT NULL,
  "currency" TEXT NOT NULL,
  "accountingDate" DATE NOT NULL,
  "description" TEXT,
  "recurring" BOOLEAN NOT NULL DEFAULT false,
  "version" INTEGER NOT NULL DEFAULT 0,
  "commandReceiptId" TEXT NOT NULL,
  "createdByIdentityId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "ExpenseRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ExpenseRecord_amount_check" CHECK ("amount" >= 0 AND "amount" < 1000000000000000),
  CONSTRAINT "ExpenseRecord_currency_check" CHECK ("currency" IN ('LKR','USD')),
  CONSTRAINT "ExpenseRecord_description_check" CHECK ("description" IS NULL OR length("description") <= 500),
  CONSTRAINT "ExpenseRecord_version_check" CHECK ("version" >= 0),
  CONSTRAINT "ExpenseRecord_identity_check" CHECK (length("createdByIdentityId") BETWEEN 1 AND 128)
);
CREATE UNIQUE INDEX "ExpenseRecord_commandReceiptId_key" ON "ExpenseRecord"("commandReceiptId");
CREATE INDEX "ExpenseRecord_accountingDate_category_id_idx" ON "ExpenseRecord"("accountingDate","category","id");
CREATE INDEX "ExpenseRecord_category_accountingDate_id_idx" ON "ExpenseRecord"("category","accountingDate","id");
ALTER TABLE "ExpenseRecord" ADD CONSTRAINT "ExpenseRecord_commandReceiptId_fkey"
  FOREIGN KEY ("commandReceiptId") REFERENCES "CommandReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CategoryBudget" (
  "id" TEXT NOT NULL,
  "category" "ExpenseCategory" NOT NULL,
  "month" DATE NOT NULL,
  "amount" DECIMAL(19,4) NOT NULL,
  "currency" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0,
  "commandReceiptId" TEXT NOT NULL,
  "actorIdentityId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "CategoryBudget_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CategoryBudget_month_check" CHECK (EXTRACT(DAY FROM "month") = 1),
  CONSTRAINT "CategoryBudget_amount_check" CHECK ("amount" >= 0 AND "amount" < 1000000000000000),
  CONSTRAINT "CategoryBudget_currency_check" CHECK ("currency" IN ('LKR','USD')),
  CONSTRAINT "CategoryBudget_version_check" CHECK ("version" >= 0),
  CONSTRAINT "CategoryBudget_identity_check" CHECK (length("actorIdentityId") BETWEEN 1 AND 128)
);
CREATE UNIQUE INDEX "CategoryBudget_category_month_key" ON "CategoryBudget"("category","month");
CREATE UNIQUE INDEX "CategoryBudget_commandReceiptId_key" ON "CategoryBudget"("commandReceiptId");
CREATE INDEX "CategoryBudget_month_category_idx" ON "CategoryBudget"("month","category");
ALTER TABLE "CategoryBudget" ADD CONSTRAINT "CategoryBudget_commandReceiptId_fkey"
  FOREIGN KEY ("commandReceiptId") REFERENCES "CommandReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
