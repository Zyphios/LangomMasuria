import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Booking from './Booking';
import * as bookingsApi from '../api/bookings';
import * as pricingApi from '../api/pricing';
import { vi } from 'vitest';
import i18n from '../i18n';
import { MemoryRouter } from 'react-router-dom';

vi.spyOn(bookingsApi, 'getAvailability').mockResolvedValue({ blockedDates: ['2026-06-10'] });
vi.spyOn(pricingApi, 'getPricingSeasons').mockResolvedValue([]);

afterEach(async () => {
  cleanup();
  await i18n.changeLanguage('pl');
});

describe('booking step 1', () => {
  it('prevents selecting a stay shorter than two nights', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter><Booking /></MemoryRouter>
      </QueryClientProvider>
    );
    
    const next = new Date();
    next.setMonth(next.getMonth() + 1, 1);
    const month = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    await user.click(await screen.findByRole('button', { name: new RegExp(`${month}-12 —`) }));
    await user.click(screen.getByRole('button', { name: new RegExp(`${month}-13 —`) }));
    await user.click(screen.getByRole('button', { name: 'Dalej' }));
    
    expect(await screen.findByText('Minimalna długość pobytu to 2 noce')).toBeInTheDocument();
  });

  it.each([
    { locale: 'pl', rules: 'Cennik i zasady pobytu', contact: 'Masz pytania? Napisz do nas' },
    { locale: 'en', rules: 'Pricing and stay rules', contact: 'Questions? Get in touch' }
  ])('links to separate rules and contact pages from the $locale booking wizard', async (copy) => {
    await i18n.changeLanguage(copy.locale);
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><Booking /></MemoryRouter></QueryClientProvider>);
    expect(screen.getByRole('link', { name: copy.rules })).toHaveAttribute('href', '/pricing');
    expect(screen.getByRole('link', { name: copy.contact })).toHaveAttribute('href', '/contact');
    expect(screen.queryByRole('heading', { name: /Zasady Domu|House Rules/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Wyślij wiadomość|Send message/ })).not.toBeInTheDocument();
  });
});
