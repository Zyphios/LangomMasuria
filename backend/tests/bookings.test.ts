import request from 'supertest';
import { Prisma } from '@prisma/client';
import { prisma, createApp } from '../src/index';
import * as email from '../src/services/email';

describe('POST /api/bookings', () => {
  beforeAll(async () => {
    jest.spyOn(email, 'sendOwnerBookingEmail').mockResolvedValue(undefined);
    await prisma.bookingVerification.deleteMany();
    await prisma.bookingAbuseEvent.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.blockedDate.deleteMany();
    await prisma.pricingSeason.deleteMany();
    await prisma.pricingSeason.create({ data: { namePl: 'Sezon wysoki', nameEn: 'High season', pricePerNight: new Prisma.Decimal(1200), dateFrom: new Date('2026-05-01'), dateTo: new Date('2026-09-30'), isFeatured: true } });
  });

  afterAll(async () => { await prisma.booking.deleteMany(); });

  it('immediately creates a pending booking, holds its nights and queues an informative email', async () => {
    const response = await request(createApp()).post('/api/bookings').send({ guestName: 'Anna Nowak', guestEmail: 'anna@example.com', guestPhone: '+48555111222', checkIn: '2026-06-01', checkOut: '2026-06-04', guestsCount: 4, notes: 'Sauna please', locale: 'pl' });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ status: 'PENDING', totalPrice: 3600 });
    expect(response.body.reference).toEqual(expect.any(String));
    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: response.body.id } });
    expect(booking.expiresAt!.getTime() - booking.createdAt.getTime()).toBe(86400000);
    expect(booking.originalTotalPrice?.toNumber()).toBe(3600);
    expect(await prisma.bookingVerification.count()).toBe(0);
    expect(await prisma.confirmationEmail.findUnique({ where: { bookingId: booking.id } }))
      .toMatchObject({ kind: 'PENDING', status: 'QUEUED' });
    const availability = await request(createApp()).get('/api/availability?month=6&year=2026');
    expect(availability.body.pendingDates).toEqual(['2026-06-01', '2026-06-02', '2026-06-03']);
    expect(availability.body.pendingDates).not.toContain('2026-06-04');
  });

  it('keeps the provisional booking when SMTP is unavailable and never creates a verification link', async () => {
    const response = await request(createApp()).post('/api/bookings').send({
      guestName: 'No SMTP', guestEmail: 'queued@example.invalid', guestPhone: '0',
      checkIn: '2026-07-01', checkOut: '2026-07-03', guestsCount: 2, locale: 'en'
    });
    expect(response.status).toBe(201);
    expect(await prisma.booking.findUnique({ where: { id: response.body.id } })).toMatchObject({ status: 'PENDING' });
    expect(await prisma.bookingVerification.count()).toBe(0);
  });

  it('rejects stays shorter than two nights', async () => {
    const response = await request(createApp()).post('/api/bookings').send({ guestName: 'Short Stay', guestEmail: 'short@example.com', guestPhone: '+48555111000', checkIn: '2026-06-01', checkOut: '2026-06-02', guestsCount: 2, locale: 'en' });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Minimum stay is 2 nights');
  });
});
