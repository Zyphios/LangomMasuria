import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { completeBookingLink, previewBookingLink } from '../api/bookings';
import { ApiError } from '../api/client';
import type { BookingLinkPreview, BookingResponse } from '../types';
import LanguageToggle from '../components/LanguageToggle';

export default function BookingLink({ kind }: { kind: 'verification' | 'decision' }) {
  const { t, i18n } = useTranslation();
  const client = useQueryClient();
  const [capability] = useState<{ token: string; decision?: 'CONFIRMED' | 'CANCELLED' }>(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const decision = params.get('decision');
    return { token: params.get('token') || '', decision: decision === 'CANCELLED' || decision === 'CONFIRMED' ? decision : undefined };
  });
  const [preview, setPreview] = useState<BookingLinkPreview>();
  const [result, setResult] = useState<BookingResponse>();
  const [errorKey, setErrorKey] = useState('');
  const [retryAfter, setRetryAfter] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const showError = useCallback((error: unknown) => {
    setRetryAfter(error instanceof ApiError ? error.retryAfter : undefined);
    setErrorKey(error instanceof ApiError
      ? error.code === 'DATES_UNAVAILABLE' ? 'links.datesUnavailable'
        : error.code === 'NO_PRICING' ? 'links.availabilityError'
          : error.status === 429 ? 'links.rateLimited' : error.status === 409 ? 'links.invalid' : 'links.error'
      : 'links.error');
  }, []);

  useEffect(() => {
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
    const meta = document.createElement('meta');
    meta.name = 'referrer';
    meta.content = 'no-referrer';
    document.head.append(meta);
    let active = true;
    if (!/^[a-f0-9]{64}$/.test(capability.token) || (kind === 'decision' && !capability.decision)) {
      setErrorKey('links.invalid');
      setLoading(false);
    } else {
      previewBookingLink(kind, capability.token)
        .then((value) => { if (active) setPreview(value); })
        .catch((error: unknown) => { if (active) showError(error); })
        .finally(() => { if (active) setLoading(false); });
    }
    return () => { active = false; meta.remove(); };
  }, [capability, kind, showError]);

  const submit = async () => {
    if (!preview || busy) return;
    setBusy(true);
    setErrorKey('');
    setRetryAfter(undefined);
    try {
      const completed = await completeBookingLink(kind, capability.token, preview.totalPrice, capability.decision);
      setResult(completed);
      await client.invalidateQueries({ queryKey: ['availability'] });
    } catch (error) {
      if (error instanceof ApiError && error.message === 'PRICE_CHANGED') {
        try {
          setPreview(await previewBookingLink(kind, capability.token));
          setErrorKey('links.priceChanged');
        } catch (previewError) { setPreview(undefined); showError(previewError); }
      } else {
        showError(error);
      }
    } finally { setBusy(false); }
  };
  const localTime = (iso: string) => new Date(iso).toLocaleString(i18n.language === 'en' ? 'en-GB' : 'pl-PL');

  return (
    <main className="mx-auto max-w-xl px-5 py-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <Link to="/"><img src="/logo-mazurska.jpg" alt="Domek na Mazurskiej" width={176} height={70} /></Link>
        <LanguageToggle />
      </div>
      <section className="rounded-2xl border border-outline-variant bg-white p-5 sm:p-8">
        <h1 className="text-headline-sm">{t(kind === 'verification' ? 'links.verifyTitle' : 'links.decisionTitle')}</h1>
        {loading && <p role="status" className="mt-4">{t('links.loading')}</p>}
        {errorKey && <p role="alert" className="mt-4 text-error">{t(errorKey)} {retryAfter ? t('links.retryAfter', { minutes: Math.ceil(retryAfter / 60) }) : ''}</p>}
        {result ? (
          <div role="status" className="mt-6 space-y-3">
            <p>{t(kind === 'verification' ? 'links.pendingResult' : result.status === 'CONFIRMED' ? 'links.confirmedResult' : 'links.rejectedResult')}</p>
            <p className="break-all font-mono">{result.reference}</p>
            {kind === 'verification' && result.expiresAt && <p>{t('links.deadline')}: {localTime(result.expiresAt)}</p>}
          </div>
        ) : preview && (
          <div className="mt-6 space-y-4">
            <p>{preview.checkIn} → {preview.checkOut}</p>
            <p>{preview.totalPrice} PLN · {t('booking.guestsCount')}: {preview.guestsCount}</p>
            <p>{t('links.deadline')}: {localTime(preview.expiresAt)}</p>
            <p>{t(kind === 'verification' ? 'links.verifyHelp' : 'links.decisionHelp')}</p>
            <button type="button" disabled={busy || ['links.invalid', 'links.datesUnavailable', 'links.availabilityError'].includes(errorKey)} onClick={submit}
              className="min-h-11 w-full rounded bg-primary px-4 py-3 text-white disabled:opacity-50">
              {t(busy ? 'links.working' : kind === 'verification' ? 'links.verifyAction' : capability.decision === 'CONFIRMED' ? 'links.confirmAction' : 'links.rejectAction')}
            </button>
          </div>
        )}
        {!loading && !preview && !result && errorKey === 'links.error' && (
          <p className="mt-4">{t('links.reopen')}</p>
        )}
        <Link to={kind === 'verification' ? '/booking' : '/admin/bookings'} className="mt-6 block underline">
          {t(kind === 'verification' ? 'links.backBooking' : 'links.backPanel')}
        </Link>
      </section>
    </main>
  );
}
