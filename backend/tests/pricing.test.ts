import jwt from 'jsonwebtoken';
import request from 'supertest';
import type { BookingStatus } from '@prisma/client';
import { prisma, createApp } from '../src/index';
import { calculateTotalPrice } from '../src/services/availability';

const token = jwt.sign({ adminId: 'pricing-test' }, process.env.JWT_SECRET || 'test_secret');
const low = { id: 'rate-low', namePl: 'Sezon niski', nameEn: 'Low season', pricePerNight: 700,
  dateFrom: '2026-10-01', dateTo: '2027-04-30', isFeatured: false };
const high = { id: 'rate-high', namePl: 'Sezon wysoki', nameEn: 'High season', pricePerNight: 800,
  dateFrom: '2026-05-01', dateTo: '2026-09-30', isFeatured: true };
const holidays = { id: 'rate-holiday', namePl: 'Święta i Nowy Rok', nameEn: 'Holidays', pricePerNight: 1000,
  dateFrom: '2026-12-20', dateTo: '2027-01-05', isFeatured: false };

beforeEach(async () => {
  await prisma.booking.deleteMany();
  await prisma.pricingSeason.deleteMany();
  await prisma.pricingSeason.createMany({ data: [low, high, holidays].map((rate) => ({
    ...rate, dateFrom: new Date(rate.dateFrom), dateTo: new Date(rate.dateTo)
  })) });
});

const updateRate = (id: string, rate: typeof low) => request(createApp())
  .patch(`/api/admin/pricing/${id}`).set('Authorization', `Bearer ${token}`)
  .send(rate).timeout({ response: 1500, deadline: 2500 });

describe('dynamic seasonal pricing', () => {
  it('gives holidays priority over the overlapping low season', async () => {
    expect((await calculateTotalPrice(prisma, new Date('2026-12-24'), new Date('2026-12-26'))).toString()).toBe('2000');
  });

  it('adds each night separately across the start and inclusive end of the holiday period', async () => {
    expect((await calculateTotalPrice(prisma, new Date('2026-12-19'), new Date('2026-12-22'))).toString()).toBe('2700');
    expect((await calculateTotalPrice(prisma, new Date('2027-01-05'), new Date('2027-01-07'))).toString()).toBe('1700');
  });

  it('publishes edited prices and dates and uses them in subsequent quotes', async () => {
    const response = await updateRate(low.id, { ...low, pricePerNight: 750.5, dateFrom: '2026-10-02', dateTo: '2027-04-29' });
    expect(response.status).toBe(200);
    const listed = await request(createApp()).get('/api/pricing');
    expect(listed.body).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: low.id, pricePerNight: '750.5', dateFrom: '2026-10-02T00:00:00.000Z', dateTo: '2027-04-29T00:00:00.000Z' })
    ]));
    expect((await calculateTotalPrice(prisma, new Date('2026-10-02'), new Date('2026-10-04'))).toString()).toBe('1501');
    await expect(calculateTotalPrice(prisma, new Date('2026-10-01'), new Date('2026-10-03'))).rejects.toMatchObject({ code: 'NO_PRICING' });
  });

  it('preserves stored prices and deadlines of pending and confirmed bookings', async () => {
    const deadline = new Date(Date.now() + 86400000);
    const statuses: BookingStatus[] = ['PENDING', 'CONFIRMED'];
    await prisma.booking.createMany({ data: statuses.map((status, index) => ({
      id: `price-history-${index}`, reference: `PRICE-HISTORY-${index}`, guestName: 'Synthetic guest', guestPhone: '000',
      checkIn: new Date('2026-11-02'), checkOut: new Date('2026-11-04'), guestsCount: 2, totalPrice: 1234.5,
      locale: 'pl', status, expiresAt: status === 'PENDING' ? deadline : null
    })) });
    expect((await updateRate(low.id, { ...low, pricePerNight: 850 })).status).toBe(200);
    const bookings = await prisma.booking.findMany({ orderBy: { id: 'asc' } });
    expect(bookings.map((booking) => booking.totalPrice.toString())).toEqual(['1234.5', '1234.5']);
    expect(bookings[0].expiresAt).toEqual(deadline);
    expect(bookings.map((booking) => booking.status)).toEqual(['PENDING', 'CONFIRMED']);
  });

  it('rejects overlapping ordinary seasons without saving the conflicting change', async () => {
    const response = await updateRate(low.id, { ...low, dateFrom: '2026-09-30' });
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('PRICING_OVERLAP');
    expect((await prisma.pricingSeason.findUniqueOrThrow({ where: { id: low.id } })).dateFrom.toISOString()).toBe('2026-10-01T00:00:00.000Z');
  });

  it('allows the holiday period to overlap an ordinary season', async () => {
    expect((await updateRate(holidays.id, { ...holidays, dateFrom: '2026-12-21' })).status).toBe(200);
    expect((await calculateTotalPrice(prisma, new Date('2026-12-21'), new Date('2026-12-23'))).toString()).toBe('2000');
  });

  it('rejects reversed dates', async () => {
    expect((await updateRate(low.id, { ...low, dateTo: '2026-09-01' })).status).toBe(400);
  });

  it.each([0, -1, 700.123, 100000000])('rejects invalid nightly price %s', async (pricePerNight) => {
    expect((await updateRate(low.id, { ...low, pricePerNight })).status).toBe(400);
  });

  it('returns an explicit response for a missing season instead of hanging', async () => {
    const response = await updateRate('missing-season', low);
    expect(response.status).toBe(404);
    expect(response.body.code).toBe('PRICING_NOT_FOUND');
  });

  it('requires admin authentication to edit rates', async () => {
    const response = await request(createApp()).patch(`/api/admin/pricing/${low.id}`).send({ ...low, pricePerNight: 900 });
    expect(response.status).toBe(401);
    expect((await prisma.pricingSeason.findUniqueOrThrow({ where: { id: low.id } })).pricePerNight.toString()).toBe('700');
  });
});
