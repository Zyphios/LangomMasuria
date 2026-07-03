import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import AdminBookings from './AdminBookings';
import * as adminApi from '../../api/admin';
import * as bookingsApi from '../../api/bookings';
import { vi } from 'vitest';

localStorage.setItem('adminToken', 'jwt-token');

vi.spyOn(adminApi, 'getAdminBookings').mockResolvedValue([
  {
    id: 'b1',
    guestName: 'Anna',
    guestEmail: 'anna@example.com',
    guestPhone: '+48111111111',
    status: 'PENDING',
    source: 'WEBSITE',
    checkIn: '2026-06-01',
    checkOut: '2026-06-04',
    totalPrice: '3800',
    depositAmount: '0'
  },
  {
    id: 'b2',
    guestName: 'Jan Telefoniczny',
    guestEmail: null,
    guestPhone: '+48600000000',
    status: 'CONFIRMED',
    source: 'MANUAL',
    checkIn: '2026-07-01',
    checkOut: '2026-07-03',
    totalPrice: '2000',
    depositAmount: '500'
  }
]);

vi.spyOn(bookingsApi, 'getAvailability').mockResolvedValue({ blockedDates: [] });

const renderAdminBookings = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <AdminBookings />
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('admin tabs', () => {
  it('renders bookings returned by the admin API', async () => {
    renderAdminBookings();
    expect(await screen.findByText('Anna')).toBeInTheDocument();
  });

  it('shows a source badge distinguishing website and manual bookings', async () => {
    renderAdminBookings();
    expect(await screen.findByText('Strona')).toBeInTheDocument();
    expect(await screen.findByText('Telefon')).toBeInTheDocument();
  });

  it('allows editing the deposit amount inline', async () => {
    const depositSpy = vi.spyOn(adminApi, 'updateBookingDeposit').mockResolvedValue({ depositAmount: '600' });

    renderAdminBookings();

    const depositInput = await screen.findByDisplayValue('500');
    const depositCell = depositInput.parentElement;
    fireEvent.change(depositInput, { target: { value: '600' } });
    fireEvent.click(within(depositCell as HTMLElement).getByText('Zapisz zaliczkę'));

    await waitFor(() => expect(depositSpy).toHaveBeenCalledWith('jwt-token', 'b2', 600));
  });

  it('opens the manual booking form and hides it again', async () => {
    renderAdminBookings();

    await screen.findByText('Anna');
    fireEvent.click(screen.getByText('+ Nowa rezerwacja (telefon)'));

    expect(await screen.findByText('Nowa rezerwacja telefoniczna')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Anuluj'));

    await waitFor(() => expect(screen.queryByText('Nowa rezerwacja telefoniczna')).not.toBeInTheDocument());
  });
});
