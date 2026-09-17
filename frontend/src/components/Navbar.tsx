import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageToggle from './LanguageToggle';

const navLinks = [
  { to: '/house', labelKey: 'nav.house' },
  { to: '/house#attractions', labelKey: 'nav.attractions' },
  { to: '/gallery', labelKey: 'nav.gallery' },
  { to: '/gallery#rates', labelKey: 'nav.rates' },
  { to: '/booking', labelKey: 'nav.contact' }
];

export default function Navbar() {
  const { t } = useTranslation();
  const location = useLocation();

  // Both "Contact" and "Book now" point to /booking. If the guest is already on that page
  // (often scrolled down past the calendar), react-router's Link does nothing on click since
  // the location doesn't change - making the button look broken. Force a scroll-to-top instead.
  const handleBookNowClick = () => {
    if (location.pathname === '/booking') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header className="fixed top-0 z-50 w-full border-b border-outline-variant/30 bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-container-max items-center justify-between px-8 md:px-margin-desktop">
        <Link to="/" className="flex items-center gap-2 text-primary">
          <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>water_lux</span>
          <span className="text-xl font-medium tracking-tight md:text-headline-md">LAGOM MASURIA</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to ||
              (link.to !== '/' && location.pathname.startsWith(link.to.split('#')[0]));

            return (
              <Link
                key={link.to}
                to={link.to}
                className={`text-body-md transition-colors duration-300 ${
                  isActive
                    ? 'border-b border-primary pb-1 font-medium text-primary'
                    : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                {t(link.labelKey)}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-4">
          <LanguageToggle />
          <Link
            to="/booking"
            onClick={handleBookNowClick}
            className="hidden rounded bg-primary px-8 py-4 text-label-caps uppercase text-on-primary transition-colors hover:bg-surface-tint md:block"
          >
            {t('nav.bookNow')}
          </Link>
        </div>
      </div>
    </header>
  );
}
