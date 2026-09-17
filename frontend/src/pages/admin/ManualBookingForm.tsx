import { useMemo, useRef, useState } from 'react';
import { differenceInCalendarDays } from 'date-fns';
import BookingCalendar from '../../components/BookingCalendar';
import { createManualBooking } from '../../api/admin';
import { useAvailability } from '../../hooks/useAvailability';

type Props = {
  token: string;
  onCreated: () => void;
  onCancel: () => void;
};

const fieldClasses = 'mt-2 w-full rounded-lg border border-outline bg-surface-container-lowest px-4 py-3 text-on-surface outline-none transition-colors focus:border-primary';

// UTC-safe night-date enumeration (mirrors backend's getNightDates fix in availability.ts) —
// avoids local-timezone drift when comparing selected nights against ISO blockedDates from the API.
const getNightDatesUtc = (checkIn: string, checkOut: string): string[] => {
  const start = new Date(`${checkIn}T00:00:00.000Z`).getTime();
  const end = new Date(`${checkOut}T00:00:00.000Z`).getTime();
  const dates: string[] = [];
  for (let t = start; t < end; t += 24 * 60 * 60 * 1000) {
    dates.push(new Date(t).toISOString().slice(0, 10));
  }
  return dates;
};

// Parses a raw (possibly empty) numeric input string, defaulting to 0 for blank/invalid input
// instead of NaN — keeps live totals calculable while the field is being edited.
const toNumberOrZero = (raw: string): number => {
  const n = Number(raw);
  return raw.trim() === '' || !Number.isFinite(n) ? 0 : n;
};

