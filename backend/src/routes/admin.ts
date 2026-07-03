import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { BookingStatus, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../index';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { assertDatesAvailable, blockDatesForBooking, calculateManualPrice, getNightCount } from '../services/availability';
import { sendGuestConfirmationEmail } from '../services/email';
import type { ManualBookingCreateInput } from '../types';

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const bookingStatusSchema = z.object({ status: z.nativeEnum(BookingStatus) });
const readSchema = z.object({ isRead: z.boolean() });
const blockedDateSchema = z.object({ date: z.string().date(), reason: z.string().optional() });
const gallerySchema = z.object({ url: z.string().url(), captionPl: z.string().optional(), captionEn: z.string().optional(), sortOrder: z.number().int().default(0) });
const pricingSchema = z.object({ namePl: z.string().min(1), nameEn: z.string().min(1), pricePerNight: z.number().positive(), dateFrom: z.string().date(), dateTo: z.string().date(), isFeatured: z.boolean() });
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
adminRouter.get('/bookings', async (_req, res) => res.json(await prisma.booking.findMany({ orderBy: { createdAt: 'desc' } })));
adminRouter.post('/bookings/manual', validate(manualBookingSchema), async (req, res) => {
  try {
    const payload: ManualBookingCreateInput = manualBookingSchema.parse(req.body);
    const checkIn = new Date(payload.checkIn);
    const checkOut = new Date(payload.checkOut);
    await assertDatesAvailable(prisma, checkIn, checkOut);
    const nights = getNightCount(checkIn, checkOut);
    const totalPrice = calculateManualPrice(payload.pricePerNight, nights, payload.discountPercent);
    const booking = await prisma.booking.create({
      data: {
        guestName: payload.guestName,
        guestEmail: payload.guestEmail,
        guestPhone: payload.guestPhone,
        checkIn,
        checkOut,
        guestsCount: payload.guestsCount,
        notes: payload.notes,
        totalPrice,
        depositAmount: new Prisma.Decimal(payload.depositAmount),
        status: BookingStatus.CONFIRMED,
        source: 'MANUAL',
        locale: 'pl'
      }
    });
    await blockDatesForBooking(prisma, booking, 'Manual phone booking');
    if (booking.guestEmail) await sendGuestConfirmationEmail({ ...booking, guestEmail: booking.guestEmail });
    res.status(201).json({ id: booking.id, status: booking.status, totalPrice: totalPrice.toNumber() });
  } catch (error) {
    if (error instanceof Error) return res.status(400).json({ message: error.message });
    throw error;
  }
});
adminRouter.patch('/bookings/:id', validate(bookingStatusSchema), async (req, res) => {
  const booking = await prisma.booking.update({ where: { id: req.params.id as string }, data: { status: bookingStatusSchema.parse(req.body).status } });
  if (booking.status === BookingStatus.CONFIRMED) {
    await blockDatesForBooking(prisma, booking);
    if (booking.guestEmail) await sendGuestConfirmationEmail({ ...booking, guestEmail: booking.guestEmail });
  }
  res.json({ status: booking.status });
});
adminRouter.delete('/bookings/:id', async (req, res) => { await prisma.booking.delete({ where: { id: req.params.id as string } }); res.status(204).send(); });
adminRouter.get('/messages', async (_req, res) => res.json(await prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } })));
adminRouter.patch('/messages/:id', validate(readSchema), async (req, res) => { const message = await prisma.contactMessage.update({ where: { id: req.params.id as string }, data: { isRead: readSchema.parse(req.body).isRead } }); res.json({ isRead: message.isRead }); });
adminRouter.post('/blocked-dates', validate(blockedDateSchema), async (req, res) => { const payload = blockedDateSchema.parse(req.body); res.status(201).json(await prisma.blockedDate.create({ data: { date: new Date(payload.date), reason: payload.reason } })); });
adminRouter.delete('/blocked-dates/:id', async (req, res) => { await prisma.blockedDate.delete({ where: { id: req.params.id as string } }); res.status(204).send(); });
adminRouter.post('/gallery', validate(gallerySchema), async (req, res) => res.status(201).json(await prisma.galleryImage.create({ data: gallerySchema.parse(req.body) })));
adminRouter.delete('/gallery/:id', async (req, res) => { await prisma.galleryImage.delete({ where: { id: req.params.id as string } }); res.status(204).send(); });
adminRouter.patch('/pricing/:id', validate(pricingSchema), async (req, res) => {
  const payload = pricingSchema.parse(req.body);
  res.json(await prisma.pricingSeason.update({ where: { id: req.params.id as string }, data: { namePl: payload.namePl, nameEn: payload.nameEn, pricePerNight: new Prisma.Decimal(payload.pricePerNight), dateFrom: new Date(payload.dateFrom), dateTo: new Date(payload.dateTo), isFeatured: payload.isFeatured } }));
});
