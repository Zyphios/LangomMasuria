import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminPricing from './AdminPricing';
import * as pricingApi from '../../api/pricing';
import * as adminApi from '../../api/admin';
import { ApiError } from '../../api/client';
import i18n from '../../i18n';
import type { PricingSeason } from '../../types';

const rates: PricingSeason[] = [
  { id: 'real-low-id', namePl: 'Sezon niski', nameEn: 'Low season', pricePerNight: '700',
    dateFrom: '2026-10-01T00:00:00.000Z', dateTo: '2027-04-30T00:00:00.000Z', isFeatured: false },
  { id: 'real-high-id', namePl: 'Sezon wysoki', nameEn: 'High season', pricePerNight: '800',
    dateFrom: '2026-05-01T00:00:00.000Z', dateTo: '2026-09-30T00:00:00.000Z', isFeatured: true },
  { id: 'real-holiday-id', namePl: 'Święta i Nowy Rok', nameEn: 'Holidays', pricePerNight: '1000',
    dateFrom: '2026-12-20T00:00:00.000Z', dateTo: '2027-01-05T00:00:00.000Z', isFeatured: false }
];

function showPricing() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><AdminPricing /></QueryClientProvider>);
  return client;
}

beforeEach(async () => {
  await i18n.changeLanguage('pl');
  localStorage.setItem('adminToken', 'synthetic-admin-token');
  vi.spyOn(pricingApi, 'getPricingSeasons').mockResolvedValue(rates);
  vi.spyOn(adminApi, 'updatePricingSeason').mockImplementation(async (_token, rate) => rate);
});

afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  await i18n.changeLanguage('pl');
});

