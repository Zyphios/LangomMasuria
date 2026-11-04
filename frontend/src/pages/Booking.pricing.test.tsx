import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Booking from './Booking';
import { MemoryRouter } from 'react-router-dom';
import * as pricingApi from '../api/pricing';
import * as bookingsApi from '../api/bookings';
import { ApiError } from '../api/client';
import i18n from '../i18n';
import type { PricingSeason } from '../types';

const next = new Date();
next.setMonth(next.getMonth() + 1, 1);
const month = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
const rates: PricingSeason[] = [
  { id: 'low', namePl: 'Sezon niski', nameEn: 'Low season', pricePerNight: '700',
    dateFrom: `${month}-01`, dateTo: `${month}-28`, isFeatured: false, minNights: 2 },
  { id: 'holiday', namePl: 'Święta i Nowy Rok', nameEn: 'Holidays', pricePerNight: '1000',
    dateFrom: `${month}-12`, dateTo: `${month}-13`, isFeatured: false, minNights: 2 }
];

function showBooking() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter><Booking /></MemoryRouter></QueryClientProvider>);
  return client;
}

async function selectStay(from = 11, to = 14) {
  const checkIn = await screen.findByRole('button', { name: new RegExp(`${month}-${String(from).padStart(2, '0')} —`) });
  await waitFor(() => { expect(checkIn).not.toBeDisabled(); });
  fireEvent.click(checkIn);
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`${month}-${String(to).padStart(2, '0')} —`) }));
}

function fillGuest() {
  fireEvent.change(screen.getByLabelText('Imię i nazwisko'), { target: { value: 'Test' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.invalid' } });
  fireEvent.change(screen.getByLabelText('Telefon'), { target: { value: '000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
}

beforeEach(async () => {
  await i18n.changeLanguage('pl');
  vi.spyOn(pricingApi, 'getPricingSeasons').mockResolvedValue(rates);
  vi.spyOn(bookingsApi, 'getAvailability').mockResolvedValue({ blockedDates: [], pendingDates: [], confirmedDates: [], manualBlockedDates: [] });
  vi.spyOn(bookingsApi, 'createBooking').mockResolvedValue({
    id: 'booking-1', reference: 'TEST-1', status: 'PENDING', totalPrice: 2400, expiresAt: '2030-01-02T10:15:00Z'
  });
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

  it('displays and enforces the highest minimum among the selected occupied seasons', async () => {
    vi.mocked(pricingApi.getPricingSeasons).mockResolvedValue([{ ...rates[0], minNights: 5 }, rates[1]]);
    showBooking();
    await selectStay();
    expect(await screen.findByText('Minimum w wybranym terminie: 5 nocy')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Minimalna długość pobytu to 5 nocy');
    expect(screen.queryByLabelText('Imię i nazwisko')).not.toBeInTheDocument();
  });

  it('accepts a stay exactly as long as the configured minimum', async () => {
    vi.mocked(pricingApi.getPricingSeasons).mockResolvedValue([{ ...rates[0], minNights: 5 }, rates[1]]);
    showBooking();
    await selectStay(9, 14);
    await screen.findByText('4100 PLN');
    fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
    expect(await screen.findByLabelText('Imię i nazwisko')).toBeInTheDocument();
  });

  it('uses the holiday override and excludes checkout from the stricter ordinary season', async () => {
    vi.mocked(pricingApi.getPricingSeasons).mockResolvedValue([{ ...rates[0], minNights: 5 }, rates[1]]);
    showBooking();
    await selectStay(12, 14);
    expect(await screen.findByText('Minimum w wybranym terminie: 2 noce')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
    expect(await screen.findByLabelText('Imię i nazwisko')).toBeInTheDocument();
  });

  it('enforces a stricter holiday minimum as well', async () => {
    vi.mocked(pricingApi.getPricingSeasons).mockResolvedValue([rates[0], { ...rates[1], minNights: 6 }]);
    showBooking();
    await selectStay();
    fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Minimalna długość pobytu to 6 nocy');
    expect(screen.queryByLabelText('Imię i nazwisko')).not.toBeInTheDocument();
  });

  it('rechecks updated minimums before sending a request already at review', async () => {
    const client = showBooking();
    await selectStay();
    await screen.findByText('2700 PLN');
    fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
    fillGuest();
    await act(async () => { client.setQueryData(['pricing'], [{ ...rates[0], minNights: 5, pricePerNight: '800' }, rates[1]]); });
    await screen.findByText(/2800 PLN/);
    fireEvent.click(screen.getByRole('button', { name: 'Wyślij prośbę o rezerwację' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Minimalna długość pobytu to 5 nocy');
    expect(screen.getByRole('heading', { name: 'Daty pobytu' })).toBeInTheDocument();
    expect(bookingsApi.createBooking).not.toHaveBeenCalled();
  });

  it('returns to dates and reloads rates when the server rejects an outdated minimum', async () => {
    vi.mocked(bookingsApi.createBooking).mockRejectedValueOnce(new ApiError('Minimum stay is 5 nights', 400, 'MINIMUM_STAY'));
    showBooking();
    await selectStay();
    await screen.findByText('2700 PLN');
    fireEvent.click(screen.getByRole('button', { name: 'Dalej' }));
    fillGuest();
    vi.mocked(pricingApi.getPricingSeasons).mockResolvedValue([{ ...rates[0], minNights: 5 }, rates[1]]);
    fireEvent.click(screen.getByRole('button', { name: 'Wyślij prośbę o rezerwację' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Minimalna długość pobytu dla tego terminu uległa zmianie');
    expect(await screen.findByText('Minimum w wybranym terminie: 5 nocy')).toBeInTheDocument();
    expect(screen.queryByText('Dziękujemy za zgłoszenie!')).not.toBeInTheDocument();
  });

  it('shows the seasonal minimum and validation in English', async () => {
    await i18n.changeLanguage('en');
    vi.mocked(pricingApi.getPricingSeasons).mockResolvedValue([{ ...rates[0], minNights: 5 }, rates[1]]);
    showBooking();
    await selectStay();
    expect(await screen.findByText('Minimum for the selected dates: 5 nights')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Minimum stay is 5 nights');
  });
});
