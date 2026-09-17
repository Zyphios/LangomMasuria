-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "reference" TEXT;

-- Backfill any pre-existing rows with a placeholder reference before enforcing NOT NULL/UNIQUE
UPDATE "Booking" SET "reference" = 'LM-LEGACY-' || substr(id, 1, 8) WHERE "reference" IS NULL;

ALTER TABLE "Booking" ALTER COLUMN "reference" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_reference_key" ON "Booking"("reference");
