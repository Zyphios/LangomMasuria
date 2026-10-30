import { Prisma, PrismaClient, type BookingVerification } from '@prisma/client';
import type { BookingCreateInput } from '../types';
import { assertDatesAvailable, assertMinimumStay, calculateTotalPrice } from './availability';
import { bookingConfig, hashBookingIp, hashBookingSecret, newBookingSecret, normalizeEmail } from './bookingLinks';
import { generateBookingReference } from './bookingReference';
import { decideBooking } from './bookingLifecycle';
import { BookingOperationError, withBookingTransaction } from './bookingTransaction';
import { queueGuestNotification } from './confirmationQueue';

const DAY = 86400000;
const unavailable = () => new BookingOperationError(409, 'LINK_UNAVAILABLE');
const limited = (seconds = 120) => new BookingOperationError(429, 'BOOKING_RATE_LIMIT', 'BOOKING_RATE_LIMIT', Math.max(1, Math.ceil(seconds)));

async function windowLimit(tx: Prisma.TransactionClient, where: Prisma.BookingAbuseEventWhereInput, now: Date, window: number, limit: number) {
  const events = await tx.bookingAbuseEvent.findMany({
    where: { ...where, createdAt: { gt: new Date(now.getTime() - window) } }, orderBy: { createdAt: 'asc' }, take: limit
  });
  return events.length >= limit ? limited((events[0].createdAt.getTime() + window - now.getTime()) / 1000) : null;
}

async function emailCapacity(tx: Prisma.TransactionClient, email: string, now: Date) {
  const config = bookingConfig();
  const pending = await tx.booking.findMany({
    where: { guestEmail: { equals: email, mode: 'insensitive' }, status: 'PENDING', expiresAt: { gt: now } },
    select: { expiresAt: true }, orderBy: { expiresAt: 'asc' }
  });
  if (pending.length >= config.pending) {
    return limited((pending[pending.length - config.pending].expiresAt!.getTime() - now.getTime()) / 1000);
  }
  return windowLimit(tx, { kind: 'BOOKING', email }, now, DAY, config.daily);
}

export async function createWebsiteBooking(db: PrismaClient, input: BookingCreateInput, ip: string) {
  const config = bookingConfig();
  const email = normalizeEmail(input.guestEmail);
  const ipKey = hashBookingIp(ip);
  const outcome = await withBookingTransaction(db, async (tx, now) => {
    const ipError = await windowLimit(tx, { kind: 'SUBMISSION', ipKey }, now, 3600000, config.hourlyIp) ??
      await windowLimit(tx, { kind: 'SUBMISSION', ipKey }, now, DAY, config.dailyIp);
    if (ipError) return { error: ipError };
    await tx.bookingAbuseEvent.create({ data: { kind: 'SUBMISSION', ipKey, createdAt: now } });
    const mailEvents = { kind: { in: ['VERIFY_MAIL', 'REQUEST_MAIL'] }, email };
    const error = await emailCapacity(tx, email, now) ??
      await windowLimit(tx, mailEvents, now, DAY, config.emails) ??
      await windowLimit(tx, mailEvents, now, config.cooldown * 1000, 1);
    if (error) return { error };
    const checkIn = new Date(input.checkIn);
    const checkOut = new Date(input.checkOut);
    let totalPrice: Prisma.Decimal;
    try {
      assertMinimumStay(checkIn, checkOut);
      await assertDatesAvailable(tx, checkIn, checkOut, { now });
      totalPrice = await calculateTotalPrice(tx, checkIn, checkOut);
    } catch (error) {
      if (error instanceof BookingOperationError) return { error };
      throw error;
    }
    const ownerSecret = newBookingSecret();
    const booking = await tx.booking.create({ data: {
      ...input, guestEmail: email, checkIn, checkOut,
      reference: generateBookingReference(email), totalPrice, originalTotalPrice: totalPrice,
      status: 'PENDING', createdAt: now, expiresAt: new Date(now.getTime() + DAY),
      decisionTokenHash: ownerSecret.hash
    } });
    await queueGuestNotification(tx, booking.id, 'PENDING', now);
    await tx.bookingAbuseEvent.createMany({ data: [
      { kind: 'BOOKING', email, createdAt: now },
      { kind: 'REQUEST_MAIL', email, createdAt: now }
    ] });
    return { booking, ownerToken: ownerSecret.token };
  });
  if ('error' in outcome) throw outcome.error;
  return outcome;
}

export async function limitBookingLinks(db: PrismaClient, ip: string) {
  const ipKey = hashBookingIp(ip);
  const outcome = await withBookingTransaction(db, async (tx, now) => {
    const error = await windowLimit(tx, { kind: 'LINK', ipKey }, now, 60000, bookingConfig().linkMinute);
    if (error) return error;
    await tx.bookingAbuseEvent.create({ data: { kind: 'LINK', ipKey, createdAt: now } });
    return null;
  });
  if (outcome) throw outcome;
}

