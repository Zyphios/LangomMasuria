import { useTranslation } from 'react-i18next';

const destination = '53.91005862515826,22.162065817720844';

export default function Directions() {
  const { t } = useTranslation();
  return <div className="bg-background pb-section-gap pt-[var(--site-header-height)]">
    <section className="mx-auto max-w-container-max px-8 pt-16 md:px-margin-desktop">
      <div className="mx-auto mb-12 max-w-4xl text-center">
        <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">{t('directions.title')}</h1>
        <p className="mt-6 text-body-lg text-on-surface-variant">{t('directions.intro')}</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="directions-car-heading" className="rounded-[32px] bg-surface-container-low p-6 sm:p-8">
          <h2 id="directions-car-heading" className="text-headline-sm">{t('directions.carTitle')}</h2>
          <p className="mt-6 text-body-md font-semibold">{t('directions.gps')}<br />ul. Mazurska 31G, 19-330 Stare Juchy</p>
          <ol className="mt-6 list-decimal space-y-4 pl-5 text-body-md text-on-surface-variant">
            <li>{t('directions.turn')}</li><li>{t('directions.forest')}</li><li>{t('directions.parking')}</li>
          </ol>
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${destination}`} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex min-h-11 items-center rounded-full bg-primary px-6 py-3 text-center text-sm font-semibold text-on-primary hover:bg-surface-tint">{t('directions.openMap')}</a>
        </section>
        <section aria-labelledby="directions-transit-heading" className="rounded-[32px] bg-surface-container-low p-6 sm:p-8">
          <h2 id="directions-transit-heading" className="text-headline-sm">{t('directions.transitTitle')}</h2>
          <h3 className="mt-6 text-body-lg font-semibold">{t('directions.trainTitle')}</h3>
          <p className="mt-3 text-body-md text-on-surface-variant">{t('directions.train')}</p>
          <h3 className="mt-8 text-body-lg font-semibold">{t('directions.busTitle')}</h3>
          <p className="mt-3 text-body-md text-on-surface-variant">{t('directions.bus')}</p>
        </section>
      </div>
      <section aria-labelledby="directions-map-heading" className="mt-12">
        <h2 id="directions-map-heading" className="mb-6 text-headline-sm">{t('directions.mapTitle')}</h2>
        <iframe title={t('directions.mapTitle')} src={`https://www.google.com/maps?q=${destination}&z=15&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-[400px] w-full rounded-[32px] border-0 md:h-[500px]" />
      </section>
    </section>
  </div>;
}
