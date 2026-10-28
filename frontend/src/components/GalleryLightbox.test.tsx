import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '../i18n';
import { installDialogTestMethods } from '../test/dialog';
import type { GalleryImage } from '../types';
import GalleryLightbox from './GalleryLightbox';

const photos: GalleryImage[] = [
  { id: 'one', url: '/one.jpg', captionPl: 'Dom', captionEn: 'House', sortOrder: 1 },
  { id: 'two', url: '/two.jpg', captionPl: 'Salon', captionEn: 'Living room', sortOrder: 2 }
];

function Harness({ images = photos }: { images?: GalleryImage[] }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(true);
  return open ? (
    <GalleryLightbox images={images} index={index} onIndexChange={setIndex} onClose={() => setOpen(false)} />
  ) : null;
}

describe('gallery lightbox', () => {
  let restoreDialog: () => void;

  beforeEach(async () => {
    restoreDialog = installDialogTestMethods();
    await i18n.changeLanguage('pl');
  });

  afterEach(async () => {
    cleanup();
    restoreDialog();
    document.body.style.overflow = '';
    await i18n.changeLanguage('pl');
  });

  it('navigates through photos in both directions and wraps at the ends', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByRole('dialog', { name: 'Podgląd zdjęć' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Dom' })).toHaveAttribute('src', '/one.jpg');
    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Poprzednie zdjęcie' }));
    expect(screen.getByRole('img', { name: 'Salon' })).toHaveAttribute('src', '/two.jpg');
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Następne zdjęcie' }));
    expect(screen.getByRole('img', { name: 'Dom' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Następne zdjęcie' }));
    expect(screen.getByRole('img', { name: 'Salon' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Następne zdjęcie' }));
    expect(screen.getByRole('img', { name: 'Dom' })).toBeInTheDocument();
  });

  it('supports arrow keys while keeping the close button focused', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByRole('button', { name: 'Zamknij podgląd' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('img', { name: 'Salon' })).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('img', { name: 'Dom' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zamknij podgląd' })).toHaveFocus();
  });

  it('cycles keyboard focus between the first and last controls', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Następne zdjęcie' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Zamknij podgląd' })).toHaveFocus();
  });

  it.each(['button', 'cancel', 'backdrop'])('closes via %s', async (method) => {
    const user = userEvent.setup();
    render(<Harness />);
    const dialog = screen.getByRole('dialog');
    if (method === 'button') await user.click(screen.getByRole('button', { name: 'Zamknij podgląd' }));
    else if (method === 'cancel') fireEvent(dialog, new Event('cancel', { cancelable: true }));
    else fireEvent.click(dialog);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not close when the photo is clicked', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('img', { name: 'Dom' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('restores the previous scroll setting on close', () => {
    document.body.style.overflow = 'auto';
    const { unmount } = render(<Harness />);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('uses English captions and controls with a Polish fallback', async () => {
    await i18n.changeLanguage('en');
    render(<Harness images={[photos[0], { ...photos[1], captionEn: null }]} />);
    expect(screen.getByRole('dialog', { name: 'Photo viewer' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'House' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next photo' }));
    expect(screen.getByRole('img', { name: 'Salon' })).toBeInTheDocument();
  });

  it('keeps a single photo open without navigating to an invalid index', async () => {
    render(<Harness images={[photos[0]]} />);
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Następne zdjęcie' })).toBeDisabled();
    await userEvent.keyboard('{ArrowRight}{ArrowLeft}');
    expect(screen.getByRole('img', { name: 'Dom' })).toBeInTheDocument();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Zamknij podgląd' })).toHaveFocus();
  });

  it('shows a loading error without breaking navigation or later retry', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    fireEvent.error(screen.getByRole('img', { name: 'Dom' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Nie udało się wczytać zdjęcia');
    await user.click(screen.getByRole('button', { name: 'Następne zdjęcie' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Salon' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Poprzednie zdjęcie' }));
    expect(screen.getByRole('img', { name: 'Dom' })).toBeInTheDocument();
  });
});
