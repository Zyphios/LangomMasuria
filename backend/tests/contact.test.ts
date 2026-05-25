import request from 'supertest';
import { Prisma } from '@prisma/client';
import { prisma, createApp } from '../src/index';

describe('public content endpoints', () => {
  beforeAll(async () => {
    // Ensure 3 pricing seasons exist for the test
    const count = await prisma.pricingSeason.count();
    if (count < 3) {
      await prisma.pricingSeason.deleteMany();
      await prisma.pricingSeason.createMany({
        data: [
          { namePl: 'Sezon niski', nameEn: 'Low season', pricePerNight: new Prisma.Decimal(600), dateFrom: new Date('2026-10-01'), dateTo: new Date('2027-04-30'), isFeatured: false },
          { namePl: 'Sezon wysoki', nameEn: 'High season', pricePerNight: new Prisma.Decimal(1200), dateFrom: new Date('2026-05-01'), dateTo: new Date('2026-09-30'), isFeatured: true },
          { namePl: 'Święta i Nowy Rok', nameEn: 'Holidays', pricePerNight: new Prisma.Decimal(1500), dateFrom: new Date('2026-12-20'), dateTo: new Date('2027-01-05'), isFeatured: false }
        ]
      });
    }
  });

  it('stores a contact message', async () => {
    const response = await request(createApp()).post('/api/contact').send({ name: 'Maria', email: 'maria@example.com', message: 'Czy jacuzzi jest caloroczne?' });
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ success: true });
  });

  it('returns gallery images sorted by sortOrder', async () => {
    const response = await request(createApp()).get('/api/gallery');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('returns all pricing seasons', async () => {
    const response = await request(createApp()).get('/api/pricing');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);
  });

  afterAll(async () => { await prisma.contactMessage.deleteMany(); });
});
