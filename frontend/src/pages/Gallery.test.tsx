import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import Gallery from './Gallery';
import * as galleryApi from '../api/gallery';
import { vi } from 'vitest';
import i18n from '../i18n';
import { installDialogTestMethods } from '../test/dialog';

vi.spyOn(galleryApi, 'getGalleryImages').mockResolvedValue([
  { id: 'one', url: '/one.jpg', captionPl: 'Widok', captionEn: 'View', sortOrder: 1 },
  { id: 'two', url: '/two.jpg', captionPl: 'Salon', captionEn: 'Living room', sortOrder: 2 }
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

  it('introduces the gallery without address suffixes or the old pricing section', async () => {
    renderGallery();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', {
      level: 1, name: 'Rozgość się w Domku na Mazurskiej'
    })).toBeInTheDocument();
    expect(screen.getByText('Przejrzyj zdjęcia i przekonaj się, jak przyjemnie można spędzić czas w naszym mazurskim domku :)'))
      .toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Powiększ zdjęcie: Salon' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Cennik i zasady rezerwacji' })).not.toBeInTheDocument();
  });

  it('provides the new introduction and the unchanged photo preview in English', async () => {
    await i18n.changeLanguage('en');
    const user = userEvent.setup();
    renderGallery();
    expect(screen.getByRole('heading', {
      level: 1, name: 'Make yourself at home at Domek na Mazurskiej'
    })).toBeInTheDocument();
    expect(screen.getByText('Browse the photos and discover how lovely a stay in our Masurian cottage can be :)'))
      .toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Enlarge photo: Living room' }));
    const preview = within(screen.getByRole('dialog', { name: 'Photo viewer' }));
    expect(preview.getByRole('img', { name: 'Living room' })).toHaveAttribute('src', '/two.jpg');
    expect(preview.getByText('2 / 2')).toBeInTheDocument();
  });

  it('keeps the renamed night photo and its caption available in the default gallery and viewer', async () => {
    vi.mocked(galleryApi.getGalleryImages).mockResolvedValueOnce([]);
    const user = userEvent.setup();
    renderGallery();
    const caption = 'Dom nocą, w świetle latarni';
    await waitFor(() => {
      expect(screen.getByRole('img', { name: caption })).toHaveAttribute('src', '/Baner.jpg');
    });
    await user.click(screen.getByRole('button', { name: `Powiększ zdjęcie: ${caption}` }));
    expect(within(screen.getByRole('dialog')).getByRole('img', { name: caption }))
      .toHaveAttribute('src', '/Baner.jpg');
  });
});
