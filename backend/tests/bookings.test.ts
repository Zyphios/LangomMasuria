import request from 'supertest';
import { Prisma } from '@prisma/client';
import { prisma, createApp } from '../src/index';
import * as email from '../src/services/email';

describe('POST /api/bookings', () => {
  beforeAll(async () => {
    jest.spyOn(email, 'sendBookingVerificationEmail').mockResolvedValue(undefined);
    await prisma.bookingVerification.deleteMany();
    await prisma.bookingAbuseEvent.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.blockedDate.deleteMany();
    await prisma.pricingSeason.deleteMany();
    await prisma.pricingSeason.create({ data: { namePl: 'Sezon wysoki', nameEn: 'High season', pricePerNight: new Prisma.Decimal(1200), dateFrom: new Date('2026-05-01'), dateTo: new Date('2026-09-30'), isFeatured: true } });
  });

  afterAll(async () => { await prisma.booking.deleteMany(); });

  it('requests email verification and calculates the price without holding dates', async () => {
    const response = await request(createApp()).post('/api/bookings').send({ guestName: 'Anna Nowak', guestEmail: 'anna@example.com', guestPhone: '+48555111222', checkIn: '2026-06-01', checkOut: '2026-06-04', guestsCount: 4, notes: 'Sauna please', locale: 'pl' });
    expect(response.status).toBe(202);
    expect(response.body.status).toBe('EMAIL_VERIFICATION_REQUIRED');
    expect(response.body).not.toHaveProperty('id');
    expect(await prisma.booking.count()).toBe(0);
    const verification = await prisma.bookingVerification.findFirstOrThrow();
    expect(verification.totalPrice.toNumber()).toBe(3600);
  });

  it('rejects stays shorter than two nights', async () => {
    const response = await request(createApp()).post('/api/bookings').send({ guestName: 'Short Stay', guestEmail: 'short@example.com', guestPhone: '+48555111000', checkIn: '2026-06-01', checkOut: '2026-06-02', guestsCount: 2, locale: 'en' });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Minimum stay is 2 nights');
  });
});
