import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createBlockedDate, deleteAdminBlockedDate, getAdminBlockedDates } from '../../api/admin';
import BookingCalendar from '../../components/BookingCalendar';
import { initialVisibleMonths, useCalendarAvailability } from '../../hooks/useAvailability';

export default function AdminCalendar() {
  const token = localStorage.getItem('adminToken') || '';
  const client = useQueryClient();
  const [months, setMonths] = useState(initialVisibleMonths);
  const { isError, retry, ...calendar } = useCalendarAvailability(months);
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const left = useQuery({ queryKey: ['admin-blocks', months.left], queryFn: () => getAdminBlockedDates(token, months.left.month, months.left.year), refetchInterval: 30000 });
  const right = useQuery({ queryKey: ['admin-blocks', months.right], queryFn: () => getAdminBlockedDates(token, months.right.month, months.right.year), refetchInterval: 30000 });
  const blocks = Array.from(new Map([...(left.data ?? []), ...(right.data ?? [])].map((block) => [block.id, block])).values());
  const perform = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await action();
      await Promise.all([client.invalidateQueries({ queryKey: ['availability'] }), client.invalidateQueries({ queryKey: ['admin-blocks'] })]);
    } catch { setError('Nie udało się zmienić blokady. Termin może być zajęty lub sesja wygasła.'); }
    finally { setBusy(false); }
  };
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
      <h1 className="mb-6 text-3xl font-semibold">Kalendarz</h1>
      <BookingCalendar {...calendar} checkIn="" checkOut="" onCheckInChange={() => {}} onCheckOutChange={() => {}}
        readOnly onVisibleMonthsChange={setMonths} />
      {calendar.disabled && <p role="alert" className="mt-4">{isError ? 'Błąd pobierania dostępności.' : 'Ładowanie dostępności…'}
        {isError && <button className="ml-3 underline" type="button" onClick={retry}>Ponów</button>}
      </p>}
      <form className="mt-6 flex flex-wrap items-end gap-4" onSubmit={(event) => {
        event.preventDefault();
        void perform(() => createBlockedDate(token, date, reason.trim() || 'Manual block'));
      }}>
        <label>Data blokady<input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className="mt-2 block rounded border p-2" /></label>
        <label>Powód<input value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 block rounded border p-2" /></label>
        <button type="submit" disabled={busy || calendar.disabled} className="min-h-11 rounded bg-primary px-4 text-white">Dodaj blokadę</button>
      </form>
      {error && <p role="alert" className="mt-4 text-error">{error}</p>}
      {(left.isError || right.isError) && <p role="alert" className="mt-4 text-error">Nie udało się pobrać ręcznych blokad.
        <button type="button" className="ml-3 underline" onClick={() => { void left.refetch(); void right.refetch(); }}>Ponów</button>
      </p>}
      <h2 className="mt-8 text-xl">Ręczne blokady widocznych miesięcy</h2>
      <ul className="mt-4 space-y-3">
        {blocks.map((block) => <li key={block.id} className="flex flex-wrap items-center justify-between gap-3 border-t py-2">
          <span>{block.date.slice(0, 10)} · {block.reason}</span>
          <button type="button" disabled={busy} className="min-h-11 underline" aria-label={`Usuń blokadę ${block.date.slice(0, 10)}`}
            onClick={() => { void perform(() => deleteAdminBlockedDate(token, block.id)); }}>Usuń blokadę</button>
        </li>)}
      </ul>
    </div>
  );
}
