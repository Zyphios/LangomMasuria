import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageToggle from './LanguageToggle';

const navLinks = [
  { to: '/house', labelKey: 'nav.house' },
  { to: '/attractions', labelKey: 'nav.attractions' },
  { to: '/gallery', labelKey: 'nav.gallery' },
  { to: '/pricing', labelKey: 'nav.rates' },
  { to: '/booking', labelKey: 'nav.contact' }
];

export default function Navbar() {
  const { t } = useTranslation();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.key]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  const closeMenu = () => {
    setIsMenuOpen(false);
    if (isMenuOpen) menuButtonRef.current?.focus();
  };

  // Both "Contact" and "Book now" point to /booking. If the guest is already on that page
  // (often scrolled down past the calendar), react-router's Link does nothing on click since
  // the location doesn't change - making the button look broken. Force a scroll-to-top instead.
  const handleBookNowClick = () => {
    closeMenu();
    if (location.pathname === '/booking') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header className="fixed top-0 z-50 w-full border-b border-primary/10 bg-[#bac5b5]">
      <div className="mx-auto flex h-[var(--site-header-height)] max-w-container-max items-center justify-between gap-2 px-margin-mobile md:gap-3 md:px-6 lg:gap-4 lg:px-8 xl:px-margin-desktop">
        <Link to="/" onClick={closeMenu} className="shrink-0 rounded transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
          <img
            src="/logo-mazurska.jpg"
            alt="Domek na Mazurskiej"
            width={680}
            height={270}
            className="h-auto w-44 lg:w-64 xl:w-[280px]"
          />
        </Link>
        <button
          ref={menuButtonRef}
          type="button"
          aria-label={t(isMenuOpen ? 'nav.closeMenu' : 'nav.openMenu')}
          aria-expanded={isMenuOpen}
          aria-controls={menuId}
          onClick={() => setIsMenuOpen((open) => !open)}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded border border-primary/40 px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary md:hidden"
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d={isMenuOpen ? 'M6 6l12 12M6 18 18 6' : 'M4 6h16M4 12h16M4 18h16'} />
          </svg>
          {t('nav.menu')}
        </button>
        <div
          id={menuId}
          className={`${isMenuOpen ? 'flex' : 'hidden'} absolute inset-x-0 top-full max-h-[calc(100dvh-var(--site-header-height))] flex-col gap-4 overflow-y-auto overscroll-contain border-b border-primary/15 bg-[#bac5b5] px-margin-mobile py-4 shadow-lg md:contents`}
        >
          <nav aria-label={t('nav.navigation')} className="flex flex-col gap-1 md:flex-row md:items-center md:gap-4 lg:gap-6 xl:gap-8">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;

              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={link.to === '/booking' ? handleBookNowClick : closeMenu}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex min-h-11 items-center rounded px-3 py-2 text-base transition-colors duration-300 md:min-h-0 md:rounded-none md:px-0 md:py-0 md:text-sm lg:text-body-md ${
                    isActive
                      ? 'bg-primary/10 font-medium text-primary md:border-b md:border-primary md:bg-transparent md:pb-1'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  {t(link.labelKey)}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center justify-between gap-2 border-t border-primary/15 pt-4 [&_button]:min-h-11 md:justify-start md:border-0 md:pt-0 md:[&_button]:min-h-0 lg:gap-4">
            <LanguageToggle />
            <Link
              to="/booking"
              onClick={handleBookNowClick}
              className="flex min-h-11 items-center justify-center rounded bg-primary px-4 py-3 text-label-caps uppercase text-on-primary transition-colors hover:bg-surface-tint md:py-4 lg:px-8"
            >
              {t('nav.bookNow')}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
