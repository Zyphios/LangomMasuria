import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../api/client';
import { getAdminBookings, updateAdminBooking, updateBookingDeposit } from '../../api/admin';
import ManualBookingForm from './ManualBookingForm';
import type { AdminBookingRow, BookingStatus } from '../../types';

type StatusFilter = 'PENDING' | BookingStatus;

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'PENDING', label: 'Oczekujące' },
  { value: 'CONFIRMED', label: 'Potwierdzone' },
  { value: 'CANCELLED', label: 'Anulowane' }
];

export default function AdminBookings() {
  const token = localStorage.getItem('adminToken') || '';
  const [bookings, setBookings] = useState<AdminBookingRow[]>([]);
  const [depositDrafts, setDepositDrafts] = useState<Record<string, string>>({});
  const [depositErrors, setDepositErrors] = useState<Record<string, string>>({});
  const [showManualForm, setShowManualForm] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter | 'ALL'>('ALL');

  const refresh = () =>
    getAdminBookings(token)
      .then((nextBookings) => {
        setBookings(nextBookings);
        setDepositDrafts({});
        setDepositErrors({});
        setError('');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const visibleBookings = useMemo(
    () => (statusFilter === 'ALL' ? bookings : bookings.filter((booking) => booking.status === statusFilter)),
    [bookings, statusFilter]
  );

  const countFor = (status: StatusFilter) => bookings.filter((booking) => booking.status === status).length;

  const updateStatus = async (id: string, status: AdminBookingRow['status']) => {
    await updateAdminBooking(token, id, status);
    setBookings((current) => current.map((booking) => (booking.id === id ? { ...booking, status } : booking)));
  };

  const saveDeposit = async (id: string) => {
    const draft = depositDrafts[id];
    if (draft === undefined) return;

    const amount = Number(draft);
    if (!Number.isFinite(amount) || amount < 0) {
      setDepositErrors((current) => ({ ...current, [id]: 'Zaliczka musi być liczbą nieujemną' }));
      return;
    }

    const result = await updateBookingDeposit(token, id, amount);
    setDepositErrors((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setDepositDrafts((current) => ({ ...current, [id]: result.depositAmount }));
    setBookings((current) => current.map((booking) => (booking.id === id ? { ...booking, depositAmount: result.depositAmount } : booking)));
  };

  return (
    <div className='rounded-2xl bg-white p-6 shadow-sm'>
      <div className='flex items-center justify-between'>
        <h1 className='text-3xl font-semibold'>Rezerwacje</h1>
        <button
          type='button'
          onClick={() => setShowManualForm(true)}
          className='rounded bg-pine px-4 py-2 font-medium text-white transition-colors hover:bg-pine-dark'
        >
          + Nowa rezerwacja (telefon)
        </button>
      </div>

      {error ? <p className='mt-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-red-700'>{error}</p> : null}

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
            key={filter.value}
            type='button'
            onClick={() => setStatusFilter(filter.value)}
            className={`rounded-full border px-4 py-1 text-sm transition-colors ${
              statusFilter === filter.value ? 'border-pine bg-pine text-white' : 'border-outline hover:bg-surface-container'
            }`}
          >
            {filter.label} ({countFor(filter.value)})
          </button>
        ))}
      </div>

      {visibleBookings.length === 0 ? (
        <p className='mt-6 text-on-surface-variant'>Brak rezerwacji w tej kategorii.</p>
      ) : (
      <table className='mt-6 w-full text-left'>
        <tbody>
          {visibleBookings.map((booking) => (
            <tr key={booking.id} className='border-t'>
              <td className='py-3 font-mono text-xs'>{booking.reference}</td>
              <td>{booking.guestName}</td>
              <td>{booking.guestEmail || '—'}</td>
              <td>{booking.checkIn} - {booking.checkOut}</td>
              <td>{booking.totalPrice} PLN</td>
              <td>{booking.status}</td>
              <td>
                <span className='rounded-full border px-2 py-1 text-xs'>
                  {booking.source === 'MANUAL' ? 'Telefon' : 'Strona'}
                </span>
              </td>
              <td>
                <input
                  aria-label={`Zaliczka ${booking.guestName}`}
                  className='w-24 rounded border px-2 py-1'
                  value={depositDrafts[booking.id] ?? booking.depositAmount}
                  onChange={(event) => {
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
                  className='ml-2 rounded border border-outline px-2 py-1 text-on-surface transition-colors hover:bg-surface-container'
                >
                  Zapisz zaliczkę
                </button>
                {depositErrors[booking.id] ? <p className='mt-2 text-sm text-red-600'>{depositErrors[booking.id]}</p> : null}
              </td>
              <td className='space-x-2'>
                <button
                  type='button'
                  onClick={() => updateStatus(booking.id, 'CONFIRMED')}
                  className='rounded border border-outline px-3 py-1 text-on-surface transition-colors hover:bg-surface-container'
                >
                  Confirm
                </button>
                <button
                  type='button'
                  onClick={() => updateStatus(booking.id, 'CANCELLED')}
                  className='rounded border border-outline px-3 py-1 text-on-surface transition-colors hover:bg-surface-container'
                >
                  Cancel
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      )}
    </div>
  );
}
