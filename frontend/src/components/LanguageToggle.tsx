import { useTranslation } from 'react-i18next';

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  
  const changeLanguage = (lang: 'pl' | 'en') => {
    localStorage.setItem('lang', lang);
    i18n.changeLanguage(lang);
  };
  
  return (
    <div className='flex gap-2'>
      <button
        type='button'
        aria-label='PL'
        onClick={() => changeLanguage('pl')}
        className='rounded border px-3 py-1'
      >
        PL
      </button>
      <button
        type='button'
        aria-label='EN'
        onClick={() => changeLanguage('en')}
        className='rounded border px-3 py-1'
      >
        EN
      </button>
    </div>
  );
}
