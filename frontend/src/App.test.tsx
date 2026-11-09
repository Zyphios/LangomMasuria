import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import * as galleryApi from './api/gallery';
import * as pricingApi from './api/pricing';
import i18n from './i18n';
import * as siteSettingsApi from './api/siteSettings';

vi.spyOn(siteSettingsApi, 'getSiteSettings').mockResolvedValue({ facebookUrl: '', instagramUrl: '' });

vi.spyOn(galleryApi, 'getGalleryImages').mockResolvedValue([]);
vi.spyOn(pricingApi, 'getPricingSeasons').mockResolvedValue([
  { id: 'high', namePl: 'Sezon wysoki', nameEn: 'High season', pricePerNight: '1200', minNights: 2, dateFrom: '2026-05-01', dateTo: '2026-09-30', isFeatured: true }
]);
vi.spyOn(pricingApi, 'getPricingSettings').mockResolvedValue({
  minStayTextPl: 'Min. długość pobytu: 2 noce', minStayTextEn: 'Minimum stay: 2 nights'
});

function RouteProbe() {
  const { pathname, hash } = useLocation();
  return <output aria-label="Adres">{pathname + hash}</output>;
}

function renderRoute(entry: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <App />
        <RouteProbe />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('app shell', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('pl');
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.mocked(window.scrollTo).mockRestore();
  });

  it('renders the Polish home route by default', () => {
    renderRoute('/');
    expect(screen.getByRole('heading', {
      level: 1,
      name: 'Domek z balią i jacuzzi na Mazurach Stare Juchy k. Ełku'
    })).toBeInTheDocument();
  });

  it.each([
    ['/house#attractions', '/attractions'],
    ['/gallery#rates', '/pricing']
  ])('redirects old section %s to %s', async (entry, expected) => {
    renderRoute(entry);
    await waitFor(() => expect(screen.getByLabelText('Adres')).toHaveTextContent(expected));
  });

  it('keeps gallery and house content separate from pricing and attractions', () => {
    const gallery = renderRoute('/gallery');
    expect(screen.getByRole('heading', {
      name: 'Rozgość się w Domku na Mazurskiej'
    })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Cennik i zasady rezerwacji' })).not.toBeInTheDocument();
    gallery.unmount();
    renderRoute('/house');
    expect(screen.getByRole('heading', {
      name: 'O Domku na Mazurskiej – Poznaj nasze wnętrza i otoczenie'
    })).toBeInTheDocument();
    expect(screen.queryByRole('heading', {
      name: 'Atrakcje w okolicy – co warto zobaczyć wokół Domku na Mazurskiej?'
    })).not.toBeInTheDocument();
  });

  it('renders API prices and booking action at the pricing address', async () => {
    renderRoute('/pricing');
    expect(screen.getByRole('heading', { level: 1, name: 'Cennik i zasady rezerwacji' })).toBeInTheDocument();
    expect(await screen.findByText('1200')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ZAREZERWUJ SWÓJ POBYT' })).toHaveAttribute('href', '/booking');
  });

  it('renders local attractions at their own address', () => {
    renderRoute('/attractions');
    expect(screen.getByRole('heading', {
      level: 1, name: 'Atrakcje w okolicy – co warto zobaczyć wokół Domku na Mazurskiej?'
    })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Kameralna plaża leśna – 500 m od domku' })).toBeInTheDocument();
  });

  it.each([
    ['/house', 'Dom'],
    ['/attractions', 'Atrakcje'],
    ['/gallery', 'Galeria'],
    ['/pricing', 'Cennik'],
    ['/directions', 'Jak dojechać?'],
    ['/contact', 'Kontakt']
  ])('marks only the matching navigation link at %s', (entry, label) => {
    renderRoute(entry);
    const nav = within(within(screen.getByRole('banner')).getByRole('navigation'));
    expect(nav.getByRole('link', { name: label })).toHaveAttribute('href', entry);
    expect(nav.getByRole('link', { current: 'page' })).toHaveTextContent(label);
  });
});
