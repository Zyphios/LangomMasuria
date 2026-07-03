-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('WEBSITE', 'MANUAL');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "depositAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "source" "BookingSource" NOT NULL DEFAULT 'WEBSITE',
ALTER COLUMN "guestEmail" DROP NOT NULL;
