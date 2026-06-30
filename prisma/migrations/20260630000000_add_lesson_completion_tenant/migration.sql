-- Add tenantId to LessonCompletion for multi-tenant isolation.
-- Backfills existing rows from the related User's tenantId before enforcing NOT NULL.

-- Step 1: add nullable so backfill can run on non-empty databases
ALTER TABLE "LessonCompletion" ADD COLUMN "tenantId" TEXT;

-- Step 2: backfill from User (safe on empty db too)
UPDATE "LessonCompletion" lc
SET "tenantId" = u."tenantId"
FROM "User" u
WHERE lc."userId" = u."id";

-- Step 3: enforce NOT NULL now that every row has a value
ALTER TABLE "LessonCompletion" ALTER COLUMN "tenantId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "LessonCompletion_tenantId_idx" ON "LessonCompletion"("tenantId");

-- AddForeignKey
ALTER TABLE "LessonCompletion" ADD CONSTRAINT "LessonCompletion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
