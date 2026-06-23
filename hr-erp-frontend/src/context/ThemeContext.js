import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { applyTheme, getStoredTheme, THEME_STORAGE_KEY } from '../utils/theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getStoredTheme);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    applyTheme(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, isDark: theme === 'dark' }),
    [theme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
