import React, { useEffect } from 'react';
import { useUserSettings } from '../hooks/useUserSettings';

const ThemeProvider = ({ children }) => {
  const { settings } = useUserSettings();

  // Apply theme whenever it changes or on initial load
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  return children;
};

export default ThemeProvider;
