import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Booking from './Booking';
import * as bookingsApi from '../api/bookings';
import * as pricingApi from '../api/pricing';
import { vi } from 'vitest';
import { ApiError } from '../api/client';
import i18n from '../i18n';

vi.spyOn(bookingsApi, 'getAvailability').mockResolvedValue({ blockedDates: [] });
vi.spyOn(pricingApi, 'getPricingSeasons').mockResolvedValue([
  { id: 's1', namePl: 'Sezon wysoki', nameEn: 'High season', pricePerNight: '1200', dateFrom: '2020-01-01', dateTo: '2099-12-31', isFeatured: true }
]);
vi.spyOn(bookingsApi, 'createBooking').mockResolvedValue({
  id: 'booking-1', reference: 'LM-20260101-ANN1A2B', status: 'PENDING',
  totalPrice: 3450, expiresAt: '2030-01-02T10:15:00Z'
});

describe('booking wizard', () => {
  it('shows review, then an immediate booking reference and hold while waiting for the owner', async () => {
    vi.mocked(bookingsApi.createBooking).mockRejectedValueOnce(new ApiError('BOOKING_RATE_LIMIT', 429, 'BOOKING_RATE_LIMIT', 3600));
    const user = userEvent.setup();
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
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
    const availabilityCalls = vi.mocked(bookingsApi.getAvailability).mock.calls.length;
    vi.mocked(bookingsApi.getAvailability).mockResolvedValue({
      blockedDates: [`${month}-12`], pendingDates: [`${month}-12`], confirmedDates: [], manualBlockedDates: []
    });
    await user.click(screen.getByRole('button', { name: 'Wyślij prośbę o rezerwację' }));

    expect(await screen.findByText(/LM-20260101-ANN1A2B/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Rezerwacja wstępna' })).toBeInTheDocument();
    expect(screen.getByText(/24 godziny.*decyzję właściciela/)).toBeInTheDocument();
    expect(screen.getByText(/Termin zablokowany do:/)).toHaveTextContent(
      new Date('2030-01-02T10:15:00Z').toLocaleString('pl-PL'));
    expect(screen.getByText(/3\s?450.*PLN/)).toBeInTheDocument();
    expect(screen.getByText(/wysłane lub oczekuje w kolejce.*Nie musisz/)).toBeInTheDocument();
    expect(screen.queryByText(/15 minut|Sprawdź swoją pocztę|Potwierdź adres e-mail/)).not.toBeInTheDocument();
    await waitFor(() => expect(vi.mocked(bookingsApi.getAvailability).mock.calls.length).toBeGreaterThan(availabilityCalls));
    await waitFor(() => expect(client.getQueryData(['availability', next.getMonth() + 1, next.getFullYear()]))
      .toMatchObject({ pendingDates: [`${month}-12`] }));
    await act(async () => { await i18n.changeLanguage('en'); });
    expect(screen.getByRole('heading', { name: 'Provisional booking' })).toBeInTheDocument();
    expect(screen.getByText(/24 hours.*owner/)).toBeInTheDocument();
    expect(screen.getByText(/sent or queued.*No action/)).toBeInTheDocument();
    await act(async () => { await i18n.changeLanguage('pl'); });
  });
});
