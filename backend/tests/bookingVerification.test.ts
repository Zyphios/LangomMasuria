import { PrismaClient } from '@prisma/client';
import { requestBookingVerification, previewBookingVerification, completeBookingVerification,
  previewBookingDecision, completeBookingDecision, limitBookingLinks } from '../src/services/bookingVerification';
import { hashBookingIp } from '../src/services/bookingLinks';

const db = new PrismaClient();
const input = { guestName: 'Test', guestEmail: 'test@example.invalid', guestPhone: '0',
  checkIn: '2030-06-10', checkOut: '2030-06-12', guestsCount: 2, locale: 'pl' as const };

beforeEach(async () => {
  process.env.BOOKING_ABUSE_SECRET = 'synthetic-test-secret-at-least-32-characters';
  process.env.PUBLIC_SITE_URL = 'http://localhost:4173';
  await db.bookingVerification.deleteMany();
  await db.bookingAbuseEvent.deleteMany();
  await db.booking.deleteMany();
  await db.blockedDate.deleteMany();
  await db.pricingSeason.deleteMany();
  await db.pricingSeason.create({ data: { namePl: 'Test', nameEn: 'Test', pricePerNight: 500,
    dateFrom: new Date('2030-01-01'), dateTo: new Date('2030-12-31') } });
});
afterAll(() => db.$disconnect());
afterEach(() => jest.useRealTimers());
const freeze = (now: Date) => jest.useFakeTimers({ now, doNotFake: [
  'hrtime', 'performance', 'queueMicrotask', 'nextTick', 'setTimeout', 'clearTimeout',
  'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate'
] });

it('does not hold dates on submission or preview, then starts exactly 24h after verification', async () => {
  const link = await requestBookingVerification(db, input, '127.0.0.1');
  expect(await db.booking.count()).toBe(0);
  const preview = await previewBookingVerification(db, link.token);
  expect(preview.totalPrice).toBe('1000');
  expect(preview).not.toHaveProperty('guestEmail');
  expect(await db.booking.count()).toBe(0);
  const { booking, ownerToken } = await completeBookingVerification(db, link.token, '1000');
  expect(booking.expiresAt!.getTime() - booking.createdAt.getTime()).toBe(86400000);
  expect(booking.status).toBe('PENDING');
  expect(booking.decisionTokenHash).not.toBe(ownerToken);
  expect(await db.blockedDate.count()).toBe(0);
  expect(JSON.stringify(await db.bookingVerification.findMany())).not.toContain(link.token);
  await expect(completeBookingVerification(db, link.token, '1000')).rejects.toMatchObject({ status: 409 });
});

