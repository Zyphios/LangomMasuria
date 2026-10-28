import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getGalleryImages } from '../api/gallery';
import GalleryLightbox, { getGalleryCaption } from '../components/GalleryLightbox';

export default function Gallery() {
  const { t, i18n } = useTranslation();
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const { data: images = [] } = useQuery({ queryKey: ['gallery'], queryFn: getGalleryImages });

  const galleryImages = images.length > 0 ? images : [
    { id: '1', url: '/glowne-foto.jpg', captionPl: 'Dom o zmierzchu', captionEn: 'House at dusk', sortOrder: 1 },
    { id: '2', url: '/shared image (19).jpg', captionPl: 'Dom noc\u0105, w \u015bwietle latarni', captionEn: 'The house glowing at night', sortOrder: 2 },
    { id: '3', url: '/shared image (3).jpg', captionPl: 'Dom nad stawem', captionEn: 'The house by the pond', sortOrder: 3 },
    { id: '4', url: '/shared image (13).jpg', captionPl: 'Jacuzzi z widokiem na \u0142\u0105ki', captionEn: 'Hot tub with meadow views', sortOrder: 4 },
    { id: '5', url: '/IMG_20260705_162852.jpg', captionPl: 'Kuchnia', captionEn: 'Kitchen', sortOrder: 5 },
    { id: '6', url: '/IMG-20260705-WA0003.jpg', captionPl: 'Detale kuchni', captionEn: 'Kitchen details', sortOrder: 6 },
    { id: '7', url: '/shared image (5).jpg', captionPl: 'Kuchnia i jadalnia', captionEn: 'Kitchen and dining nook', sortOrder: 7 },
    { id: '8', url: '/IMG_20260705_163047.jpg', captionPl: 'Salon z widokiem na taras', captionEn: 'Living room with terrace view', sortOrder: 8 },
    { id: '9', url: '/shared image (7).jpg', captionPl: 'Salon z antresol\u0105', captionEn: 'Living room with mezzanine view', sortOrder: 9 },
    { id: '10', url: '/shared image (6).jpg', captionPl: 'Sypialnia z widokiem na \u0142\u0105ki', captionEn: 'Bedroom with meadow view', sortOrder: 10 },
    { id: '11', url: '/shared image (20).jpg', captionPl: 'Antresola sypialniana', captionEn: 'Loft bedroom', sortOrder: 11 },
    { id: '12', url: '/shared image (21).jpg', captionPl: '\u0141azienka', captionEn: 'Bathroom', sortOrder: 12 },
    { id: '13', url: '/pagorki.jpg', captionPl: 'Panorama mazurskich pag\u00f3rk\u00f3w o \u015bwicie', captionEn: 'Panorama of Masurian hills at dawn', sortOrder: 13 },
    { id: '14', url: '/dodaj2.jpg', captionPl: 'Widok z antresoli na salon i \u0142\u0105ki', captionEn: 'View from the loft over the living room and meadows', sortOrder: 14 },
    { id: '15', url: '/dodaj3.jpg', captionPl: 'Salon z wyj\u015bciem na taras i jacuzzi', captionEn: 'Living room opening onto the terrace and hot tub', sortOrder: 15 },
    { id: '16', url: '/dodaj4.jpg', captionPl: 'Dom noc\u0105 z pod\u015bwietlonym jacuzzi', captionEn: 'The house at night with the glowing hot tub', sortOrder: 16 }
  ];

  const gridClasses = ['md:col-span-2 md:row-span-2'];
  const selectedIndex = galleryImages.findIndex((image) => image.id === selectedImageId);

  useEffect(() => {
    if (selectedImageId !== null && selectedIndex === -1) setSelectedImageId(null);
  }, [selectedImageId, selectedIndex]);

  return (
    <div className="bg-background pt-20">
      <main className="pb-section-gap pt-16">
        <section className="mx-auto mb-24 max-w-container-max px-8 text-center md:px-margin-desktop">
          <h1 className="mb-6 text-headline-lg-mobile text-on-surface md:text-headline-lg">{t('gallery.title')}</h1>
          <p className="mx-auto max-w-2xl text-body-lg text-on-surface-variant">{t('gallery.subtitle')}</p>
        </section>

        <section className="mx-auto mb-section-gap max-w-container-max px-8 md:px-margin-desktop">
          <div className="grid grid-flow-dense grid-cols-2 gap-gutter sm:grid-cols-3 md:grid-cols-4 auto-rows-[220px] md:auto-rows-[260px]">
            {galleryImages.map((image, index) => (
              <button
                key={image.id}
                type="button"
                aria-label={t('gallery.viewer.open', { caption: getGalleryCaption(image, i18n.language) })}
                onClick={() => setSelectedImageId(image.id)}
                className={`${gridClasses[index] || ''} group cursor-zoom-in overflow-hidden rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary`}
              >
                <img
                  src={image.url}
                  alt={getGalleryCaption(image, i18n.language)}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        </section>

      </main>
      {selectedIndex !== -1 && (
        <GalleryLightbox
          images={galleryImages}
          index={selectedIndex}
          onIndexChange={(index) => setSelectedImageId(galleryImages[index].id)}
          onClose={() => setSelectedImageId(null)}
        />
      )}
    </div>
  );
}
