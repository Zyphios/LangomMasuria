const attractions = [
  'Lake Garbas 500 m',
  'Kajaki i wędkowanie',
  'Trasy rowerowe przez las',
  'Regionalna kuchnia i sery'
];

export default function House() {
  return (
    <div className='mx-auto max-w-6xl px-6 py-16'>
      <section className='grid gap-10 md:grid-cols-[1.2fr_0.8fr]'>
        <div>
          <h1 className='text-4xl font-semibold'>Dom i atrakcje</h1>
          <p className='mt-4 text-lg text-slate-700'>
            120 m² komfortowej przestrzeni, 3 sypialnie, salon z kominkiem i strefa wellness dla maksymalnie 8 gości.
          </p>
        </div>
        <aside className='rounded-2xl bg-white p-6 shadow-sm'>
          <ul className='space-y-3 text-lg'>
            <li>120 m²</li>
            <li>3 sypialnie</li>
            <li>8 gości</li>
          </ul>
        </aside>
      </section>

      <section className='mt-12'>
        <h2 className='text-2xl font-semibold'>W okolicy</h2>
        <ul className='mt-6 grid gap-4 md:grid-cols-2'>
          {attractions.map((item) => (
            <li key={item} className='rounded-2xl bg-white p-6 shadow-sm'>
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
