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
    await prisma.booking.deleteMany();
    await prisma.blockedDate.deleteMany();
    await prisma.pricingSeason.deleteMany();
    const pricing = await prisma.pricingSeason.create({ data: { namePl: 'Test', nameEn: 'Test', pricePerNight: 500,
      dateFrom: new Date('2026-01-01'), dateTo: new Date('2026-12-31') } });
    const passwordHash = await bcrypt.hash('Lagom123!', 10);
    const admin = await prisma.adminUser.upsert({ where: { email: 'admin@lagommasuria.pl' }, update: { passwordHash }, create: { email: 'admin@lagommasuria.pl', passwordHash } });
    token = jwt.sign({ adminId: admin.id }, process.env.JWT_SECRET || 'test_secret');
    bookingId = (await prisma.booking.create({ data: { reference: 'LM-TEST-ADMIN001', guestName: 'Admin Test', guestEmail: 'guest@example.com', guestPhone: '+48111111111', checkIn: new Date('2026-07-01'), checkOut: new Date('2026-07-03'), guestsCount: 2, totalPrice: new Prisma.Decimal(2600), status: BookingStatus.PENDING, expiresAt: new Date(Date.now() + 86400000), locale: 'pl' } })).id;
    messageId = (await prisma.contactMessage.create({ data: { name: 'Reader', email: 'reader@example.com', message: 'Hello' } })).id;
    pricingId = pricing.id;
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
    expect(response.body[0]).not.toHaveProperty('decisionTokenHash');
    expect(response.body[0]).not.toHaveProperty('confirmationEmail');
    expect(response.body[0].confirmation.status).toBe('NOT_RECORDED');
  });

  it('updates booking status', async () => {
    const response = await request(createApp()).patch(`/api/admin/bookings/${bookingId}`).set('Authorization', `Bearer ${token}`).send({ status: 'CONFIRMED' });
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('CONFIRMED');
  });

  it('queues an explicit failed-mail retry with a JSON response for the owner UI', async () => {
    await prisma.confirmationEmail.update({ where: { bookingId }, data: { status: 'FAILED', attempts: 3 } });
    const response = await request(createApp()).post(`/api/admin/bookings/${bookingId}/confirmation/retry`)
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(202);
    expect(response.body.status).toBe('QUEUED');
    const mail = await prisma.confirmationEmail.findUniqueOrThrow({ where: { bookingId } });
    expect(mail.status).toBe('QUEUED');
    expect(mail.attempts).toBe(0);
  });

  it('marks contact messages as read', async () => {
    const response = await request(createApp()).patch(`/api/admin/messages/${messageId}`).set('Authorization', `Bearer ${token}`).send({ isRead: true });
    expect(response.status).toBe(200);
    expect(response.body.isRead).toBe(true);
    const refreshed = await request(createApp()).get('/api/admin/messages').set('Authorization', `Bearer ${token}`);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: messageId, isRead: true })]));
  });

  it('returns a logged JSON error when message loading fails', async () => {
    const failure = jest.spyOn(prisma.contactMessage, 'findMany').mockRejectedValueOnce(new Error('synthetic read failure'));
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const response = await request(createApp()).get('/api/admin/messages').set('Authorization', `Bearer ${token}`)
        .timeout({ response: 1000, deadline: 1500 });
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: 'Internal server error' });
      expect(log).toHaveBeenCalledWith('API operation failed:', 'Error');
    } finally {
      failure.mockRestore();
      log.mockRestore();
    }
  });

  it('returns a logged JSON error when marking a message fails', async () => {
    const failure = jest.spyOn(prisma.contactMessage, 'update').mockRejectedValueOnce(new Error('synthetic mark failure'));
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const response = await request(createApp()).patch(`/api/admin/messages/${messageId}`).set('Authorization', `Bearer ${token}`)
        .send({ isRead: true }).timeout({ response: 1000, deadline: 1500 });
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: 'Internal server error' });
      expect(log).toHaveBeenCalledWith('API operation failed:', 'Error');
    } finally {
      failure.mockRestore();
      log.mockRestore();
    }
  });

  it('returns a logged JSON error when saving a deposit fails', async () => {
    const failure = jest.spyOn(prisma.booking, 'update').mockRejectedValueOnce(new Error('synthetic deposit failure'));
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const response = await request(createApp()).patch(`/api/admin/bookings/${bookingId}/deposit`).set('Authorization', `Bearer ${token}`)
        .send({ depositAmount: 200 }).timeout({ response: 1000, deadline: 1500 });
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: 'Internal server error' });
      expect(log).toHaveBeenCalledWith('API operation failed:', 'Error');
    } finally {
      failure.mockRestore();
      log.mockRestore();
    }
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

    expect(blocked).toBeNull();
    const availability = await request(createApp()).get('/api/availability?month=9&year=2026');
    expect(availability.body.confirmedDates).toContain('2026-09-10');
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

    expect(response.status).toBe(409);
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
