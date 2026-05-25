import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { requireAuth } from '../src/middleware/auth';
import { validate } from '../src/middleware/validate';
import { z } from 'zod';

describe('middleware', () => {
  it('reads Authorization Bearer token and exposes adminId', async () => {
    const token = jwt.sign({ adminId: 'admin-1' }, process.env.JWT_SECRET || 'test_secret');
    const app = express();
    app.get('/secure', requireAuth as never, (req, res) => res.json({ adminId: (req as typeof req & { adminId: string }).adminId }));
    const response = await request(app).get('/secure').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ adminId: 'admin-1' });
  });

  it('returns validation errors from a Zod schema', async () => {
    const app = express();
    app.use(express.json());
    app.post('/validated', validate(z.object({ email: z.string().email() })), (_req, res) => res.status(204).send());
    const response = await request(app).post('/validated').send({ email: 'broken' });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Validation failed');
  });
});
