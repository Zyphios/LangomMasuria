import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { validate } from '../middleware/validate';
import { createWebsiteBooking } from '../services/bookingVerification';
import { sendOwnerBookingEmail } from '../services/email';
import { publicBooking } from '../services/bookingLifecycle';

const bookingSchema = z.object({
  guestName: z.string().trim().min(1).max(200),
  guestEmail: z.string().trim().email().max(254),
  guestPhone: z.string().trim().min(1).max(50),
  checkIn: z.string().date(), checkOut: z.string().date(),
  guestsCount: z.number().int().min(1).max(8), notes: z.string().max(4000).optional(),
  locale: z.enum(['pl', 'en']).default('pl')
});

export const bookingsRouter = Router();
bookingsRouter.post('/', validate(bookingSchema), async (req, res, next) => {
  try {
    const input = bookingSchema.parse(req.body);
    const { booking, ownerToken } = await createWebsiteBooking(prisma, input, req.ip || req.socket.remoteAddress || 'unknown');
    await sendOwnerBookingEmail(booking, ownerToken);
    res.status(201).json(publicBooking(booking));
  } catch (error) { next(error); }
});
