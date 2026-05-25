import { useQuery } from '@tanstack/react-query';
import { getGalleryImages } from '../api/gallery';
import { getPricingSeasons } from '../api/pricing';

export default function Gallery() {
  const { data: images = [] } = useQuery({ queryKey: ['gallery'], queryFn: getGalleryImages });
  const { data: pricing = [] } = useQuery({ queryKey: ['pricing'], queryFn: getPricingSeasons });
  
  return (
    <div className='mx-auto max-w-6xl px-6 py-16'>
      <section>
        <h1 className='text-4xl font-semibold'>Galeria i cennik</h1>
        <div className='mt-8 columns-1 gap-4 md:columns-3'>
          {images.map((image) => (
            <figure key={image.id} className='mb-4 break-inside-avoid rounded-2xl bg-white p-2 shadow-sm'>
              <img src={image.url} alt={image.captionPl || 'Lagom Masuria'} className='w-full rounded-xl' />
              <figcaption className='p-3 text-sm'>{image.captionPl}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className='mt-16 grid gap-6 md:grid-cols-3'>
        {pricing.map((season) => (
          <article key={season.id} className='rounded-2xl bg-white p-6 shadow-sm'>
            {season.isFeatured ? (
              <span className='rounded bg-pine px-2 py-1 text-xs text-white'>POPULARNY</span>
            ) : null}
            <h2 className='mt-3 text-2xl font-semibold'>{season.namePl}</h2>
            <p className='mt-2 text-lg'>{season.pricePerNight} PLN / noc</p>
            <p className='mt-2 text-sm text-slate-600'>{season.dateFrom} — {season.dateTo}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