describe('admin seasonal pricing editor', () => {
  it('loads all real seasons and date-only values instead of a hardcoded example', async () => {
    showPricing();
    const low = within(await screen.findByRole('group', { name: /sezon niski/i }));
    expect(low.getByLabelText('Cena za noc (PLN)')).toHaveValue('700');
    expect(low.getByLabelText('Data od')).toHaveValue('2026-10-01');
    expect(low.getByLabelText('Data do')).toHaveValue('2027-04-30');
    expect(within(screen.getByRole('group', { name: /sezon wysoki/i })).getByLabelText('Cena za noc (PLN)')).toHaveValue('800');
    expect(within(screen.getByRole('group', { name: /święta/i })).getByLabelText('Cena za noc (PLN)')).toHaveValue('1000');
  });

  it('saves the actual ID, dates and comma-decimal amount before acknowledging', async () => {
    let resolve!: (value: PricingSeason) => void;
    vi.mocked(adminApi.updatePricingSeason).mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const client = showPricing();
    const low = within(await screen.findByRole('group', { name: /sezon niski/i }));
    fireEvent.change(low.getByLabelText('Cena za noc (PLN)'), { target: { value: '750,50' } });
    fireEvent.change(low.getByLabelText('Data od'), { target: { value: '2026-10-02' } });
    fireEvent.change(low.getByLabelText('Data do'), { target: { value: '2027-04-29' } });
    fireEvent.click(low.getByRole('button', { name: 'Zapisz zmiany' }));
    expect(low.getByRole('button', { name: 'Zapisuję…' })).toBeDisabled();
    expect(low.queryByRole('status')).not.toBeInTheDocument();
    const updated = { ...rates[0], pricePerNight: '750.5', dateFrom: '2026-10-02', dateTo: '2027-04-29' };
    vi.mocked(pricingApi.getPricingSeasons).mockResolvedValue([updated, ...rates.slice(1)]);
    await act(async () => { resolve(updated); });
    expect(adminApi.updatePricingSeason).toHaveBeenCalledWith('synthetic-admin-token', updated);
    expect(low.getByRole('status')).toHaveTextContent('Zapisano');
    expect(low.getByLabelText('Cena za noc (PLN)')).toHaveValue('750.5');
    expect(client.getQueryData<PricingSeason[]>(['pricing'])?.find((rate) => rate.id === updated.id)?.pricePerNight).toBe('750.5');
    expect(low.getByLabelText('Data do')).toHaveValue('2027-04-29');
  });

  it.each(['0', '-1', 'abc', '700.123', '100000000'])('rejects invalid price %s without sending it', async (value) => {
    showPricing();
    const low = within(await screen.findByRole('group', { name: /sezon niski/i }));
    fireEvent.change(low.getByLabelText('Cena za noc (PLN)'), { target: { value } });
    fireEvent.click(low.getByRole('button', { name: 'Zapisz zmiany' }));
    expect(await low.findByRole('alert')).toHaveTextContent('Podaj poprawną cenę');
    expect(adminApi.updatePricingSeason).not.toHaveBeenCalled();
  });

  it('rejects reversed season dates', async () => {
    showPricing();
    const low = within(await screen.findByRole('group', { name: /sezon niski/i }));
    fireEvent.change(low.getByLabelText('Data do'), { target: { value: '2026-09-01' } });
    fireEvent.click(low.getByRole('button', { name: 'Zapisz zmiany' }));
    expect(await low.findByRole('alert')).toHaveTextContent('Data końcowa nie może być wcześniejsza');
    expect(adminApi.updatePricingSeason).not.toHaveBeenCalled();
  });

  it('keeps unsaved dates and shows an explicit server overlap error', async () => {
    vi.mocked(adminApi.updatePricingSeason).mockRejectedValueOnce(new ApiError('PRICING_OVERLAP', 409, 'PRICING_OVERLAP'));
    showPricing();
    const low = within(await screen.findByRole('group', { name: /sezon niski/i }));
    fireEvent.change(low.getByLabelText('Data od'), { target: { value: '2026-09-30' } });
    fireEvent.click(low.getByRole('button', { name: 'Zapisz zmiany' }));
    expect(await low.findByRole('alert')).toHaveTextContent('Sezon niski i wysoki nie mogą się nakładać');
    expect(low.getByLabelText('Data od')).toHaveValue('2026-09-30');
    expect(low.queryByRole('status')).not.toBeInTheDocument();
    expect(low.getByRole('button', { name: 'Zapisz zmiany' })).not.toBeDisabled();
  });

  it('keeps the edit after a failed save and supports retry', async () => {
    vi.mocked(adminApi.updatePricingSeason).mockRejectedValueOnce(new Error('synthetic failure'));
    showPricing();
    const low = within(await screen.findByRole('group', { name: /sezon niski/i }));
    fireEvent.change(low.getByLabelText('Cena za noc (PLN)'), { target: { value: '750' } });
    fireEvent.click(low.getByRole('button', { name: 'Zapisz zmiany' }));
    expect(await low.findByRole('alert')).toHaveTextContent('Nie udało się zapisać cennika');
    expect(low.getByLabelText('Cena za noc (PLN)')).toHaveValue('750');
    vi.mocked(pricingApi.getPricingSeasons).mockResolvedValue([{ ...rates[0], pricePerNight: '750' }, ...rates.slice(1)]);
    fireEvent.click(low.getByRole('button', { name: 'Zapisz zmiany' }));
    expect(await low.findByRole('status')).toHaveTextContent('Zapisano');
    expect(low.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows load failure without offering a fake price record', async () => {
    vi.mocked(pricingApi.getPricingSeasons).mockRejectedValueOnce(new Error('synthetic failure'));
    showPricing();
    expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się wczytać cennika');
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('translates editor fields and confirmation into English', async () => {
    await i18n.changeLanguage('en');
    showPricing();
    const low = within(await screen.findByRole('group', { name: /low season/i }));
    fireEvent.change(low.getByLabelText('Price per night (PLN)'), { target: { value: '750' } });
    vi.mocked(pricingApi.getPricingSeasons).mockResolvedValue([{ ...rates[0], pricePerNight: '750' }, ...rates.slice(1)]);
    fireEvent.click(low.getByRole('button', { name: 'Save changes' }));
    expect(await low.findByRole('status')).toHaveTextContent('Saved');
    expect(low.getByLabelText('From date')).toBeInTheDocument();
  });
});
