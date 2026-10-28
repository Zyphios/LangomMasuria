import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import Pricing from './Pricing';
import * as pricingApi from '../api/pricing';
import i18n from '../i18n';
import type { PricingSeason } from '../types';

const seasons: PricingSeason[] = [
  { id: 's1', namePl: 'Sezon niski', nameEn: 'Low season', pricePerNight: '900', dateFrom: '2026-01-01', dateTo: '2026-04-30', isFeatured: false },
  { id: 's2', namePl: 'Sezon wysoki', nameEn: 'High season', pricePerNight: '1200', dateFrom: '2026-05-01', dateTo: '2026-09-30', isFeatured: true },
  { id: 's3', namePl: 'Święta i Sylwester', nameEn: 'Holidays and New Year', pricePerNight: '1500', dateFrom: '2026-12-20', dateTo: '2027-01-06', isFeatured: false }
];
const getPricing = vi.spyOn(pricingApi, 'getPricingSeasons');

function renderPricing() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <Pricing />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe('pricing page', () => {
  beforeEach(async () => {
    getPricing.mockResolvedValue(seasons);
    await i18n.changeLanguage('pl');
  });

  afterEach(async () => {
    cleanup();
    await i18n.changeLanguage('pl');
  });

  it('shows API prices, the featured season and the booking action', async () => {
    renderPricing();
    expect(screen.getByRole('heading', { level: 1, name: 'Cennik' })).toBeInTheDocument();
    expect(await screen.findByText('POPULARNY')).toBeInTheDocument();
    expect(screen.getByText('1200')).toBeInTheDocument();
    expect(screen.getByText('900')).toBeInTheDocument();
    expect(screen.getByText('1500')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ZAREZERWUJ SWÓJ POBYT' })).toHaveAttribute('href', '/booking');
  });

  it('translates the price units, featured badge and booking action', async () => {
    await i18n.changeLanguage('en');
    renderPricing();
    expect(await screen.findByText('POPULAR')).toBeInTheDocument();
    expect(screen.getAllByText('PLN / night')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'BOOK YOUR STAY' })).toHaveAttribute('href', '/booking');
  });

  it('shows a visible error instead of an apparently empty price list', async () => {
    getPricing.mockRejectedValueOnce(new Error('Network unavailable'));
    renderPricing();
    expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się wczytać cennika');
    expect(screen.getByRole('link', { name: 'ZAREZERWUJ SWÓJ POBYT' })).toBeInTheDocument();
  });

  it('explains when no seasons have been configured', async () => {
    getPricing.mockResolvedValueOnce([]);
    renderPricing();
    expect(await screen.findByText('Cennik jest obecnie aktualizowany. Skontaktuj się z nami, aby ustalić cenę pobytu.')).toBeInTheDocument();
  });
});
