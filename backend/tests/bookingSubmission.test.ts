import { PrismaClient } from '@prisma/client';
import { createWebsiteBooking } from '../src/services/bookingVerification';
import { changeBookingStatus } from '../src/services/bookingLifecycle';
import { hashBookingIp } from '../src/services/bookingLinks';

const db = new PrismaClient();
const input = { guestName: 'Test', guestEmail: 'test@example.invalid', guestPhone: '0',
  checkIn: '2030-06-10', checkOut: '2030-06-12', guestsCount: 2, locale: 'pl' as const };
const start = new Date('2030-01-01T10:00:00Z');
const freeze = () => jest.useFakeTimers({ now: start, doNotFake: [
  'hrtime', 'performance', 'queueMicrotask', 'nextTick', 'setTimeout', 'clearTimeout',
  'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate'
] });

beforeEach(async () => {
  await db.booking.deleteMany();
  await db.bookingVerification.deleteMany();
  await db.bookingAbuseEvent.deleteMany();
  await db.blockedDate.deleteMany();
  await db.pricingSeason.deleteMany();
  await db.pricingSeason.create({ data: { namePl: 'Test', nameEn: 'Test', pricePerNight: 500,
    dateFrom: new Date('2030-01-01'), dateTo: new Date('2030-12-31') } });
  freeze();
});
afterEach(() => { jest.useRealTimers(); });
afterAll(() => db.$disconnect());

it('allows only one active pending booking per normalized email across dates and IP addresses', async () => {
  await createWebsiteBooking(db, input, '127.0.0.1');
  await expect(createWebsiteBooking(db, { ...input, guestEmail: ' TEST@example.invalid ',
    checkIn: '2030-07-10', checkOut: '2030-07-12' }, '127.0.0.2'))
    .rejects.toMatchObject({ status: 429, retryAfter: 86400 });
  expect(await db.booking.count()).toBe(1);
});

it('allows the exact 120-second initial-mail cooldown after an owner rejection', async () => {
  const first = await createWebsiteBooking(db, input, '127.0.0.1');
  await changeBookingStatus(db, first.booking.id, 'CANCELLED');
  jest.setSystemTime(new Date(start.getTime() + 119999));
  await expect(createWebsiteBooking(db, input, '127.0.0.1')).rejects.toMatchObject({ status: 429, retryAfter: 1 });
  jest.setSystemTime(new Date(start.getTime() + 120000));
  await expect(createWebsiteBooking(db, input, '127.0.0.1')).resolves.toHaveProperty('booking.status', 'PENDING');
  expect(await db.booking.count()).toBe(2);
});

it('allows replacing an expired hold exactly at 24 hours without a maintenance tick', async () => {
  const first = await createWebsiteBooking(db, input, '127.0.0.1');
  jest.setSystemTime(new Date(start.getTime() + 86400000 - 1));
  await expect(createWebsiteBooking(db, input, '127.0.0.1')).rejects.toMatchObject({ status: 429, retryAfter: 1 });
  jest.setSystemTime(first.booking.expiresAt!);
  await expect(createWebsiteBooking(db, input, '127.0.0.1')).resolves.toHaveProperty('booking.status', 'PENDING');
});

it('limits genuinely created bookings to three per rolling day despite rejection, deletion and restart', async () => {
  for (let count = 0; count < 3; count += 1) {
    jest.setSystemTime(new Date(start.getTime() + count * 120000));
    const result = await createWebsiteBooking(db, input, '127.0.0.1');
    await changeBookingStatus(db, result.booking.id, 'CANCELLED');
  }
  await db.booking.deleteMany();
  const restarted = new PrismaClient();
  try {
    jest.setSystemTime(new Date(start.getTime() + 86400000 - 1));
    await expect(createWebsiteBooking(restarted, input, '127.0.0.2')).rejects.toMatchObject({ status: 429, retryAfter: 1 });
    jest.setSystemTime(new Date(start.getTime() + 86400000));
    await expect(createWebsiteBooking(restarted, input, '127.0.0.2')).resolves.toHaveProperty('booking.status', 'PENDING');
  } finally { await restarted.$disconnect(); }
});

