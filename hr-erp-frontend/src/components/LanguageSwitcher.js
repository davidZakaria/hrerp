import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = ({ compact = false }) => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language?.startsWith('ar') ? 'ar' : 'en';

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    if (lng === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.setAttribute('lang', 'en');
    }
  };

  return (
    <div
      className={`language-switcher ed-header-lang${compact ? ' language-switcher--compact' : ''}`}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => changeLanguage('en')}
        className={`lang-btn${currentLanguage === 'en' ? ' lang-btn--active' : ''}`}
        aria-pressed={currentLanguage === 'en'}
        aria-label="Switch to English"
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => changeLanguage('ar')}
        className={`lang-btn${currentLanguage === 'ar' ? ' lang-btn--active' : ''}`}
        aria-pressed={currentLanguage === 'ar'}
        aria-label="Switch to Arabic"
      >
        عر
      </button>
    </div>
  );
};

export default LanguageSwitcher;
