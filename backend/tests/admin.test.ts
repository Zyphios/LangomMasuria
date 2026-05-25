import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { BookingStatus, Prisma } from '@prisma/client';
import { prisma, createApp } from '../src/index';

describe('admin api', () => {
  let token = '';
  let bookingId = '';
  let messageId = '';
  let pricingId = '';

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('Lagom123!', 10);
    const admin = await prisma.adminUser.upsert({ where: { email: 'admin@lagommasuria.pl' }, update: { passwordHash }, create: { email: 'admin@lagommasuria.pl', passwordHash } });
    token = jwt.sign({ adminId: admin.id }, process.env.JWT_SECRET || 'test_secret');
    bookingId = (await prisma.booking.create({ data: { guestName: 'Admin Test', guestEmail: 'guest@example.com', guestPhone: '+48111111111', checkIn: new Date('2026-07-01'), checkOut: new Date('2026-07-03'), guestsCount: 2, totalPrice: new Prisma.Decimal(2600), status: BookingStatus.PENDING, locale: 'pl' } })).id;
    messageId = (await prisma.contactMessage.create({ data: { name: 'Reader', email: 'reader@example.com', message: 'Hello' } })).id;
    pricingId = (await prisma.pricingSeason.findFirstOrThrow()).id;
  });

  it('logs in and returns a JWT', async () => {
    const response = await request(createApp()).post('/api/admin/login').send({ email: 'admin@lagommasuria.pl', password: 'Lagom123!' });
    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
  });

  it('lists bookings for authorized admins', async () => {
    const response = await request(createApp()).get('/api/admin/bookings').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body[0].id).toBe(bookingId);
  });

  it('updates booking status', async () => {
    const response = await request(createApp()).patch(`/api/admin/bookings/${bookingId}`).set('Authorization', `Bearer ${token}`).send({ status: 'CONFIRMED' });
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('CONFIRMED');
  });

  it('marks contact messages as read', async () => {
    const response = await request(createApp()).patch(`/api/admin/messages/${messageId}`).set('Authorization', `Bearer ${token}`).send({ isRead: true });
    expect(response.status).toBe(200);
    expect(response.body.isRead).toBe(true);
  });

  it('updates pricing', async () => {
    const response = await request(createApp()).patch(`/api/admin/pricing/${pricingId}`).set('Authorization', `Bearer ${token}`).send({ namePl: 'Sezon premium', nameEn: 'Premium season', pricePerNight: 1400, dateFrom: '2026-05-01', dateTo: '2026-09-30', isFeatured: true });
    expect(response.status).toBe(200);
    expect(response.body.pricePerNight).toBe('1400');
  });
});
