import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getPricingSeasons, getPricingSettings } from '../api/pricing';
import { formatPrice, getSeasonKind, sortPricingSeasons } from '../utils/pricing';

export default function Pricing() {
  const { t, i18n } = useTranslation();
  const { data: pricing = [], isError, isSuccess } = useQuery({
    queryKey: ['pricing'], queryFn: getPricingSeasons, refetchInterval: 30000, refetchOnWindowFocus: true
  });
  const orderedPricing = sortPricingSeasons(pricing);
  const { data: settings, isPending: settingsPending, isError: settingsError, refetch: retrySettings } = useQuery({
    queryKey: ['pricing-settings'], queryFn: getPricingSettings, refetchInterval: 30000, refetchOnWindowFocus: true
  });

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
                    {t(`pricing.${getSeasonKind(season)}`)}
                  </span>
                  <div className="mb-2 flex items-baseline gap-1">
                    <span className={`text-headline-lg-mobile md:text-headline-lg ${season.isFeatured ? 'text-primary' : 'text-on-surface'}`}>
                      {formatPrice(season.pricePerNight, i18n.language)}
                    </span>
                    <span className="text-body-md text-on-surface-variant">{t('pricing.perNight')}</span>
                  </div>
                  <p className="whitespace-pre-line text-center text-body-md text-on-surface-variant">
                    {season.dateFrom.slice(0, 10)} – {season.dateTo.slice(0, 10)}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex flex-col items-center justify-between gap-8 border-t border-outline-variant/30 pt-8 lg:flex-row">
              <div className="flex min-w-0 items-center gap-2 text-body-md text-on-surface-variant">
                <span aria-hidden="true" className="material-symbols-outlined text-xl">calendar_month</span>
                {settingsPending ? <p role="status">{t('pricing.descriptionLoading')}</p> : settingsError ?
                  <p role="alert">{t('pricing.descriptionLoadError')}
                    <button type="button" className="ml-3 underline" onClick={() => { void retrySettings(); }}>{t('links.retry')}</button>
                  </p> : settings &&
                  <span className="min-w-0 whitespace-pre-line break-words">
                    {i18n.language === 'en' ? settings.minStayTextEn : settings.minStayTextPl}
                  </span>}
              </div>
              <Link
                to="/booking"
                className="rounded-full bg-primary px-6 py-5 text-center text-label-caps uppercase tracking-widest text-on-primary shadow-[0_4px_20px_-4px_rgba(69,85,56,0.3)] transition-colors hover:bg-primary/90 sm:px-10"
              >
                {t('pricing.cta')}
              </Link>
            </div>
            <section aria-labelledby="pricing-terms-heading" className="mt-12 border-t border-outline-variant/30 pt-10">
              <h2 id="pricing-terms-heading" className="text-headline-sm text-on-surface">{t('pricing.terms.title')}</h2>
              <div className="mt-8 grid gap-8 lg:grid-cols-3">
                <section aria-labelledby="pricing-hot-tub-heading" className="min-w-0">
                  <h3 id="pricing-hot-tub-heading" className="text-body-lg font-semibold text-on-surface">{t('pricing.terms.hotTub.title')}</h3>
                  <dl className="mt-4 text-body-md text-on-surface-variant">
                    <dt>{t('pricing.terms.hotTub.first')}</dt>
                    <dd className="mt-1 font-semibold text-on-surface">{t('pricing.terms.hotTub.price')}</dd>
                  </dl>
                  <p className="mt-4 text-body-md text-on-surface-variant">{t('pricing.terms.hotTub.selfService')}</p>
                </section>
                <section aria-labelledby="pricing-hours-heading" className="min-w-0">
                  <h3 id="pricing-hours-heading" className="text-body-lg font-semibold text-on-surface">{t('pricing.terms.hours.title')}</h3>
                  <dl className="mt-4 grid gap-3 text-body-md text-on-surface-variant">
                    <div>
                      <dt>{t('pricing.terms.hours.arrival')}</dt>
                      <dd className="font-semibold text-on-surface">{t('pricing.terms.hours.checkIn')}</dd>
                    </div>
                    <div>
                      <dt>{t('pricing.terms.hours.departure')}</dt>
                      <dd className="font-semibold text-on-surface">{t('pricing.terms.hours.checkOut')}</dd>
                    </div>
                  </dl>
                  <p className="mt-4 text-body-md text-on-surface-variant">{t('pricing.terms.hours.flexible')}</p>
                </section>
                <section aria-labelledby="pricing-payment-heading" className="min-w-0">
                  <h3 id="pricing-payment-heading" className="text-body-lg font-semibold text-on-surface">{t('pricing.terms.payment.title')}</h3>
                  <p className="mt-4 text-body-md text-on-surface-variant">{t('pricing.terms.payment.advance')}</p>
                  <p className="mt-4 text-body-md text-on-surface-variant">{t('pricing.terms.payment.balance')}</p>
                </section>
              </div>
            </section>
            <section aria-labelledby="pricing-house-rules-heading" className="mt-12 border-t border-outline-variant/30 pt-10">
              <h2 id="pricing-house-rules-heading" className="text-headline-sm">{t('booking.houseRulesTitle')}</h2>
              <div className="mt-8 grid gap-6 lg:grid-cols-3">
                {[
                  { icon: 'volume_off', title: 'quietHoursTitle', value: 'quietHoursValue' },
                  { icon: 'pets', title: 'petsTitle', value: 'petsValue' },
                  { icon: 'smoke_free', title: 'noSmokingTitle', value: 'noSmokingValue' }
                ].map((rule) => <div key={rule.title} className="rounded-2xl bg-surface-container-lowest p-6">
                  <span aria-hidden="true" className="material-symbols-outlined text-3xl text-primary">{rule.icon}</span>
                  <h3 className="mt-4 text-label-caps">{t(`booking.${rule.title}`)}</h3>
                  <p className="mt-2 text-body-md text-on-surface-variant">{t(`booking.${rule.value}`)}</p>
                </div>)}
              </div>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}
