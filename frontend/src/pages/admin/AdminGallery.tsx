import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createGalleryImage, deleteGalleryImage, uploadGalleryImage } from '../../api/admin';
import { getGalleryImages } from '../../api/gallery';

const MAX_BYTES = 10 * 1024 * 1024;
const inputClass = 'mt-2 w-full rounded border px-3 py-2';
const buttonClass = 'rounded bg-pine px-4 py-2 font-medium text-white transition-colors hover:bg-pine-dark disabled:opacity-50';

export default function AdminGallery() {
  const token = localStorage.getItem('adminToken') || '';
  const queryClient = useQueryClient();
  const { data: images = [] } = useQuery({ queryKey: ['gallery'], queryFn: getGalleryImages });
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [url, setUrl] = useState('');
  const [captionPl, setCaptionPl] = useState('');
  const [captionEn, setCaptionEn] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    setMessage('');
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: ['gallery'] });
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Operacja nie powiodła się');
    } finally {
      setBusy(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setFileInputKey((key) => key + 1);
    setUrl('');
    setCaptionPl('');
    setCaptionEn('');
  };

  const submit = () => {
    if (file) {
      if (file.size > MAX_BYTES) { setMessage('Plik jest za duży (maksymalnie 10 MB)'); return; }
      return run(async () => { await uploadGalleryImage(token, file, captionPl, captionEn); resetForm(); }, 'Zdjęcie zostało dodane');
    }
    if (url.trim()) {
      return run(async () => {
        await createGalleryImage(token, { url: url.trim(), captionPl: captionPl || undefined, captionEn: captionEn || undefined, sortOrder: images.length + 1 });
        resetForm();
      }, 'Zdjęcie zostało dodane');
    }
    setMessage('Wybierz plik z komputera lub wpisz adres URL');
  };

  const remove = (id: string, caption: string | null) => {
    if (!window.confirm(`Usunąć zdjęcie${caption ? ` „${caption}”` : ''} z galerii?`)) return;
    return run(() => deleteGalleryImage(token, id), 'Zdjęcie zostało usunięte');
  };

  return (
    <div className='rounded-2xl bg-white p-6 shadow-sm'>
      <h1 className='text-3xl font-semibold'>Galeria</h1>
      <label className='mt-6 block'>
        Plik z komputera (JPG, PNG, WebP, do 10 MB)
        <input
          key={fileInputKey}
          type='file'
          accept='image/jpeg,image/png,image/webp'
          className={inputClass}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </label>
      <label className='mt-4 block'>
        albo URL zdjęcia
        <input className={inputClass} value={url} disabled={Boolean(file)} onChange={(event) => setUrl(event.target.value)} />
      </label>
      <label className='mt-4 block'>
        Opis PL
        <input className={inputClass} value={captionPl} onChange={(event) => setCaptionPl(event.target.value)} />
      </label>
      <label className='mt-4 block'>
        Opis EN
        <input className={inputClass} value={captionEn} onChange={(event) => setCaptionEn(event.target.value)} />
      </label>
      <button type='button' onClick={submit} disabled={busy} className={`mt-4 ${buttonClass}`}>
        Dodaj zdjęcie
      </button>
      {message ? <p role='status' className='mt-4'>{message}</p> : null}

      <h2 className='mt-10 text-2xl font-semibold'>Aktualne zdjęcia</h2>
      {images.length === 0 ? <p className='mt-4'>Brak zdjęć w galerii — strona pokazuje zdjęcia domyślne.</p> : null}
      <ul className='mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {images.map((image) => (
          <li key={image.id} className='overflow-hidden rounded-xl border'>
            <img src={image.url} alt={image.captionPl ?? ''} loading='lazy' className='h-40 w-full object-cover' />
            <div className='flex items-center justify-between gap-2 p-3'>
              <span className='min-w-0 truncate text-sm'>{image.captionPl || image.url}</span>
              <button
                type='button'
                disabled={busy}
                onClick={() => remove(image.id, image.captionPl)}
                aria-label={`Usuń zdjęcie ${image.captionPl ?? ''}`.trim()}
                className='shrink-0 rounded border border-red-600 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50'
              >
                Usuń
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
