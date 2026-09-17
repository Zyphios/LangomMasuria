import { useState } from 'react';
import { createGalleryImage } from '../../api/admin';

export default function AdminGallery() {
  const token = localStorage.getItem('adminToken') || '';
  const [url, setUrl] = useState('');
  const [captionPl, setCaptionPl] = useState('');
  const [message, setMessage] = useState('');
  
  const submit = async () => {
    await createGalleryImage(token, { url, captionPl, sortOrder: 0 });
    setMessage('Image added');
  };
  
  return (
    <div className='rounded-2xl bg-white p-6 shadow-sm'>
      <h1 className='text-3xl font-semibold'>Galeria</h1>
      <label className='mt-6 block'>
        URL
        <input
          className='mt-2 w-full rounded border px-3 py-2'
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
      </label>
      <label className='mt-4 block'>
        Caption PL
        <input
          className='mt-2 w-full rounded border px-3 py-2'
          value={captionPl}
          onChange={(event) => setCaptionPl(event.target.value)}
        />
      </label>
      <button type='button' onClick={submit} className='mt-4 rounded bg-pine px-4 py-2 font-medium text-white transition-colors hover:bg-pine-dark'>
        Add image
      </button>
      {message ? <p className='mt-4'>{message}</p> : null}
    </div>
  );
}
