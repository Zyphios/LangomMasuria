import request from 'supertest';
import { createApp, prisma } from '../src/index';
import { sendBookingVerificationEmail, sendOwnerBookingEmail } from '../src/services/email';

jest.mock('../src/services/email', () => ({
  ...jest.requireActual('../src/services/email'),
  sendBookingVerificationEmail: jest.fn().mockResolvedValue(undefined),
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

it('holds nothing until explicit verification and keeps both private secrets out of public responses', async () => {
  const app = createApp();
  const response = await request(app).post('/api/bookings').send(input);
  expect(response.status).toBe(202);
  expect(response.body.status).toBe('EMAIL_VERIFICATION_REQUIRED');
  expect(response.body).not.toHaveProperty('id');
  expect(await prisma.booking.count()).toBe(0);
  const token = jest.mocked(sendBookingVerificationEmail).mock.calls[0][1];
  const preview = await request(app).post('/api/booking-links/verification/preview').send({ token });
  expect(preview.status).toBe(200);
  expect(await prisma.booking.count()).toBe(0);
  const completed = await request(app).post('/api/booking-links/verification/complete').send({ token, expectedTotalPrice: '1000' });
  expect(completed.status).toBe(201);
  expect(completed.body.status).toBe('PENDING');
  expect(completed.body).not.toHaveProperty('decisionTokenHash');
  expect(completed.body).not.toHaveProperty('ownerToken');
  const ownerToken = jest.mocked(sendOwnerBookingEmail).mock.calls[0][1];
  expect(ownerToken).toBeTruthy();
  const decided = await request(app).post('/api/booking-links/decision/complete').send({ token: ownerToken, decision: 'CONFIRMED' });
  expect(decided.status).toBe(200);
  expect(await prisma.confirmationEmail.count()).toBe(1);
  const availability = await request(app).get('/api/availability?month=6&year=2030');
  expect(availability.body.confirmedDates).toEqual(['2030-06-10', '2030-06-11']);
  expect(JSON.stringify(availability.body)).not.toContain('test@example.invalid');
});

it('surfaces SMTP failure, holds no dates and retains the email cooldown', async () => {
  jest.mocked(sendBookingVerificationEmail).mockRejectedValueOnce(new Error('SMTP failed'));
  const app = createApp();
  const failed = await request(app).post('/api/bookings').send(input);
  expect(failed.status).toBe(503);
  expect(await prisma.booking.count()).toBe(0);
  const repeated = await request(app).post('/api/bookings').send(input);
  expect(repeated.status).toBe(429);
  expect(Number(repeated.headers['retry-after'])).toBeGreaterThan(0);
});

it('does not trust spoofed proxy headers in the local server', async () => {
  const app = createApp();
  for (let count = 0; count < 10; count += 1) {
    const response = await request(app).post('/api/bookings')
      .set('X-Forwarded-For', `192.0.2.${count}`)
      .send({ ...input, guestEmail: `test${count}@example.invalid` });
    expect(response.status).toBe(202);
  }
  const response = await request(app).post('/api/bookings').set('X-Forwarded-For', '198.51.100.1')
    .send({ ...input, guestEmail: 'next@example.invalid' });
  expect(response.status).toBe(429);
});
