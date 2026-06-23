import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

const toggleClasses =
  'theme-toggle ed-header-control px-4 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm font-medium';

export default function ThemeToggle({ className = '' }) {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={`${toggleClasses} ${className}`.trim()}
      onClick={toggleTheme}
      aria-label={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
      title={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        {isDark ? '\u2600\uFE0F' : '\u{1F319}'}
      </span>
    </button>
  );
}
