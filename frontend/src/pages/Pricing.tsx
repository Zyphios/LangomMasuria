import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getPricingSeasons } from '../api/pricing';
import type { PricingSeason } from '../types';

export default function Pricing() {
  const { t } = useTranslation();
  const { data: pricing = [], isError, isSuccess } = useQuery({ queryKey: ['pricing'], queryFn: getPricingSeasons });

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
    <div className="bg-background pt-[var(--site-header-height)]">
      <div className="pb-section-gap pt-16">
        <section className="mx-auto max-w-container-max px-8 md:px-margin-desktop">
          <div className="rounded-[32px] bg-surface-container-low p-6 sm:p-8 lg:p-16">
            <div className="mb-16 text-center">
              <h1 className="mb-4 text-headline-lg-mobile text-on-surface md:text-headline-lg">{t('pricing.title')}</h1>
              <p className="text-body-lg text-on-surface-variant">{t('pricing.subtitle')}</p>
            </div>
            <div className="mb-16 grid grid-cols-1 gap-12 lg:grid-cols-3">
              {isError && <p role="alert" className="text-center text-body-md lg:col-span-3">{t('pricing.loadError')}</p>}
              {isSuccess && pricing.length === 0 && <p className="text-center text-body-md lg:col-span-3">{t('pricing.empty')}</p>}
              {orderedPricing.map((season) => (
                <div key={season.id} className="relative flex flex-col items-center">
                  {season.isFeatured ? (
                    <div className="absolute -top-6 rounded-full bg-primary px-4 py-1 text-label-caps uppercase text-on-primary">
                      {t('pricing.popular')}
                    </div>
                  ) : null}
                  <span className={`mb-4 text-label-caps uppercase tracking-widest ${season.isFeatured ? 'text-primary' : 'text-on-surface-variant'}`}>
                    {t(`pricing.${season.isFeatured ? 'high' : season.namePl.includes('Święta') ? 'holidays' : 'low'}`)}
                  </span>
                  <div className="mb-2 flex items-baseline gap-1">
                    <span className={`text-headline-lg-mobile md:text-headline-lg ${season.isFeatured ? 'text-primary' : 'text-on-surface'}`}>
                      {Math.round(Number(season.pricePerNight))}
                    </span>
                    <span className="text-body-md text-on-surface-variant">{t('pricing.perNight')}</span>
                  </div>
                  <p className="whitespace-pre-line text-center text-body-md text-on-surface-variant">
                    {season.isFeatured ? t('pricing.highDates') : season.namePl.includes('Święta') ? t('pricing.holidayDates') : t('pricing.lowDates')}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex flex-col items-center justify-between gap-8 border-t border-outline-variant/30 pt-8 lg:flex-row">
              <div className="flex items-center gap-2 text-body-md text-on-surface-variant">
                <span aria-hidden="true" className="material-symbols-outlined text-xl">calendar_month</span>
                {t('pricing.minStay')}
              </div>
              <Link
                to="/booking"
                className="rounded-full bg-primary px-6 py-5 text-center text-label-caps uppercase tracking-widest text-on-primary shadow-[0_4px_20px_-4px_rgba(69,85,56,0.3)] transition-colors hover:bg-primary/90 sm:px-10"
              >
                {t('pricing.cta')}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
