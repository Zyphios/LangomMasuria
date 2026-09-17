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
    bookingId = (await prisma.booking.create({ data: { reference: 'LM-TEST-ADMIN001', guestName: 'Admin Test', guestEmail: 'guest@example.com', guestPhone: '+48111111111', checkIn: new Date('2026-07-01'), checkOut: new Date('2026-07-03'), guestsCount: 2, totalPrice: new Prisma.Decimal(2600), status: BookingStatus.PENDING, locale: 'pl' } })).id;
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

  it('creates a manual booking, blocks the dates, and skips the minimum-stay rule', async () => {
    await prisma.blockedDate.deleteMany({ where: { date: { in: [new Date('2026-09-09'), new Date('2026-09-10')] } } });
    await prisma.booking.deleteMany({ where: { guestPhone: '+48600000000' } });

    const response = await request(createApp())
      .post('/api/admin/bookings/manual')
      .set('Authorization', `Bearer ${token}`)
      .send({
        guestName: 'Telefoniczny Gość',
        guestPhone: '+48600000000',
        checkIn: '2026-09-10',
        checkOut: '2026-09-11',
        guestsCount: 2,
        pricePerNight: 1000,
        discountPercent: 10,
        depositAmount: 300
      });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('CONFIRMED');

    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: response.body.id } });

    expect(booking.source).toBe('MANUAL');
    expect(booking.guestEmail).toBeNull();
    expect(booking.totalPrice.toNumber()).toBe(900);
    expect(booking.depositAmount.toNumber()).toBe(300);

    const blocked = await prisma.blockedDate.findUnique({ where: { date: new Date('2026-09-10') } });

    expect(blocked).not.toBeNull();
  });

  it('rejects a manual booking when the dates conflict with an existing confirmed booking', async () => {
    await prisma.blockedDate.deleteMany({ where: { date: { in: [new Date('2026-09-20'), new Date('2026-09-21')] } } });
    await prisma.booking.deleteMany({ where: { guestPhone: { in: ['+48600000001', '+48600000002'] } } });

    await prisma.booking.create({
      data: {
        reference: 'LM-TEST-EXISTING1',
        guestName: 'Existing Guest',
        guestEmail: 'existing@example.com',
        guestPhone: '+48600000001',
        checkIn: new Date('2026-09-20'),
        checkOut: new Date('2026-09-22'),
        guestsCount: 2,
        totalPrice: new Prisma.Decimal(2000),
        status: 'CONFIRMED',
        locale: 'pl'
      }
    });

    const response = await request(createApp())
      .post('/api/admin/bookings/manual')
      .set('Authorization', `Bearer ${token}`)
      .send({
        guestName: 'Konflikt',
        guestPhone: '+48600000002',
        checkIn: '2026-09-20',
        checkOut: '2026-09-21',
        guestsCount: 1,
        pricePerNight: 500,
        discountPercent: 0,
        depositAmount: 0
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Selected dates are not available');
  });

  it('updates the deposit amount for any booking', async () => {
    const response = await request(createApp())
      .patch(`/api/admin/bookings/${bookingId}/deposit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ depositAmount: 450 });
    expect(response.status).toBe(200);
    expect(response.body.depositAmount).toBe('450');
    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    expect(booking.depositAmount.toNumber()).toBe(450);
  });
});
