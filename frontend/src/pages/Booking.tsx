import { differenceInCalendarDays } from 'date-fns';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import BookingCalendar from '../components/BookingCalendar';
import { sendContactMessage } from '../api/contact';
import { createBooking, initPayment } from '../api/bookings';
import { useAvailability } from '../hooks/useAvailability';
import { CLEANING_FEE, type BookingWizardForm } from '../types';

const baseState: BookingWizardForm = {
  guestName: '',
  guestEmail: '',
  guestPhone: '',
  checkIn: '',
  checkOut: '',
  guestsCount: 2,
  notes: '',
  locale: 'pl',
  totalPrice: CLEANING_FEE
};

export default function Booking() {
  const { i18n } = useTranslation();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [form, setForm] = useState<BookingWizardForm>(baseState);
  
  const { data } = useAvailability(6, 2026);
  
  const nights = useMemo(
    () => (!form.checkIn || !form.checkOut ? 0 : differenceInCalendarDays(new Date(form.checkOut), new Date(form.checkIn))),
    [form.checkIn, form.checkOut]
  );
  
  const estimatedTotal = Math.max(0, nights) * 1200 + CLEANING_FEE;
  
  const nextFromDates = () => {
    if (nights < 2) {
      setError('Minimum stay is 2 nights');
      return;
    }
    setForm((current) => ({ ...current, totalPrice: estimatedTotal, locale: i18n.language === 'en' ? 'en' : 'pl' }));
    setError('');
    setStep(2);
  };
  
  const nextFromGuestDetails = async () => {
    if (!form.guestName || !form.guestEmail || !form.guestPhone || form.guestsCount < 1 || form.guestsCount > 8) {
      setError('Fill in all required guest details');
      return;
    }
    const booking = await createBooking({
      guestName: form.guestName,
      guestEmail: form.guestEmail,
      guestPhone: form.guestPhone,
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      guestsCount: form.guestsCount,
      notes: form.notes,
      locale: form.locale
    });
    setForm((current) => ({ ...current, bookingId: booking.id }));
    setError('');
    setStep(3);
  };
  
  const handlePayment = async () => {
    if (!form.bookingId) return;
    const payment = await initPayment(form.bookingId, form.totalPrice);
    setForm((current) => ({ ...current, orderId: payment.orderId }));
    setStep(4);
  };
  
  return (
    <div className='mx-auto max-w-4xl px-6 py-16'>
      <h1 className='text-4xl font-semibold'>Rezerwacja</h1>
      <p className='mt-2 text-slate-600'>Krok {step}</p>
      
      {step === 1 ? (
        <div className='mt-8'>
          <BookingCalendar
            blockedDates={data?.blockedDates || []}
            checkIn={form.checkIn}
            checkOut={form.checkOut}
            onCheckInChange={(value) => setForm((current) => ({ ...current, checkIn: value }))}
            onCheckOutChange={(value) => setForm((current) => ({ ...current, checkOut: value }))}
          />
          <button type='button' onClick={nextFromDates} className='mt-6 rounded bg-pine px-4 py-2 text-white'>
            Dalej
          </button>
        </div>
      ) : null}
      
      {step === 2 ? (
        <form className='mt-8 grid gap-4 rounded-2xl bg-white p-6 shadow-sm'>
          <label>
            Imię i nazwisko
            <input
              aria-label='Imię i nazwisko'
              className='mt-1 w-full rounded border px-3 py-2'
              value={form.guestName}
              onChange={(event) => setForm((current) => ({ ...current, guestName: event.target.value }))}
            />
          </label>
          <label>
            Email
            <input
              aria-label='Email'
              className='mt-1 w-full rounded border px-3 py-2'
              value={form.guestEmail}
              onChange={(event) => setForm((current) => ({ ...current, guestEmail: event.target.value }))}
            />
          </label>
          <label>
            Telefon
            <input
              aria-label='Telefon'
              className='mt-1 w-full rounded border px-3 py-2'
              value={form.guestPhone}
              onChange={(event) => setForm((current) => ({ ...current, guestPhone: event.target.value }))}
            />
          </label>
          <label>
            Liczba gości
            <input
              aria-label='Liczba gości'
              type='number'
              min={1}
              max={8}
              className='mt-1 w-full rounded border px-3 py-2'
              value={form.guestsCount}
              onChange={(event) => setForm((current) => ({ ...current, guestsCount: Number(event.target.value) }))}
            />
          </label>
          <label>
            Uwagi
            <textarea
              className='mt-1 w-full rounded border px-3 py-2'
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            />
          </label>
          <div className='flex gap-3'>
            <button type='button' onClick={() => setStep(1)} className='rounded border px-4 py-2'>
              Wstecz
            </button>
            <button type='button' onClick={nextFromGuestDetails} className='rounded bg-pine px-4 py-2 text-white'>
              Dalej
            </button>
          </div>
        </form>
      ) : null}
      
      {step === 3 ? (
        <section className='mt-8 rounded-2xl bg-white p-6 shadow-sm'>
          <h2 className='text-2xl font-semibold'>Zadatek</h2>
          <p className='mt-3'>Kwota do potwierdzenia: {form.totalPrice} PLN</p>
          <button type='button' onClick={handlePayment} className='mt-6 rounded bg-pine px-4 py-2 text-white'>
            Uruchom płatność testową
          </button>
        </section>
      ) : null}
      
      {step === 4 ? (
        <section className='mt-8 rounded-2xl bg-white p-6 shadow-sm'>
          <h2 className='text-2xl font-semibold'>Potwierdzenie</h2>
          <p>Rezerwacja: {form.bookingId}</p>
          <p>Zamówienie PayU: {form.orderId}</p>
          <p>Noclegi: {nights} × 1200 PLN</p>
          <p>Opłata za sprzątanie: {CLEANING_FEE} PLN</p>
          <p className='font-semibold'>Razem: {form.totalPrice} PLN</p>
        </section>
      ) : null}
      
      {error ? <p className='mt-4 text-red-700'>{error}</p> : null}
      
      <section className='mt-16 rounded-2xl bg-white p-6 shadow-sm'>
        <h2 className='text-2xl font-semibold'>Kontakt</h2>
        <ContactSection />
        <iframe
          title='Lagom Masuria map'
          src='https://www.google.com/maps?q=53.901,22.177&z=12&output=embed'
          className='mt-6 h-72 w-full rounded-2xl border-0'
        />
      </section>
    </div>
  );
}

function ContactSection() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [success, setSuccess] = useState('');
  
  const submit = async () => {
    await sendContactMessage(form);
    setSuccess('Wiadomość została wysłana.');
  };
  
  return (
    <div className='mt-6 grid gap-4'>
      <label>
        Kontakt — imię
        <input
          aria-label='Kontakt — imię'
          className='mt-1 w-full rounded border px-3 py-2'
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        />
      </label>
      <label>
        Kontakt — email
        <input
          aria-label='Kontakt — email'
          className='mt-1 w-full rounded border px-3 py-2'
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
        />
      </label>
      <label>
        Kontakt — wiadomość
        <textarea
          aria-label='Kontakt — wiadomość'
          className='mt-1 w-full rounded border px-3 py-2'
          value={form.message}
          onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
        />
      </label>
      <button type='button' onClick={submit} className='w-fit rounded bg-pine px-4 py-2 text-white'>
        Wyślij wiadomość
      </button>
      {success ? <p className='text-green-700'>{success}</p> : null}
    </div>
  );
}
