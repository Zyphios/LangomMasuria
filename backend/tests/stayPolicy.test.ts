import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp, prisma } from '../src/index';
import {
  completeBookingDecision, completeBookingVerification, createWebsiteBooking,
  previewBookingVerification, requestBookingVerification
} from '../src/services/bookingVerification';

const token = jwt.sign({ adminId: 'stay-policy-test' }, process.env.JWT_SECRET || 'test_secret');
const low = { id: 'stay-low', namePl: 'Sezon niski', nameEn: 'Low season', pricePerNight: 700,
  dateFrom: '2030-01-01', dateTo: '2030-04-30', isFeatured: false };
const high = { id: 'stay-high', namePl: 'Sezon wysoki', nameEn: 'High season', pricePerNight: 800,
  dateFrom: '2030-05-01', dateTo: '2030-08-31', isFeatured: true };
const holiday = { id: 'stay-holiday', namePl: 'Święta', nameEn: 'Holidays', pricePerNight: 1000,
  dateFrom: '2030-05-10', dateTo: '2030-05-11', isFeatured: false };
const input = { guestName: 'Synthetic guest', guestEmail: 'stay@example.invalid', guestPhone: '000',
  checkIn: '2030-05-02', checkOut: '2030-05-04', guestsCount: 2, locale: 'pl' as const };
const setMinimum = (season: typeof low, minNights: unknown) => request(createApp())
  .patch(`/api/admin/pricing/${season.id}`).set('Authorization', `Bearer ${token}`)
  .send({ ...season, minNights });

beforeEach(async () => {
  await prisma.booking.deleteMany();
  await prisma.bookingVerification.deleteMany();
  await prisma.bookingAbuseEvent.deleteMany();
  await prisma.blockedDate.deleteMany();
  await prisma.pricingSeason.deleteMany();
  await prisma.pricingSeason.createMany({ data: [low, high, holiday].map((season) => ({
    ...season, dateFrom: new Date(season.dateFrom), dateTo: new Date(season.dateTo)
  })) });
});

afterAll(async () => { await prisma.$disconnect(); });

