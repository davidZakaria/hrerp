import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    
    // Set document direction for RTL support
    if (lng === 'ar') {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.setAttribute('lang', 'en');
    }
  };

  const currentLanguage = i18n.language || 'en';

  return (
    <div className="language-switcher" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '25px',
      padding: '5px',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)'
    }}>
      <button
        onClick={() => changeLanguage('en')}
        className={`lang-btn ${currentLanguage === 'en' ? 'active' : ''}`}
        style={{
          padding: '8px 16px',
          borderRadius: '20px',
          border: 'none',
          background: currentLanguage === 'en' 
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
            : 'transparent',
          color: currentLanguage === 'en' ? 'white' : 'rgba(255, 255, 255, 0.8)',
          fontSize: '0.9rem',
          fontWeight: currentLanguage === 'en' ? 'bold' : 'normal',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          textShadow: currentLanguage === 'en' ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
          minWidth: '60px'
        }}
        onMouseOver={(e) => {
          if (currentLanguage !== 'en') {
            e.target.style.background = 'rgba(255, 255, 255, 0.1)';
          }
        }}
        onMouseOut={(e) => {
          if (currentLanguage !== 'en') {
            e.target.style.background = 'transparent';
          }
        }}
      >
        EN
      </button>
      
      <button
        onClick={() => changeLanguage('ar')}
        className={`lang-btn ${currentLanguage === 'ar' ? 'active' : ''}`}
        style={{
          padding: '8px 16px',
          borderRadius: '20px',
          border: 'none',
          background: currentLanguage === 'ar' 
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
            : 'transparent',
          color: currentLanguage === 'ar' ? 'white' : 'rgba(255, 255, 255, 0.8)',
          fontSize: '0.9rem',
          fontWeight: currentLanguage === 'ar' ? 'bold' : 'normal',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          textShadow: currentLanguage === 'ar' ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
          minWidth: '60px'
        }}
        onMouseOver={(e) => {
          if (currentLanguage !== 'ar') {
            e.target.style.background = 'rgba(255, 255, 255, 0.1)';
          }
        }}
        onMouseOut={(e) => {
          if (currentLanguage !== 'ar') {
            e.target.style.background = 'transparent';
          }
        }}
      >
        عر
      </button>
    </div>
  );
};

export default LanguageSwitcher; 