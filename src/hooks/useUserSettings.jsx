import { useState, useEffect } from 'react';
import localDataService from '../services/localDataService';

export const settingsUpdateEvent = new Event('settingsUpdate');

export const useUserSettings = () => {
  // Get initial settings from the userProfile in local data service
  const getInitialSettings = () => {
    const profile = localDataService.getUserProfile();
    return {
      height: profile.height || 170,
      weight: profile.weight || 70,
      gender: profile.gender || 'M',
      enableWeather: profile.enableWeather || false,
      theme: profile.theme || 'default',
      mapLayer: profile.mapLayer || 'outdoors-v12'
    };
  };

  const [settings, setSettings] = useState(getInitialSettings);

  useEffect(() => {
    const handleSettingsUpdate = () => {
      const profile = localDataService.getUserProfile();
      setSettings({
        height: profile.height || 170,
        weight: profile.weight || 70,
        gender: profile.gender || 'M',
        enableWeather: profile.enableWeather || false,
        theme: profile.theme || 'default',
        mapLayer: profile.mapLayer || 'outdoors-v12'
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
    try {
      // Update the userProfile using the local data service
      localDataService.updateUserProfile(newSettings);

      // Immediately update state
      setSettings(prev => ({
        ...prev,
        ...newSettings
      }));
      
      // Dispatch event for other components that might be listening
      window.dispatchEvent(settingsUpdateEvent);
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  return { settings, updateSettings };
}; 