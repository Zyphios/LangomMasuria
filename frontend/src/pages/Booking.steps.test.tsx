import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Booking from './Booking';
import * as bookingsApi from '../api/bookings';
import * as pricingApi from '../api/pricing';
import { vi } from 'vitest';

vi.spyOn(bookingsApi, 'getAvailability').mockResolvedValue({ blockedDates: [] });
vi.spyOn(pricingApi, 'getPricingSeasons').mockResolvedValue([
  { id: 's1', namePl: 'Sezon wysoki', nameEn: 'High season', pricePerNight: '1200', dateFrom: '2026-05-01', dateTo: '2026-09-30', isFeatured: true }
]);
vi.spyOn(bookingsApi, 'createBooking').mockResolvedValue({ id: 'booking-1', reference: 'LM-20260101-ANN1A2B', status: 'PENDING', totalPrice: 3600 });

describe('booking wizard', () => {
  it('shows a review step before submitting, then the confirmation with a friendly reference', async () => {
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

    // Review/summary step: guest details are shown for a final check, booking isn't created yet.
    expect(await screen.findByText('Anna Nowak')).toBeInTheDocument();
    expect(bookingsApi.createBooking).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Wyślij prośbę o rezerwację' }));

    expect(await screen.findByText(/LM-20260101-ANN1A2B/)).toBeInTheDocument();
  });
});


