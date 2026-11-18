CREATE TABLE "GymosSubscriptionOrder" (
    "id" UUID PRIMARY KEY,
    "gymId" TEXT NOT NULL REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "ownerIdentityId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "tier" TEXT NOT NULL CHECK ("tier" IN ('STARTER', 'GROWTH', 'PRO')),
    "amount" DECIMAL(19,4) NOT NULL CHECK ("amount" > 0),
    "merchantId" TEXT NOT NULL,
    "providerSubscriptionId" TEXT,
    "paidThrough" TIMESTAMPTZ(3),
    "stoppedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "GymosSubscriptionOrder_gymId_idempotencyKey_key" ON "GymosSubscriptionOrder"("gymId", "idempotencyKey");
CREATE UNIQUE INDEX "GymosSubscriptionOrder_providerSubscriptionId_key" ON "GymosSubscriptionOrder"("providerSubscriptionId");
CREATE UNIQUE INDEX "GymosSubscriptionOrder_one_current" ON "GymosSubscriptionOrder"("gymId") WHERE "stoppedAt" IS NULL;
CREATE INDEX "GymosSubscriptionOrder_gymId_createdAt_idx" ON "GymosSubscriptionOrder"("gymId", "createdAt");

CREATE TABLE "GymosSubscriptionPayment" (
    "paymentId" TEXT PRIMARY KEY,
    "orderId" UUID NOT NULL REFERENCES "GymosSubscriptionOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "verifiedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
