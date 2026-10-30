import request from 'supertest';
import { createApp, prisma } from '../src/index';
import { sendGuestBookingEmail, sendOwnerBookingEmail } from '../src/services/email';
import { processNextConfirmation } from '../src/services/confirmationQueue';

jest.mock('../src/services/email', () => ({
  ...jest.requireActual('../src/services/email'),
  sendOwnerBookingEmail: jest.fn().mockResolvedValue(undefined)
}));
const input = { guestName: 'Test', guestEmail: 'test@example.invalid', guestPhone: '0',
  checkIn: '2030-06-10', checkOut: '2030-06-12', guestsCount: 2, locale: 'pl' };

beforeEach(async () => {
  process.env.BOOKING_ABUSE_SECRET = 'synthetic-test-secret-at-least-32-characters';
  process.env.PUBLIC_SITE_URL = 'http://localhost:4173';
  jest.clearAllMocks();
  await prisma.bookingVerification.deleteMany();
  await prisma.bookingAbuseEvent.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.blockedDate.deleteMany();
  await prisma.pricingSeason.deleteMany();
  await prisma.pricingSeason.create({ data: { namePl: 'Test', nameEn: 'Test', pricePerNight: 500,
    dateFrom: new Date('2030-01-01'), dateTo: new Date('2030-12-31') } });
});

it('holds dates immediately, keeps the owner secret private and requires an explicit owner decision', async () => {
  const app = createApp();
  const response = await request(app).post('/api/bookings').send(input);
  expect(response.status).toBe(201);
  expect(response.body.status).toBe('PENDING');
  expect(await prisma.booking.count()).toBe(1);
  expect(await prisma.bookingVerification.count()).toBe(0);
  expect(response.body).not.toHaveProperty('decisionTokenHash');
  expect(response.body).not.toHaveProperty('ownerToken');
  const ownerToken = jest.mocked(sendOwnerBookingEmail).mock.calls[0][1];
  expect(ownerToken).toBeTruthy();
  expect(JSON.stringify(response.body)).not.toContain(ownerToken);
  const preview = await request(app).post('/api/booking-links/decision/preview').send({ token: ownerToken });
  expect(preview.status).toBe(200);
  expect((await prisma.booking.findFirstOrThrow()).status).toBe('PENDING');
  const decided = await request(app).post('/api/booking-links/decision/complete').send({ token: ownerToken, decision: 'CONFIRMED' });
  expect(decided.status).toBe(200);
  expect(await prisma.confirmationEmail.count()).toBe(1);
  expect(await prisma.confirmationEmail.findFirstOrThrow()).toMatchObject({ kind: 'CONFIRMED', status: 'QUEUED' });
  const availability = await request(app).get('/api/availability?month=6&year=2030');
  expect(availability.body.confirmedDates).toEqual(['2030-06-10', '2030-06-11']);
  expect(JSON.stringify(availability.body)).not.toContain('test@example.invalid');
});

it('retains the booking and retries a guest mail failure without allowing duplicate submissions', async () => {
  const app = createApp();
  const created = await request(app).post('/api/bookings').send(input);
  expect(created.status).toBe(201);
  await processNextConfirmation(prisma, new Date(), sendGuestBookingEmail);
  expect(await prisma.booking.count()).toBe(1);
  expect(await prisma.confirmationEmail.findFirstOrThrow())
    .toMatchObject({ kind: 'PENDING', status: 'QUEUED', attempts: 1, lastError: 'SMTP_NOT_CONFIGURED' });
  const repeated = await request(app).post('/api/bookings').send(input);
  expect(repeated.status).toBe(429);
  expect(Number(repeated.headers['retry-after'])).toBeGreaterThan(0);
});

it('queues the guest rejection and releases the hold when the owner rejects from a private link', async () => {
  const app = createApp();
  const created = await request(app).post('/api/bookings').send(input);
  expect(created.status).toBe(201);
  const token = jest.mocked(sendOwnerBookingEmail).mock.calls[0][1];
  const response = await request(app).post('/api/booking-links/decision/complete')
    .send({ token, decision: 'CANCELLED' });
  expect(response.status).toBe(200);
  expect(response.body.status).toBe('CANCELLED');
  expect(await prisma.confirmationEmail.findFirstOrThrow()).toMatchObject({ kind: 'CANCELLED', status: 'QUEUED' });
  const availability = await request(app).get('/api/availability?month=6&year=2030');
  expect(availability.body.pendingDates).toEqual([]);
});

it('does not trust spoofed proxy headers in the local server', async () => {
  const app = createApp();
  for (let count = 0; count < 10; count += 1) {
    const response = await request(app).post('/api/bookings')
      .set('X-Forwarded-For', `192.0.2.${count}`)
      .send({ ...input, guestEmail: `test${count}@example.invalid` });
    expect(response.status).toBe(count === 0 ? 201 : 409);
  }
  const response = await request(app).post('/api/bookings').set('X-Forwarded-For', '198.51.100.1')
    .send({ ...input, guestEmail: 'next@example.invalid' });
  expect(response.status).toBe(429);
});