it('keeps owner previews read-only and allows only one conflicting decision', async () => {
  const link = await requestBookingVerification(db, input, '127.0.0.1');
  const { booking, ownerToken } = await completeBookingVerification(db, link.token, '1000');
  await previewBookingDecision(db, ownerToken!);
  expect(await db.confirmationEmail.count()).toBe(1);
  const results = await Promise.allSettled([
    completeBookingDecision(db, ownerToken!, 'CONFIRMED'),
    completeBookingDecision(db, ownerToken!, 'CANCELLED')
  ]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(await db.confirmationEmail.count()).toBeLessThanOrEqual(1);
  expect((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).not.toBe('PENDING');
  await expect(previewBookingDecision(db, ownerToken!)).rejects.toMatchObject({ status: 409 });
});

it('rejects wrong/expired tokens and a changed price without creating a hold', async () => {
  const link = await requestBookingVerification(db, input, '127.0.0.1');
  await expect(completeBookingVerification(db, 'x'.repeat(64), '1000')).rejects.toMatchObject({ status: 409 });
  await expect(completeBookingVerification(db, link.token, '1')).rejects.toMatchObject({ code: 'PRICE_CHANGED' });
  expect(await db.booking.count()).toBe(0);
  await db.bookingVerification.updateMany({ data: { expiresAt: new Date(0) } });
  await expect(completeBookingVerification(db, link.token, '1000')).rejects.toMatchObject({ status: 409 });
});

it('enforces email cooldown case-insensitively and one active hold across different dates', async () => {
  const link = await requestBookingVerification(db, input, '127.0.0.1');
  await expect(requestBookingVerification(db, { ...input, guestEmail: ' TEST@example.invalid ' }, '127.0.0.2'))
    .rejects.toMatchObject({ status: 429 });
  await completeBookingVerification(db, link.token, '1000');
  await db.bookingAbuseEvent.updateMany({ data: { createdAt: new Date(Date.now() - 121000) } });
  await expect(requestBookingVerification(db, { ...input, checkIn: '2030-07-10', checkOut: '2030-07-12' }, '127.0.0.1'))
    .rejects.toMatchObject({ status: 429 });
});

it('treats the exact 15-minute verification deadline as expired', async () => {
  freeze(new Date('2030-01-01T10:00:00Z'));
  const link = await requestBookingVerification(db, input, '127.0.0.1');
  jest.setSystemTime(new Date(link.expiresAt.getTime() - 1));
  await expect(previewBookingVerification(db, link.token)).resolves.toHaveProperty('totalPrice', '1000');
  jest.setSystemTime(link.expiresAt);
  await expect(completeBookingVerification(db, link.token, '1000')).rejects.toMatchObject({ code: 'LINK_UNAVAILABLE' });
  expect(await db.booking.count()).toBe(0);
});

it('provides the real remaining pending-hold wait instead of a misleading short cooldown', async () => {
  freeze(new Date('2030-01-01T10:00:00Z'));
  const link = await requestBookingVerification(db, input, '127.0.0.1');
  await completeBookingVerification(db, link.token, '1000');
  await expect(requestBookingVerification(db, { ...input, checkIn: '2030-07-10', checkOut: '2030-07-12' }, '127.0.0.2'))
    .rejects.toMatchObject({ status: 429, retryAfter: 86400 });
});

it('allows exactly the 120-second email cooldown boundary', async () => {
  const now = new Date('2030-01-01T10:00:00Z');
  freeze(now);
  await requestBookingVerification(db, input, '127.0.0.1');
  jest.setSystemTime(new Date(now.getTime() + 119999));
  await expect(requestBookingVerification(db, input, '127.0.0.1')).rejects.toMatchObject({ status: 429 });
  jest.setSystemTime(new Date(now.getTime() + 120000));
  await expect(requestBookingVerification(db, input, '127.0.0.1')).resolves.toHaveProperty('token');
  expect(await db.bookingVerification.count()).toBe(2);
});

it.each([
  ['BOOKING', 3],
  ['VERIFY_MAIL', 5]
])('keeps the rolling %s email budget after bookings are removed and the client restarts', async (kind, count) => {
  const now = new Date('2030-01-01T10:00:00Z');
  freeze(now);
  await db.bookingAbuseEvent.createMany({ data: Array.from({ length: count }, () => ({ kind, email: input.guestEmail, createdAt: now })) });
  await db.booking.deleteMany();
  const restarted = new PrismaClient();
  try {
    jest.setSystemTime(new Date(now.getTime() + 86400000 - 1));
    await expect(requestBookingVerification(restarted, input, '127.0.0.1')).rejects.toMatchObject({ status: 429, retryAfter: 1 });
    jest.setSystemTime(new Date(now.getTime() + 86400000));
    await expect(requestBookingVerification(restarted, input, '127.0.0.1')).resolves.toHaveProperty('token');
  } finally { await restarted.$disconnect(); }
});

it.each([
  [10, 3600000],
  [30, 86400000]
])('enforces %i submissions per IP window even with different emails', async (count, window) => {
  const now = new Date('2030-01-01T10:00:00Z');
  freeze(now);
  const ipKey = hashBookingIp('127.0.0.1');
  const createdAt = new Date(now.getTime() - (window === 86400000 ? 7200000 : 0));
  await db.bookingAbuseEvent.createMany({ data: Array.from({ length: count }, () => ({ kind: 'SUBMISSION', ipKey, createdAt })) });
  await expect(requestBookingVerification(db, input, '127.0.0.1')).rejects.toMatchObject({ status: 429 });
  jest.setSystemTime(new Date(createdAt.getTime() + window));
  await expect(requestBookingVerification(db, input, '127.0.0.1')).resolves.toHaveProperty('token');
});

it('shares the 30/minute link budget across previews and completions', async () => {
  const now = new Date('2030-01-01T10:00:00Z');
  freeze(now);
  for (let i = 0; i < 30; i += 1) await limitBookingLinks(db, '127.0.0.1');
  await expect(limitBookingLinks(db, '127.0.0.1')).rejects.toMatchObject({ status: 429, retryAfter: 60 });
  jest.setSystemTime(new Date(now.getTime() + 60000));
  await expect(limitBookingLinks(db, '127.0.0.1')).resolves.toBeUndefined();
});

it('serializes competing verified requests for the same email on different dates', async () => {
  const first = await requestBookingVerification(db, input, '127.0.0.1');
  await db.bookingAbuseEvent.updateMany({ data: { createdAt: new Date(Date.now() - 121000) } });
  const second = await requestBookingVerification(db, { ...input, checkIn: '2030-07-10', checkOut: '2030-07-12' }, '127.0.0.2');
  const results = await Promise.allSettled([
    completeBookingVerification(db, first.token, '1000'), completeBookingVerification(db, second.token, '1000')
  ]);
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(await db.booking.count()).toBe(1);
});

it('counts three genuinely created and rejected bookings even after deletion and restart', async () => {
  const now = new Date('2030-01-01T10:00:00Z');
  freeze(now);
  for (let i = 0; i < 3; i += 1) {
    jest.setSystemTime(new Date(now.getTime() + i * 120000));
    const link = await requestBookingVerification(db, input, '127.0.0.1');
    const result = await completeBookingVerification(db, link.token, '1000');
    await completeBookingDecision(db, result.ownerToken, 'CANCELLED');
  }
  await db.booking.deleteMany();
  expect(await db.bookingAbuseEvent.count({ where: { kind: 'BOOKING' } })).toBe(3);
  jest.setSystemTime(new Date(now.getTime() + 360000));
  const restarted = new PrismaClient();
  try {
    await expect(requestBookingVerification(restarted, input, '127.0.0.2')).rejects.toMatchObject({ status: 429 });
  } finally { await restarted.$disconnect(); }
});
