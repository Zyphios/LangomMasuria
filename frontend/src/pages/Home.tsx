import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const previewImages = [
  'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',
  'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800',
  'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800'
];

export default function Home() {
  const { t } = useTranslation();
  
  return (
    <div>
      <section className='bg-pine px-6 py-24 text-white'>
        <div className='mx-auto max-w-6xl'>
          <h1 className='text-5xl font-semibold'>{t('home.hero.title')}</h1>
          <p className='mt-4 max-w-2xl text-lg'>{t('home.hero.subtitle')}</p>
          <Link to='/booking' className='mt-8 inline-block rounded bg-lake px-6 py-3 font-medium text-slate-900'>
            {t('home.hero.cta')}
          </Link>
        </div>
      </section>

      <section className='mx-auto max-w-6xl px-6 py-16'>
        <h2 className='mb-8 text-3xl font-semibold'>{t('home.amenities.title')}</h2>
        <div className='grid gap-6 md:grid-cols-3'>
          {[t('home.amenities.jacuzzi'), t('home.amenities.forest'), t('home.amenities.lake')].map((item) => (
            <article key={item} className='rounded-2xl bg-white p-6 shadow-sm'>
              <h3 className='text-xl font-medium'>{item}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className='mx-auto max-w-6xl px-6 pb-20'>
        <div className='grid gap-6 md:grid-cols-3'>
          {previewImages.map((image) => (
            <img
              key={image}
              src={image}
              alt='Lagom Masuria interior preview'
              className='h-72 w-full rounded-2xl object-cover'
            />
          ))}
        </div>
      </section>
    </div>
  );
}
