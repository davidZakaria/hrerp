import React from 'react';
import LogoutButton from '../LogoutButton';
import LanguageSwitcher from '../LanguageSwitcher';
import ThemeToggle from '../ThemeToggle';

/**
 * Unified dashboard top bar — distinct sticky header with theme-adaptive controls.
 */
export default function DashboardAppHeader({ title }) {
  return (
    <header className="app-header saas-app-header sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
      <h1 className="app-title text-slate-900 dark:text-white">{title}</h1>
      <div className="app-header-actions">
        <ThemeToggle />
        <LanguageSwitcher compact />
        <LogoutButton />
      </div>
    </header>
  );
}
