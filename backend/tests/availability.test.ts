import request from 'supertest';
import { BookingStatus, Prisma } from '@prisma/client';
import { prisma, createApp } from '../src/index';

describe('GET /api/availability', () => {
  beforeAll(async () => {
    // Clean up any leftover data from previous tests to ensure isolation
    await prisma.blockedDate.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.blockedDate.create({ data: { date: new Date('2026-06-10'), reason: 'Maintenance' } });
    await prisma.booking.create({
      data: {
        guestName: 'Jan Kowalski',
        guestEmail: 'jan@example.com',
        guestPhone: '+48123123123',
        checkIn: new Date('2026-06-14'),
        checkOut: new Date('2026-06-17'),
        guestsCount: 4,
        totalPrice: new Prisma.Decimal(2600),
        status: BookingStatus.CONFIRMED,
        locale: 'pl'
      }
    });
  });

  afterAll(async () => {
    await prisma.blockedDate.deleteMany();
    await prisma.booking.deleteMany();
  });

  it('returns blocked dates and confirmed booking nights in YYYY-MM-DD format', async () => {
    const response = await request(createApp()).get('/api/availability?month=6&year=2026');
    expect(response.status).toBe(200);
    expect(response.body.blockedDates).toEqual(['2026-06-10', '2026-06-14', '2026-06-15', '2026-06-16']);
  });
});
