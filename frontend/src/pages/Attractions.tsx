import { useTranslation } from 'react-i18next';

export default function Attractions() {
  const { t } = useTranslation();

  return (
    <div className="bg-background pt-[var(--site-header-height)]">
      <div className="pb-section-gap pt-16">
        <section className="mx-auto max-w-container-max px-8 md:px-margin-desktop">
          <h1 className="mb-16 text-center text-headline-lg-mobile text-on-background md:text-headline-lg">{t('house.attractions.title')}</h1>
          <div className="grid grid-cols-1 auto-rows-[minmax(300px,auto)] gap-gutter md:grid-cols-12">
            <div className="relative overflow-hidden rounded-xl md:col-span-8">
              <img
                src="/pagorki.jpg"
                alt={t('house.attractions.pond.title')}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/90 via-inverse-surface/30 to-transparent" />
              <div className="relative flex h-full flex-col justify-end p-6 sm:p-8">
                <span className="mb-2 block text-label-caps uppercase tracking-widest text-on-primary">{t('house.attractions.pond.distance')}</span>
                <h2 className="mb-2 text-headline-md text-on-primary">{t('house.attractions.pond.title')}</h2>
                <p className="text-body-md text-on-primary/90">{t('house.attractions.pond.desc')}</p>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl md:col-span-4">
              <img
                src="/supy.jpg"
                alt={t('house.attractions.kayak.title')}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-inverse-surface/60" />
              <div className="relative flex h-full flex-col justify-end p-6 sm:p-8">
                <h2 className="mb-2 text-headline-sm text-on-primary">{t('house.attractions.kayak.title')}</h2>
                <p className="text-body-md text-on-primary/90">{t('house.attractions.kayak.desc')}</p>
              </div>
            </div>
            <div className="flex flex-col justify-between gap-6 rounded-xl bg-surface-container p-6 sm:p-8 md:col-span-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span aria-hidden="true" className="material-symbols-outlined text-[32px]">pedal_bike</span>
              </div>
              <div>
                <h2 className="mb-3 text-headline-sm text-on-surface">{t('house.attractions.bike.title')}</h2>
                <p className="text-body-md text-on-surface-variant">{t('house.attractions.bike.desc')}</p>
              </div>
            </div>
            <div className="flex flex-col justify-between gap-6 rounded-xl bg-surface-container p-6 sm:p-8 md:col-span-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span aria-hidden="true" className="material-symbols-outlined text-[32px]">phishing</span>
              </div>
              <div>
                <h2 className="mb-3 text-headline-sm text-on-surface">{t('house.attractions.fishing.title')}</h2>
                <p className="text-body-md text-on-surface-variant">{t('house.attractions.fishing.desc')}</p>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl md:col-span-4">
              <img
                src="/IMG_20260705_162852.jpg"
                alt={t('house.attractions.food.imageAlt')}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-inverse-surface/60" />
              <div className="relative flex h-full flex-col justify-end p-6 sm:p-8">
                <h2 className="mb-2 text-headline-sm text-on-primary">{t('house.attractions.food.title')}</h2>
                <p className="text-body-md text-on-primary/90">{t('house.attractions.food.desc')}</p>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl md:col-span-12">
              <img
                src="/garbas.jpg"
                alt={t('house.attractions.garbas.title')}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/90 via-inverse-surface/30 to-transparent" />
              <div className="relative flex h-full flex-col justify-end p-6 sm:p-8">
                <span className="mb-1 block text-label-caps uppercase tracking-widest text-on-primary/80">{t('house.attractions.garbas.distance')}</span>
                <h2 className="mb-2 text-headline-md text-on-primary">{t('house.attractions.garbas.title')}</h2>
                <p className="text-body-md text-on-primary/90">{t('house.attractions.garbas.desc')}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
