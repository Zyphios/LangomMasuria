import { Router } from 'express';
import { BookingStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../index';
import { validate } from '../middleware/validate';
import { calculateTotalPrice, assertDatesAvailable, assertMinimumStay } from '../services/availability';
import { generateBookingReference } from '../services/bookingReference';
import { sendOwnerBookingEmail } from '../services/email';

const bookingSchema = z.object({
  guestName: z.string().min(1),
  guestEmail: z.string().email(),
  guestPhone: z.string().min(1),
  checkIn: z.string().date(),
  checkOut: z.string().date(),
  guestsCount: z.number().int().min(1).max(8),
  notes: z.string().optional(),
  locale: z.enum(['pl', 'en']).default('pl')
});

export const bookingsRouter = Router();
bookingsRouter.post('/', validate(bookingSchema), async (req, res, next) => {
  try {
    const payload = bookingSchema.parse(req.body);
    const checkIn = new Date(payload.checkIn);
    const checkOut = new Date(payload.checkOut);
    assertMinimumStay(checkIn, checkOut);
    await assertDatesAvailable(prisma, checkIn, checkOut);
    const totalPrice = await calculateTotalPrice(prisma, checkIn, checkOut);

    // The reference includes a random suffix, so a collision is extremely unlikely; retry a
    // few times with a freshly generated one instead of failing the whole booking on a clash.
    let booking;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const reference = generateBookingReference(payload.guestEmail);
      try {
        booking = await prisma.booking.create({
          data: { ...payload, checkIn, checkOut, totalPrice, reference, status: BookingStatus.PENDING }
        });
        break;
      } catch (error) {
        const isDuplicateReference = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
        if (!isDuplicateReference || attempt === 4) throw error;
      }
    }

    await sendOwnerBookingEmail(booking!);
    res.status(201).json({ id: booking!.id, reference: booking!.reference, status: booking!.status, totalPrice: booking!.totalPrice.toNumber() });
  } catch (error) {
    if (error instanceof Error) return res.status(400).json({ message: error.message });
    next(error);
  }
});