export async function requestBookingVerification(db: PrismaClient, input: BookingCreateInput, ip: string) {
  const config = bookingConfig();
  const email = normalizeEmail(input.guestEmail);
  const ipKey = hashBookingIp(ip);
  const outcome = await withBookingTransaction(db, async (tx, now) => {
    const ipError = await windowLimit(tx, { kind: 'SUBMISSION', ipKey }, now, 3600000, config.hourlyIp) ??
      await windowLimit(tx, { kind: 'SUBMISSION', ipKey }, now, DAY, config.dailyIp);
    if (ipError) return { error: ipError };
    await tx.bookingAbuseEvent.create({ data: { kind: 'SUBMISSION', ipKey, createdAt: now } });
    const error = await emailCapacity(tx, email, now) ??
      await windowLimit(tx, { kind: 'VERIFY_MAIL', email }, now, DAY, config.emails) ??
      await windowLimit(tx, { kind: 'VERIFY_MAIL', email }, now, config.cooldown * 1000, 1);
    if (error) return { error };
    const checkIn = new Date(input.checkIn);
    const checkOut = new Date(input.checkOut);
    assertMinimumStay(checkIn, checkOut);
    await assertDatesAvailable(tx, checkIn, checkOut, { now });
    const totalPrice = await calculateTotalPrice(tx, checkIn, checkOut);
    const secret = newBookingSecret();
    const expiresAt = new Date(now.getTime() + 15 * 60000);
    await tx.bookingVerification.create({ data: {
      ...input, guestEmail: email, checkIn, checkOut, totalPrice, tokenHash: secret.hash, expiresAt, createdAt: now
    } });
    await tx.bookingAbuseEvent.create({ data: { kind: 'VERIFY_MAIL', email, createdAt: now } });
    return { token: secret.token, expiresAt };
  });
  if ('error' in outcome) throw outcome.error;
  return outcome;
}

function assertVerification(row: BookingVerification | null, now: Date): asserts row is BookingVerification {
  if (!row || row.consumedAt || row.expiresAt <= now) throw unavailable();
}

const preview = (value: { checkIn: Date; checkOut: Date; guestsCount: number; totalPrice: Prisma.Decimal; expiresAt: Date }) => ({
  checkIn: value.checkIn.toISOString().slice(0, 10), checkOut: value.checkOut.toISOString().slice(0, 10),
  guestsCount: value.guestsCount, totalPrice: value.totalPrice.toString(), expiresAt: value.expiresAt.toISOString()
});

export const previewBookingVerification = (db: PrismaClient, token: string) =>
  withBookingTransaction(db, async (tx, now) => {
    const row = await tx.bookingVerification.findUnique({ where: { tokenHash: hashBookingSecret(token) } });
    assertVerification(row, now);
    await assertDatesAvailable(tx, row.checkIn, row.checkOut, { now });
    return preview({ ...row, totalPrice: await calculateTotalPrice(tx, row.checkIn, row.checkOut) });
  });

export const completeBookingVerification = (db: PrismaClient, token: string, expectedTotalPrice: string) =>
  withBookingTransaction(db, async (tx, now) => {
    const row = await tx.bookingVerification.findUnique({ where: { tokenHash: hashBookingSecret(token) } });
    assertVerification(row, now);
    const capacity = await emailCapacity(tx, row.guestEmail, now);
    if (capacity) throw capacity;
    assertMinimumStay(row.checkIn, row.checkOut);
    await assertDatesAvailable(tx, row.checkIn, row.checkOut, { now });
    const totalPrice = await calculateTotalPrice(tx, row.checkIn, row.checkOut);
    if (!/^\d+(\.\d{1,2})?$/.test(expectedTotalPrice) || !totalPrice.equals(expectedTotalPrice)) {
      throw new BookingOperationError(409, 'PRICE_CHANGED');
    }
    const ownerSecret = newBookingSecret();
    const booking = await tx.booking.create({ data: {
      guestName: row.guestName, guestEmail: row.guestEmail, guestPhone: row.guestPhone,
      checkIn: row.checkIn, checkOut: row.checkOut, guestsCount: row.guestsCount, notes: row.notes, locale: row.locale,
      reference: generateBookingReference(row.guestEmail), totalPrice, originalTotalPrice: totalPrice, status: 'PENDING',
      createdAt: now, expiresAt: new Date(now.getTime() + DAY), decisionTokenHash: ownerSecret.hash
    } });
    await queueGuestNotification(tx, booking.id, 'PENDING', now);
    await tx.bookingVerification.update({ where: { id: row.id }, data: { consumedAt: now, bookingId: booking.id } });
    await tx.bookingAbuseEvent.create({ data: { kind: 'BOOKING', email: row.guestEmail, createdAt: now } });
    return { booking, ownerToken: ownerSecret.token };
  });

async function pendingByToken(tx: Prisma.TransactionClient, token: string, now: Date) {
  const booking = await tx.booking.findUnique({ where: { decisionTokenHash: hashBookingSecret(token) } });
  if (!booking || booking.status !== 'PENDING' || !booking.expiresAt || booking.expiresAt <= now) throw unavailable();
  return { ...booking, expiresAt: booking.expiresAt };
}

export const previewBookingDecision = (db: PrismaClient, token: string) =>
  withBookingTransaction(db, async (tx, now) => preview(await pendingByToken(tx, token, now)));

export const completeBookingDecision = (db: PrismaClient, token: string, status: 'CONFIRMED' | 'CANCELLED') =>
  withBookingTransaction(db, async (tx, now) => {
    const booking = await pendingByToken(tx, token, now);
    return decideBooking(tx, booking.id, status, now);
  });
