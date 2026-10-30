import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('API base URL', () => {
  it('preserves rate-limit metadata needed for clear retry guidance', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ message: 'BOOKING_RATE_LIMIT', code: 'BOOKING_RATE_LIMIT', retryAfter: 3600 }), { status: 429 }
    )));
    const { apiClient } = await import('./client');
    await expect(apiClient('/api/bookings')).rejects.toMatchObject({ status: 429, code: 'BOOKING_RATE_LIMIT', retryAfter: 3600 });
  });
  it.each([
    ['', '/api/pricing'],
    [undefined, 'http://localhost:4000/api/pricing'],
    ['https://example.com', 'https://example.com/api/pricing']
  ])('uses %s as the API base', async (baseUrl, expectedUrl) => {
    vi.stubEnv('VITE_API_URL', baseUrl);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ id: 'season' }]), {
        headers: { 'Content-Type': 'application/json' }
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const { apiClient } = await import('./client');

    await expect(apiClient('/api/pricing')).resolves.toEqual([{ id: 'season' }]);
    expect(fetchMock).toHaveBeenCalledWith(expectedUrl, {
      headers: { 'Content-Type': 'application/json' }
    });
  });
});
