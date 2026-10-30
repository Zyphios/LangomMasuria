import { PrismaClient } from '@prisma/client';
import { runBookingMaintenance } from '../src/services/bookingJobs';

const db = new PrismaClient();
afterAll(() => db.$disconnect());

it('expires holds and removes only old verification/budget data, preserving bookings and live counters', async () => {
  await db.bookingVerification.deleteMany();
  await db.bookingAbuseEvent.deleteMany();
  await db.booking.deleteMany();
  const now = new Date('2030-01-01T10:00:00Z');
  const old = new Date(now.getTime() - 49 * 3600000);
  const booking = await db.booking.create({ data: {
    reference: 'MAINTENANCE', guestName: 'Test', guestPhone: '0',
    checkIn: new Date('2030-06-10'), checkOut: new Date('2030-06-12'), guestsCount: 2,
    totalPrice: 1000, status: 'PENDING', expiresAt: now
  } });
  await db.bookingVerification.create({ data: {
    guestName: 'Test', guestEmail: 'test@example.invalid', guestPhone: '0',
    checkIn: booking.checkIn, checkOut: booking.checkOut, guestsCount: 2, totalPrice: 1000,
    tokenHash: 'old', expiresAt: old, consumedAt: old, bookingId: booking.id, locale: 'pl'
  } });
  await db.bookingAbuseEvent.createMany({ data: [
    { kind: 'BOOKING', email: 'old@example.invalid', createdAt: old },
    { kind: 'BOOKING', email: 'current@example.invalid', createdAt: new Date(now.getTime() - 3600000) }
  ] });
  await runBookingMaintenance(db, now, async () => { throw new Error('No mail expected'); });
  expect((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe('EXPIRED');
  expect(await db.bookingVerification.count()).toBe(0);
  expect(await db.bookingAbuseEvent.count()).toBe(1);
});

it('does not erase counters still needed by a configured cooldown longer than 48 hours', async () => {
  await db.bookingAbuseEvent.deleteMany();
  process.env.BOOKING_EMAIL_COOLDOWN_SECONDS = '259200';
  const now = new Date();
  await db.bookingAbuseEvent.create({ data: {
    kind: 'VERIFY_MAIL', email: 'test@example.invalid', createdAt: new Date(now.getTime() - 49 * 3600000)
  } });
  try {
    await runBookingMaintenance(db, now, async () => {});
    expect(await db.bookingAbuseEvent.count()).toBe(1);
  } finally { delete process.env.BOOKING_EMAIL_COOLDOWN_SECONDS; }
});
