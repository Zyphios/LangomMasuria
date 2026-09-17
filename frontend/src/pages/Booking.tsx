import { differenceInCalendarDays } from 'date-fns';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import BookingCalendar from '../components/BookingCalendar';
import { sendContactMessage } from '../api/contact';
import { createBooking } from '../api/bookings';
import { getPricingSeasons } from '../api/pricing';
import { useAvailability } from '../hooks/useAvailability';
import type { BookingWizardForm } from '../types';

const baseState: BookingWizardForm = {
  guestName: '',
  guestEmail: '',
  guestPhone: '',
  checkIn: '',
  checkOut: '',
  guestsCount: 2,
  notes: '',
  locale: 'pl',
  totalPrice: 0
};

const formFieldClasses = 'mt-2 w-full rounded-lg border border-outline bg-surface-container-lowest px-4 py-3 text-on-surface outline-none transition-colors focus:border-primary';
const primaryButtonClasses = 'rounded-full bg-primary px-6 py-3 text-label-caps uppercase tracking-widest text-on-primary transition-colors hover:bg-surface-tint';
const secondaryButtonClasses = 'rounded-full border border-outline px-6 py-3 text-label-caps uppercase tracking-widest text-on-surface transition-colors hover:bg-surface-container';

export default function Booking() {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [form, setForm] = useState<BookingWizardForm>(baseState);

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

  const nights = useMemo(
    () => (!form.checkIn || !form.checkOut ? 0 : differenceInCalendarDays(new Date(form.checkOut), new Date(form.checkIn))),
    [form.checkIn, form.checkOut]
  );

  const { data: pricingSeasons = [] } = useQuery({ queryKey: ['pricing'], queryFn: getPricingSeasons });

  // Mirrors the backend's per-night season lookup so the estimate shown here matches the
  // authoritative total the server calculates when the booking is actually created.
  const estimatedTotal = useMemo(() => {
    const nightsCount = Math.max(0, nights);
    if (!form.checkIn || nightsCount === 0 || pricingSeasons.length === 0) return 0;
    const checkInDate = new Date(form.checkIn);
    let total = 0;
    for (let i = 0; i < nightsCount; i += 1) {
      const night = new Date(Date.UTC(checkInDate.getUTCFullYear(), checkInDate.getUTCMonth(), checkInDate.getUTCDate() + i));
      const season = pricingSeasons.find((entry) => night >= new Date(entry.dateFrom) && night <= new Date(entry.dateTo));
      total += season ? Number(season.pricePerNight) : 0;
    }
    return total;
  }, [form.checkIn, nights, pricingSeasons]);

  const nextFromDates = () => {
    if (nights < 2) {
      setError(t('booking.minStayError'));
      return;
    }
    setForm((current) => ({ ...current, totalPrice: estimatedTotal, locale: i18n.language === 'en' ? 'en' : 'pl' }));
    setError('');
    setStep(2);
  };

  const nextFromGuestDetails = () => {
    if (!form.guestName || !form.guestEmail || !form.guestPhone || form.guestsCount < 1 || form.guestsCount > 8) {
      setError(t('booking.fillDetailsError'));
      return;
    }
    setError('');
    setStep(3);
  };

  const submitBookingRequest = async () => {
    try {
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
      setForm((current) => ({ ...current, bookingId: booking.id, reference: booking.reference, totalPrice: booking.totalPrice }));
      setError('');
      setStep(4);
    } catch (err) {
      // The backend re-validates date availability as the final safeguard against overlapping
      // stays; surface its rejection instead of leaving the wizard silently stuck on step 3.
      setError(err instanceof Error ? err.message : t('booking.unavailableError'));
    }
  };

  return (
    <div className='bg-background pt-20'>
      <main className='mx-auto max-w-container-max px-8 pb-section-gap pt-16 md:px-margin-desktop'>
        <section className='mb-16 text-center'>
          <h1 className='text-headline-lg-mobile text-on-surface md:text-headline-lg'>{t('booking.title')}</h1>
          <p className='mt-4 mx-auto max-w-2xl text-body-lg text-on-surface-variant'>{t('booking.subtitle')}</p>
        </section>

        <section className='rounded-[32px] border border-outline-variant/40 bg-surface-container-low p-6 md:p-10'>
          <div className='flex justify-center items-center gap-4 md:gap-8 mb-10 overflow-x-auto'>
            {[
              { icon: 'calendar_month', label: t('booking.step1') },
              { icon: 'person', label: t('booking.step2') },
              { icon: 'fact_check', label: t('booking.step3') },
              { icon: 'check_circle', label: t('booking.step4') }
            ].map(({ icon, label }, index) => {
              const currentStep = index + 1;
              const isActive = step === currentStep;
              const isCompleted = step > currentStep;
              return (
                <div key={icon} className='flex items-center'>
                  {index > 0 && <div className='w-8 md:w-16 h-px bg-outline-variant mx-2 md:mx-4 flex-shrink-0' />}
                  <div className='flex flex-col items-center gap-2 flex-shrink-0'>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                      isActive || isCompleted
                        ? 'bg-primary text-on-primary'
                        : 'border border-outline text-outline'
                    }`}>
                      <span className='material-symbols-outlined'>{icon}</span>
                    </div>
                    <span className={`text-label-caps uppercase text-center leading-tight ${isActive || isCompleted ? 'text-primary' : 'text-outline'}`}>
                      {label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {step === 1 ? (
            <div className='mt-10'>
              <div className='mb-6 flex flex-col gap-2'>
                <h2 className='text-headline-sm text-on-surface'>{t('booking.dates')}</h2>
                <p className='text-body-md text-on-surface-variant'>{t('booking.datesSubtitle')}</p>
              </div>
              <BookingCalendar
                blockedDates={blockedDates}
                checkIn={form.checkIn}
                checkOut={form.checkOut}
                onCheckInChange={(value) => setForm((current) => ({ ...current, checkIn: value }))}
                onCheckOutChange={(value) => setForm((current) => ({ ...current, checkOut: value }))}
                onVisibleMonthsChange={setVisibleMonths}
              />
              <div className='mt-6 flex flex-wrap items-center justify-between gap-4'>
                <div className='rounded-2xl bg-surface-container-lowest px-5 py-4 text-body-md text-on-surface-variant'>
                  {t('booking.estimatedCost')} <span className='font-medium text-on-surface'>{estimatedTotal} PLN</span>
                </div>
                <button type='button' onClick={nextFromDates} className={primaryButtonClasses}>
                  {t('booking.next')}
                </button>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <form className='mt-10 grid gap-5 rounded-[32px] bg-surface-container-lowest p-6 md:grid-cols-2 md:p-8'>
              <label className='md:col-span-1'>
                {t('booking.guestName')}
                <input
                  aria-label={t('booking.guestName')}
                  className={formFieldClasses}
                  value={form.guestName}
                  onChange={(event) => setForm((current) => ({ ...current, guestName: event.target.value }))}
                />
              </label>
              <label className='md:col-span-1'>
                {t('booking.email')}
                <input
                  aria-label={t('booking.email')}
                  className={formFieldClasses}
                  value={form.guestEmail}
                  onChange={(event) => setForm((current) => ({ ...current, guestEmail: event.target.value }))}
                />
              </label>
              <label className='md:col-span-1'>
                {t('booking.phone')}
                <input
                  aria-label={t('booking.phone')}
                  className={formFieldClasses}
                  value={form.guestPhone}
                  onChange={(event) => setForm((current) => ({ ...current, guestPhone: event.target.value }))}
                />
              </label>
              <label className='md:col-span-1'>
                {t('booking.guestsCount')}
                <input
                  aria-label={t('booking.guestsCount')}
                  type='number'
                  min={1}
                  max={8}
                  className={formFieldClasses}
                  value={form.guestsCount}
                  onChange={(event) => setForm((current) => ({ ...current, guestsCount: Number(event.target.value) }))}
                />
              </label>
              <label className='md:col-span-2'>
                {t('booking.notes')}
                <textarea
                  className={`${formFieldClasses} min-h-32`}
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                />
              </label>
              <div className='md:col-span-2 flex flex-wrap gap-3'>
                <button type='button' onClick={() => setStep(1)} className={secondaryButtonClasses}>
                  {t('booking.prev')}
                </button>
                <button type='button' onClick={nextFromGuestDetails} className={primaryButtonClasses}>
                  {t('booking.next')}
                </button>
              </div>
            </form>
          ) : null}

          {step === 3 ? (
            <section className='mt-10 rounded-[32px] bg-surface-container-lowest p-6 md:p-8'>
              <h2 className='text-headline-sm text-on-surface'>{t('booking.summaryTitle')}</h2>
              <p className='mt-3 text-body-md text-on-surface-variant'>{t('booking.summarySubtitle')}</p>
              <div className='mt-6 grid gap-4 md:grid-cols-2'>
                <div className='rounded-2xl bg-surface-container p-5'>
                  <p className='text-label-caps uppercase text-on-surface-variant'>{t('booking.summaryDates')}</p>
                  <p className='mt-2 text-on-surface'>{form.checkIn} → {form.checkOut}</p>
                  <p className='mt-1 text-on-surface-variant'>{t('booking.nights')}: {nights}</p>
                </div>
                <div className='rounded-2xl bg-surface-container p-5'>
                  <p className='text-label-caps uppercase text-on-surface-variant'>{t('booking.summaryGuest')}</p>
                  <p className='mt-2 text-on-surface'>{form.guestName}</p>
                  <p className='text-on-surface-variant'>{form.guestEmail}</p>
                  <p className='text-on-surface-variant'>{form.guestPhone}</p>
                  <p className='mt-1 text-on-surface-variant'>{t('booking.guestsCount')}: {form.guestsCount}</p>
                  {form.notes ? <p className='mt-1 text-on-surface-variant'>{t('booking.notes')}: {form.notes}</p> : null}
                </div>
                <div className='rounded-2xl bg-primary-container p-5 text-on-primary-container md:col-span-2'>
                  <p className='text-label-caps uppercase'>{t('booking.summaryPrice')}</p>
                  <p className='mt-2 text-headline-sm'>{t('booking.total')}: {form.totalPrice} PLN</p>
                </div>
              </div>
              <div className='mt-6 flex flex-wrap gap-3'>
                <button type='button' onClick={() => setStep(2)} className={secondaryButtonClasses}>
                  {t('booking.prev')}
                </button>
                <button type='button' onClick={submitBookingRequest} className={primaryButtonClasses}>
                  {t('booking.sendRequest')}
                </button>
              </div>
            </section>
          ) : null}

          {step === 4 ? (
            <section className='mt-10 rounded-[32px] bg-surface-container-lowest p-6 md:p-8'>
              <h2 className='text-headline-sm text-on-surface'>{t('booking.confirmation')}</h2>
              <p className='mt-3 text-body-lg text-on-surface-variant'>{t('booking.confirmationMessage')}</p>
              <div className='mt-6 grid gap-4 md:grid-cols-2'>
                <div className='rounded-2xl bg-surface-container p-5'>
                  <p>{t('booking.bookingIdLabel')} {form.reference}</p>
                </div>
                <div className='rounded-2xl bg-primary-container p-5 text-on-primary-container'>
                  <p>{t('booking.nights')}: {nights}</p>
                  <p className='mt-2 font-semibold'>{t('booking.total')}: {form.totalPrice} PLN</p>
                </div>
              </div>
            </section>
          ) : null}


          {error ? <p className='mt-6 text-body-md text-error'>{error}</p> : null}
        </section>

        <section className='mt-16'>
          <h2 className='text-headline-md text-on-surface text-center mb-12'>{t('booking.houseRulesTitle')}</h2>
          <div className='grid gap-gutter md:grid-cols-2 xl:grid-cols-4'>
            {[
              { icon: 'schedule', title: t('booking.checkInTitle'), value: t('booking.checkInValue') },
              { icon: 'volume_off', title: t('booking.quietHoursTitle'), value: t('booking.quietHoursValue') },
              { icon: 'pets', title: t('booking.petsTitle'), value: t('booking.petsValue') },
              { icon: 'smoke_free', title: t('booking.noSmokingTitle'), value: t('booking.noSmokingValue') }
            ].map((rule) => (
              <div key={rule.title} className='flex flex-col items-center text-center rounded-xl bg-surface-container-low p-6'>
                <span className='material-symbols-outlined text-primary mb-4' style={{ fontSize: '40px' }}>{rule.icon}</span>
                <h3 className='text-label-caps uppercase text-on-surface mb-2'>{rule.title}</h3>
                <p className='text-body-md text-on-surface-variant'>{rule.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className='mt-section-gap rounded-[32px] bg-surface-container-low p-6 md:p-10'>
          <div className='mb-10'>
            <span className='text-label-caps uppercase tracking-widest text-primary'>{t('booking.contactLabel')}</span>
            <h2 className='mt-4 text-headline-md text-on-surface'>{t('booking.writeToUs')}</h2>
          </div>
          <div className='grid gap-10 lg:grid-cols-[1.1fr_0.9fr]'>
            <ContactSection />
            <div className='rounded-[32px] bg-surface-container-low overflow-hidden min-h-[500px] relative'>
              <div className='absolute inset-0 bg-gradient-to-br from-[#e4e9e0] to-[#cdd6c5]' />
              <div className='h-full w-full'>
                <iframe
                  title='Lagom Masuria map'
                  src='https://www.google.com/maps?q=53.91005862515826,22.162065817720844&z=15&output=embed'
                  className='h-full w-full border-0 min-h-[500px] mix-blend-multiply opacity-70 grayscale'
                />
              </div>
              <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
                <div className='flex flex-col items-center'>
                  <span className='material-symbols-outlined text-primary drop-shadow-md' style={{ fontSize: '48px', fontVariationSettings: "'FILL' 1" }}>location_on</span>
                  <div className='bg-surface px-4 py-2 rounded-full shadow-sm mt-2 text-label-caps text-primary tracking-widest'>LAGOM MASURIA</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function ContactSection() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [success, setSuccess] = useState('');

  const submit = async () => {
    await sendContactMessage(form);
    setSuccess(t('booking.messageSent'));
  };

  return (
    <div className='rounded-[32px] bg-surface-container-lowest p-6'>
      <div className='grid gap-6'>
        <label>
          <span className='text-label-caps uppercase tracking-widest text-on-surface-variant'>{t('booking.contactName')}</span>
          <input
            aria-label={t('booking.contactName')}
            className='mt-2 w-full border-b border-outline bg-transparent px-0 py-3 text-on-surface outline-none transition-colors focus:border-primary'
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
        </label>
        <label>
          <span className='text-label-caps uppercase tracking-widest text-on-surface-variant'>{t('booking.contactEmail')}</span>
          <input
            aria-label={t('booking.contactEmail')}
            className='mt-2 w-full border-b border-outline bg-transparent px-0 py-3 text-on-surface outline-none transition-colors focus:border-primary'
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          />
        </label>
        <label>
          <span className='text-label-caps uppercase tracking-widest text-on-surface-variant'>{t('booking.contactMessage')}</span>
          <textarea
            aria-label={t('booking.contactMessage')}
            className='mt-2 min-h-28 w-full border-b border-outline bg-transparent px-0 py-3 text-on-surface outline-none transition-colors focus:border-primary'
            value={form.message}
            onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
          />
        </label>
        <button type='button' onClick={submit} className={`${primaryButtonClasses} w-fit`}>
          {t('booking.sendMessage')}
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
