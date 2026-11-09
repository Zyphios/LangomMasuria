export const SITE_URL = 'https://domeknamazurskiej.pl';
export const DEFAULT_IMAGE = `${SITE_URL}/panorama-hero.jpg`;

type Lang = 'pl' | 'en';
type Text = Record<Lang, string>;

export interface SeoRoute {
  path: string;
  title: Text;
  description: Text;
}

export const seoRoutes: SeoRoute[] = [
  {
    path: '/',
    title: {
      pl: 'Domek z balią i jacuzzi na Mazurach – Stare Juchy k. Ełku | Domek na Mazurskiej',
      en: 'Holiday cabin with a hot tub in Masuria – Stare Juchy near Ełk | Domek na Mazurskiej'
    },
    description: {
      pl: 'Domek do wynajęcia z gorącą balią i jacuzzi w Starych Juchach koło Ełku. Las Natura 2000, jezioro 500 m, widok z tarasu na łąki i staw. Dla 2–6 osób. Sprawdź wolne terminy.',
      en: 'Holiday cabin with a hot tub in Stare Juchy near Ełk, Masuria. Natura 2000 forest, a lake 500 m away and terrace views over meadows and a pond. Sleeps 2–6. Check availability.'
    }
  },
  {
    path: '/house',
    title: {
      pl: 'Domek dla 2–6 osób z balią i tarasem – wyposażenie | Stare Juchy',
      en: 'Cabin for 2–6 guests with hot tub and terrace – facilities | Stare Juchy'
    },
    description: {
      pl: 'Zobacz, jak wygląda domek w Starych Juchach: salon z antresolą, kuchnia, łazienka, sypialnie, taras, gorąca balia i miejsce na ognisko. Komfortowy wypoczynek dla 2–6 osób.',
      en: 'See inside the cabin in Stare Juchy: living room with a loft, kitchen, bathroom, bedrooms, terrace, hot tub and fire pit. Comfortable stay for 2–6 guests.'
    }
  },
  {
    path: '/gallery',
    title: {
      pl: 'Galeria zdjęć – domek z balią i widokiem na łąki | Domek na Mazurskiej',
      en: 'Photo gallery – cabin with a hot tub and meadow views | Domek na Mazurskiej'
    },
    description: {
      pl: 'Zdjęcia domku z jacuzzi w Starych Juchach: wnętrza, taras, balia nocą oraz mazurskie pagórki o świcie.',
      en: 'Photos of the cabin with a hot tub in Stare Juchy: interiors, terrace, the hot tub at night and the Masurian hills at dawn.'
    }
  },
  {
    path: '/attractions',
    title: {
      pl: 'Atrakcje w okolicy Starych Juch i Ełku – jeziora, wieża widokowa | Domek na Mazurskiej',
      en: 'Things to do near Stare Juchy and Ełk – lakes, viewing tower | Domek na Mazurskiej'
    },
    description: {
      pl: 'Co robić na Mazurach Garbatych: plaża leśna 500 m od domku, Góra Piaskowa, wieża widokowa w Starych Juchach, wypady do Ełku i Giżycka.',
      en: 'What to do in the Masurian Hills: forest beach 500 m away, the sand hill, the viewing tower in Stare Juchy, day trips to Ełk and Giżycko.'
    }
  },
  {
    path: '/pricing',
    title: {
      pl: 'Cennik – wynajem domku z balią na Mazurach | Domek na Mazurskiej',
      en: 'Pricing – cabin with a hot tub in Masuria | Domek na Mazurskiej'
    },
    description: {
      pl: 'Aktualny cennik za dobę w sezonach, zasady pobytu i dodatkowe usługi w domku z balią w Starych Juchach.',
      en: 'Current nightly rates by season, stay rules and extras for the cabin with a hot tub in Stare Juchy.'
    }
  },
  {
    path: '/booking',
    title: {
      pl: 'Rezerwacja domku z balią – wolne terminy | Domek na Mazurskiej',
      en: 'Book the cabin with a hot tub – availability | Domek na Mazurskiej'
    },
    description: {
      pl: 'Sprawdź wolne terminy i zarezerwuj domek z balią i jacuzzi w Starych Juchach koło Ełku.',
      en: 'Check availability and book the cabin with a hot tub in Stare Juchy near Ełk.'
    }
  },
  {
    path: '/contact',
    title: {
      pl: 'Kontakt – Domek na Mazurskiej, Stare Juchy',
      en: 'Contact – Domek na Mazurskiej, Stare Juchy'
    },
    description: {
      pl: 'Skontaktuj się w sprawie pobytu w domku z balią w Starych Juchach. Odpowiemy na pytania o terminy i ofertę.',
      en: 'Get in touch about a stay in the cabin with a hot tub in Stare Juchy. We will answer questions about dates and the offer.'
    }
  },
  {
    path: '/directions',
    title: {
      pl: 'Jak dojechać – Stare Juchy k. Ełku | Domek na Mazurskiej',
      en: 'Directions – Stare Juchy near Ełk | Domek na Mazurskiej'
    },
    description: {
      pl: 'Dojazd do domku w Starych Juchach koło Ełku: mapa, wskazówki dojazdu i parking przy domku.',
      en: 'How to get to the cabin in Stare Juchy near Ełk: map, directions and parking at the property.'
    }
  }
];

