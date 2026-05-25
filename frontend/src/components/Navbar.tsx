import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageToggle from './LanguageToggle';

export default function Navbar() {
  const { t } = useTranslation();
  
  return (
    <header className='border-b bg-white/90'>
      <nav className='mx-auto flex max-w-6xl items-center justify-between px-6 py-4'>
        <Link to='/' className='text-xl font-semibold text-pine'>
          Lagom Masuria
        </Link>
        <div className='flex items-center gap-6'>
          <Link to='/'>{t('nav.home')}</Link>
          <Link to='/house'>{t('nav.house')}</Link>
          <Link to='/gallery'>{t('nav.gallery')}</Link>
          <Link to='/booking'>{t('nav.contact')}</Link>
          <Link to='/booking' className='rounded bg-pine px-4 py-2 text-white'>
            {t('nav.bookNow')}
          </Link>
          <LanguageToggle />
        </div>
      </nav>
    </header>
  );
}