it('counts legacy verification and new initial mail together against the five-mail daily budget', async () => {
  await db.bookingAbuseEvent.createMany({ data: ['VERIFY_MAIL', 'VERIFY_MAIL', 'REQUEST_MAIL', 'REQUEST_MAIL', 'REQUEST_MAIL']
    .map((kind) => ({ kind, email: input.guestEmail, createdAt: start })) });
  jest.setSystemTime(new Date(start.getTime() + 86400000 - 1));
  await expect(createWebsiteBooking(db, input, '127.0.0.1')).rejects.toMatchObject({ status: 429, retryAfter: 1 });
  jest.setSystemTime(new Date(start.getTime() + 86400000));
  await expect(createWebsiteBooking(db, input, '127.0.0.1')).resolves.toHaveProperty('booking.status', 'PENDING');
});

it.each([[10, 3600000], [30, 86400000]])('enforces %i attempts per IP and releases the exact window boundary', async (count, window) => {
  const createdAt = new Date(start.getTime() - (window === 86400000 ? 7200000 : 0));
  await db.bookingAbuseEvent.createMany({ data: Array.from({ length: count }, () => ({
    kind: 'SUBMISSION', ipKey: hashBookingIp('127.0.0.1'), createdAt
  })) });
  await expect(createWebsiteBooking(db, input, '127.0.0.1')).rejects.toMatchObject({ status: 429 });
  jest.setSystemTime(new Date(createdAt.getTime() + window));
  await expect(createWebsiteBooking(db, input, '127.0.0.1')).resolves.toHaveProperty('booking.status', 'PENDING');
});

it('counts unsuccessful availability attempts toward the IP budget without creating mail or bookings', async () => {
  const first = await createWebsiteBooking(db, input, '127.0.0.1');
  for (let count = 1; count < 10; count += 1) {
    await expect(createWebsiteBooking(db, { ...input, guestEmail: `other${count}@example.invalid` }, '127.0.0.1'))
      .rejects.toMatchObject({ status: 409 });
  }
  await expect(createWebsiteBooking(db, { ...input, guestEmail: 'last@example.invalid' }, '127.0.0.1'))
    .rejects.toMatchObject({ status: 429 });
  expect(await db.booking.count()).toBe(1);
  expect(await db.confirmationEmail.count()).toBe(1);
  expect(await db.bookingAbuseEvent.count({ where: { kind: 'SUBMISSION' } })).toBe(10);
  expect(first.booking.status).toBe('PENDING');
});

it.each([true, false])('serializes competing submissions with shared email=%s', async (sameEmail) => {
  const results = await Promise.allSettled([
    createWebsiteBooking(db, input, '127.0.0.1'),
    createWebsiteBooking(db, { ...input, guestEmail: sameEmail ? input.guestEmail : 'other@example.invalid',
      ...(sameEmail ? { checkIn: '2030-07-10', checkOut: '2030-07-12' } : {}) }, '127.0.0.2')
  ]);
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(await db.booking.count()).toBe(1);
  expect(await db.confirmationEmail.count()).toBe(1);
});

it('does not apply submission/email budgets to an owner decision', async () => {
  const { booking } = await createWebsiteBooking(db, input, '127.0.0.1');
  await db.bookingAbuseEvent.createMany({ data: Array.from({ length: 10 }, () => ({
    kind: 'REQUEST_MAIL', email: input.guestEmail, createdAt: start
  })) });
  await changeBookingStatus(db, booking.id, 'CONFIRMED');
  expect(await db.confirmationEmail.findUnique({ where: { bookingId: booking.id } }))
    .toMatchObject({ kind: 'CONFIRMED', status: 'QUEUED' });
  await changeBookingStatus(db, booking.id, 'CANCELLED');
  expect(await db.confirmationEmail.findUnique({ where: { bookingId: booking.id } }))
    .toMatchObject({ kind: 'CANCELLED', status: 'QUEUED' });
});
