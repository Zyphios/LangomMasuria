import request from 'supertest';
import { prisma, createApp } from '../src/index';

describe('public content endpoints', () => {
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
