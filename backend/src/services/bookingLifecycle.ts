import { Prisma, PrismaClient, type Booking } from '@prisma/client';
import { assertDatesAvailable, calculateManualPrice, getNightCount } from './availability';
import { generateBookingReference } from './bookingReference';
import { BookingOperationError, withBookingTransaction } from './bookingTransaction';
import type { ManualBookingCreateInput } from '../types';

export const expirePendingBookings = async (db: Prisma.TransactionClient, now: Date) =>
  (await db.booking.updateMany({ where: { status: 'PENDING', expiresAt: { lte: now } }, data: { status: 'EXPIRED' } })).count;

export async function decideBooking(tx: Prisma.TransactionClient, id: string, status: 'CONFIRMED' | 'CANCELLED', now: Date): Promise<Booking> {
  const booking = await tx.booking.findUnique({ where: { id } });
  if (!booking) throw new BookingOperationError(404, 'BOOKING_NOT_FOUND');
  if (booking.status === status) return booking;
  if (status === 'CONFIRMED') {
    if (booking.status === 'EXPIRED' || (booking.status === 'PENDING' && (!booking.expiresAt || booking.expiresAt <= now))) {
      throw new BookingOperationError(409, 'BOOKING_EXPIRED');
    }
    if (booking.status !== 'PENDING') throw new BookingOperationError(409, 'BOOKING_ALREADY_DECIDED');
    await assertDatesAvailable(tx, booking.checkIn, booking.checkOut, { now, excludeBookingId: id });
    if (booking.guestEmail) await tx.confirmationEmail.upsert({ where: { bookingId: id }, create: { bookingId: id }, update: {} });
  } else {
    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) throw new BookingOperationError(409, 'BOOKING_ALREADY_DECIDED');
    await tx.confirmationEmail.updateMany({ where: { bookingId: id, status: { in: ['QUEUED', 'SENDING', 'FAILED'] } },
      data: { status: 'CANCELLED', leaseToken: null, leaseUntil: null } });
  }
  return tx.booking.update({ where: { id }, data: { status } });
}

export const changeBookingStatus = (db: PrismaClient, id: string, status: 'CONFIRMED' | 'CANCELLED') =>
  withBookingTransaction(db, (tx, now) => decideBooking(tx, id, status, now));

export const createManualBooking = (db: PrismaClient, input: ManualBookingCreateInput) =>
  withBookingTransaction(db, async (tx, now) => {
    const checkIn = new Date(input.checkIn);
    const checkOut = new Date(input.checkOut);
    await assertDatesAvailable(tx, checkIn, checkOut, { now });
    const totalPrice = calculateManualPrice(input.pricePerNight, getNightCount(checkIn, checkOut), input.discountPercent);
    return tx.booking.create({ data: {
      guestName: input.guestName, guestEmail: input.guestEmail?.trim().toLowerCase(), guestPhone: input.guestPhone,
      checkIn, checkOut, guestsCount: input.guestsCount, notes: input.notes,
      reference: generateBookingReference(input.guestEmail), totalPrice, originalTotalPrice: totalPrice,
      depositAmount: new Prisma.Decimal(input.depositAmount),
      status: 'CONFIRMED', source: 'MANUAL',
      ...(input.guestEmail ? { confirmationEmail: { create: {} } } : {})
    } });
  });

export function publicBooking(booking: Booking) {
  return { id: booking.id, reference: booking.reference, status: booking.status,
    totalPrice: booking.totalPrice.toNumber(), expiresAt: booking.expiresAt };
}
