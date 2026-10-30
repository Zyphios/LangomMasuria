import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../index';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { assertDatesAvailable, isHolidaySeason } from '../services/availability';
import { createManualBooking, changeBookingStatus, publicBooking } from '../services/bookingLifecycle';
import { retryConfirmation } from '../services/confirmationQueue';
import { BookingOperationError, withBookingTransaction } from '../services/bookingTransaction';
import { bookingPriceSchema, updateBookingPrice } from '../services/bookingPricing';

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const bookingStatusSchema = z.object({ status: z.enum(['CONFIRMED', 'CANCELLED']) });
const readSchema = z.object({ isRead: z.boolean() });
const blockedDateSchema = z.object({ date: z.string().date(), reason: z.string().optional() });
const gallerySchema = z.object({ url: z.string().url(), captionPl: z.string().optional(), captionEn: z.string().optional(), sortOrder: z.number().int().default(0) });
const pricingSchema = z.object({
  namePl: z.string().min(1),
  nameEn: z.string().min(1),
  pricePerNight: z.number().finite().positive().max(99999999.99)
    .refine((value) => new Prisma.Decimal(value).decimalPlaces() <= 2, 'Use at most two decimal places'),
  dateFrom: z.string().date(),
  dateTo: z.string().date(),
  isFeatured: z.boolean()
}).refine((value) => value.dateFrom <= value.dateTo, { path: ['dateTo'], message: 'End date must not precede start date' });
const depositSchema = z.object({ depositAmount: z.number().min(0) });
const manualBookingSchema = z.object({
  guestName: z.string().min(1),
  guestEmail: z.string().email().optional().or(z.literal('')).transform((value) => (value ? value : undefined)),
  guestPhone: z.string().min(1),
  checkIn: z.string().date(),
  checkOut: z.string().date(),
  guestsCount: z.number().int().min(1).max(8),
  notes: z.string().optional(),
  pricePerNight: z.number().positive(),
  discountPercent: z.number().min(0).max(100),
  depositAmount: z.number().min(0)
});

