import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { validate } from '../middleware/validate';
import { requestBookingVerification } from '../services/bookingVerification';
import { sendBookingVerificationEmail } from '../services/email';
import { BookingOperationError } from '../services/bookingTransaction';

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
    const link = await requestBookingVerification(prisma, input, req.ip || req.socket.remoteAddress || 'unknown');
    try {
      await sendBookingVerificationEmail(input, link.token, link.expiresAt);
    } catch {
      console.error('Booking verification delivery failed; SMTP did not confirm delivery.');
      throw new BookingOperationError(503, 'VERIFICATION_EMAIL_FAILED');
    }
    res.status(202).json({ status: 'EMAIL_VERIFICATION_REQUIRED', expiresAt: link.expiresAt });
  } catch (error) { next(error); }
});
