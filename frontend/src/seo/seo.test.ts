import { afterEach, describe, expect, it } from 'vitest';
import { applySeo } from '../components/Seo';
import { headHtml, seoFor, seoRoutes, structuredData } from './routes';

afterEach(() => {
  document.head.innerHTML = '';
  document.title = '';
});

describe('seoFor', () => {
  it('returns Polish title with key phrases for the home page', () => {
    const seo = seoFor('/', 'pl');
    expect(seo.title).toMatch(/balią i jacuzzi/);
    expect(seo.title).toMatch(/Stare Juchy/);
    expect(seo.canonical).toBe('https://domeknamazurskiej.pl/');
    expect(seo.noindex).toBe(false);
  });

  it('uses English text and strips trailing slashes', () => {
    const seo = seoFor('/house/', 'en');
    expect(seo.lang).toBe('en');
    expect(seo.canonical).toBe('https://domeknamazurskiej.pl/house');
    expect(seo.title).toMatch(/hot tub/i);
  });

  it('marks unknown paths as noindex with the home canonical', () => {
    const seo = seoFor('/admin/bookings', 'pl');
    expect(seo.noindex).toBe(true);
    expect(seo.canonical).toBe('https://domeknamazurskiej.pl/');
  });

  it('has unique titles and descriptions within sensible lengths', () => {
    const titles = seoRoutes.map((r) => r.title.pl);
    expect(new Set(titles).size).toBe(titles.length);
    seoRoutes.forEach((r) => {
      expect(r.description.pl.length).toBeLessThanOrEqual(200);
      expect(r.description.en.length).toBeLessThanOrEqual(200);
    });
  });
});

describe('applySeo', () => {
  it('updates title and head tags without duplicating them', () => {
    applySeo(seoFor('/', 'pl'));
    applySeo(seoFor('/pricing', 'pl'));
    expect(document.title).toMatch(/Cennik/);
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://domeknamazurskiej.pl/pricing');
  });

  it('adds noindex only for unknown routes', () => {
    applySeo(seoFor('/nope', 'pl'));
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    applySeo(seoFor('/', 'pl'));
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });
});

describe('headHtml', () => {
  it('escapes attributes and includes valid JSON-LD only when requested', () => {
    const html = headHtml({ ...seoFor('/', 'pl'), title: 'A "quoted" <title>' }, true);
    expect(html).toContain('A &quot;quoted&quot; &lt;title&gt;');
    const json = html.match(/<script type="application\/ld\+json">(.*)<\/script>/)![1];
    expect(JSON.parse(json).address.addressLocality).toBe(structuredData.address.addressLocality);
    expect(headHtml(seoFor('/', 'pl'), false)).not.toContain('ld+json');
  });
});
