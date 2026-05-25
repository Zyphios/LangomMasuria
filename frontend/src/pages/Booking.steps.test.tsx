import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Booking from './Booking';
import * as bookingsApi from '../api/bookings';
import { vi } from 'vitest';

vi.spyOn(bookingsApi, 'getAvailability').mockResolvedValue({ blockedDates: [] });
vi.spyOn(bookingsApi, 'createBooking').mockResolvedValue({ id: 'booking-1', status: 'PENDING' });
vi.spyOn(bookingsApi, 'initPayment').mockResolvedValue({ redirectUrl: '/booking?step=4&status=success', orderId: 'STUB-booking-1' });

describe('booking wizard', () => {
  it('submits guest details, initializes payment, and shows the confirmation summary', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Booking />
      </QueryClientProvider>
    );
    
    await user.type(screen.getByLabelText('Check-in'), '2026-06-12');
    await user.type(screen.getByLabelText('Check-out'), '2026-06-15');
    await user.click(screen.getByRole('button', { name: 'Dalej' }));
    
    await user.type(screen.getByLabelText('Imię i nazwisko'), 'Anna Nowak');
    await user.type(screen.getByLabelText('Email'), 'anna@example.com');
    await user.type(screen.getByLabelText('Telefon'), '+48555111222');
    await user.clear(screen.getByLabelText('Liczba gości'));
    await user.type(screen.getByLabelText('Liczba gości'), '4');
    await user.click(screen.getByRole('button', { name: 'Dalej' }));
    
    await user.click(screen.getByRole('button', { name: 'Uruchom płatność testową' }));
    
    expect(await screen.findByText(/STUB-booking-1/)).toBeInTheDocument();
    expect(await screen.findByText('Opłata za sprzątanie: 200 PLN')).toBeInTheDocument();
  });
});
