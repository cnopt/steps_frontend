import { useState, useEffect } from 'react';

export const settingsUpdateEvent = new Event('settingsUpdate');

export const useUserSettings = () => {
  const [settings, setSettings] = useState({
    height: parseInt(localStorage.getItem('userHeight')) || 170,
    weight: parseInt(localStorage.getItem('userWeight')) || 70,
    gender: localStorage.getItem('userGender') || 'M',
    enableWeather: localStorage.getItem('userEnableWeather') === 'true' || false
  });

  useEffect(() => {
    const handleSettingsUpdate = () => {
      setSettings({
        height: parseInt(localStorage.getItem('userHeight')) || 170,
        weight: parseInt(localStorage.getItem('userWeight')) || 70,
        gender: localStorage.getItem('userGender') || 'M',
        enableWeather: localStorage.getItem('userEnableWeather') === 'true' || false
      });
    };

    window.addEventListener('storage', handleSettingsUpdate);
    window.addEventListener('settingsUpdate', handleSettingsUpdate);
    
    return () => {
      window.removeEventListener('storage', handleSettingsUpdate);
      window.removeEventListener('settingsUpdate', handleSettingsUpdate);
    };
  }, []);

  const updateSettings = (newSettings) => {
    // update localStorage
    Object.entries(newSettings).forEach(([key, value]) => {
      localStorage.setItem(`user${key.charAt(0).toUpperCase() + key.slice(1)}`, value.toString());
    });

    // immediately update state
    setSettings(prev => ({
      ...prev,
      ...newSettings
    }));
    window.dispatchEvent(settingsUpdateEvent);
  };

  return { settings, updateSettings };
}; 