import fs from 'fs';
import os from 'os';
import path from 'path';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { prisma, createApp } from '../src/index';

const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32, 1)]);

describe('gallery upload', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uploads-'));
  let token = '';

  beforeAll(async () => {
    process.env.UPLOAD_DIR = dir;
    const admin = await prisma.adminUser.upsert({ where: { email: 'upload@lagommasuria.pl' }, update: {}, create: { email: 'upload@lagommasuria.pl', passwordHash: 'x' } });
    token = jwt.sign({ adminId: admin.id }, process.env.JWT_SECRET || 'test_secret');
  });

  afterAll(() => { fs.rmSync(dir, { recursive: true, force: true }); delete process.env.UPLOAD_DIR; });

  it('requires authentication', async () => {
    const response = await request(createApp()).post('/api/admin/gallery/upload').set('Content-Type', 'image/png').send(png);
    expect(response.status).toBe(401);
  });

  it('rejects files that are not images', async () => {
    const response = await request(createApp()).post('/api/admin/gallery/upload')
      .set('Authorization', `Bearer ${token}`).set('Content-Type', 'image/png').send(Buffer.from('<script>alert(1)</script>'));
    expect(response.status).toBe(400);
  });

  it('stores, serves and deletes an uploaded image', async () => {
    const app = createApp();
    const created = await request(app).post('/api/admin/gallery/upload?captionPl=Test')
      .set('Authorization', `Bearer ${token}`).set('Content-Type', 'image/png').send(png);
    expect(created.status).toBe(201);
    expect(created.body.url).toMatch(/^\/api\/uploads\/[0-9a-f-]+\.png$/);
    expect(created.body.captionPl).toBe('Test');

    const served = await request(app).get(created.body.url);
    expect(served.status).toBe(200);

    const removed = await request(app).delete(`/api/admin/gallery/${created.body.id}`).set('Authorization', `Bearer ${token}`);
    expect(removed.status).toBe(204);
    expect((await request(app).get(created.body.url)).status).toBe(404);
    expect(fs.readdirSync(dir)).toHaveLength(0);
  });
});
