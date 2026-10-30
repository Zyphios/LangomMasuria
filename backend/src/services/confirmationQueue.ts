import { randomUUID } from 'crypto';
import { PrismaClient, type Booking, type BookingEmailKind, type Prisma } from '@prisma/client';
import { BookingOperationError, withBookingTransaction } from './bookingTransaction';

export type ConfirmationSender = (booking: Booking & { guestEmail: string }, kind: BookingEmailKind) => Promise<void>;

export const queueGuestNotification = (tx: Prisma.TransactionClient, bookingId: string, kind: BookingEmailKind, now: Date) =>
  tx.confirmationEmail.upsert({
    where: { bookingId },
    create: { bookingId, kind, availableAt: now },
    update: { kind, status: 'QUEUED', attempts: 0, availableAt: now,
      sentAt: null, lastError: null, leaseToken: null, leaseUntil: null }
  });

const isCurrentNotification = (booking: Booking, kind: BookingEmailKind, now: Date) =>
  booking.status === kind && (kind !== 'PENDING' || Boolean(booking.expiresAt && booking.expiresAt > now));

export async function processNextConfirmation(db: PrismaClient, now: Date, send: ConfirmationSender): Promise<boolean> {
  const task = await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "ConfirmationEmail"
      WHERE (status = 'QUEUED' AND "availableAt" <= ${now})
         OR (status = 'SENDING' AND "leaseUntil" <= ${now})
      ORDER BY "availableAt", id LIMIT 1 FOR UPDATE SKIP LOCKED
    `;
    if (!rows[0]) return null;
    const current = await tx.confirmationEmail.findUniqueOrThrow({ where: { id: rows[0].id } });
    if (current.attempts >= 3) {
      await tx.confirmationEmail.update({ where: { id: current.id },
        data: { status: 'FAILED', lastError: 'DELIVERY_UNKNOWN', leaseToken: null, leaseUntil: null } });
      return { exhausted: true as const };
    }
    return tx.confirmationEmail.update({ where: { id: current.id }, data: {
      status: 'SENDING', leaseToken: randomUUID(), leaseUntil: new Date(now.getTime() + 120000), attempts: { increment: 1 }
    }, include: { booking: true } });
  });
  if (!task) return false;
  if ('exhausted' in task) return true;
  const where = { id: task.id, kind: task.kind, status: 'SENDING' as const, leaseToken: task.leaseToken };
  const booking = await db.booking.findUnique({ where: { id: task.bookingId } });
  if (!booking || !isCurrentNotification(booking, task.kind, now) || !booking.guestEmail) {
    await db.confirmationEmail.updateMany({ where, data: { status: 'CANCELLED', leaseToken: null, leaseUntil: null } });
    return true;
  }
  try {
    await send({ ...booking, guestEmail: booking.guestEmail }, task.kind);
  } catch (error) {
    const code = error instanceof Error && error.message === 'SMTP_NOT_CONFIGURED' ? 'SMTP_NOT_CONFIGURED' : 'SMTP_SEND_FAILED';
    await db.confirmationEmail.updateMany({ where, data: {
      status: task.attempts >= 3 ? 'FAILED' : 'QUEUED', lastError: code, leaseToken: null, leaseUntil: null,
      availableAt: new Date(now.getTime() + (task.attempts === 1 ? 60000 : 300000))
    } });
    console.error('booking notification delivery failed:', task.kind, code);
    return true;
  }
  await db.confirmationEmail.updateMany({ where,
    data: { status: 'SENT', sentAt: new Date(), lastError: null, leaseToken: null, leaseUntil: null } });
  return true;
}

export const retryConfirmation = (db: PrismaClient, bookingId: string) =>
  withBookingTransaction(db, async (tx, now) => {
    const task = await tx.confirmationEmail.findUnique({ where: { bookingId }, include: { booking: true } });
    if (!task || task.status !== 'FAILED' || !isCurrentNotification(task.booking, task.kind, now) || !task.booking.guestEmail) {
      throw new BookingOperationError(409, 'CONFIRMATION_RETRY_UNAVAILABLE');
    }
    await tx.confirmationEmail.update({ where: { bookingId }, data: {
      status: 'QUEUED', attempts: 0, lastError: null, availableAt: now, leaseToken: null, leaseUntil: null
    } });
  });
