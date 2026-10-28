import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import * as galleryApi from './api/gallery';
import * as pricingApi from './api/pricing';
import i18n from './i18n';

vi.spyOn(galleryApi, 'getGalleryImages').mockResolvedValue([]);
vi.spyOn(pricingApi, 'getPricingSeasons').mockResolvedValue([
  { id: 'high', namePl: 'Sezon wysoki', nameEn: 'High season', pricePerNight: '1200', dateFrom: '2026-05-01', dateTo: '2026-09-30', isFeatured: true }
]);

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
    expect(screen.getByText('Twój azyl na Mazurach')).toBeInTheDocument();
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
    expect(screen.getByRole('heading', { name: 'Galeria' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Cennik' })).not.toBeInTheDocument();
    gallery.unmount();
    renderRoute('/house');
    expect(screen.getByRole('heading', { name: 'O Naszym Domu' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Atrakcje w okolicy' })).not.toBeInTheDocument();
  });

  it('renders API prices and booking action at the pricing address', async () => {
    renderRoute('/pricing');
    expect(screen.getByRole('heading', { level: 1, name: 'Cennik' })).toBeInTheDocument();
    expect(await screen.findByText('1200')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ZAREZERWUJ SWÓJ POBYT' })).toHaveAttribute('href', '/booking');
  });

  it('renders local attractions at their own address', () => {
    renderRoute('/attractions');
    expect(screen.getByRole('heading', { level: 1, name: 'Atrakcje w okolicy' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Jezioro Garbas' })).toBeInTheDocument();
  });

  it.each([
    ['/house', 'Dom'],
    ['/attractions', 'Atrakcje'],
    ['/gallery', 'Galeria'],
    ['/pricing', 'Cennik']
  ])('marks only the matching navigation link at %s', (entry, label) => {
    renderRoute(entry);
    const nav = within(within(screen.getByRole('banner')).getByRole('navigation'));
    expect(nav.getByRole('link', { name: label })).toHaveAttribute('href', entry);
    expect(nav.getByRole('link', { current: 'page' })).toHaveTextContent(label);
  });
});