export const adminRouter = Router();
adminRouter.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) return res.status(401).json({ message: 'Invalid credentials' });
  return res.json({ token: jwt.sign({ adminId: admin.id }, process.env.JWT_SECRET || 'change_me_in_production', { expiresIn: '12h' }) });
});
adminRouter.use(requireAuth as never);
adminRouter.get('/bookings', async (_req, res, next) => {
  try {
    const bookings = await prisma.booking.findMany({ orderBy: { createdAt: 'desc' }, include: { confirmationEmail: true } });
    res.json(bookings.map(({ decisionTokenHash: _secret, confirmationEmail, ...booking }) => ({
      ...booking,
      confirmation: confirmationEmail
        ? { kind: confirmationEmail.kind, status: confirmationEmail.status, attempts: confirmationEmail.attempts, sentAt: confirmationEmail.sentAt, lastError: confirmationEmail.lastError }
        : { status: ['PENDING', 'CONFIRMED', 'CANCELLED'].includes(booking.status) && booking.guestEmail ? 'NOT_RECORDED' : 'NOT_APPLICABLE', attempts: 0, sentAt: null, lastError: null }
    })));
  } catch (error) { next(error); }
});
adminRouter.post('/bookings/manual', validate(manualBookingSchema), async (req, res, next) => {
  try { res.status(201).json(publicBooking(await createManualBooking(prisma, manualBookingSchema.parse(req.body)))); }
  catch (error) { next(error); }
});
adminRouter.patch('/bookings/:id/deposit', validate(depositSchema), async (req, res, next) => {
  try {
    const booking = await prisma.booking.update({
      where: { id: req.params.id as string },
      data: { depositAmount: new Prisma.Decimal(depositSchema.parse(req.body).depositAmount) }
    });
    res.json({ depositAmount: booking.depositAmount.toString() });
  } catch (error) { next(error); }
});
adminRouter.patch('/bookings/:id/price', validate(bookingPriceSchema), async (req, res, next) => {
  try { res.json(await updateBookingPrice(prisma, req.params.id as string, bookingPriceSchema.parse(req.body))); }
  catch (error) { next(error); }
});
adminRouter.patch('/bookings/:id', validate(bookingStatusSchema), async (req, res, next) => {
  try { res.json(publicBooking(await changeBookingStatus(prisma, req.params.id as string, bookingStatusSchema.parse(req.body).status))); }
  catch (error) { next(error); }
});
adminRouter.post('/bookings/:id/confirmation/retry', async (req, res, next) => {
  try { await retryConfirmation(prisma, req.params.id as string); res.status(202).json({ status: 'QUEUED' }); }
  catch (error) { next(error); }
});
adminRouter.delete('/bookings/:id', async (req, res, next) => {
  try {
    await withBookingTransaction(prisma, (tx) => tx.booking.delete({ where: { id: req.params.id as string } }));
    res.sendStatus(204);
  } catch (error) { next(error); }
});
adminRouter.get('/messages', async (_req, res, next) => {
  try { res.json(await prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } })); }
  catch (error) { next(error); }
});
adminRouter.patch('/messages/:id', validate(readSchema), async (req, res, next) => {
  try {
    const message = await prisma.contactMessage.update({
      where: { id: req.params.id as string },
      data: { isRead: readSchema.parse(req.body).isRead }
    });
    res.json({ isRead: message.isRead });
  } catch (error) { next(error); }
});
adminRouter.get('/blocked-dates', async (req, res, next) => {
  try {
    const { month, year } = z.object({ month: z.coerce.number().int().min(1).max(12), year: z.coerce.number().int().min(2024).max(2100) }).parse(req.query);
    res.json(await prisma.blockedDate.findMany({ where: { date: { gte: new Date(Date.UTC(year, month - 1, 1)), lt: new Date(Date.UTC(year, month, 1)) } }, orderBy: { date: 'asc' } }));
  } catch (error) { next(error); }
});
adminRouter.post('/blocked-dates', validate(blockedDateSchema), async (req, res, next) => {
  try {
    const payload = blockedDateSchema.parse(req.body);
    const result = await withBookingTransaction(prisma, async (tx, now) => {
      const date = new Date(payload.date);
      await assertDatesAvailable(tx, date, new Date(date.getTime() + 86400000), { now });
      return tx.blockedDate.create({ data: { date, reason: payload.reason } });
    });
    res.status(201).json(result);
  } catch (error) { next(error); }
});
adminRouter.delete('/blocked-dates/:id', async (req, res, next) => {
  try { await withBookingTransaction(prisma, (tx) => tx.blockedDate.delete({ where: { id: req.params.id as string } })); res.sendStatus(204); }
  catch (error) { next(error); }
});
adminRouter.post('/gallery', validate(gallerySchema), async (req, res) => res.status(201).json(await prisma.galleryImage.create({ data: gallerySchema.parse(req.body) })));
adminRouter.delete('/gallery/:id', async (req, res) => { await prisma.galleryImage.delete({ where: { id: req.params.id as string } }); res.status(204).send(); });
adminRouter.patch('/pricing/:id', validate(pricingSchema), async (req, res, next) => {
  try {
    const payload = pricingSchema.parse(req.body);
    const id = req.params.id as string;
    const updated = await withBookingTransaction(prisma, async (tx) => {
      const seasons = await tx.pricingSeason.findMany();
      if (!seasons.some((season) => season.id === id)) throw new BookingOperationError(404, 'PRICING_NOT_FOUND');
      const dateFrom = new Date(payload.dateFrom);
      const dateTo = new Date(payload.dateTo);
      if (!isHolidaySeason(payload) && seasons.some((season) =>
        season.id !== id && !isHolidaySeason(season) && season.dateFrom <= dateTo && season.dateTo >= dateFrom
      )) throw new BookingOperationError(409, 'PRICING_OVERLAP');
      return tx.pricingSeason.update({
        where: { id },
        data: { ...payload, pricePerNight: new Prisma.Decimal(payload.pricePerNight), dateFrom, dateTo }
      });
    });
    res.json(updated);
  } catch (error) { next(error); }
});
