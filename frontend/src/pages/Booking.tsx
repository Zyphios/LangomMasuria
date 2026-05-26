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

const stepLabels = ['Daty pobytu', 'Dane gości', 'Zadatek', 'Potwierdzenie'];
const formFieldClasses = 'mt-2 w-full rounded-lg border border-outline bg-surface-container-lowest px-4 py-3 text-on-surface outline-none transition-colors focus:border-primary';
const primaryButtonClasses = 'rounded-full bg-primary px-6 py-3 text-label-caps uppercase tracking-widest text-on-primary transition-colors hover:bg-surface-tint';
const secondaryButtonClasses = 'rounded-full border border-outline px-6 py-3 text-label-caps uppercase tracking-widest text-on-surface transition-colors hover:bg-surface-container';

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
    <div className='bg-background pt-20'>
      <main className='mx-auto max-w-container-max px-8 pb-section-gap pt-16 md:px-margin-desktop'>
        <section className='mb-16'>
          <span className='text-label-caps uppercase tracking-widest text-primary'>Lagom Masuria</span>
          <h1 className='mt-4 text-headline-lg-mobile text-on-surface md:text-headline-lg'>Rezerwacja</h1>
          <p className='mt-4 max-w-3xl text-body-lg text-on-surface-variant'>Wybierz termin, uzupełnij dane gości i potwierdź pobyt w kilku prostych krokach.</p>
        </section>

        <section className='rounded-[32px] border border-outline-variant/40 bg-surface-container-low p-6 md:p-10'>
          <div className='grid gap-4 md:grid-cols-4'>
            {stepLabels.map((label, index) => {
              const currentStep = index + 1;
              const isActive = step === currentStep;
              const isCompleted = step > currentStep;

              return (
                <div
                  key={label}
                  className={`rounded-2xl border px-5 py-4 transition-colors ${
                    isActive
                      ? 'border-primary bg-primary/5 text-primary'
                      : isCompleted
                        ? 'border-primary/30 bg-surface-container-lowest text-primary'
                        : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant'
                  }`}
                >
                  <div className='text-label-caps uppercase tracking-widest'>Krok {currentStep}</div>
                  <div className='mt-2 text-body-md font-medium'>{label}</div>
                </div>
              );
            })}
          </div>

          {step === 1 ? (
            <div className='mt-10'>
              <div className='mb-6 flex flex-col gap-2'>
                <h2 className='text-headline-sm text-on-surface'>Daty pobytu</h2>
                <p className='text-body-md text-on-surface-variant'>Minimalna długość pobytu to 2 noce. Cena orientacyjna aktualizuje się automatycznie.</p>
              </div>
              <BookingCalendar
                blockedDates={data?.blockedDates || []}
                checkIn={form.checkIn}
                checkOut={form.checkOut}
                onCheckInChange={(value) => setForm((current) => ({ ...current, checkIn: value }))}
                onCheckOutChange={(value) => setForm((current) => ({ ...current, checkOut: value }))}
              />
              <div className='mt-6 flex flex-wrap items-center justify-between gap-4'>
                <div className='rounded-2xl bg-surface-container-lowest px-5 py-4 text-body-md text-on-surface-variant'>
                  Szacunkowy koszt pobytu: <span className='font-medium text-on-surface'>{estimatedTotal} PLN</span>
                </div>
                <button type='button' onClick={nextFromDates} className={primaryButtonClasses}>
                  Dalej
                </button>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <form className='mt-10 grid gap-5 rounded-[32px] bg-surface-container-lowest p-6 md:grid-cols-2 md:p-8'>
              <label className='md:col-span-1'>
                Imię i nazwisko
                <input
                  aria-label='Imię i nazwisko'
                  className={formFieldClasses}
                  value={form.guestName}
                  onChange={(event) => setForm((current) => ({ ...current, guestName: event.target.value }))}
                />
              </label>
              <label className='md:col-span-1'>
                Email
                <input
                  aria-label='Email'
                  className={formFieldClasses}
                  value={form.guestEmail}
                  onChange={(event) => setForm((current) => ({ ...current, guestEmail: event.target.value }))}
                />
              </label>
              <label className='md:col-span-1'>
                Telefon
                <input
                  aria-label='Telefon'
                  className={formFieldClasses}
                  value={form.guestPhone}
                  onChange={(event) => setForm((current) => ({ ...current, guestPhone: event.target.value }))}
                />
              </label>
              <label className='md:col-span-1'>
                Liczba gości
                <input
                  aria-label='Liczba gości'
                  type='number'
                  min={1}
                  max={8}
                  className={formFieldClasses}
                  value={form.guestsCount}
                  onChange={(event) => setForm((current) => ({ ...current, guestsCount: Number(event.target.value) }))}
                />
              </label>
              <label className='md:col-span-2'>
                Uwagi
                <textarea
                  className={`${formFieldClasses} min-h-32`}
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                />
              </label>
              <div className='md:col-span-2 flex flex-wrap gap-3'>
                <button type='button' onClick={() => setStep(1)} className={secondaryButtonClasses}>
                  Wstecz
                </button>
                <button type='button' onClick={nextFromGuestDetails} className={primaryButtonClasses}>
                  Dalej
                </button>
              </div>
            </form>
          ) : null}

          {step === 3 ? (
            <section className='mt-10 rounded-[32px] bg-surface-container-lowest p-6 md:p-8'>
              <h2 className='text-headline-sm text-on-surface'>Zadatek</h2>
              <p className='mt-3 text-body-lg text-on-surface-variant'>Kwota do potwierdzenia: {form.totalPrice} PLN</p>
              <div className='mt-6 grid gap-4 md:grid-cols-3'>
                <div className='rounded-2xl bg-surface-container p-4'>
                  <p className='text-label-caps uppercase text-on-surface-variant'>Noclegi</p>
                  <p className='mt-2 text-headline-sm text-on-surface'>{nights} × 1200 PLN</p>
                </div>
                <div className='rounded-2xl bg-surface-container p-4'>
                  <p className='text-label-caps uppercase text-on-surface-variant'>Sprzątanie</p>
                  <p className='mt-2 text-headline-sm text-on-surface'>{CLEANING_FEE} PLN</p>
                </div>
                <div className='rounded-2xl bg-primary-container p-4 text-on-primary-container'>
                  <p className='text-label-caps uppercase'>Razem</p>
                  <p className='mt-2 text-headline-sm'>{form.totalPrice} PLN</p>
                </div>
              </div>
              <button type='button' onClick={handlePayment} className={`mt-6 ${primaryButtonClasses}`}>
                Uruchom płatność testową
              </button>
            </section>
          ) : null}

          {step === 4 ? (
            <section className='mt-10 rounded-[32px] bg-surface-container-lowest p-6 md:p-8'>
              <h2 className='text-headline-sm text-on-surface'>Potwierdzenie</h2>
              <div className='mt-6 grid gap-4 md:grid-cols-2'>
                <div className='rounded-2xl bg-surface-container p-5'>
                  <p>Rezerwacja: {form.bookingId}</p>
                  <p className='mt-2'>Zamówienie PayU: {form.orderId}</p>
                </div>
                <div className='rounded-2xl bg-surface-container p-5'>
                  <p>Noclegi: {nights} × 1200 PLN</p>
                  <p className='mt-2'>Opłata za sprzątanie: {CLEANING_FEE} PLN</p>
                  <p className='mt-2 font-semibold'>Razem: {form.totalPrice} PLN</p>
                </div>
              </div>
            </section>
          ) : null}

          {error ? <p className='mt-6 text-body-md text-error'>{error}</p> : null}
        </section>

        <section className='mt-16'>
          <div className='mb-10'>
            <span className='text-label-caps uppercase tracking-widest text-primary'>Zasady pobytu</span>
            <h2 className='mt-4 text-headline-md text-on-surface'>Zasady Domu</h2>
          </div>
          <div className='grid gap-gutter md:grid-cols-2 xl:grid-cols-4'>
            {[
              { icon: 'bedtime', title: 'Cisza nocna', desc: 'Prosimy o uszanowanie spokoju okolicy po godzinie 22:00.' },
              { icon: 'smoke_free', title: 'Dom bez dymu', desc: 'We wnętrzach obowiązuje całkowity zakaz palenia.' },
              { icon: 'pets', title: 'Zwierzaki', desc: 'Skontaktuj się z nami przed przyjazdem z pupilem.' },
              { icon: 'groups', title: 'Maks. 8 osób', desc: 'Dom został przygotowany z myślą o kameralnych pobytach.' }
            ].map((rule) => (
              <article key={rule.title} className='rounded-[28px] bg-surface-container-low p-6'>
                <div className='flex h-14 w-14 items-center justify-center rounded-full bg-primary-container text-on-primary-container'>
                  <span className='material-symbols-outlined'>{rule.icon}</span>
                </div>
                <h3 className='mt-5 text-headline-sm text-on-surface'>{rule.title}</h3>
                <p className='mt-3 text-body-md text-on-surface-variant'>{rule.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className='mt-section-gap rounded-[32px] bg-surface-container-low p-6 md:p-10'>
          <div className='mb-10'>
            <span className='text-label-caps uppercase tracking-widest text-primary'>Kontakt</span>
            <h2 className='mt-4 text-headline-md text-on-surface'>Napisz do nas</h2>
          </div>
          <div className='grid gap-10 lg:grid-cols-[1.1fr_0.9fr]'>
            <ContactSection />
            <div className='rounded-[32px] bg-surface-container-lowest p-6'>
              <div className='flex items-start gap-4'>
                <div className='flex h-14 w-14 items-center justify-center rounded-full bg-primary-container text-on-primary-container'>
                  <span className='material-symbols-outlined'>call</span>
                </div>
                <div>
                  <h3 className='text-headline-sm text-on-surface'>Mazury są bliżej niż myślisz</h3>
                  <p className='mt-2 text-body-md text-on-surface-variant'>Skontaktuj się z nami, jeśli chcesz doprecyzować termin lub zaplanować pobyt dla większej grupy.</p>
                </div>
              </div>
              <div className='mt-6 overflow-hidden rounded-[28px] border border-outline-variant/40'>
                <iframe
                  title='Lagom Masuria map'
                  src='https://www.google.com/maps?q=53.901,22.177&z=12&output=embed'
                  className='h-72 w-full border-0'
                />
              </div>
            </div>
          </div>
        </section>
      </main>
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
    <div className='rounded-[32px] bg-surface-container-lowest p-6'>
      <div className='grid gap-6'>
        <label>
          <span className='text-label-caps uppercase tracking-widest text-on-surface-variant'>Kontakt — imię</span>
          <input
            aria-label='Kontakt — imię'
            className='mt-2 w-full border-b border-outline bg-transparent px-0 py-3 text-on-surface outline-none transition-colors focus:border-primary'
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
        </label>
        <label>
          <span className='text-label-caps uppercase tracking-widest text-on-surface-variant'>Kontakt — email</span>
          <input
            aria-label='Kontakt — email'
            className='mt-2 w-full border-b border-outline bg-transparent px-0 py-3 text-on-surface outline-none transition-colors focus:border-primary'
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          />
        </label>
        <label>
          <span className='text-label-caps uppercase tracking-widest text-on-surface-variant'>Kontakt — wiadomość</span>
          <textarea
            aria-label='Kontakt — wiadomość'
            className='mt-2 min-h-28 w-full border-b border-outline bg-transparent px-0 py-3 text-on-surface outline-none transition-colors focus:border-primary'
            value={form.message}
            onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
          />
        </label>
        <button type='button' onClick={submit} className={`${primaryButtonClasses} w-fit`}>
          Wyślij wiadomość
        </button>
        {success ? <p className='text-body-md text-primary'>{success}</p> : null}
      </div>
      <div className='mt-10 flex flex-col gap-3 text-body-md text-on-surface-variant'>
        <a href='tel:+48123456789' className='transition-colors hover:text-primary'>+48 123 456 789</a>
        <a href='mailto:hello@lagommasuria.pl' className='transition-colors hover:text-primary'>hello@lagommasuria.pl</a>
      </div>
    </div>
  );
}
