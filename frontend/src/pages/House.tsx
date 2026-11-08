import { useTranslation } from 'react-i18next';

const zones = [
  {
    id: 'indoor', image: '/shared image (7).jpg', imageClassName: 'h-auto', noteKey: '',
    groups: [
      {
        titleKey: 'sleepingTitle',
        items: [
          { key: 'bedroom', icon: 'bed' },
          { key: 'loft', icon: 'window' },
          { key: 'sofa', icon: 'weekend' }
        ]
      },
      {
        titleKey: 'equipmentTitle',
        items: [
          { key: 'kitchen', icon: 'skillet' },
          { key: 'bathroom', icon: 'shower' },
          { key: 'climate', icon: 'thermostat' },
          { key: 'media', icon: 'wifi' }
        ]
      }
    ]
  },
  {
    id: 'outdoor', image: '/shared image (13).jpg', imageClassName: 'h-80 lg:h-[420px]', noteKey: '',
    groups: [{
      titleKey: 'subtitle',
      items: [
        { key: 'jacuzzi', icon: 'hot_tub' },
        { key: 'terrace', icon: 'deck' },
        { key: 'firepit', icon: 'local_fire_department' },
        { key: 'parking', icon: 'local_parking' }
      ]
    }]
  },
  {
    id: 'family', image: '/bramka.jpg', imageClassName: 'h-80 lg:h-[420px]', noteKey: '',
    groups: [{
      titleKey: 'subtitle',
      items: [
        { key: 'goal', icon: 'sports_soccer' },
        { key: 'yard', icon: 'toys' },
        { key: 'water', icon: 'rowing' },
        { key: 'baby', icon: 'child_care' }
      ]
    }]
  }
];

const inventoryGroups = [
  { id: 'comfort', icon: 'chair', items: ['ac', 'heating', 'media', 'towels', 'linen'] },
  { id: 'kitchen', icon: 'kitchen', items: ['kitchenette', 'dishwasher', 'hob', 'coffee', 'fridge', 'kettle', 'cookware'] },
  { id: 'family', icon: 'child_care', items: ['baby', 'playground', 'goal'] },
  { id: 'outdoor', icon: 'nature_people', items: ['hotTub', 'terrace', 'firepit', 'loungers', 'water', 'parking', 'pets'] }
];

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
                  { icon: 'home', value: '42 m²', label: t('house.stats.space') },
                  { icon: 'bed', value: '1 + 1', label: t('house.stats.bedrooms') },
                  { icon: 'groups', value: '4–6', label: t('house.stats.guests') }
                ].map(({ icon, value, label }) => (
                  <div key={icon} className="flex flex-col gap-2">
                    <span aria-hidden="true" className="material-symbols-outlined text-3xl text-primary">{icon}</span>
                    <span className="text-headline-sm">{value}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant lg:text-label-caps">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-full rounded-xl overflow-hidden md:col-span-7">
              <img
                src="/glowne-foto kadr.jpg"
                alt="Domek na Mazurskiej"
                className="block max-h-[32rem] w-full rounded-2xl object-cover"
              />
            </div>
          </div>
        </section>

        {zones.map((zone, index) => {
          const prefix = `house.amenities.${zone.id}`;

          return (
            <section
              key={zone.id}
              aria-labelledby={`house-${zone.id}-title`}
              className="mx-auto mt-section-gap grid max-w-container-max gap-10 px-8 md:grid-cols-2 md:items-center md:px-margin-desktop"
            >
              <img
                src={zone.image}
                alt={t(`${prefix}.imageAlt`)}
                loading="lazy"
                className={`w-full rounded-2xl object-cover ${zone.imageClassName} ${index % 2 === 1 ? 'md:order-2' : ''}`}
              />
              <div className="min-w-0">
                <h2 id={`house-${zone.id}-title`} className="text-headline-md text-primary">{t(`${prefix}.title`)}</h2>
                {zone.groups.map((group) => (
                  <div key={group.titleKey} className="mt-6">
                    <h3 className="mb-4 text-headline-sm text-on-surface">{t(`${prefix}.${group.titleKey}`)}</h3>
                    <ul className="grid gap-4 text-body-md text-on-surface-variant">
                      {group.items.map((item) => (
                        <li key={item.key} className="flex items-start gap-3">
                          <span aria-hidden="true" className="material-symbols-outlined mt-0.5 shrink-0 text-primary">{item.icon}</span>
                          <span>
                            <strong className="font-medium text-on-surface">{t(`${prefix}.${item.key}Title`)}</strong>
                            {' – '}{t(`${prefix}.${item.key}Desc`)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {zone.noteKey && (
                  <p className="mt-6 rounded-xl bg-surface-container-low p-4 text-body-md text-on-surface-variant">{t(`${prefix}.${zone.noteKey}`)}</p>
                )}
              </div>
            </section>
          );
        })}

        <section aria-labelledby="house-inventory-title" className="mx-auto mt-section-gap max-w-container-max px-8 md:px-margin-desktop">
          <h2 id="house-inventory-title" className="mb-10 text-headline-md text-primary">{t('house.inventory.title')}</h2>
          <div className="grid gap-gutter md:grid-cols-2">
            {inventoryGroups.map((group) => (
              <section key={group.id} aria-labelledby={`inventory-${group.id}-title`} className="rounded-xl bg-surface-container-low p-6 sm:p-8">
                <h3 id={`inventory-${group.id}-title`} className="mb-6 flex items-start gap-3 text-headline-sm text-on-surface">
                  <span aria-hidden="true" className="material-symbols-outlined shrink-0 text-primary">{group.icon}</span>
                  {t(`house.inventory.${group.id}.title`)}
                </h3>
                <ul className="grid gap-3 text-body-md text-on-surface-variant">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span aria-hidden="true" className="material-symbols-outlined shrink-0 text-primary">check</span>
                      <span>{t(`house.inventory.${group.id}.items.${item}`)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
