import { useState } from 'react';
import { updatePricingSeason } from '../../api/admin';

export default function AdminPricing() {
  const token = localStorage.getItem('adminToken') || '';
  const [season, setSeason] = useState({
    id: 'season-1',
    namePl: 'Sezon wysoki',
    nameEn: 'High season',
    pricePerNight: '1200',
    dateFrom: '2026-05-01',
    dateTo: '2026-09-30',
    isFeatured: true
  });
  const [message, setMessage] = useState('');
  
  const submit = async () => {
    await updatePricingSeason(token, season);
    setMessage('Pricing saved');
  };
  
  return (
    <div className='rounded-2xl bg-white p-6 shadow-sm'>
      <h1 className='text-3xl font-semibold'>Cennik</h1>
      <label className='mt-6 block'>
        Price per night
        <input
          className='mt-2 rounded border px-3 py-2'
          value={season.pricePerNight}
          onChange={(event) => setSeason((current) => ({ ...current, pricePerNight: event.target.value }))}
        />
      </label>
      <button type='button' onClick={submit} className='mt-4 rounded bg-pine px-4 py-2 font-medium text-white transition-colors hover:bg-pine-dark'>
        Save pricing
      </button>
      {message ? <p className='mt-4'>{message}</p> : null}
    </div>
  );
}
