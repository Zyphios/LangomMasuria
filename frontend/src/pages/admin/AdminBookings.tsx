import { useEffect, useState } from 'react';
import { getAdminBookings, updateAdminBooking, updateBookingDeposit } from '../../api/admin';
import ManualBookingForm from './ManualBookingForm';
import type { AdminBookingRow } from '../../types';

export default function AdminBookings() {
  const token = localStorage.getItem('adminToken') || '';
  const [bookings, setBookings] = useState<AdminBookingRow[]>([]);
  const [depositDrafts, setDepositDrafts] = useState<Record<string, string>>({});
  const [depositErrors, setDepositErrors] = useState<Record<string, string>>({});
  const [showManualForm, setShowManualForm] = useState(false);

  const refresh = () =>
    getAdminBookings(token).then((nextBookings) => {
      setBookings(nextBookings);
      setDepositDrafts({});
      setDepositErrors({});
    });

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
        <button type='button' onClick={() => setShowManualForm(true)} className='rounded bg-pine px-4 py-2 text-white'>
          + Nowa rezerwacja (telefon)
        </button>
      </div>

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

      <table className='mt-6 w-full text-left'>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id} className='border-t'>
              <td className='py-3'>{booking.guestName}</td>
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
                <button type='button' onClick={() => saveDeposit(booking.id)} className='ml-2 rounded border px-2 py-1'>
                  Zapisz zaliczkę
                </button>
                {depositErrors[booking.id] ? <p className='mt-2 text-sm text-red-600'>{depositErrors[booking.id]}</p> : null}
              </td>
              <td className='space-x-2'>
                <button
                  type='button'
                  onClick={() => updateStatus(booking.id, 'CONFIRMED')}
                  className='rounded border px-3 py-1'
                >
                  Confirm
                </button>
                <button
                  type='button'
                  onClick={() => updateStatus(booking.id, 'CANCELLED')}
                  className='rounded border px-3 py-1'
                >
                  Cancel
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
