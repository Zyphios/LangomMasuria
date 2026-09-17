import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getGalleryImages } from '../api/gallery';
import { getPricingSeasons } from '../api/pricing';
import type { PricingSeason } from '../types';

export default function Gallery() {
  const { t } = useTranslation();
  const { data: images = [] } = useQuery({ queryKey: ['gallery'], queryFn: getGalleryImages });
  const { data: pricing = [] } = useQuery({ queryKey: ['pricing'], queryFn: getPricingSeasons });

  const galleryImages = images.length > 0 ? images : [
    { id: '1', url: '/glowne-foto.jpg', captionPl: 'Dom o zmierzchu', captionEn: 'House at dusk', sortOrder: 1 },
    { id: '2', url: '/shared image (19).jpg', captionPl: 'Dom noc\u0105, w \u015bwietle latarni', captionEn: 'The house glowing at night', sortOrder: 2 },
    { id: '3', url: '/shared image (3).jpg', captionPl: 'Dom nad stawem', captionEn: 'The house by the pond', sortOrder: 3 },
    { id: '4', url: '/shared image (13).jpg', captionPl: 'Jacuzzi z widokiem na \u0142\u0105ki', captionEn: 'Hot tub with meadow views', sortOrder: 4 },
    { id: '5', url: '/IMG_20260705_162852.jpg', captionPl: 'Kuchnia', captionEn: 'Kitchen', sortOrder: 5 },
    { id: '6', url: '/IMG-20260705-WA0003.jpg', captionPl: 'Detale kuchni', captionEn: 'Kitchen details', sortOrder: 6 },
    { id: '7', url: '/shared image (5).jpg', captionPl: 'Kuchnia i jadalnia', captionEn: 'Kitchen and dining nook', sortOrder: 7 },
    { id: '8', url: '/IMG_20260705_163047.jpg', captionPl: 'Salon z widokiem na taras', captionEn: 'Living room with terrace view', sortOrder: 8 },
    { id: '9', url: '/shared image (7).jpg', captionPl: 'Salon z antresol\u0105', captionEn: 'Living room with mezzanine view', sortOrder: 9 },
    { id: '10', url: '/shared image (6).jpg', captionPl: 'Sypialnia z widokiem na \u0142\u0105ki', captionEn: 'Bedroom with meadow view', sortOrder: 10 },
    { id: '11', url: '/shared image (20).jpg', captionPl: 'Antresola sypialniana', captionEn: 'Loft bedroom', sortOrder: 11 },
    { id: '12', url: '/shared image (21).jpg', captionPl: '\u0141azienka', captionEn: 'Bathroom', sortOrder: 12 }
  ];

  const gridClasses = ['md:col-span-2 md:row-span-2'];

  const sortedPricing = [...pricing].sort((a, b) => {
    if (a.isFeatured) return 0;
    if (b.isFeatured) return -1;
    return 1;
  });

  const orderedPricing = pricing.length === 3
    ? [
        pricing.find((season) => !season.isFeatured && !season.namePl.includes('Święta')),
        pricing.find((season) => season.isFeatured),
        pricing.find((season) => season.namePl.includes('Święta'))
      ].filter((season): season is PricingSeason => Boolean(season))
    : sortedPricing;

  return (
    <div className="bg-background pt-20">
      <main className="pb-section-gap pt-16">
        <section className="mx-auto mb-24 max-w-container-max px-8 text-center md:px-margin-desktop">
          <h1 className="mb-6 text-headline-lg-mobile text-on-surface md:text-headline-lg">{t('gallery.title')}</h1>
          <p className="mx-auto max-w-2xl text-body-lg text-on-surface-variant">{t('gallery.subtitle')}</p>
        </section>

        <section className="mx-auto mb-section-gap max-w-container-max px-8 md:px-margin-desktop">
          <div className="grid grid-flow-dense grid-cols-2 gap-gutter sm:grid-cols-3 md:grid-cols-4 auto-rows-[220px] md:auto-rows-[260px]">
            {galleryImages.map((image, index) => (
              <div key={image.id} className={`${gridClasses[index] || ''} group overflow-hidden rounded-xl`}>
                <img
                  src={image.url}
                  alt={image.captionPl || 'Lagom Masuria'}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
            ))}
          </div>
        </section>

        <section id="rates" className="mx-auto max-w-container-max px-8 md:px-margin-desktop">
          <div className="rounded-[32px] bg-surface-container-low p-8 md:p-16">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-headline-lg-mobile text-on-surface md:text-headline-lg">{t('pricing.title')}</h2>
              <p className="text-body-lg text-on-surface-variant">{t('pricing.subtitle')}</p>
            </div>
            <div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-3">
              {orderedPricing.map((season) => (
                <div key={season.id} className="relative flex flex-col items-center">
                  {season.isFeatured ? (
                    <div className="absolute -top-6 rounded-full bg-primary px-4 py-1 text-label-caps uppercase text-on-primary">
                      POPULARNY
                    </div>
                  ) : null}
                  <span className={`mb-4 text-label-caps uppercase tracking-widest ${season.isFeatured ? 'text-primary' : 'text-on-surface-variant'}`}>
                    {t(`pricing.${season.isFeatured ? 'high' : season.namePl.includes('Święta') ? 'holidays' : 'low'}`)}
                  </span>
                  <div className="mb-2 flex items-baseline gap-1">
                    <span className={`text-headline-lg-mobile md:text-headline-lg ${season.isFeatured ? 'text-primary' : 'text-on-surface'}`}>
                      {Math.round(Number(season.pricePerNight))}
                    </span>
                    <span className="text-body-md text-on-surface-variant">zł / noc</span>
                  </div>
                  <p className="whitespace-pre-line text-center text-body-md text-on-surface-variant">
                    {season.isFeatured ? t('pricing.highDates') : season.namePl.includes('Święta') ? t('pricing.holidayDates') : t('pricing.lowDates')}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex flex-col items-center justify-between gap-8 border-t border-outline-variant/30 pt-8 md:flex-row">
              <div className="flex flex-wrap justify-center gap-6 text-body-md text-on-surface-variant">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>calendar_month</span>
                  {t('pricing.minStay')}
                </div>
              </div>
              <Link
                to="/booking"
                className="rounded-full bg-primary px-10 py-5 text-label-caps uppercase tracking-widest text-on-primary shadow-[0_4px_20px_-4px_rgba(69,85,56,0.3)] transition-colors hover:bg-primary/90"
              >
                {t('pricing.cta')}
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
