import { useState } from 'react';
import { createBlockedDate } from '../../api/admin';

export default function AdminCalendar() {
  const token = localStorage.getItem('adminToken') || '';
  const [date, setDate] = useState('');
  const [message, setMessage] = useState('');
  
  const submit = async () => {
    await createBlockedDate(token, date, 'Manual block');
    setMessage(`Blocked ${date}`);
  };
  
  return (
    <div className='rounded-2xl bg-white p-6 shadow-sm'>
      <h1 className='text-3xl font-semibold'>Kalendarz</h1>
      <label className='mt-6 block'>
        Date
        <input
          type='date'
          className='mt-2 rounded border px-3 py-2'
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </label>
      <button type='button' onClick={submit} className='mt-4 rounded bg-pine px-4 py-2 font-medium text-white transition-colors hover:bg-pine-dark'>
        Block date
      </button>
      {message ? <p className='mt-4'>{message}</p> : null}
    </div>
  );
}
