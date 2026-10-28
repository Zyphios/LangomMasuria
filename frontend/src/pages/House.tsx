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
                  { icon: 'home', value: '50 m²', label: t('house.stats.space') },
                  { icon: 'bed', value: '2', label: t('house.stats.bedrooms') },
                  { icon: 'groups', value: '6', label: t('house.stats.guests') }
                ].map(({ icon, value, label }) => (
                  <div key={icon} className="flex flex-col gap-2">
                    <span className="material-symbols-outlined text-3xl text-primary">{icon}</span>
                    <span className="text-headline-sm">{value}</span>
                    <span className="text-label-caps uppercase text-on-surface-variant">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-full rounded-xl overflow-hidden md:col-span-7">
              <img
                src="/glowne-foto.jpg"
                alt="Dom Lagom Masuria"
                className="w-[60%] h-auto block mx-auto"
              />
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
