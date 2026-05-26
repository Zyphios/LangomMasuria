import { useTranslation } from 'react-i18next';

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language === 'en' ? 'en' : 'pl';

  const changeLanguage = (lang: 'pl' | 'en') => {
    localStorage.setItem('lang', lang);
    i18n.changeLanguage(lang);
  };

  return (
    <div className='flex items-center rounded-full border border-outline-variant/70 px-1 py-1'>
      {(['pl', 'en'] as const).map((lang) => {
        const isActive = currentLanguage === lang;

        return (
          <button
            key={lang}
            type='button'
            aria-label={lang.toUpperCase()}
            onClick={() => changeLanguage(lang)}
            className={`rounded-full px-3 py-1 text-sm uppercase transition-colors ${
              isActive
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            {lang}
          </button>
        );
      })}
    </div>
  );
}
