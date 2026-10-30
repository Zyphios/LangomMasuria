import { useTranslation } from 'react-i18next';

export default function House() {
  const { t } = useTranslation();

  return (
    <div className="bg-background pt-[var(--site-header-height)]">
      <div className="pb-section-gap pt-16">
        <section className="mx-auto max-w-container-max px-8 md:px-margin-desktop">
          <div className="grid grid-cols-1 items-center gap-gutter md:grid-cols-12">
            <div className="flex flex-col gap-8 md:col-span-5">
              <h1 className="text-headline-lg-mobile text-on-background md:text-headline-lg">{t('house.title')}</h1>
              <p className="text-body-lg text-on-surface-variant">{t('house.desc')}</p>
              <div className="grid grid-cols-3 gap-4 border-t border-surface-dim pt-4">
                {[
                  { icon: 'home', value: '50 m²', label: t('house.stats.space') },
                  { icon: 'bed', value: '2', label: t('house.stats.bedrooms') },
                  { icon: 'groups', value: '6', label: t('house.stats.guests') }
                ].map(({ icon, value, label }) => (
                  <div key={icon} className="flex flex-col gap-2">
                    <span className="material-symbols-outlined text-3xl text-primary">{icon}</span>
                    <span className="text-headline-sm">{value}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant lg:text-label-caps">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-full rounded-xl overflow-hidden md:col-span-7">
              <img
                src="/glowne-foto.jpg"
                alt="Domek na Mazurskiej"
                className="block max-h-[32rem] w-full rounded-2xl object-cover"
              />
            </div>
          </div>
        </section>

        <section className="mx-auto mt-section-gap grid max-w-container-max gap-10 px-8 md:grid-cols-2 md:items-center md:px-margin-desktop">
          <img
            src="/otoczenie.jpg"
            alt={t('house.amenities.outdoor.imageAlt')}
            loading="lazy"
            className="h-80 w-full rounded-2xl object-cover lg:h-[420px]"
          />
          <div className="min-w-0">
            <h2 className="text-headline-md text-primary">{t('house.amenities.outdoor.title')}</h2>
            <p className="mt-4 text-body-lg text-on-surface-variant">{t('house.amenities.outdoor.description')}</p>
            <ul className="mt-6 grid gap-4 text-body-lg">
              {[
                { icon: 'outdoor_grill', label: t('house.amenities.outdoor.grill') },
                { icon: 'local_fire_department', label: t('house.amenities.outdoor.firepit') },
                { icon: 'hot_tub', label: t('house.amenities.outdoor.jacuzzi') }
              ].map(({ icon, label }) => (
                <li key={icon} className="flex items-center gap-3">
                  <span aria-hidden="true" className="material-symbols-outlined shrink-0 text-primary">{icon}</span>
                  <span>{label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 rounded-xl bg-surface-container-low p-4 text-body-md text-on-surface-variant">{t('house.amenities.outdoor.woodTerms')}</p>
          </div>
        </section>

        <section className="mx-auto mt-section-gap grid max-w-container-max gap-10 px-8 md:grid-cols-2 md:items-center md:px-margin-desktop">
          <img
            src="/pagorki.jpg"
            alt={t('house.amenities.family.imageAlt')}
            loading="lazy"
            className="h-80 w-full rounded-2xl object-cover md:order-2 lg:h-[420px]"
          />
          <div className="min-w-0">
            <h2 className="text-headline-md text-primary">{t('house.amenities.family.title')}</h2>
            <p className="mt-4 text-body-lg text-on-surface-variant">{t('house.amenities.family.description')}</p>
            <ul className="mt-6 grid gap-4 text-body-lg">
              {[
                { icon: 'sports_soccer', label: t('house.amenities.family.goal') },
                { icon: 'toys', label: t('house.amenities.family.yard') },
                { icon: 'pedal_bike', label: t('house.amenities.family.bikesSup') }
              ].map(({ icon, label }) => (
                <li key={icon} className="flex items-center gap-3">
                  <span aria-hidden="true" className="material-symbols-outlined shrink-0 text-primary">{icon}</span>
                  <span>{label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 rounded-xl bg-surface-container-low p-4 text-body-md text-on-surface-variant">{t('house.amenities.family.equipmentTerms')}</p>
          </div>
        </section>

        <section className="mx-auto mt-section-gap grid max-w-container-max gap-10 px-8 md:grid-cols-2 md:items-center md:px-margin-desktop">
          <img
            src="/IMG_20260705_162852.jpg"
            alt={t('house.amenities.indoor.imageAlt')}
            loading="lazy"
            className="h-80 w-full rounded-2xl object-cover lg:h-[420px]"
          />
          <div className="min-w-0">
            <h2 className="text-headline-md text-primary">{t('house.amenities.indoor.title')}</h2>
            <p className="mt-4 text-body-lg text-on-surface-variant">{t('house.amenities.indoor.description')}</p>
            <ul className="mt-6 grid gap-4 text-body-lg sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
              {[
                { icon: 'coffee_maker', label: t('house.amenities.indoor.coffee') },
                { icon: 'ac_unit', label: t('house.amenities.indoor.ac') },
                { icon: 'tv', label: t('house.amenities.indoor.tv') },
                { icon: 'wifi', label: t('house.amenities.indoor.internet') }
              ].map(({ icon, label }) => (
                <li key={icon} className="flex items-center gap-3">
                  <span aria-hidden="true" className="material-symbols-outlined shrink-0 text-primary">{icon}</span>
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
