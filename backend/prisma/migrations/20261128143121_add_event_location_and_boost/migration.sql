-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "boostedUntil" TIMESTAMP(3),
ADD COLUMN     "city" VARCHAR(120),
ADD COLUMN     "country" VARCHAR(120),
ADD COLUMN     "isBoosted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "state" VARCHAR(120);

-- CreateIndex
CREATE INDEX "Event_isBoosted_startAt_idx" ON "Event"("isBoosted", "startAt");
