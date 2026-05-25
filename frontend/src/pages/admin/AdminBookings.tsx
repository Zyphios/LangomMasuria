import { useEffect, useState } from 'react';
import { getAdminBookings, updateAdminBooking } from '../../api/admin';

type BookingRow = {
  id: string;
  guestName: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  checkIn: string;
  checkOut: string;
  totalPrice: string;
};

export default function AdminBookings() {
  const token = localStorage.getItem('adminToken') || '';
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  
  useEffect(() => {
    getAdminBookings(token).then(setBookings);
  }, [token]);
  
  const updateStatus = async (id: string, status: BookingRow['status']) => {
    await updateAdminBooking(token, id, status);
    setBookings((current) => current.map((booking) => (booking.id === id ? { ...booking, status } : booking)));
  };
  
  return (
    <div className='rounded-2xl bg-white p-6 shadow-sm'>
      <h1 className='text-3xl font-semibold'>Rezerwacje</h1>
      <table className='mt-6 w-full text-left'>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id} className='border-t'>
              <td className='py-3'>{booking.guestName}</td>
              <td>{booking.checkIn} - {booking.checkOut}</td>
              <td>{booking.totalPrice} PLN</td>
              <td>{booking.status}</td>
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
