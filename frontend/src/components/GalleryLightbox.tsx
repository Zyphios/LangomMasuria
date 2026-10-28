import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GalleryImage } from '../types';

type Props = {
  images: GalleryImage[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

export function getGalleryCaption(image: GalleryImage, language: string) {
  const caption = language === 'en'
    ? image.captionEn || image.captionPl
    : image.captionPl || image.captionEn;
  return caption || 'Domek na Mazurskiej';
}

export default function GalleryLightbox({ images, index, onIndexChange, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [imageError, setImageError] = useState(false);
  const image = images[index];
  const caption = getGalleryCaption(image, i18n.language);
  const canNavigate = images.length > 1;
  const buttonClass = 'pointer-events-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white transition-colors hover:bg-black/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:cursor-default disabled:opacity-30 sm:h-12 sm:w-12';

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    dialog.showModal();
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    setImageError(false);
  }, [image.id, image.url]);

  const previous = () => {
    if (canNavigate) onIndexChange((index - 1 + images.length) % images.length);
  };
  const next = () => {
    if (canNavigate) onIndexChange((index + 1) % images.length);
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label={t('gallery.viewer.title')}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overscroll-contain bg-[#101510]/95 p-3 text-white backdrop:bg-black/80 sm:p-6"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Tab') {
          const first = closeRef.current;
          const last = canNavigate ? nextRef.current : first;
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          previous();
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          next();
        }
      }}
    >
      <div className="pointer-events-none mx-auto flex h-full max-w-[1600px] flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <p aria-live="polite" aria-atomic="true" className="text-sm tracking-widest text-white/75">
            {t('gallery.viewer.counter', { current: index + 1, total: images.length })}
          </p>
          <button ref={closeRef} type="button" className={buttonClass} aria-label={t('gallery.viewer.close')} onClick={onClose}>
            <span aria-hidden="true" className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>
        <div className="relative flex min-h-0 flex-1 items-center sm:grid sm:grid-cols-[3rem_minmax(0,1fr)_3rem] sm:gap-6">
          <button type="button" className={`${buttonClass} absolute left-0 top-1/2 z-10 -translate-y-1/2 sm:static sm:translate-y-0`} aria-label={t('gallery.viewer.previous')} onClick={previous} disabled={!canNavigate}>
            <span aria-hidden="true" className="material-symbols-outlined text-3xl">chevron_left</span>
          </button>
          <figure className="flex h-full min-h-0 min-w-0 w-full flex-col items-center justify-center">
            <div className="flex min-h-0 flex-1 items-center justify-center">
              {imageError ? (
                <p role="alert" className="pointer-events-auto max-w-sm text-center text-body-md text-white/80">
                  {t('gallery.viewer.loadError')}
                </p>
              ) : (
                <img
                  key={image.id}
                  src={image.url}
                  alt={caption}
                  draggable={false}
                  className="pointer-events-auto max-h-[calc(100dvh-12rem)] max-w-full object-contain"
                  onError={() => setImageError(true)}
                />
              )}
            </div>
            <figcaption aria-live="polite" className="pointer-events-auto pt-4 text-center text-sm text-white/80 sm:text-body-md">
              {caption}
            </figcaption>
          </figure>
          <button ref={nextRef} type="button" className={`${buttonClass} absolute right-0 top-1/2 z-10 -translate-y-1/2 sm:static sm:translate-y-0`} aria-label={t('gallery.viewer.next')} onClick={next} disabled={!canNavigate}>
            <span aria-hidden="true" className="material-symbols-outlined text-3xl">chevron_right</span>
          </button>
        </div>
      </div>
    </dialog>
  );
}
