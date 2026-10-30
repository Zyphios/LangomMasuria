ALTER TABLE "Booking"
ADD COLUMN "originalTotalPrice" DECIMAL(10,2),
ADD COLUMN "discountPercent" DECIMAL(5,2);

UPDATE "Booking" SET "originalTotalPrice" = "totalPrice";