describe('seasonal minimum stay', () => {
  it('keeps the existing two-night requirement as the default for every season', async () => {
    const listed = await request(createApp()).get('/api/pricing');
    expect(listed.status).toBe(200);
    expect(listed.body.map((season: { minNights: number }) => season.minNights)).toEqual([2, 2, 2]);
    await expect(createWebsiteBooking(prisma, input, '127.0.0.1')).resolves.toHaveProperty('booking.status', 'PENDING');
  });

  it('persists and publishes the minimum edited by the owner', async () => {
    const saved = await setMinimum(high, 5);
    expect(saved.status).toBe(200);
    expect(saved.body.minNights).toBe(5);
    const listed = await request(createApp()).get('/api/pricing');
    expect(listed.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: high.id, minNights: 5 })]));
  });

  it.each([0, 1, -1, 2.5, '5', 2147483648])('rejects invalid seasonal minimum %s', async (value) => {
    expect((await setMinimum(high, value)).status).toBe(400);
  });

  it('rejects a short guest booking without creating a booking or notification', async () => {
    expect((await setMinimum(high, 5)).status).toBe(200);
    const result = await request(createApp()).post('/api/bookings').send(input);
    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({ code: 'MINIMUM_STAY' });
    expect(await prisma.booking.count()).toBe(0);
    expect(await prisma.confirmationEmail.count()).toBe(0);
    expect(await prisma.bookingAbuseEvent.count({ where: { kind: 'SUBMISSION' } })).toBe(1);
  });

  it('accepts the exact seasonal minimum without changing the nightly price calculation', async () => {
    expect((await setMinimum(high, 5)).status).toBe(200);
    const result = await createWebsiteBooking(prisma, { ...input, checkOut: '2030-05-07' }, '127.0.0.1');
    expect(result.booking.totalPrice.toString()).toBe('4000');
    expect(result.booking.status).toBe('PENDING');
  });

  it('takes the highest minimum across occupied seasons, not only the arrival season', async () => {
    expect((await setMinimum(high, 5)).status).toBe(200);
    await expect(createWebsiteBooking(prisma, {
      ...input, checkIn: '2030-04-30', checkOut: '2030-05-04'
    }, '127.0.0.1')).rejects.toMatchObject({ code: 'MINIMUM_STAY' });
    const result = await createWebsiteBooking(prisma, {
      ...input, checkIn: '2030-04-30', checkOut: '2030-05-05'
    }, '127.0.0.1');
    expect(result.booking.totalPrice.toString()).toBe('3900');
  });

  it('does not count the checkout date as a night in a stricter season', async () => {
    expect((await setMinimum(high, 5)).status).toBe(200);
    await expect(createWebsiteBooking(prisma, {
      ...input, checkIn: '2030-04-29', checkOut: '2030-05-01'
    }, '127.0.0.1')).resolves.toHaveProperty('booking.status', 'PENDING');
  });

  it('uses the same holiday override as pricing when resolving each occupied night', async () => {
    expect((await setMinimum(high, 5)).status).toBe(200);
    const result = await createWebsiteBooking(prisma, {
      ...input, checkIn: '2030-05-10', checkOut: '2030-05-12'
    }, '127.0.0.1');
    expect(result.booking.totalPrice.toString()).toBe('2000');
  });

  it('also enforces a holiday minimum higher than the ordinary season minimum', async () => {
    expect((await setMinimum(high, 5)).status).toBe(200);
    expect((await setMinimum(holiday, 6)).status).toBe(200);
    await expect(createWebsiteBooking(prisma, {
      ...input, checkIn: '2030-05-08', checkOut: '2030-05-13'
    }, '127.0.0.1')).rejects.toMatchObject({ code: 'MINIMUM_STAY' });
  });

  it('does not retroactively alter or cancel an existing shorter hold', async () => {
    const { booking, ownerToken } = await createWebsiteBooking(prisma, input, '127.0.0.1');
    expect((await setMinimum(high, 5)).status).toBe(200);
    const stored = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(stored.status).toBe('PENDING');
    expect(stored.totalPrice.toString()).toBe(booking.totalPrice.toString());
    expect(stored.expiresAt).toEqual(booking.expiresAt);
    await expect(completeBookingDecision(prisma, ownerToken, 'CONFIRMED')).resolves.toHaveProperty('status', 'CONFIRMED');
  });

  it('applies the same minimum to legacy guest-verification requests', async () => {
    expect((await setMinimum(high, 5)).status).toBe(200);
    await expect(requestBookingVerification(prisma, input, '127.0.0.1')).rejects.toMatchObject({ code: 'MINIMUM_STAY' });
    expect(await prisma.bookingVerification.count()).toBe(0);
  });

  it('revalidates a legacy verification before preview and completion after a minimum changes', async () => {
    const verification = await requestBookingVerification(prisma, input, '127.0.0.1');
    expect((await setMinimum(high, 5)).status).toBe(200);
    await expect(previewBookingVerification(prisma, verification.token)).rejects.toMatchObject({ code: 'MINIMUM_STAY' });
    await expect(completeBookingVerification(prisma, verification.token, '1600')).rejects.toMatchObject({ code: 'MINIMUM_STAY' });
    expect(await prisma.booking.count()).toBe(0);
    expect(await prisma.bookingVerification.count({ where: { consumedAt: null } })).toBe(1);
  });

  it('preserves the owner’s ability to create an individual shorter manual booking', async () => {
    expect((await setMinimum(high, 5)).status).toBe(200);
    const result = await request(createApp()).post('/api/admin/bookings/manual')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...input, pricePerNight: 500, discountPercent: 0, depositAmount: 0 });
    expect(result.status).toBe(201);
    expect(result.body).toMatchObject({ status: 'CONFIRMED', totalPrice: 1000 });
  });

  it('requires authentication to change a minimum', async () => {
    expect((await request(createApp()).patch(`/api/admin/pricing/${high.id}`)
      .send({ ...high, minNights: 5 })).status).toBe(401);
  });
});

describe('editable public stay description', () => {
  const description = {
    minStayTextPl: 'Maj–sierpień: minimum 5 nocy. Pozostałe terminy: 2 noce.',
    minStayTextEn: 'May–August: at least 5 nights. Other dates: 2 nights.'
  };

  it('persists both languages and serves them publicly without changing numeric rules', async () => {
    const saved = await request(createApp()).patch('/api/admin/pricing-settings')
      .set('Authorization', `Bearer ${token}`).send(description);
    expect(saved.status).toBe(200);
    expect(saved.body).toMatchObject(description);
    const listed = await request(createApp()).get('/api/pricing/settings');
    expect(listed.status).toBe(200);
    expect(listed.body).toMatchObject(description);
    await expect(createWebsiteBooking(prisma, input, '127.0.0.1')).resolves.toHaveProperty('booking.status', 'PENDING');
  });

  it('rejects blank or excessively long descriptions', async () => {
    for (const minStayTextPl of ['', '   ', 'x'.repeat(2001)]) {
      const saved = await request(createApp()).patch('/api/admin/pricing-settings')
        .set('Authorization', `Bearer ${token}`).send({ ...description, minStayTextPl });
      expect(saved.status).toBe(400);
    }
  });

  it('requires authentication to edit the public description', async () => {
    expect((await request(createApp()).patch('/api/admin/pricing-settings').send(description)).status).toBe(401);
  });
});
