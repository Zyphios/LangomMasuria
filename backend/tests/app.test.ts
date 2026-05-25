import request from 'supertest';
import { createApp } from '../src/index';

describe('backend bootstrap', () => {
  it('returns JSON 404 for unknown routes', async () => {
    const app = createApp();
    const response = await request(app).get('/missing');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Not found' });
  });
});
