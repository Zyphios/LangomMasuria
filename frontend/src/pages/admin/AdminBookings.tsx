import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '../../api/client';
import { getAdminBookings, updateAdminBooking, updateBookingDeposit, updateBookingPrice, retryBookingConfirmation } from '../../api/admin';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import ManualBookingForm from './ManualBookingForm';
import BookingPriceEditor from './BookingPriceEditor';
import type { AdminBookingRow, BookingStatus, BookingPriceInput, BookingPriceResult } from '../../types';

type StatusFilter = 'PENDING' | BookingStatus;
type DepositState = 'saving' | 'saved';

const FILTERS: StatusFilter[] = ['PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED'];

export default function AdminBookings() {
  const { t, i18n } = useTranslation();
  const token = localStorage.getItem('adminToken') || '';
  const client = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [bookings, setBookings] = useState<AdminBookingRow[]>([]);
  const [depositDrafts, setDepositDrafts] = useState<Record<string, string>>({});
  const [depositErrors, setDepositErrors] = useState<Record<string, string>>({});
  const [depositStates, setDepositStates] = useState<Record<string, DepositState>>({});
  const [priceBlocking, setPriceBlocking] = useState<Record<string, boolean>>({});
  const [priceSaving, setPriceSaving] = useState<Record<string, boolean>>({});
  const [priceErrors, setPriceErrors] = useState<Record<string, string>>({});
  const priceBlockingChanged = useCallback((id: string, blocked: boolean) => {
    setPriceBlocking((current) => current[id] === blocked ? current : { ...current, [id]: blocked });
  }, []);
  const priceSaved = useCallback((id: string, result: BookingPriceResult) => {
    setBookings((current) => current.map((booking) => booking.id === id ? { ...booking, ...result } : booking));
  }, []);
  const depositTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const mounted = useRef(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter | 'ALL'>('ALL');

  useEffect(() => {
    mounted.current = true;
    const timers = depositTimers.current;
    return () => {
      mounted.current = false;
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  const refresh = () =>
    getAdminBookings(token)
      .then((nextBookings) => {
        setBookings(nextBookings);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          localStorage.removeItem('adminToken');
          window.location.href = '/admin/login';
          return;
        }
        setError('Nie udało się pobrać rezerwacji. Spróbuj odświeżyć stronę.');
      });

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 30000);
    const focus = () => { void refresh(); };
    window.addEventListener('focus', focus);
    return () => { clearInterval(timer); window.removeEventListener('focus', focus); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const visibleBookings = useMemo(
    () => (statusFilter === 'ALL' ? bookings : bookings.filter((booking) => booking.status === statusFilter)),
    [bookings, statusFilter]
  );

  const countFor = (status: StatusFilter) => bookings.filter((booking) => booking.status === status).length;

  const runAction = async (id: string, action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(id);
    setError('');
    try {
      await action();
      await client.invalidateQueries({ queryKey: ['availability'] });
      await refresh();
    } catch (error) {
      setError(error instanceof ApiError && error.status === 409
        ? 'Zgłoszenie wygasło, zostało już obsłużone lub termin jest niedostępny. Odświeżono listę.'
        : 'Nie udało się wykonać operacji. Sprawdź połączenie i spróbuj ponownie.');
      await refresh();
    } finally { setBusy(null); }
  };
  const amountsUnsettled = (booking: AdminBookingRow) => priceBlocking[booking.id] ||
    priceSaving[booking.id] || depositStates[booking.id] === 'saving' ||
    (depositDrafts[booking.id] !== undefined && (depositDrafts[booking.id].trim() === '' ||
      Number(depositDrafts[booking.id]) !== Number(booking.depositAmount)));
  const updateStatus = (id: string, status: 'CONFIRMED' | 'CANCELLED') => {
    const booking = bookings.find((entry) => entry.id === id);
    if (status === 'CONFIRMED' && booking && amountsUnsettled(booking)) {
      setError(t('admin.priceEdit.unsaved'));
      return;
    }
    void runAction(id, () => updateAdminBooking(token, id, status));
  };

  const clearDepositFeedback = (id: string) => {
    clearTimeout(depositTimers.current.get(id));
    depositTimers.current.delete(id);
    setDepositStates((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const savePrice = async (id: string, input: BookingPriceInput): Promise<BookingPriceResult> => {
    setPriceSaving((current) => ({ ...current, [id]: true }));
    setPriceErrors((current) => ({ ...current, [id]: '' }));
    try {
      const result = await updateBookingPrice(token, id, input);
      if (mounted.current) priceSaved(id, result);
      return result;
    } catch (error) {
      if (mounted.current) {
        if (error instanceof ApiError && error.status === 401) {
          localStorage.removeItem('adminToken');
          window.location.href = '/admin/login';
        }
        setPriceErrors((current) => ({ ...current, [id]: t('admin.priceEdit.error') }));
      }
      throw error;
    } finally {
      if (mounted.current) setPriceSaving((current) => ({ ...current, [id]: false }));
    }
  };

  const saveDeposit = async (id: string) => {
    const draft = depositDrafts[id];
    if (draft === undefined || depositStates[id] === 'saving') return;

    const amount = Number(draft);
    if (!Number.isFinite(amount) || amount < 0) {
      setDepositErrors((current) => ({ ...current, [id]: t('admin.deposit.invalid') }));
      return;
    }

    clearDepositFeedback(id);
    setDepositErrors((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setDepositStates((current) => ({ ...current, [id]: 'saving' }));
    try {
      const result = await updateBookingDeposit(token, id, amount);
      if (!mounted.current) return;
      setDepositDrafts((current) => ({ ...current, [id]: result.depositAmount }));
      setBookings((current) => current.map((booking) => (booking.id === id ? { ...booking, depositAmount: result.depositAmount } : booking)));
      setDepositStates((current) => ({ ...current, [id]: 'saved' }));
      depositTimers.current.set(id, setTimeout(() => { clearDepositFeedback(id); }, 3000));
    } catch (error) {
      if (!mounted.current) return;
      clearDepositFeedback(id);
      if (error instanceof ApiError && error.status === 401) {
        localStorage.removeItem('adminToken');
        window.location.href = '/admin/login';
      }
      setDepositErrors((current) => ({ ...current, [id]: t('admin.deposit.error') }));
    }
  };

  return (
    <div className='rounded-2xl bg-white p-6 shadow-sm'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <h1 className='text-3xl font-semibold'>{t('admin.bookings')}</h1>
        <button
          type='button'
          onClick={() => setShowManualForm(true)}
          className='rounded bg-pine px-4 py-2 font-medium text-white transition-colors hover:bg-pine-dark'
        >
          + Nowa rezerwacja (telefon)
        </button>
      </div>

      {error ? <p role="alert" className='mt-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-red-700'>{error}</p> : null}

      {showManualForm ? (
        <div className='mt-6'>
          <ManualBookingForm
            token={token}
            onCreated={() => {
              setShowManualForm(false);
              refresh();
            }}
            onCancel={() => setShowManualForm(false)}
          />
        </div>
      ) : null}

      <div className='mt-6 flex flex-wrap gap-2'>
        <button
          type='button'
          onClick={() => setStatusFilter('ALL')}
          className={`rounded-full border px-4 py-1 text-sm transition-colors ${
            statusFilter === 'ALL' ? 'border-pine bg-pine text-white' : 'border-outline hover:bg-surface-container'
          }`}
        >
          Wszystkie ({bookings.length})
        </button>
        {FILTERS.map((filter) => (
          <button
            key={filter}
            type='button'
            onClick={() => setStatusFilter(filter)}
            className={`rounded-full border px-4 py-1 text-sm transition-colors ${
              statusFilter === filter ? 'border-pine bg-pine text-white' : 'border-outline hover:bg-surface-container'
            }`}
          >
            {t(`admin.bookingFilters.${filter}`)} ({countFor(filter)})
          </button>
        ))}
      </div>

      {visibleBookings.length === 0 ? (
        <p className='mt-6 text-on-surface-variant'>Brak rezerwacji w tej kategorii.</p>
      ) : (
      <div className="mt-6 overflow-x-auto"><table className='w-full text-left'>
        <tbody>
          {visibleBookings.map((booking) => (
            <tr key={booking.id} className='border-t'>
              <td className='py-3 font-mono text-xs'>{booking.reference}</td>
              <td>{booking.guestName}</td>
              <td>{booking.guestEmail || '—'}</td>
              <td>{booking.checkIn.slice(0, 10)} – {booking.checkOut.slice(0, 10)}</td>
              <td><BookingPriceEditor booking={booking}
                disabled={Boolean(busy) || priceSaving[booking.id] || depositStates[booking.id] === 'saving'}
                onSave={savePrice} saveError={priceErrors[booking.id]} onBlockingChange={priceBlockingChanged} /></td>
              <td>
                <p>{t(`admin.bookingStates.${booking.status}`)}</p>
                {booking.status === 'PENDING' && booking.expiresAt && <p className="text-sm">{t('admin.decisionBy')}: {new Date(booking.expiresAt).toLocaleString(i18n.language === 'en' ? 'en-GB' : 'pl-PL')}</p>}
                <p className="text-sm">
                  {t(`admin.bookingMailKind.${booking.confirmation ? booking.confirmation.kind ?? 'CONFIRMED' : booking.status === 'PENDING' || booking.status === 'CANCELLED' ? booking.status : 'CONFIRMED'}`)}:{' '}
                  {t(`admin.bookingMail.${booking.confirmation?.status ?? (booking.status !== 'EXPIRED' && booking.guestEmail ? 'NOT_RECORDED' : 'NOT_APPLICABLE')}`)}
                </p>
                {booking.confirmation?.lastError === 'DELIVERY_UNKNOWN' && <p className="text-sm text-error">
                  {t('admin.deliveryUnknown')}
                </p>}
                {booking.confirmation?.status === 'FAILED' && <button type="button" disabled={Boolean(busy)}
                  onClick={() => { void runAction(booking.id, () => retryBookingConfirmation(token, booking.id)); }}
                  className="min-h-11 underline">{t('admin.retryConfirmation')}</button>}
              </td>
              <td>
                <span className='rounded-full border px-2 py-1 text-xs'>
                  {booking.source === 'MANUAL' ? 'Telefon' : 'Strona'}
                </span>
              </td>
              <td>
                <input
                  aria-label={t('admin.deposit.label', { name: booking.guestName })}
                  className='w-24 rounded border px-2 py-1'
                  disabled={depositStates[booking.id] === 'saving'}
                  value={depositDrafts[booking.id] ?? booking.depositAmount}
                  onChange={(event) => {
                    clearDepositFeedback(booking.id);
                    setDepositDrafts((current) => ({ ...current, [booking.id]: event.target.value }));
                    setDepositErrors((current) => {
                      const next = { ...current };
                      delete next[booking.id];
                      return next;
                    });
                  }}
                />
                <button
                  type='button'
                  onClick={() => saveDeposit(booking.id)}
                  disabled={depositStates[booking.id] === 'saving' ||
                    Number(depositDrafts[booking.id] ?? booking.depositAmount) === Number(booking.depositAmount)}
                  className='ml-2 rounded border border-outline px-2 py-1 text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-60'
                >
                  {t(depositStates[booking.id] === 'saving' ? 'admin.deposit.saving' : 'admin.deposit.save')}
                </button>
                {depositStates[booking.id] === 'saved' && <p role="status" className="mt-2 text-sm text-pine">{t('admin.deposit.saved')}</p>}
                {depositErrors[booking.id] ? <p role="alert" className='mt-2 text-sm text-red-600'>{depositErrors[booking.id]}</p> : null}
              </td>
              <td className='space-x-2'>
                {booking.status === 'PENDING' && (
                <button
                  type='button'
                  disabled={Boolean(busy) || amountsUnsettled(booking) || !booking.expiresAt || new Date(booking.expiresAt).getTime() <= Date.now()}
                  onClick={() => updateStatus(booking.id, 'CONFIRMED')}
                  className='rounded border border-outline px-3 py-1 text-on-surface transition-colors hover:bg-surface-container'
                >
                  {t('admin.confirmBooking')}
                </button>
                )}
                {booking.status === 'PENDING' && amountsUnsettled(booking) &&
                  <p className="mt-2 text-sm">{t('admin.priceEdit.unsaved')}</p>}
                {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
                <button
                  type='button'
                  disabled={Boolean(busy)}
                  onClick={() => updateStatus(booking.id, 'CANCELLED')}
                  className='rounded border border-outline px-3 py-1 text-on-surface transition-colors hover:bg-surface-container'
                >
                  {t(booking.status === 'PENDING' ? 'admin.rejectBooking' : 'admin.cancelBooking')}
                </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
      )}
    </div>
  );
}
