import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import Gallery from './Gallery';
import * as galleryApi from '../api/gallery';
import * as pricingApi from '../api/pricing';
import { vi } from 'vitest';
import i18n from '../i18n';
import { installDialogTestMethods } from '../test/dialog';

vi.spyOn(galleryApi, 'getGalleryImages').mockResolvedValue([
  { id: 'one', url: '/one.jpg', captionPl: 'Widok', captionEn: 'View', sortOrder: 1 },
  { id: 'two', url: '/two.jpg', captionPl: 'Salon', captionEn: 'Living room', sortOrder: 2 }
]);

vi.spyOn(pricingApi, 'getPricingSeasons').mockResolvedValue([
  { id: 's1', namePl: 'Sezon niski', nameEn: 'Low season', pricePerNight: '900', dateFrom: '2026-01-01', dateTo: '2026-04-30', isFeatured: false },
  { id: 's2', namePl: 'Sezon wysoki', nameEn: 'High season', pricePerNight: '1200', dateFrom: '2026-05-01', dateTo: '2026-09-30', isFeatured: true },
  { id: 's3', namePl: 'Święta i Sylwester', nameEn: 'Holidays and New Year', pricePerNight: '1500', dateFrom: '2026-12-20', dateTo: '2027-01-06', isFeatured: false }
]);

function renderGallery() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <Gallery />
      </QueryClientProvider>
    </MemoryRouter>
  );
  return client;
}

describe('gallery page', () => {
  let restoreDialog: () => void;

  beforeEach(async () => {
    restoreDialog = installDialogTestMethods();
    await i18n.changeLanguage('pl');
  });

  afterEach(async () => {
    cleanup();
    restoreDialog();
    await i18n.changeLanguage('pl');
  });

  it('opens the clicked photo and returns focus to its thumbnail on close', async () => {
    const user = userEvent.setup();
    renderGallery();
    const thumbnail = await screen.findByRole('button', { name: 'Powiększ zdjęcie: Salon' });
    await user.click(thumbnail);
    const dialog = screen.getByRole('dialog', { name: 'Podgląd zdjęć' });
    expect(within(dialog).getByRole('img', { name: 'Salon' })).toHaveAttribute('src', '/two.jpg');
    expect(within(dialog).getByText('2 / 2')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Zamknij podgląd' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(thumbnail).toHaveFocus();
  });

  it('keeps the selected photo when the API reorders images and closes if it is removed', async () => {
    const user = userEvent.setup();
    const client = renderGallery();
    await user.click(await screen.findByRole('button', { name: 'Powiększ zdjęcie: Salon' }));
    act(() => {
      client.setQueryData(['gallery'], [
        { id: 'two', url: '/two.jpg', captionPl: 'Salon', captionEn: 'Living room', sortOrder: 1 },
        { id: 'one', url: '/one.jpg', captionPl: 'Widok', captionEn: 'View', sortOrder: 2 }
      ]);
    });
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('img', { name: 'Salon' })).toHaveAttribute('src', '/two.jpg');
    expect(await within(dialog).findByText('1 / 2')).toBeInTheDocument();
    act(() => {
      client.setQueryData(['gallery'], [
        { id: 'one', url: '/one.jpg', captionPl: 'Widok', captionEn: 'View', sortOrder: 1 }
      ]);
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('renders the redesigned gallery pricing section and booking call to action', async () => {
    renderGallery();
    expect(screen.getByText('Galeria')).toBeInTheDocument();
    expect(await screen.findByText('Cennik')).toBeInTheDocument();
    expect(await screen.findByText('POPULARNY')).toBeInTheDocument();
    expect(await screen.findByText('1200')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ZAREZERWUJ SWÓJ POBYT' })).toBeInTheDocument();
  });
});
