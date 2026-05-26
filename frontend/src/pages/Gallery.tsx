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
    { id: '1', url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80', captionPl: 'Salon', captionEn: 'Living room', sortOrder: 1 },
    { id: '2', url: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80', captionPl: 'Kuchnia', captionEn: 'Kitchen', sortOrder: 2 },
    { id: '3', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80', captionPl: 'Jezioro', captionEn: 'Lake', sortOrder: 3 },
    { id: '4', url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80', captionPl: 'Sypialnia', captionEn: 'Bedroom', sortOrder: 4 },
    { id: '5', url: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80', captionPl: 'Łazienka', captionEn: 'Bathroom', sortOrder: 5 },
    { id: '6', url: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800&q=80', captionPl: 'Jacuzzi', captionEn: 'Jacuzzi', sortOrder: 6 }
  ];

  const gridClasses = [
    'md:col-span-2 md:row-span-2',
    'md:col-span-1 md:row-span-1',
    'md:col-span-1 md:row-span-1',
    'md:col-span-2 md:row-span-1',
    'md:col-span-1 md:row-span-1',
    'md:col-span-1 md:row-span-1'
  ];

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
          <div className="grid grid-cols-1 gap-gutter md:grid-cols-4 md:grid-rows-[300px_300px_300px]">
            {galleryImages.slice(0, 6).map((image, index) => (
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
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>cleaning_services</span>
                  {t('pricing.cleaningFee')}
                </div>
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
