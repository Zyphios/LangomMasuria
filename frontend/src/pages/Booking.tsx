import { differenceInCalendarDays } from 'date-fns';
import { useState } from 'react';
import BookingCalendar from '../components/BookingCalendar';
import { useAvailability } from '../hooks/useAvailability';

export default function Booking() {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [error, setError] = useState('');
  
  const { data } = useAvailability(6, 2026);
  
  const onNext = () => {
    if (!checkIn || !checkOut || differenceInCalendarDays(new Date(checkOut), new Date(checkIn)) < 2) {
      setError('Minimum stay is 2 nights');
      return;
    }
    setError('');
  };
  
  return (
    <div className='mx-auto max-w-4xl px-6 py-16'>
      <h1 className='text-4xl font-semibold'>Rezerwacja</h1>
      <p className='mt-2 text-slate-600'>Krok 1: Daty</p>
      
      <div className='mt-8'>
        <BookingCalendar
          blockedDates={data?.blockedDates || []}
          checkIn={checkIn}
          checkOut={checkOut}
          onCheckInChange={setCheckIn}
          onCheckOutChange={setCheckOut}
        />
      </div>
      
      {error ? <p className='mt-4 text-red-700'>{error}</p> : null}
      
      <button
        type='button'
        onClick={onNext}
        className='mt-6 rounded bg-pine px-4 py-2 text-white'
      >
        Dalej
      </button>
    </div>
  );
}
