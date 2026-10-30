import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Booking from './Booking';
import * as pricingApi from '../api/pricing';
import * as bookingsApi from '../api/bookings';
import i18n from '../i18n';
import type { PricingSeason } from '../types';

const next = new Date();
next.setMonth(next.getMonth() + 1, 1);
const month = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
const rates: PricingSeason[] = [
  { id: 'low', namePl: 'Sezon niski', nameEn: 'Low season', pricePerNight: '700',
    dateFrom: `${month}-01`, dateTo: `${month}-28`, isFeatured: false },
  { id: 'holiday', namePl: 'Święta i Nowy Rok', nameEn: 'Holidays', pricePerNight: '1000',
    dateFrom: `${month}-12`, dateTo: `${month}-13`, isFeatured: false }
];

function showBooking() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><Booking /></QueryClientProvider>);
  return client;
}

async function selectStay() {
  const checkIn = await screen.findByRole('button', { name: new RegExp(`${month}-11 —`) });
  await waitFor(() => { expect(checkIn).not.toBeDisabled(); });
  fireEvent.click(checkIn);
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`${month}-14 —`) }));
}

beforeEach(async () => {
  await i18n.changeLanguage('pl');
  vi.spyOn(pricingApi, 'getPricingSeasons').mockResolvedValue(rates);
  vi.spyOn(bookingsApi, 'getAvailability').mockResolvedValue({ blockedDates: [], pendingDates: [], confirmedDates: [], manualBlockedDates: [] });
  vi.spyOn(bookingsApi, 'createBooking').mockResolvedValue({ status: 'EMAIL_VERIFICATION_REQUIRED', expiresAt: '2030-01-01T10:15:00Z' });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('booking seasonal estimate', () => {
  it('uses holiday priority and adds ordinary and holiday nights', async () => {
    showBooking();
    await selectStay();
    expect(await screen.findByText('2700 PLN')).toBeInTheDocument();
  });

  it('does not present a partial total or allow progressing when any night lacks a price', async () => {
    vi.mocked(pricingApi.getPricingSeasons).mockResolvedValueOnce([
      { ...rates[0], dateTo: `${month}-11` }, { ...rates[1], dateTo: `${month}-12` }
    ]);
    showBooking();
    await selectStay();
    expect(await screen.findByText(/Brak cennika dla całego wybranego pobytu/)).toHaveAttribute('role', 'alert');
    expect(screen.queryByText('1700 PLN')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
    expect(screen.queryByLabelText('Imię i nazwisko')).not.toBeInTheDocument();
  });

  it('does not accumulate floating-point currency errors', async () => {
    vi.mocked(pricingApi.getPricingSeasons).mockResolvedValueOnce([{ ...rates[0], pricePerNight: '100.10' }]);
    showBooking();
    await selectStay();
    expect(await screen.findByText('300,30 PLN')).toBeInTheDocument();
  });

  it('updates the review estimate when the shared pricing cache changes', async () => {
    const client = showBooking();
    await selectStay();
    await screen.findByText('2700 PLN');
    fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
    fireEvent.change(screen.getByLabelText('Imię i nazwisko'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.invalid' } });
    fireEvent.change(screen.getByLabelText('Telefon'), { target: { value: '000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
    await act(async () => {
      client.setQueryData(['pricing'], rates.map((rate) => ({ ...rate, pricePerNight: rate.id === 'low' ? '800' : '1200' })));
    });
    expect(await screen.findByText(/3200 PLN/)).toBeInTheDocument();
  });
});
