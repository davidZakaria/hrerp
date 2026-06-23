import React from 'react';
import LogoutButton from '../LogoutButton';
import LanguageSwitcher from '../LanguageSwitcher';
import ThemeToggle from '../ThemeToggle';

/**
 * Unified dashboard top bar: title + language + logout in one row (no overlap with fixed EN/AR).
 */
export default function DashboardAppHeader({ title }) {
  return (
    <header className="app-header">
      <h1 className="app-title">{title}</h1>
      <div className="app-header-actions">
        <ThemeToggle />
        <LanguageSwitcher compact />
        <LogoutButton />
      </div>
    </header>
  );
}
