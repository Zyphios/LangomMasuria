import { PrismaClient } from '@prisma/client';
import { changeBookingStatus, createManualBooking, expirePendingBookings } from '../src/services/bookingLifecycle';
import { getAvailabilityForMonth } from '../src/services/availability';

const db = new PrismaClient();
const deadline = new Date('2030-06-02T10:00:00Z');
const pending = () => db.booking.create({ data: {
  reference: 'LIFECYCLE-TEST', guestName: 'Test', guestPhone: '0', guestEmail: 'test@example.invalid',
  checkIn: new Date('2030-06-10'), checkOut: new Date('2030-06-12'),
  guestsCount: 2, totalPrice: 1000, status: 'PENDING', expiresAt: deadline
} });

beforeEach(async () => { await db.booking.deleteMany(); await db.blockedDate.deleteMany(); });
afterAll(() => db.$disconnect());

it('releases pending nights exactly at the expiry deadline', async () => {
  await pending();
  const before = await getAvailabilityForMonth(db, 6, 2030, new Date(deadline.getTime() - 1));
  const at = await getAvailabilityForMonth(db, 6, 2030, deadline);
  expect(before.pendingDates).toEqual(['2030-06-10', '2030-06-11']);
  expect(at.blockedDates).toEqual([]);
  expect(Object.keys(before).sort()).toEqual(['blockedDates', 'confirmedDates', 'manualBlockedDates', 'pendingDates']);
});

it('confirms its own range and creates one durable mail without duplicate blocks', async () => {
  const booking = await pending();
  await changeBookingStatus(db, booking.id, 'CONFIRMED');
  await changeBookingStatus(db, booking.id, 'CONFIRMED');
  expect(await db.confirmationEmail.count({ where: { bookingId: booking.id } })).toBe(1);
  expect(await db.blockedDate.count()).toBe(0);
  expect((await getAvailabilityForMonth(db, 6, 2030, new Date())).confirmedDates).toHaveLength(2);
});

it('replaces an unsent confirmation with a rejection email without deleting an independent block', async () => {
  const booking = await pending();
  await changeBookingStatus(db, booking.id, 'CONFIRMED');
  await db.blockedDate.create({ data: { date: new Date('2030-06-10'), reason: 'Independent' } });
  await changeBookingStatus(db, booking.id, 'CANCELLED');
  expect((await getAvailabilityForMonth(db, 6, 2030, new Date())).blockedDates).toEqual(['2030-06-10']);
  expect(await db.confirmationEmail.findUniqueOrThrow({ where: { bookingId: booking.id } }))
    .toMatchObject({ status: 'QUEUED', kind: 'CANCELLED', attempts: 0 });
});

it('queues a rejection from a pending booking once and releases its dates', async () => {
  const booking = await pending();
  await changeBookingStatus(db, booking.id, 'CANCELLED');
  await changeBookingStatus(db, booking.id, 'CANCELLED');
  expect(await db.confirmationEmail.count({ where: { bookingId: booking.id } })).toBe(1);
  expect(await db.confirmationEmail.findUniqueOrThrow({ where: { bookingId: booking.id } }))
    .toMatchObject({ status: 'QUEUED', kind: 'CANCELLED' });
  expect((await getAvailabilityForMonth(db, 6, 2030, new Date())).blockedDates).toEqual([]);
});

it('rejects late confirmation and expires without traffic', async () => {
  const booking = await pending();
  await db.booking.update({ where: { id: booking.id }, data: { expiresAt: new Date(0) } });
  await expect(changeBookingStatus(db, booking.id, 'CONFIRMED')).rejects.toMatchObject({ status: 409, code: 'BOOKING_EXPIRED' });
  await expirePendingBookings(db, new Date());
  expect((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe('EXPIRED');
});

it('serializes competing manual reservations and allows adjacent checkout/checkin', async () => {
  const input = { guestName: 'Test', guestPhone: '0', checkIn: '2030-07-10', checkOut: '2030-07-11',
    guestsCount: 2, pricePerNight: 500, discountPercent: 0, depositAmount: 0 };
  const results = await Promise.allSettled([createManualBooking(db, input), createManualBooking(db, input)]);
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
  await expect(createManualBooking(db, { ...input, checkIn: '2030-07-11', checkOut: '2030-07-12' })).resolves.toMatchObject({ status: 'CONFIRMED' });
});
