import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp, prisma } from '../src/index';
import { processNextConfirmation } from '../src/services/confirmationQueue';
import { buildGuestConfirmationEmail } from '../src/services/email';
import { newBookingSecret } from '../src/services/bookingLinks';

const auth = `Bearer ${jwt.sign({ adminId: 'price-editor' }, process.env.JWT_SECRET || 'test_secret')}`;
const app = createApp();
const ownerSecret = newBookingSecret();
const edit = (body: object, id = 'editable-price') => request(app).patch(`/api/admin/bookings/${id}/price`)
  .set('Authorization', auth).send(body).timeout({ response: 3000, deadline: 5000 });

beforeEach(async () => {
  await prisma.booking.deleteMany();
  await prisma.blockedDate.deleteMany();
  await prisma.booking.create({ data: {
    id: 'editable-price', reference: 'EDITABLE-PRICE', guestName: 'Synthetic guest',
    guestEmail: 'price@example.invalid', guestPhone: '000', guestsCount: 2, locale: 'pl',
    checkIn: new Date('2040-06-10'), checkOut: new Date('2040-06-12'),
    totalPrice: 3000, depositAmount: 600, expiresAt: new Date(Date.now() + 86400000),
    decisionTokenHash: ownerSecret.hash
  } });
});

describe('pending booking price editing', () => {
  it('persists a manual total and original price without changing the deposit, deadline or public rates', async () => {
    const before = await prisma.booking.findUniqueOrThrow({ where: { id: 'editable-price' } });
    const rates = await prisma.pricingSeason.findMany();
    const response = await edit({ mode: 'amount', totalPrice: 2500.5 });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ totalPrice: '2500.5', originalTotalPrice: '3000', discountPercent: null });
    const saved = await prisma.booking.findUniqueOrThrow({ where: { id: 'editable-price' } });
    expect(saved.totalPrice.toString()).toBe('2500.5');
    expect(saved.depositAmount.toString()).toBe('600');
    expect(saved.expiresAt).toEqual(before.expiresAt);
    expect(saved.status).toBe('PENDING');
    expect(await prisma.pricingSeason.findMany()).toEqual(rates);
    const listed = await request(app).get('/api/admin/bookings').set('Authorization', auth);
    expect(listed.body[0]).toMatchObject({ originalTotalPrice: '3000', totalPrice: '2500.5' });
  });

  it('always discounts the original quote, including after manual edits and repeat saves', async () => {
    expect((await edit({ mode: 'amount', totalPrice: 2000 })).status).toBe(200);
    for (let count = 0; count < 2; count += 1) {
      const response = await edit({ mode: 'discount', discountPercent: 10 });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ totalPrice: '2700', originalTotalPrice: '3000', discountPercent: '10' });
    }
    expect((await edit({ mode: 'discount', discountPercent: 0 })).body.totalPrice).toBe('3000');
  });

  it('rounds discounts to cents and allows a full discount without modifying a paid deposit', async () => {
    await prisma.booking.update({ where: { id: 'editable-price' }, data: { totalPrice: 100.05 } });
    expect((await edit({ mode: 'discount', discountPercent: 10 })).body.totalPrice).toBe('90.05');
    expect((await edit({ mode: 'discount', discountPercent: 100 })).body.totalPrice).toBe('0');
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: 'editable-price' } })).depositAmount.toString()).toBe('600');
  });

  it.each(['CONFIRMED', 'CANCELLED', 'EXPIRED'] as const)('rejects editing a %s booking', async (status) => {
    await prisma.booking.update({ where: { id: 'editable-price' }, data: { status } });
    expect((await edit({ mode: 'amount', totalPrice: 500 })).status).toBe(409);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: 'editable-price' } })).totalPrice.toString()).toBe('3000');
  });

  it('rejects an expired hold even before the expiry worker runs', async () => {
    await prisma.booking.update({ where: { id: 'editable-price' }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await edit({ mode: 'amount', totalPrice: 500 })).status).toBe(409);
  });

  it.each([
    { mode: 'amount', totalPrice: -1 }, { mode: 'amount', totalPrice: 1.001 },
    { mode: 'amount', totalPrice: 100000000 }, { mode: 'amount', totalPrice: '500' },
    { mode: 'discount', discountPercent: -1 }, { mode: 'discount', discountPercent: 100.01 },
    { mode: 'discount', discountPercent: 1.001 },
    { mode: 'amount', totalPrice: 500, discountPercent: 10 }
  ])('rejects invalid or ambiguous price input %j', async (body) => {
    expect((await edit(body)).status).toBe(400);
  });

  it('requires authentication and reports a missing booking', async () => {
    expect((await request(app).patch('/api/admin/bookings/editable-price/price')
      .send({ mode: 'amount', totalPrice: 500 })).status).toBe(401);
    expect((await edit({ mode: 'amount', totalPrice: 500 }, 'missing')).status).toBe(404);
  });

  it('serializes editing and confirmation so a confirmed total cannot be changed afterwards', async () => {
    const [price, confirmation] = await Promise.all([
      edit({ mode: 'discount', discountPercent: 10 }),
      request(app).patch('/api/admin/bookings/editable-price').set('Authorization', auth).send({ status: 'CONFIRMED' })
    ]);
    expect(confirmation.status).toBe(200);
    expect([200, 409]).toContain(price.status);
    const saved = await prisma.booking.findUniqueOrThrow({ where: { id: 'editable-price' } });
    expect(saved.status).toBe('CONFIRMED');
    expect(saved.totalPrice.toString()).toBe(price.status === 200 ? '2700' : '3000');
    expect((await edit({ mode: 'amount', totalPrice: 100 })).status).toBe(409);
  });

  it('delivers the edited total, paid deposit and remaining amount through the real confirmation queue', async () => {
    expect((await edit({ mode: 'discount', discountPercent: 10 })).status).toBe(200);
    const preview = await request(app).post('/api/booking-links/decision/preview').send({ token: ownerSecret.token });
    expect(preview.body.totalPrice).toBe('2700');
    expect((await request(app).post('/api/booking-links/decision/complete')
      .send({ token: ownerSecret.token, decision: 'CONFIRMED' })).status).toBe(200);
    let text = '';
    expect(await processNextConfirmation(prisma, new Date(), async (booking) => {
      text = buildGuestConfirmationEmail(booking).text;
    })).toBe(true);
    expect(text).toContain('Łącznie: 2700.00 PLN');
    expect(text).toContain('Wpłacona zaliczka: 600.00 PLN');
    expect(text).toContain('Do dopłaty na miejscu: 2100.00 PLN');
  });
});
