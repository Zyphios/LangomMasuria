import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import Pricing from './Pricing';
import * as pricingApi from '../api/pricing';
import i18n from '../i18n';
import type { PricingSeason } from '../types';

const seasons: PricingSeason[] = [
  { id: 's1', namePl: 'Sezon niski', nameEn: 'Low season', pricePerNight: '900', minNights: 2, dateFrom: '2026-01-01', dateTo: '2026-04-30', isFeatured: false },
  { id: 's2', namePl: 'Sezon wysoki', nameEn: 'High season', pricePerNight: '1200', minNights: 2, dateFrom: '2026-05-01', dateTo: '2026-09-30', isFeatured: true },
  { id: 's3', namePl: 'Święta i Sylwester', nameEn: 'Holidays and New Year', pricePerNight: '1500', minNights: 2, dateFrom: '2026-12-20', dateTo: '2027-01-06', isFeatured: false }
];
const getPricing = vi.spyOn(pricingApi, 'getPricingSeasons');
const getSettings = vi.spyOn(pricingApi, 'getPricingSettings');
const settings = { minStayTextPl: 'Maj–sierpień: minimum 5 nocy.', minStayTextEn: 'May–August: minimum 5 nights.' };

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
    getSettings.mockResolvedValue(settings);
    await i18n.changeLanguage('pl');
  });

  afterEach(async () => {
    cleanup();
    await i18n.changeLanguage('pl');
  });

  it('shows API prices, the featured season and the booking action', async () => {
    renderPricing();
    expect(screen.getByRole('heading', { level: 1, name: 'Cennik i zasady rezerwacji' })).toBeInTheDocument();
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

  it('shows actual configured dates and preserves fractional nightly prices', async () => {
    getPricing.mockResolvedValueOnce([{ ...seasons[0], pricePerNight: '900.50', dateFrom: '2026-10-02T00:00:00.000Z',
      dateTo: '2027-04-29T00:00:00.000Z' }, ...seasons.slice(1)]);
    renderPricing();
    expect(await screen.findByText('900,50')).toBeInTheDocument();
    expect(screen.getByText('2026-10-02 – 2027-04-29')).toBeInTheDocument();
    expect(screen.getByText('2026-12-20 – 2027-01-06')).toBeInTheDocument();
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

  it('uses the saved public description in the selected language instead of static two-night copy', async () => {
    renderPricing();
    expect(await screen.findByText(settings.minStayTextPl)).toBeInTheDocument();
    expect(screen.queryByText('Min. długość pobytu: 2 noce')).not.toBeInTheDocument();
    await act(async () => { await i18n.changeLanguage('en'); });
    expect(await screen.findByText(settings.minStayTextEn)).toBeInTheDocument();
  });

  it('reports a description load error and retries instead of showing invented rules', async () => {
    getSettings.mockRejectedValueOnce(new Error('synthetic failure'));
    renderPricing();
    expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się wczytać opisu minimalnego pobytu');
    expect(screen.queryByText('Min. długość pobytu: 2 noce')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ponów' }));
    expect(await screen.findByText(settings.minStayTextPl)).toBeInTheDocument();
  });

  it.each([
    { locale: 'pl', tub: 'Gorąca balia z hydromasażem', price: 'Pierwsze przygotowanie na czas przyjazdu.', self: 'Kolejne przygotowania we własnym zakresie.',
      hours: 'Doba hotelowa', arrival: 'od 15:00', departure: 'do 11:00', payment: 'Rezerwacja i płatności',
      advance: /Zaliczka 30%.*24 godzin.*zatwierdzenia rezerwacji przez właściciela/,
      balance: /przelewem przed przyjazdem.*gotówką.*BLIK/ },
    { locale: 'en', tub: 'Hot tub with hydromassage', price: 'The first preparation is done for your arrival.', self: 'Prepare the hot tub yourself for subsequent uses.',
      hours: 'Check-in and check-out', arrival: 'from 3:00 PM', departure: 'by 11:00 AM', payment: 'Booking and payments',
      advance: /30% advance payment.*24 hours.*owner.*approval/,
      balance: /bank transfer before arrival.*cash.*BLIK/ }
  ])('explains preparation charges, stay hours and post-approval payments in $locale', async (copy) => {
    await i18n.changeLanguage(copy.locale);
    renderPricing();
    const tub = within(await screen.findByRole('region', { name: copy.tub }));
    expect(tub.getByText(copy.price)).toBeInTheDocument();
    expect(tub.getByText(copy.self)).toBeInTheDocument();
    const hours = within(screen.getByRole('region', { name: copy.hours }));
    expect(hours.getByText(copy.arrival)).toBeInTheDocument();
    expect(hours.getByText(copy.departure)).toBeInTheDocument();
    const payment = within(screen.getByRole('region', { name: copy.payment }));
    expect(payment.getByText(copy.advance)).toBeInTheDocument();
    expect(payment.getByText(copy.balance)).toBeInTheDocument();
  });
});