export default function ManualBookingForm({ token, onCreated, onCancel }: Props) {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const now = new Date();
  const [visibleMonths, setVisibleMonths] = useState({
    left: { month: now.getMonth() + 1, year: now.getFullYear() },
    right: { month: now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2, year: now.getMonth() + 2 > 12 ? now.getFullYear() + 1 : now.getFullYear() }
  });
  const { data: leftAvailability } = useAvailability(visibleMonths.left.month, visibleMonths.left.year);
  const { data: rightAvailability } = useAvailability(visibleMonths.right.month, visibleMonths.right.year);
  const blockedDates = useMemo(
    () => Array.from(new Set([...(leftAvailability?.blockedDates || []), ...(rightAvailability?.blockedDates || [])])),
    [leftAvailability, rightAvailability]
  );
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestsCount, setGuestsCount] = useState(2);
  const [notes, setNotes] = useState('');
  // Kept as raw strings (not numbers) so the field can be fully cleared while
  // typing instead of getting stuck showing a leading "0" that can't be deleted.
  const [pricePerNightRaw, setPricePerNightRaw] = useState('');
  const [discountPercentRaw, setDiscountPercentRaw] = useState('');
  const [depositAmountRaw, setDepositAmountRaw] = useState('');
  const [error, setError] = useState('');

  // Guards against browser autofill / password-manager form fills that set the
  // input's DOM value directly without firing React's onChange — reading the
  // live DOM value here as a fallback ensures submit() never sees a stale empty
  // state for a field the user (or the browser) visibly filled in.
  const guestNameRef = useRef<HTMLInputElement>(null);
  const guestPhoneRef = useRef<HTMLInputElement>(null);
  const guestEmailRef = useRef<HTMLInputElement>(null);

  const pricePerNight = toNumberOrZero(pricePerNightRaw);
  const discountPercent = toNumberOrZero(discountPercentRaw);
  const depositAmount = toNumberOrZero(depositAmountRaw);

  const nights = useMemo(
    () => (!checkIn || !checkOut ? 0 : differenceInCalendarDays(new Date(checkOut), new Date(checkIn))),
    [checkIn, checkOut]
  );
  const subtotal = pricePerNight * nights;
  const discountAmount = subtotal * (discountPercent / 100);
  const total = Math.max(0, subtotal - discountAmount);

  const submit = async () => {
    setError('');

    const resolvedName = (guestNameRef.current?.value || guestName).trim();
    const resolvedPhone = (guestPhoneRef.current?.value || guestPhone).trim();

    if (!resolvedName || !resolvedPhone) {
      setError('Uzupełnij imię, nazwisko i telefon');
      return;
    }

    const trimmedEmail = (guestEmailRef.current?.value || guestEmail).trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Podany adres e-mail jest nieprawidłowy');
      return;
    }

    if (!checkIn || !checkOut || nights < 1) {
      setError('Wybierz zakres dat');
      return;
    }

    const overlapsBlocked = getNightDatesUtc(checkIn, checkOut).some((date) => blockedDates.includes(date));
    if (overlapsBlocked) {
      setError('Wybrany zakres dat obejmuje zajęty termin');
      return;
    }

    if (!Number.isFinite(pricePerNight) || pricePerNight <= 0) {
      setError('Podaj cenę za noc');
      return;
    }

    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      setError('Rabat musi być liczbą od 0 do 100');
      return;
    }

    if (!Number.isFinite(depositAmount) || depositAmount < 0) {
      setError('Zaliczka musi być liczbą nieujemną');
      return;
    }

    if (!Number.isFinite(guestsCount) || guestsCount < 1) {
      setError('Podaj liczbę gości');
      return;
    }

    try {
      await createManualBooking(token, {
        guestName: resolvedName,
        guestEmail: trimmedEmail || undefined,
        guestPhone: resolvedPhone,
        checkIn,
        checkOut,
        guestsCount,
        notes: notes || undefined,
        pricePerNight,
        discountPercent,
        depositAmount
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zapisać rezerwacji');
    }
  };

  return (
    <div className='rounded-2xl bg-white p-6 shadow-sm'>
      <h2 className='text-2xl font-semibold'>Nowa rezerwacja telefoniczna</h2>
      <div className='mt-6'>
        <BookingCalendar
          blockedDates={blockedDates}
          checkIn={checkIn}
          checkOut={checkOut}
          onCheckInChange={setCheckIn}
          onCheckOutChange={setCheckOut}
          onVisibleMonthsChange={setVisibleMonths}
        />
      </div>
      <div className='mt-6 grid gap-4 md:grid-cols-2'>
        <label>
          Imię i nazwisko
          <input
            ref={guestNameRef}
            aria-label='Imię i nazwisko'
            className={fieldClasses}
            value={guestName}
            onChange={(event) => setGuestName(event.target.value)}
            onBlur={(event) => setGuestName(event.target.value)}
          />
        </label>
        <label>
          E-mail (opcjonalnie)
          <input
            ref={guestEmailRef}
            aria-label='E-mail (opcjonalnie)'
            type='email'
            autoComplete='off'
            className={fieldClasses}
            value={guestEmail}
            onChange={(event) => setGuestEmail(event.target.value)}
            onBlur={(event) => setGuestEmail(event.target.value)}
          />
        </label>
        <label>
          Telefon
          <input
            ref={guestPhoneRef}
            aria-label='Telefon'
            className={fieldClasses}
            value={guestPhone}
            onChange={(event) => setGuestPhone(event.target.value)}
            onBlur={(event) => setGuestPhone(event.target.value)}
          />
        </label>
        <label>
          Liczba gości
          <input
            aria-label='Liczba gości'
            type='number'
            min={1}
            max={8}
            className={fieldClasses}
            value={guestsCount}
            onChange={(event) => setGuestsCount(Number(event.target.value))}
          />
        </label>
        <label>
          Cena za noc (PLN)
          <input
            aria-label='Cena za noc (PLN)'
            type='number'
            min={0}
            className={fieldClasses}
            value={pricePerNightRaw}
            onChange={(event) => setPricePerNightRaw(event.target.value)}
          />
        </label>
        <label>
          Rabat (%)
          <input
            aria-label='Rabat (%)'
            type='number'
            min={0}
            max={100}
            className={fieldClasses}
            value={discountPercentRaw}
            onChange={(event) => setDiscountPercentRaw(event.target.value)}
          />
        </label>
        <label>
          Zaliczka (PLN)
          <input
            aria-label='Zaliczka (PLN)'
            type='number'
            min={0}
            className={fieldClasses}
            value={depositAmountRaw}
            onChange={(event) => setDepositAmountRaw(event.target.value)}
          />
        </label>
        <label className='md:col-span-2'>
          Notatki
          <textarea aria-label='Notatki' className={`${fieldClasses} min-h-24`} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
      </div>
      <div className='mt-6 rounded-xl bg-surface-container p-4'>
        <p>Noce: {nights} × {pricePerNight} PLN = {subtotal} PLN</p>
        <p>Rabat: -{discountAmount} PLN</p>
        <p className='font-semibold'>Suma: {total} PLN</p>
      </div>
      {error ? <p className='mt-4 text-red-600'>{error}</p> : null}
      <div className='mt-6 flex gap-3'>
        <button
          type='button'
          onClick={submit}
          className='rounded bg-pine px-4 py-2 font-medium text-white transition-colors hover:bg-pine-dark'
        >
          Zapisz rezerwację
        </button>
        <button
          type='button'
          onClick={onCancel}
          className='rounded border border-outline px-4 py-2 text-on-surface transition-colors hover:bg-surface-container'
        >
          Anuluj
        </button>
      </div>
    </div>
  );
}
