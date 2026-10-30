import { createServer, type Server, type Socket } from 'node:net';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../src/index';
import { createWebsiteBooking } from '../src/services/bookingVerification';
import { processNextConfirmation, type ConfirmationSender } from '../src/services/confirmationQueue';

const db = new PrismaClient();
const messages: string[] = [];
const sockets = new Set<Socket>();
let server: Server;
let send: ConfirmationSender;
const token = jwt.sign({ adminId: 'notification-test' }, process.env.JWT_SECRET || 'test_secret');
const input = { guestName: 'Synthetic guest', guestEmail: 'synthetic@example.invalid', guestPhone: '0',
  checkIn: '2030-06-10', checkOut: '2030-06-12', guestsCount: 2, locale: 'en' as const };

beforeAll(async () => {
  server = createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.setEncoding('utf8');
    socket.write('220 localhost synthetic test SMTP\r\n');
    let buffer = '';
    let data: string[] | null = null;
    socket.on('data', (chunk) => {
      buffer += chunk;
      let end: number;
      while ((end = buffer.indexOf('\r\n')) !== -1) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (data) {
          if (line === '.') {
            messages.push(data.join('\r\n'));
            data = null;
            socket.write('250 Message accepted\r\n');
          } else data.push(line);
        } else if (line === 'DATA') {
          data = [];
          socket.write('354 End with a dot\r\n');
        } else if (line === 'QUIT') socket.end('221 Bye\r\n');
        else socket.write('250 OK\r\n');
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing synthetic SMTP port');
  jest.replaceProperty(process, 'env', { ...process.env, SMTP_HOST: '127.0.0.1',
    SMTP_PORT: String(address.port), SMTP_USER: '', SMTP_PASS: '', OWNER_EMAIL: 'owner@example.invalid' });
  jest.isolateModules(() => {
    send = jest.requireActual<typeof import('../src/services/email')>('../src/services/email').sendGuestBookingEmail;
  });
});
beforeEach(async () => {
  messages.length = 0;
  await db.booking.deleteMany();
  await db.bookingAbuseEvent.deleteMany();
  await db.blockedDate.deleteMany();
  await db.pricingSeason.deleteMany();
  await db.pricingSeason.create({ data: { namePl: 'Test', nameEn: 'Test', pricePerNight: 500,
    dateFrom: new Date('2030-01-01'), dateTo: new Date('2030-12-31') } });
});
afterAll(async () => {
  sockets.forEach((socket) => socket.destroy());
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  jest.restoreAllMocks();
  await db.$disconnect();
});

it('delivers pending then final adjusted price/deposit messages through SMTP after a panel confirmation', async () => {
  const { booking } = await createWebsiteBooking(db, input, '127.0.0.1');
  await processNextConfirmation(db, new Date(), send);
  expect(messages).toHaveLength(1);
  expect(messages[0]).toContain("awaits the owner's confirmation");
  expect(messages[0]).not.toContain('/verify-booking');
  const app = createApp();
  expect((await request(app).patch(`/api/admin/bookings/${booking.id}/price`)
    .set('Authorization', `Bearer ${token}`).send({ mode: 'amount', totalPrice: 750 })).status).toBe(200);
  expect((await request(app).patch(`/api/admin/bookings/${booking.id}/deposit`)
    .set('Authorization', `Bearer ${token}`).send({ depositAmount: 200 })).status).toBe(200);
  expect((await request(app).patch(`/api/admin/bookings/${booking.id}`)
    .set('Authorization', `Bearer ${token}`).send({ status: 'CONFIRMED' })).status).toBe(200);
  await processNextConfirmation(db, new Date(), send);
  expect(messages).toHaveLength(2);
  expect(messages[1]).toContain('Total: 750.00 PLN');
  expect(messages[1]).toContain('Deposit paid: 200.00 PLN');
  expect(messages[1]).toContain('Remaining on arrival: 550.00 PLN');
  expect(await db.confirmationEmail.findUnique({ where: { bookingId: booking.id } }))
    .toMatchObject({ kind: 'CONFIRMED', status: 'SENT' });
});

it('delivers a rejection through SMTP after a panel decision and immediately frees the nights', async () => {
  const { booking } = await createWebsiteBooking(db, input, '127.0.0.1');
  await processNextConfirmation(db, new Date(), send);
  const app = createApp();
  expect((await request(app).patch(`/api/admin/bookings/${booking.id}`)
    .set('Authorization', `Bearer ${token}`).send({ status: 'CANCELLED' })).status).toBe(200);
  const availability = await request(app).get('/api/availability?month=6&year=2030');
  expect(availability.body.pendingDates).toEqual([]);
  await processNextConfirmation(db, new Date(), send);
  expect(messages).toHaveLength(2);
  expect(messages[1]).toContain(booking.reference);
  expect(messages[1].replace(/=\r\n/g, '')).toContain('no longer holds these dates');
  expect(await db.confirmationEmail.findUnique({ where: { bookingId: booking.id } }))
    .toMatchObject({ kind: 'CANCELLED', status: 'SENT' });
  expect((await request(app).patch(`/api/admin/bookings/${booking.id}`)
    .set('Authorization', `Bearer ${token}`).send({ status: 'CANCELLED' })).status).toBe(200);
  expect(await processNextConfirmation(db, new Date(), send)).toBe(false);
  expect(messages).toHaveLength(2);
});
