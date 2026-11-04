import { useTranslation } from 'react-i18next';

const attractions = [
  { id: 'beach', image: '/garbas.jpg', icon: 'beach_access' },
  { id: 'sandHill', image: '/gora piachu.jpg', icon: 'landscape' },
  { id: 'lakes', image: '/supy.jpg', icon: 'rowing' },
  { id: 'forest', image: '/otoczenie.jpg', icon: 'forest' },
  { id: 'tower', image: '/wieza stare juchy.jpg', icon: 'visibility' },
  { id: 'bike', image: '', icon: 'pedal_bike' },
  { id: 'elk', image: '/elk.jpg', icon: 'location_city' },
  { id: 'village', image: '', icon: 'storefront' },
  { id: 'gizycko', image: '/gizycko.jpg', icon: 'sailing' },
  { id: 'food', image: '', icon: 'restaurant' }
];

export default function Attractions() {
  const { t } = useTranslation();

  return (
    <div className="bg-background pt-[var(--site-header-height)]">
      <div className="pb-section-gap pt-16">
        <section className="mx-auto max-w-container-max px-8 md:px-margin-desktop">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h1 className="mb-6 text-headline-lg-mobile text-on-background md:text-headline-lg">{t('house.attractions.title')}</h1>
            <p className="text-body-lg text-on-surface-variant">{t('house.attractions.intro')}</p>
          </div>
          <section aria-labelledby="attraction-panorama-title" className="relative mb-gutter min-h-[320px] overflow-hidden rounded-xl">
            <img
              src="/pagorki.jpg"
              alt={t('house.attractions.pond.title')}
              className="absolute inset-0 h-full w-full object-cover object-[center_38%]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/90 via-inverse-surface/30 to-transparent" />
            <div className="relative flex min-h-[320px] flex-col justify-end p-6 sm:p-8">
              <span className="mb-2 text-label-caps uppercase tracking-widest text-on-primary">{t('house.attractions.pond.distance')}</span>
              <h2 id="attraction-panorama-title" className="mb-2 text-headline-md text-on-primary">{t('house.attractions.pond.title')}</h2>
              <p className="text-body-md text-on-primary/90">{t('house.attractions.pond.desc')}</p>
            </div>
          </section>
          <div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
            {attractions.map(({ id, image, icon }) => (
              <article
                key={id}
                aria-labelledby={`attraction-${id}-title`}
                className="flex flex-col overflow-hidden rounded-xl bg-surface-container-low"
              >
                {image ? (
                  <img
                    src={image}
                    alt={t(`house.attractions.${id}.imageAlt`)}
                    loading="lazy"
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-surface-container text-primary">
                    <span aria-hidden="true" className="material-symbols-outlined text-6xl">{icon}</span>
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-4 p-6 sm:p-8">
                  <h2 id={`attraction-${id}-title`} className="text-headline-sm text-on-surface">{t(`house.attractions.${id}.title`)}</h2>
                  <p className="text-body-md text-on-surface-variant">{t(`house.attractions.${id}.desc`)}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
