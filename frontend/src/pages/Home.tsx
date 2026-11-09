import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import GalleryLightbox from '../components/GalleryLightbox';

export default function Home() {
  const { t } = useTranslation();
  const [firepitPreviewOpen, setFirepitPreviewOpen] = useState(false);

  return (
    <div className="bg-background">
      <section className="relative flex min-h-[819px] items-center justify-center overflow-hidden pb-16 pt-[calc(var(--site-header-height)+3rem)]">
        <div className="absolute inset-0 z-0">
          <picture>
            <source media="(min-width: 768px)" srcSet="/panorama-hero.jpg" />
            <img
              src="/shared image (16).jpg"
              alt="Widok z tarasu domku na mazurskie łąki, jezioro i mgłę o świcie"
              className="h-full w-full object-cover"
            />
          </picture>
          <div className="absolute inset-0 bg-black/40" />
        </div>
        <div className="relative z-10 mx-auto flex max-w-container-max flex-col items-center px-8 text-center md:px-margin-desktop">
          <h1 className="mb-6 text-headline-lg-mobile text-on-primary md:text-headline-lg">
            <span className="block">{t('home.hero.title')}</span>{' '}
            <span className="mt-2 block text-headline-sm md:text-headline-md">{t('home.hero.location')}</span>
          </h1>
          <p className="mb-10 max-w-2xl text-body-lg text-on-primary/90">{t('home.hero.subtitle')}</p>
          <Link
            to="/booking"
            className="rounded bg-primary px-8 py-4 text-label-caps uppercase tracking-widest text-on-primary transition-colors hover:bg-surface-tint"
          >
            {t('home.hero.cta')}
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-container-max px-8 pt-section-gap md:px-margin-desktop">
        <div className="mx-auto max-w-3xl space-y-6 text-center text-body-lg text-on-surface-variant">
          <p>{t('home.intro.description')}</p>
          <p>{t('home.intro.invitation')}</p>
        </div>
      </section>

      <section className="mt-20 h-[280px] w-full overflow-hidden sm:h-[380px] lg:h-[480px]">
        <img
          src="/Baner2.png"
          alt="Domek na Mazurskiej - dom na Mazurach"
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </section>

      <section className="mx-auto max-w-container-max px-8 py-section-gap md:px-margin-desktop">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-headline-md text-primary">{t('home.amenities.title')}</h2>
          <p className="mx-auto max-w-xl text-body-md text-on-surface-variant">{t('home.amenities.subtitle')}</p>
        </div>
        <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
          {[
            { icon: 'hot_tub', title: t('home.amenities.jacuzzi'), desc: t('home.amenities.jacuzziDesc'), image: '/dodaj4.jpg' },
            { icon: 'water_drop', title: t('home.amenities.lake'), desc: t('home.amenities.lakeDesc'), image: '/garbas.jpg' },
            { icon: 'forest', title: t('home.amenities.forest'), desc: t('home.amenities.forestDesc'), image: '/otoczenie.jpg' },
            { icon: 'local_fire_department', title: t('home.amenities.terrace'), desc: t('home.amenities.terraceDesc'), image: '/ognisko.jpg', middleCrop: true, preview: true },
            { icon: 'pets', title: t('home.amenities.family'), desc: t('home.amenities.familyDesc'), image: '/bramka.jpg' },
            { icon: 'location_on', title: t('home.amenities.location'), desc: t('home.amenities.locationDesc'), image: '/parking.jpg', middleCrop: true }
          ].map(({ icon, title, desc, image, middleCrop = false, preview = false }) => (
            <div key={icon} className="flex flex-col overflow-hidden rounded-xl bg-surface-container-low transition-colors duration-300 hover:bg-surface-container">
              {preview ? (
                <button
                  type="button"
                  aria-label={t('gallery.viewer.open', { caption: title })}
                  onClick={() => setFirepitPreviewOpen(true)}
                  className="relative aspect-[9/8] w-full shrink-0 cursor-zoom-in overflow-hidden motion-safe:transition-[aspect-ratio] motion-safe:duration-300 [@media(hover:hover)_and_(pointer:fine)]:hover:aspect-[9/11] focus-visible:aspect-[9/11] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                >
                  <img src={image} alt={title} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                  <span aria-hidden="true" className="material-symbols-outlined absolute bottom-3 right-3 rounded-full bg-primary p-2 text-on-primary">zoom_in</span>
                </button>
              ) : (
                <div className={`${middleCrop ? 'aspect-[9/8] [@media(hover:hover)_and_(pointer:fine)]:hover:aspect-[9/11]' : 'h-48 [@media(hover:hover)_and_(pointer:fine)]:hover:h-64'} relative w-full shrink-0 overflow-hidden motion-safe:transition-[height,aspect-ratio] motion-safe:duration-300`}>
                  <img src={image} alt={title} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                </div>
              )}
              <div className="flex flex-col items-start gap-4 p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                  <span aria-hidden="true" className="material-symbols-outlined">{icon}</span>
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
              <p className="mb-8 text-body-lg text-on-surface-variant">{t('home.interior.layout')}</p>
              <Link
                to="/gallery"
                className="inline-block rounded border border-outline px-8 py-4 text-label-caps uppercase tracking-widest text-on-surface transition-colors hover:bg-surface-container"
              >
                {t('home.interior.cta')}
              </Link>
            </div>
            <div className="relative h-[500px] overflow-hidden rounded-xl">
              <img
                src="/IMG_20260705_163047.png"
                alt="Domek na Mazurskiej - wnętrze salonu"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>
      {firepitPreviewOpen && (
        <GalleryLightbox
          images={[{
            id: 'home-firepit', url: '/ognisko.jpg', sortOrder: 0,
            captionPl: t('home.amenities.terrace', { lng: 'pl' }),
            captionEn: t('home.amenities.terrace', { lng: 'en' })
          }]}
          index={0}
          onIndexChange={() => undefined}
          onClose={() => setFirepitPreviewOpen(false)}
        />
      )}
    </div>
  );
}
