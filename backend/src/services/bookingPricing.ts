import { Prisma, PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { BookingOperationError, withBookingTransaction } from './bookingTransaction';

const twoDecimals = (value: number) => new Prisma.Decimal(value).decimalPlaces() <= 2;
export const bookingPriceSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('amount'),
    totalPrice: z.number().finite().min(0).max(99999999.99).refine(twoDecimals, 'Use at most two decimal places')
  }).strict(),
  z.object({
    mode: z.literal('discount'),
    discountPercent: z.number().finite().min(0).max(100).refine(twoDecimals, 'Use at most two decimal places')
  }).strict()
]);

export const updateBookingPrice = (db: PrismaClient, id: string, input: z.infer<typeof bookingPriceSchema>) =>
  withBookingTransaction(db, async (tx, now) => {
    const booking = await tx.booking.findUnique({ where: { id } });
    if (!booking) throw new BookingOperationError(404, 'BOOKING_NOT_FOUND');
    if (booking.status !== 'PENDING' || !booking.expiresAt || booking.expiresAt <= now) {
      throw new BookingOperationError(409, 'BOOKING_PRICE_NOT_EDITABLE');
    }
    const originalTotalPrice = booking.originalTotalPrice ?? booking.totalPrice;
    const discountPercent = input.mode === 'discount' ? new Prisma.Decimal(input.discountPercent) : null;
    const totalPrice = input.mode === 'amount'
      ? new Prisma.Decimal(input.totalPrice)
      : originalTotalPrice.mul(new Prisma.Decimal(100).minus(input.discountPercent)).div(100)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const updated = await tx.booking.update({ where: { id }, data: { originalTotalPrice, totalPrice, discountPercent } });
    return {
      totalPrice: updated.totalPrice.toString(), originalTotalPrice: originalTotalPrice.toString(),
      discountPercent: updated.discountPercent?.toString() ?? null
    };
  });
