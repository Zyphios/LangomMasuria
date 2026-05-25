import request from 'supertest';
import { createApp } from '../src/index';

describe('payment stub', () => {
  it('returns a mock redirect and order id', async () => {
    const response = await request(createApp()).post('/api/payment/init').send({ bookingId: 'booking-1', amount: 3800 });
    expect(response.status).toBe(200);
    expect(response.body.redirectUrl).toBe('/booking?step=4&status=success');
    expect(response.body.orderId).toMatch(/^STUB-/);
  });

  it('accepts notification callbacks', async () => {
    const response = await request(createApp()).post('/api/payment/notify').send({ orderId: 'STUB-1' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
