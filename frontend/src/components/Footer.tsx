import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="w-full border-t border-surface-container-high bg-surface-container-low">
      <div className="mx-auto flex max-w-container-max flex-col items-start justify-between gap-gutter px-8 py-16 md:flex-row md:px-margin-desktop">
        <div className="flex flex-col gap-4">
          <span className="text-label-caps uppercase tracking-widest text-primary">LAGOM MASURIA</span>
          <p className="max-w-xs text-body-md text-secondary">{t('footer.tagline')}</p>
        </div>
        <div className="flex flex-wrap gap-8 md:gap-12">
          <nav className="flex flex-col gap-3">
            <Link to="/house" className="text-body-md text-on-surface-variant transition-colors hover:text-primary">{t('nav.house')}</Link>
            <Link to="/house#attractions" className="text-body-md text-on-surface-variant transition-colors hover:text-primary">{t('nav.attractions')}</Link>
            <Link to="/gallery" className="text-body-md text-on-surface-variant transition-colors hover:text-primary">{t('nav.gallery')}</Link>
          </nav>
          <nav className="flex flex-col gap-3">
            <Link to="/gallery#rates" className="text-body-md text-on-surface-variant transition-colors hover:text-primary">{t('nav.rates')}</Link>
            <Link to="/booking" className="text-body-md text-on-surface-variant transition-colors hover:text-primary">{t('nav.contact')}</Link>
          </nav>
        </div>
      </div>
      <div className="mx-auto max-w-container-max border-t border-surface-container-high/50 px-8 pb-8 pt-4 md:px-margin-desktop">
        <span className="text-body-md text-secondary opacity-70">© 2024 Lagom Masuria. Just enough. All rights reserved.</span>
      </div>
    </footer>
  );
}
