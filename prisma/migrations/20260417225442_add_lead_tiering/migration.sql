-- CreateEnum
CREATE TYPE "LeadTier" AS ENUM ('HOT', 'GOOD', 'MAYBE', 'SKIP');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "isTierLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tier" "LeadTier" NOT NULL DEFAULT 'MAYBE',
ADD COLUMN     "tierReason" TEXT;

-- CreateIndex
CREATE INDEX "Lead_tier_idx" ON "Lead"("tier");
