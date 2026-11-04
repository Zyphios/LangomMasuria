import { differenceInCalendarDays } from 'date-fns';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import BookingCalendar from '../components/BookingCalendar';
import { Link } from 'react-router-dom';
import { createBooking } from '../api/bookings';
import { ApiError } from '../api/client';
import { getPricingSeasons } from '../api/pricing';
import { initialVisibleMonths, useCalendarAvailability } from '../hooks/useAvailability';
import { estimateStayPrice, formatPrice, getMinimumStay, MIN_STAY_NIGHTS } from '../utils/pricing';
import type { BookingWizardForm, ProvisionalBookingResponse } from '../types';

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
  const [sending, setSending] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<ProvisionalBookingResponse>();
  const client = useQueryClient();

  const [visibleMonths, setVisibleMonths] = useState(initialVisibleMonths);
  const { isError: availabilityError, retry: retryAvailability, ...calendar } = useCalendarAvailability(visibleMonths);

  const nights = useMemo(
    () => (!form.checkIn || !form.checkOut ? 0 : differenceInCalendarDays(new Date(form.checkOut), new Date(form.checkIn))),
    [form.checkIn, form.checkOut]
  );

  const { data: pricingSeasons = [], isPending: pricingPending, isError: pricingError, refetch: retryPricing } = useQuery({
    queryKey: ['pricing'], queryFn: getPricingSeasons, refetchInterval: 30000, refetchOnWindowFocus: true
  });
  const estimatedTotal = useMemo(
    () => estimateStayPrice(pricingSeasons, form.checkIn, form.checkOut),
    [form.checkIn, form.checkOut, pricingSeasons]
  );
  const requiredMinimum = useMemo(
    () => getMinimumStay(pricingSeasons, form.checkIn, form.checkOut),
    [form.checkIn, form.checkOut, pricingSeasons]
  );
  const pricingUnavailable = pricingPending || pricingError || estimatedTotal === null || requiredMinimum === null;
  const pricingMessage = pricingPending ? 'pricing.loading' : pricingError ? 'pricing.loadError' : 'booking.noPricing';
  const displayedEstimate = pricingUnavailable ? '—' : formatPrice(estimatedTotal, i18n.language);

  const validateStay = (): number | null => {
    if (nights < MIN_STAY_NIGHTS) {
      setError(t('booking.minStayError', { count: MIN_STAY_NIGHTS }));
      return null;
    }
    if (pricingPending || pricingError || estimatedTotal === null || requiredMinimum === null) {
      setError(t(pricingMessage));
      return null;
    }
    if (nights < requiredMinimum) {
      setError(t('booking.minStayError', { count: requiredMinimum }));
      return null;
    }
    return estimatedTotal;
  };

  const nextFromDates = () => {
    if (sending) return;
    if (calendar.disabled) { setError(t('links.availabilityError')); return; }
    const totalPrice = validateStay();
    if (totalPrice === null) return;
    setForm((current) => ({ ...current, totalPrice, locale: i18n.language === 'en' ? 'en' : 'pl' }));
    setError('');
    setStep(2);
  };

  const nextFromGuestDetails = () => {
    if (validateStay() === null) { setStep(1); return; }
    if (!form.guestName || !form.guestEmail || !form.guestPhone || form.guestsCount < 1 || form.guestsCount > 8) {
      setError(t('booking.fillDetailsError'));
      return;
    }
    setError('');
    setStep(3);
  };

  const submitBookingRequest = async () => {
    if (sending) return;
    const totalPrice = validateStay();
    if (totalPrice === null) { setStep(1); return; }
    setForm((current) => ({ ...current, totalPrice }));
    setSending(true);
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
      setCreatedBooking(booking);
      setError('');
      setStep(4);
      void client.invalidateQueries({ queryKey: ['availability'] });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'MINIMUM_STAY') {
        setStep(1);
        setError(t('booking.minimumChanged'));
        await client.invalidateQueries({ queryKey: ['pricing'] });
        return;
      }
      // The backend re-validates date availability as the final safeguard against overlapping
      // stays; surface its rejection instead of leaving the wizard silently stuck on step 3.
      const key = err instanceof Error && err.message === 'BOOKING_RATE_LIMIT' ? 'links.rateLimited' : '';
      const wait = err instanceof ApiError && err.retryAfter ? ` ${t('links.retryAfter', { minutes: Math.ceil(err.retryAfter / 60) })}` : '';
      setError((key ? t(key) : err instanceof Error ? err.message : t('booking.unavailableError')) + wait);
    } finally { setSending(false); }
  };

  return (
    <div className='bg-background pt-[var(--site-header-height)]'>
      <main className='mx-auto max-w-container-max px-4 pb-section-gap pt-16 sm:px-8 md:px-margin-desktop'>
        <section className='mb-16 text-center'>
          <h1 className='text-headline-lg-mobile text-on-surface md:text-headline-lg'>{t('booking.title')}</h1>
          <p className='mt-4 mx-auto max-w-2xl text-body-lg text-on-surface-variant'>{t('booking.subtitle')}</p>
        </section>

        <section className='rounded-[32px] border border-outline-variant/40 bg-surface-container-low p-4 sm:p-6 md:p-10'>
          <div className='mb-10 flex items-center justify-start gap-4 overflow-x-auto md:justify-center md:gap-8'>
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

          {step < 4 && (pricingPending || pricingError || (nights >= MIN_STAY_NIGHTS && pricingUnavailable)) &&
            <p role={pricingPending ? 'status' : 'alert'} className="mt-4 text-error">{t(pricingMessage)}
              {pricingError && <button type="button" className="ml-3 underline" onClick={() => { void retryPricing(); }}>{t('links.retry')}</button>}
            </p>}

          {step === 1 ? (
            <div className='mt-10'>
              <div className='mb-6 flex flex-col gap-2'>
                <h2 className='text-headline-sm text-on-surface'>{t('booking.dates')}</h2>
                <p className='text-body-md text-on-surface-variant'>{t('booking.datesSubtitle')}</p>
              </div>
              <BookingCalendar
                {...calendar}
                checkIn={form.checkIn}
                checkOut={form.checkOut}
                onCheckInChange={(value) => { setError(''); setForm((current) => ({ ...current, checkIn: value })); }}
                onCheckOutChange={(value) => { setError(''); setForm((current) => ({ ...current, checkOut: value })); }}
                onVisibleMonthsChange={setVisibleMonths}
              />
              {calendar.disabled && <p role="alert" className="mt-4">{t(availabilityError ? 'links.availabilityError' : 'links.loading')}
                {availabilityError && <button type="button" className="ml-3 underline" onClick={retryAvailability}>{t('links.retry')}</button>}
              </p>}
              {nights > 0 && !pricingUnavailable && requiredMinimum !== null &&
                <p aria-live="polite" className="mt-4 text-body-md text-on-surface-variant">
                  {t('booking.minimumStay', { count: requiredMinimum })}
                </p>}
              <div className='mt-6 flex flex-wrap items-center justify-between gap-4'>
                <div className='rounded-2xl bg-surface-container-lowest px-5 py-4 text-body-md text-on-surface-variant'>
                  {t('booking.estimatedCost')} <span className='font-medium text-on-surface'>{displayedEstimate} PLN</span>
                </div>
                <button type='button' disabled={sending || calendar.disabled || pricingPending || pricingError || (nights >= MIN_STAY_NIGHTS && pricingUnavailable)} onClick={nextFromDates} className={primaryButtonClasses}>
                  {t('booking.next')}
                </button>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <form className='mt-10 grid grid-cols-1 gap-5 rounded-[32px] bg-surface-container-lowest p-6 md:grid-cols-2 md:p-8'>
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
              <div className='mt-6 grid grid-cols-1 gap-4 break-words md:grid-cols-2'>
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
                  <p className='mt-2 text-headline-sm'>{t('booking.total')}: {displayedEstimate} PLN</p>
                </div>
              </div>
              <div className='mt-6 flex flex-wrap gap-3'>
                <button type='button' onClick={() => setStep(2)} className={secondaryButtonClasses}>
                  {t('booking.prev')}
                </button>
                <button type='button'                 disabled={sending || pricingUnavailable} onClick={submitBookingRequest} className={primaryButtonClasses}>
                  {t(sending ? 'links.working' : 'booking.sendRequest')}
                </button>
              </div>
            </section>
          ) : null}

          {step === 4 && createdBooking ? (
            <section className='mt-10 rounded-[32px] bg-surface-container-lowest p-6 md:p-8'>
              <h2 className='text-headline-sm text-on-surface'>{t('booking.provisionalTitle')}</h2>
              <p className='mt-3 text-body-lg text-on-surface-variant'>{t('booking.confirmationMessage')}</p>
              <p className='mt-3 text-body-md text-on-surface-variant'>{t('booking.notificationInfo')}</p>
              <div className='mt-6 grid grid-cols-1 gap-4 md:grid-cols-2'>
                <div className='rounded-2xl bg-surface-container p-5'>
                  <p className="break-all">{form.guestEmail}</p>
                  <p className="break-all">{t('booking.bookingIdLabel')} {createdBooking.reference}</p>
                  <p>{t('booking.holdDeadline')}: {new Date(createdBooking.expiresAt).toLocaleString(i18n.language === 'en' ? 'en-GB' : 'pl-PL')}</p>
                </div>
                <div className='rounded-2xl bg-primary-container p-5 text-on-primary-container'>
                  <p>{t('booking.nights')}: {nights}</p>
                  <p className='mt-2 font-semibold'>{t('booking.estimatedCost')} {formatPrice(createdBooking.totalPrice, i18n.language)} PLN</p>
                </div>
              </div>
            </section>
          ) : null}


          {error ? <p role="alert" className='mt-6 text-body-md text-error'>{error}</p> : null}
        </section>

        <div className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-4 text-body-md text-primary">
          <Link to="/pricing" className="inline-flex min-h-11 items-center underline">{t('booking.rulesLink')}</Link>
          <Link to="/contact" className="inline-flex min-h-11 items-center underline">{t('booking.contactLink')}</Link>
        </div>
      </main>
    </div>
  );
}
