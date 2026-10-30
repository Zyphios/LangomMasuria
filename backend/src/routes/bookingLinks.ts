import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { completeBookingDecision, completeBookingVerification, limitBookingLinks,
  previewBookingDecision, previewBookingVerification } from '../services/bookingVerification';
import { publicBooking } from '../services/bookingLifecycle';
import { sendOwnerBookingEmail } from '../services/email';

const tokenSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) });
export const bookingLinksRouter = Router();
bookingLinksRouter.use(async (req, _res, next) => {
  try { await limitBookingLinks(prisma, req.ip || req.socket.remoteAddress || 'unknown'); next(); }
  catch (error) { next(error); }
});
bookingLinksRouter.post('/verification/preview', async (req, res, next) => {
  try { res.json(await previewBookingVerification(prisma, tokenSchema.parse(req.body).token)); }
  catch (error) { next(error); }
});
bookingLinksRouter.post('/verification/complete', async (req, res, next) => {
  try {
    const input = tokenSchema.extend({ expectedTotalPrice: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/) }).parse(req.body);
    const { booking, ownerToken } = await completeBookingVerification(prisma, input.token, input.expectedTotalPrice);
    await sendOwnerBookingEmail(booking, ownerToken);
    res.status(201).json(publicBooking(booking));
  } catch (error) { next(error); }
});
bookingLinksRouter.post('/decision/preview', async (req, res, next) => {
  try { res.json(await previewBookingDecision(prisma, tokenSchema.parse(req.body).token)); }
  catch (error) { next(error); }
});
bookingLinksRouter.post('/decision/complete', async (req, res, next) => {
  try {
    const input = tokenSchema.extend({ decision: z.enum(['CONFIRMED', 'CANCELLED']) }).parse(req.body);
    res.json(publicBooking(await completeBookingDecision(prisma, input.token, input.decision)));
  } catch (error) { next(error); }
});
