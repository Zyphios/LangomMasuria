import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="bg-background">
      <section className="relative flex h-[819px] min-h-[600px] items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="/glowne-foto.jpg"
            alt="Lagom Masuria - dom na Mazurach"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        <div className="relative z-10 mx-auto flex max-w-container-max flex-col items-center px-8 text-center md:px-margin-desktop">
          <h1 className="mb-6 text-headline-lg-mobile text-on-primary md:text-headline-lg">{t('home.hero.title')}</h1>
          <p className="mb-10 max-w-2xl text-body-lg text-on-primary/90">{t('home.hero.subtitle')}</p>
          <Link
            to="/booking"
            className="rounded bg-primary px-8 py-4 text-label-caps uppercase tracking-widest text-on-primary transition-colors hover:bg-surface-tint"
          >
            {t('home.hero.cta')}
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-container-max px-8 py-section-gap md:px-margin-desktop">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-headline-md text-primary">{t('home.amenities.title')}</h2>
          <p className="mx-auto max-w-xl text-body-md text-on-surface-variant">{t('home.amenities.subtitle')}</p>
        </div>
        <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
          {[
            { icon: 'hot_tub', title: t('home.amenities.jacuzzi'), desc: t('home.amenities.jacuzziDesc'), image: '/dodaj4.jpg' },
            { icon: 'forest', title: t('home.amenities.forest'), desc: t('home.amenities.forestDesc'), image: '/otoczenie.jpg' },
            { icon: 'water_drop', title: t('home.amenities.lake'), desc: t('home.amenities.lakeDesc'), image: '/garbas.jpg' }
          ].map(({ icon, title, desc, image }) => (
            <div key={icon} className="flex flex-col overflow-hidden rounded-xl bg-surface-container-low transition-colors duration-300 hover:bg-surface-container">
              <div className="h-48 w-full overflow-hidden">
                <img src={image} alt={title} className="h-full w-full object-cover" />
              </div>
              <div className="flex flex-col items-start gap-4 p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                  <span className="material-symbols-outlined">{icon}</span>
                </div>
                <h3 className="text-headline-sm text-on-surface">{title}</h3>
                <p className="text-body-md text-on-surface-variant">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-surface-container-lowest py-section-gap">
        <div className="mx-auto max-w-container-max px-8 md:px-margin-desktop">
          <div className="grid grid-cols-1 items-center gap-gutter md:grid-cols-2">
            <div>
              <h2 className="mb-6 text-headline-md text-primary">{t('home.interior.title')}</h2>
              <p className="mb-8 text-body-lg text-on-surface-variant">{t('home.interior.desc')}</p>
              <Link
                to="/gallery"
                className="inline-block rounded border border-outline px-8 py-4 text-label-caps uppercase tracking-widest text-on-surface transition-colors hover:bg-surface-container"
              >
                {t('home.interior.cta')}
              </Link>
            </div>
            <div className="relative h-[500px] overflow-hidden rounded-xl">
              <img
                src="/IMG_20260705_162921.jpg"
                alt="Lagom Masuria - wnętrze salonu"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
