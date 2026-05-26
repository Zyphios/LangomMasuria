import { useTranslation } from 'react-i18next';

export default function House() {
  const { t } = useTranslation();

  return (
    <div className="bg-background pt-20">
      <main className="pb-section-gap pt-[140px]">
        <section className="mx-auto max-w-container-max px-8 md:px-margin-desktop">
          <div className="grid grid-cols-1 items-center gap-gutter md:grid-cols-12">
            <div className="flex flex-col gap-8 md:col-span-5">
              <h1 className="text-headline-lg-mobile text-on-background md:text-headline-lg">{t('house.title')}</h1>
              <p className="text-body-lg text-on-surface-variant">{t('house.desc')}</p>
              <div className="grid grid-cols-3 gap-4 border-t border-surface-dim pt-4">
                {[
                  { icon: 'home', value: '120 m²', label: t('house.stats.space') },
                  { icon: 'bed', value: '3', label: t('house.stats.bedrooms') },
                  { icon: 'groups', value: '8', label: t('house.stats.guests') }
                ].map(({ icon, value, label }) => (
                  <div key={icon} className="flex flex-col gap-2">
                    <span className="material-symbols-outlined text-3xl text-primary">{icon}</span>
                    <span className="text-headline-sm">{value}</span>
                    <span className="text-label-caps uppercase text-on-surface-variant">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-[600px] w-full overflow-hidden rounded-xl bg-surface-container-low md:col-span-7">
              <img
                src="https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=800&q=80"
                alt="Dom Lagom Masuria"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </section>

        <section id="attractions" className="mx-auto mt-section-gap max-w-container-max px-8 md:px-margin-desktop">
          <h2 className="mb-16 text-center text-headline-md text-on-background">{t('house.attractions.title')}</h2>
          <div className="grid grid-cols-1 auto-rows-[300px] gap-gutter md:grid-cols-12">
            <div className="relative overflow-hidden rounded-xl md:col-span-8">
              <img
                src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80"
                alt="Jezioro Garbas"
                className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 p-8">
                <span className="mb-2 block text-label-caps uppercase tracking-widest text-on-primary">{t('house.attractions.lake.distance')}</span>
                <h3 className="mb-2 text-headline-md text-on-primary">{t('house.attractions.lake.title')}</h3>
                <p className="text-body-md text-on-primary/90">{t('house.attractions.lake.desc')}</p>
              </div>
            </div>
            <div className="flex flex-col justify-between rounded-xl bg-surface-container p-8 transition-colors hover:bg-surface-container-high md:col-span-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>kayaking</span>
              </div>
              <div>
                <h3 className="mb-3 text-headline-sm text-on-surface">{t('house.attractions.kayak.title')}</h3>
                <p className="text-body-md text-on-surface-variant">{t('house.attractions.kayak.desc')}</p>
              </div>
            </div>
            <div className="flex flex-col justify-between rounded-xl bg-surface-container p-8 transition-colors hover:bg-surface-container-high md:col-span-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>pedal_bike</span>
              </div>
              <div>
                <h3 className="mb-3 text-headline-sm text-on-surface">{t('house.attractions.bike.title')}</h3>
                <p className="text-body-md text-on-surface-variant">{t('house.attractions.bike.desc')}</p>
              </div>
            </div>
            <div className="flex flex-col justify-between rounded-xl bg-surface-container p-8 transition-colors hover:bg-surface-container-high md:col-span-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>phishing</span>
              </div>
              <div>
                <h3 className="mb-3 text-headline-sm text-on-surface">{t('house.attractions.fishing.title')}</h3>
                <p className="text-body-md text-on-surface-variant">{t('house.attractions.fishing.desc')}</p>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl md:col-span-4">
              <img
                src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80"
                alt="Lokalna kuchnia"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-inverse-surface/40 transition-colors hover:bg-inverse-surface/50" />
              <div className="absolute inset-0 flex flex-col justify-end p-8">
                <h3 className="mb-2 text-headline-sm text-on-primary">{t('house.attractions.food.title')}</h3>
                <p className="text-body-md text-on-primary/90">{t('house.attractions.food.desc')}</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
