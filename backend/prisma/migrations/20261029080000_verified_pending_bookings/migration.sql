-- CreateEnum
CREATE TYPE "ConfirmationStatus" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "decisionTokenHash" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3);

UPDATE "Booking" SET "expiresAt" = "createdAt" + interval '24 hours'
WHERE status = 'PENDING';

ALTER TABLE "Booking" ADD CONSTRAINT "pending_deadline_required"
CHECK (status <> 'PENDING' OR "expiresAt" IS NOT NULL);

-- CreateTable
CREATE TABLE "ConfirmationEmail" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "status" "ConfirmationStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseUntil" TIMESTAMP(3),
    "leaseToken" TEXT,
    "sentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfirmationEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingVerification" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT NOT NULL,
    "guestPhone" TEXT NOT NULL,
    "checkIn" DATE NOT NULL,
    "checkOut" DATE NOT NULL,
    "guestsCount" INTEGER NOT NULL,
    "notes" TEXT,
    "locale" TEXT NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "bookingId" TEXT,

    CONSTRAINT "BookingVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingAbuseEvent" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "email" TEXT,
    "ipKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingAbuseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConfirmationEmail_bookingId_key" ON "ConfirmationEmail"("bookingId");

-- CreateIndex
CREATE INDEX "ConfirmationEmail_status_availableAt_idx" ON "ConfirmationEmail"("status", "availableAt");

-- CreateIndex
CREATE UNIQUE INDEX "BookingVerification_tokenHash_key" ON "BookingVerification"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "BookingVerification_bookingId_key" ON "BookingVerification"("bookingId");

-- CreateIndex
CREATE INDEX "BookingVerification_expiresAt_idx" ON "BookingVerification"("expiresAt");

-- CreateIndex
CREATE INDEX "BookingAbuseEvent_kind_email_createdAt_idx" ON "BookingAbuseEvent"("kind", "email", "createdAt");

-- CreateIndex
CREATE INDEX "BookingAbuseEvent_kind_ipKey_createdAt_idx" ON "BookingAbuseEvent"("kind", "ipKey", "createdAt");

-- CreateIndex
CREATE INDEX "BookingAbuseEvent_createdAt_idx" ON "BookingAbuseEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_decisionTokenHash_key" ON "Booking"("decisionTokenHash");

-- CreateIndex
CREATE INDEX "Booking_status_expiresAt_idx" ON "Booking"("status", "expiresAt");

-- AddForeignKey
ALTER TABLE "ConfirmationEmail" ADD CONSTRAINT "ConfirmationEmail_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingVerification" ADD CONSTRAINT "BookingVerification_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
