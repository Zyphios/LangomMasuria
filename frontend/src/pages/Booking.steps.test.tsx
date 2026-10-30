import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Booking from './Booking';
import * as bookingsApi from '../api/bookings';
import * as pricingApi from '../api/pricing';
import { vi } from 'vitest';
import { ApiError } from '../api/client';

vi.spyOn(bookingsApi, 'getAvailability').mockResolvedValue({ blockedDates: [] });
vi.spyOn(pricingApi, 'getPricingSeasons').mockResolvedValue([
  { id: 's1', namePl: 'Sezon wysoki', nameEn: 'High season', pricePerNight: '1200', dateFrom: '2020-01-01', dateTo: '2099-12-31', isFeatured: true }
]);
vi.spyOn(bookingsApi, 'createBooking').mockResolvedValue({ status: 'EMAIL_VERIFICATION_REQUIRED', expiresAt: '2030-01-01T10:15:00Z' });

describe('booking wizard', () => {
  it('shows review, then requests email verification without claiming a reservation or hold', async () => {
    vi.mocked(bookingsApi.createBooking).mockRejectedValueOnce(new ApiError('BOOKING_RATE_LIMIT', 429, 'BOOKING_RATE_LIMIT', 3600));
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Booking />
      </QueryClientProvider>
    );
    
    await screen.findByRole('button', { name: /Dalej/ });
    const next = new Date();
    next.setMonth(next.getMonth() + 1, 1);
    const month = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    await user.click(await screen.findByRole('button', { name: new RegExp(`${month}-12 —`) }));
    await user.click(screen.getByRole('button', { name: new RegExp(`${month}-15 —`) }));
    await user.click(screen.getByRole('button', { name: 'Dalej' }));
    
    await user.type(screen.getByLabelText('Imię i nazwisko'), 'Anna Nowak');
    await user.type(screen.getByLabelText('Email'), 'anna@example.com');
    await user.type(screen.getByLabelText('Telefon'), '+48555111222');
    await user.clear(screen.getByLabelText('Liczba gości'));
    await user.type(screen.getByLabelText('Liczba gości'), '4');
    await user.click(screen.getByRole('button', { name: 'Dalej' }));

    // Review/summary step: guest details are shown for a final check, booking isn't created yet.
    expect(await screen.findByText('Anna Nowak')).toBeInTheDocument();
    expect(bookingsApi.createBooking).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Wyślij prośbę o rezerwację' }));
    expect(await screen.findByText(/60 min/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Wyślij prośbę o rezerwację' }));

    expect(await screen.findByText('Sprawdź swoją pocztę')).toBeInTheDocument();
    expect(screen.queryByText(/LM-20260101-ANN1A2B/)).not.toBeInTheDocument();
    expect(screen.getByText(/15 minut/)).toBeInTheDocument();
  });
});