export interface SeoData {
  title: string;
  description: string;
  canonical: string;
  image: string;
  lang: Lang;
  noindex: boolean;
}

export function seoFor(pathname: string, language: string): SeoData {
  const lang: Lang = language === 'en' ? 'en' : 'pl';
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const route = seoRoutes.find((r) => r.path === clean);
  const source = route ?? seoRoutes[0];
  return {
    title: source.title[lang],
    description: source.description[lang],
    canonical: route ? `${SITE_URL}${route.path}` : `${SITE_URL}/`,
    image: DEFAULT_IMAGE,
    lang,
    noindex: !route
  };
}

export const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'LodgingBusiness',
  name: 'Domek na Mazurskiej',
  description: seoRoutes[0].description.pl,
  url: SITE_URL,
  image: [DEFAULT_IMAGE, `${SITE_URL}/shared%20image%20(16).jpg`],
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Stare Juchy',
    addressRegion: 'warmińsko-mazurskie',
    addressCountry: 'PL'
  },
  containsPlace: {
    '@type': 'Accommodation',
    additionalType: 'EntirePlace',
    occupancy: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 6 }
  },
  amenityFeature: [
    'Balia / jacuzzi (gorąca balia)',
    'Taras z widokiem na łąki i staw',
    'Miejsce na ognisko',
    'Plac zabaw i bramka do piłki',
    'Parking przy domku',
    'Jezioro 500 m od domku',
    'Las Natura 2000 w sąsiedztwie'
  ].map((name) => ({ '@type': 'LocationFeatureSpecification', name, value: true }))
};

const esc = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function headHtml(seo: SeoData, withStructuredData: boolean): string {
  const tags = [
    `<title>${esc(seo.title)}</title>`,
    `<meta name="description" content="${esc(seo.description)}" />`,
    `<link rel="canonical" href="${seo.canonical}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Domek na Mazurskiej" />`,
    `<meta property="og:locale" content="pl_PL" />`,
    `<meta property="og:title" content="${esc(seo.title)}" />`,
    `<meta property="og:description" content="${esc(seo.description)}" />`,
    `<meta property="og:url" content="${seo.canonical}" />`,
    `<meta property="og:image" content="${seo.image}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`
  ];
  if (withStructuredData) {
    tags.push(`<script type="application/ld+json">${JSON.stringify(structuredData).replace(/</g, '\\u003c')}</script>`);
  }
  return tags.join('\n    ');
}
