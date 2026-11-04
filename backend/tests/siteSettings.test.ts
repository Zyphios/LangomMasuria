import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp, prisma } from '../src/index';

const app = createApp();
const token = jwt.sign({ adminId: 'site-settings-test' }, process.env.JWT_SECRET || 'test_secret');
const empty = { facebookUrl: '', instagramUrl: '' };
let original: typeof empty | undefined;
const save = (value: Record<string, unknown>) => request(app).patch('/api/admin/site-settings')
  .set('Authorization', `Bearer ${token}`).send(value);

beforeAll(async () => {
  const response = await request(app).get('/api/site-settings');
  if (response.status === 200) original = response.body;
});

afterAll(async () => {
  if (original) await save(original);
  await prisma.$disconnect();
});

describe('persistent social links', () => {
  it('publishes the two editable social links without requiring authentication', async () => {
    const response = await request(app).get('/api/site-settings');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ facebookUrl: expect.any(String), instagramUrl: expect.any(String) });
  });

  it('requires owner authentication before changing links', async () => {
    expect((await request(app).patch('/api/admin/site-settings').send(empty)).status).toBe(401);
  });

  it('persists trimmed HTTPS links and allows clearing them', async () => {
    const links = { facebookUrl: 'https://www.facebook.com/example', instagramUrl: 'https://www.instagram.com/example/' };
    expect((await save({ ...links, facebookUrl: `  ${links.facebookUrl}  ` })).status).toBe(200);
    expect((await request(app).get('/api/site-settings')).body).toEqual(links);
    expect((await save(empty)).status).toBe(200);
    expect((await request(app).get('/api/site-settings')).body).toEqual(empty);
  });

  describe.each(['facebookUrl', 'instagramUrl'])('%s validation', (field) => {
    it.each([
      ['script URL', 'javascript:alert(1)'], ['HTTP URL', 'http://facebook.com/example'],
      ['relative URL', '//instagram.com/example'], ['incomplete scheme', 'https:facebook.com/example'],
      ['invalid URL', 'not a URL'], ['overlong URL', 'https://' + 'x'.repeat(2048)], ['non-string', 42]
    ])('rejects %s without changing saved settings', async (_label, value) => {
        expect((await save(empty)).status).toBe(200);
        expect((await save({ ...empty, [field]: value })).status).toBe(400);
        expect((await request(app).get('/api/site-settings')).body).toEqual(empty);
      }
    );
  });

  it('reports a missing settings row instead of publishing fake empty links', async () => {
    const stored = await prisma.siteSettings.findUniqueOrThrow({ where: { id: 1 } });
    await prisma.siteSettings.delete({ where: { id: 1 } });
    try {
      const response = await request(app).get('/api/site-settings');
      expect(response.status).toBe(503);
      expect(response.body.code).toBe('SITE_SETTINGS_UNAVAILABLE');
    } finally { await prisma.siteSettings.create({ data: stored }); }
  });
});
