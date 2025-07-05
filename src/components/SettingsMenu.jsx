import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import axios from 'axios';
import { useStepsData } from '../hooks/useStepsData';
import '../styles/SettingsMenu.css'

import XPBar from "./XPBar";
import PageTransition from './PageTransition';
import { FaUserMinus, FaUserPlus, FaMars, FaVenus } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserSettings } from '../hooks/useUserSettings';
import localDataService from '../services/localDataService';
import HealthService from '../services/healthService';
import userService from "../services/userService";
import { upsertData, testConnection, upsertUserProfile } from '../services/supabaseService';
import { getTodayLocalDateString } from '../helpers/dateUtils';

const SettingsMenu = () => {
  const { settings, updateSettings } = useUserSettings();
  const { data: stepsData, syncStatus } = useStepsData();
  const [isIncreasing, setIsIncreasing] = useState(true);
  const queryClient = useQueryClient();
  
  // Health Connect state
  const [healthStatus, setHealthStatus] = useState({
    isAvailable: null,
    hasPermissions: null,
    isLoading: false,
    error: null,
    debugData: null
  });

  // Database upload state
  const [dbUploadStatus, setDbUploadStatus] = useState({
    isUploading: false,
    error: null,
    success: null
  });

  // LocalStorage debug state
  const [localStorageData, setLocalStorageData] = useState({});

  const adjustHeight = (amount) => {
    setIsIncreasing(amount > 0);
    updateSettings({ height: settings.height + amount });
  };

  const adjustWeight = (amount) => {
    setIsIncreasing(amount > 0);
    updateSettings({ weight: settings.weight + amount });
  };

  const saveSettings = () => {
    alert('Settings saved');
  };

  // Health Connect functions
  const checkHealthAvailability = async () => {
    try {
      setHealthStatus(prev => ({ ...prev, isLoading: true, error: null }));
      const result = await HealthService.isHealthAvailable();
      setHealthStatus(prev => ({ 
        ...prev, 
        isAvailable: result.available,
        debugData: { ...prev.debugData, availability: result }
      }));
      return result.available;
    } catch (error) {
      setHealthStatus(prev => ({ 
        ...prev, 
        error: `Availability check failed: ${error.message}`,
        debugData: { ...prev.debugData, availabilityError: error.message }
      }));
      return false;
    } finally {
      setHealthStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  const checkHealthPermissions = async () => {
    try {
      setHealthStatus(prev => ({ ...prev, isLoading: true, error: null }));
      const result = await HealthService.checkHealthPermissions();
      const hasPermissions = result.permissions && Object.values(result.permissions).some(granted => granted);
      setHealthStatus(prev => ({ 
        ...prev, 
        hasPermissions,
        debugData: { ...prev.debugData, permissionCheck: result }
      }));
      return hasPermissions;
    } catch (error) {
      setHealthStatus(prev => ({ 
        ...prev, 
        error: `Permission check failed: ${error.message}`,
        debugData: { ...prev.debugData, permissionCheckError: error.message }
      }));
      return false;
    } finally {
      setHealthStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  const requestHealthPermissions = async () => {
    try {
      setHealthStatus(prev => ({ ...prev, isLoading: true, error: null }));
      const result = await HealthService.requestHealthPermissions();
      const hasPermissions = result.permissions && Object.values(result.permissions).some(granted => granted);
      setHealthStatus(prev => ({ 
        ...prev, 
        hasPermissions,
        debugData: { ...prev.debugData, permissionRequest: result }
      }));
      
      if (hasPermissions) {
        await getHealthData();
      }
    } catch (error) {
      setHealthStatus(prev => ({ 
        ...prev, 
        error: `Permission request failed: ${error.message}`,
        debugData: { ...prev.debugData, permissionRequestError: error.message }
      }));
    } finally {
      setHealthStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  const testHealthInitialization = async () => {
    try {
      setHealthStatus(prev => ({ ...prev, isLoading: true, error: null }));
      
      console.log('Testing Health Connect initialization...');
      const initResult = await HealthService.initialize();
      
      console.log('Initialization result:', initResult);
      
      const initStatus = HealthService.getInitializationStatus();
      
      setHealthStatus(prev => ({ 
        ...prev, 
        debugData: { 
          ...prev.debugData, 
          initializationTest: initResult,
          initializationStatus: initStatus 
        }
      }));
      
      if (initResult.success) {
        setHealthStatus(prev => ({ 
          ...prev, 
          isAvailable: initResult.available,
          hasPermissions: initResult.hasPermissions
        }));
      } else {
        setHealthStatus(prev => ({ 
          ...prev, 
          error: `Initialization failed: ${initResult.message}`
        }));
      }
    } catch (error) {
      setHealthStatus(prev => ({ 
        ...prev, 
        error: `Initialization test failed: ${error.message}`,
        debugData: { 
          ...prev.debugData, 
          initializationError: error.message 
        }
      }));
    } finally {
      setHealthStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  const getHealthData = async () => {
    try {
      setHealthStatus(prev => ({ ...prev, isLoading: true, error: null }));
      
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const endDate = now.toISOString();
      const startDate = startOfToday.toISOString();
      
      console.log(`Manual Health Data fetch: ${startDate} to ${endDate}`);
      
      const stepsData = await HealthService.getStepsData(startDate, endDate);
      
      console.log('Manual Health Data RAW response:', JSON.stringify(stepsData, null, 2));
      
      // Extract today's steps count (same logic as updated getTodaysSteps)
      const todayISO = getTodayLocalDateString();
      let todaysSteps = 0;
      
      if (stepsData && stepsData.aggregatedData && Array.isArray(stepsData.aggregatedData)) {
        const todayData = stepsData.aggregatedData.find(item => {
          const itemDate = item.startDate ? item.startDate.split('T')[0] : null;
          return itemDate === todayISO;
        });
        
        if (todayData) {
          todaysSteps = todayData.value || todayData.steps || todayData.count || todayData.stepsCount || 0;
          console.log(`Manual fetch - Found today's data:`, todayData);
          console.log(`Manual fetch - Extracted steps: ${todaysSteps}`);
        }
      }
      
      // Save the extracted data to localStorage (like automatic sync does)
      if (todaysSteps > 0) {
        try {
          const result = localDataService.addStepsData({
            steps: parseInt(todaysSteps),
            formatted_date: todayISO,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
          console.log(`Manual fetch - Saved ${todaysSteps} steps to localStorage:`, result);
          
          // Note: UI refresh will happen automatically via the sync detection in useStepsData
          console.log('Manual fetch - Data saved to localStorage, UI will refresh automatically');
          
        } catch (saveError) {
          console.error('Manual fetch - Failed to save data:', saveError);
        }
      }
      
      setHealthStatus(prev => ({ 
        ...prev, 
        debugData: { 
          ...prev.debugData, 
          stepsData,
          extractedSteps: todaysSteps,
          dataFetchTime: new Date().toISOString()
        }
      }));
    } catch (error) {
      setHealthStatus(prev => ({ 
        ...prev, 
        error: `Data fetch failed: ${error.message}`,
        debugData: { ...prev.debugData, dataFetchError: error.message }
      }));
    } finally {
      setHealthStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  const openHealthConnectSettings = async () => {
    try {
      await HealthService.openHealthConnectSettings();
    } catch (error) {
      setHealthStatus(prev => ({ 
        ...prev, 
        error: `Failed to open settings: ${error.message}` 
      }));
    }
  };

  const showHealthConnectInPlayStore = async () => {
    try {
      await HealthService.showHealthConnectInPlayStore();
    } catch (error) {
      setHealthStatus(prev => ({ 
        ...prev, 
        error: `Failed to open Play Store: ${error.message}` 
      }));
    }
  };

  // Function to upload step data and user profile to Supabase
  const uploadStepDataToDatabase = async () => {
    try {
      setDbUploadStatus({ isUploading: true, error: null, success: null });

      // Test connection first
      const connectionTest = await testConnection();
      if (!connectionTest.success) {
        throw new Error(`Database connection failed: ${connectionTest.message}`);
      }

      // Get today's step count (using local timezone)
      const today = getTodayLocalDateString();
      const todayStepsData = stepsData?.find(day => day.formatted_date === today);
      
      if (!todayStepsData) {
        throw new Error('No step data found for today. Please add your steps first.');
      }

      // Get user data from user service
      const userData = userService.getUserDataForDatabase();

      // Get user profile data from localStorage
      const userProfile = localDataService.getUserProfile();
      
      // Prepare user profile data for insertion (do this FIRST to satisfy foreign key constraint)
      const profileData = {
        user_id: userProfile.userId || userData.user_id,
        username: userProfile.username || userData.username,
        selected_badge: userProfile.selectedBadge || null,
        created_at: userProfile.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Upsert user profile data into user_profiles table FIRST
      const { data: profileUploadData, error: profileError } = await upsertUserProfile(profileData);

      if (profileError) {
        throw new Error(`Profile upload failed: ${profileError.message}`);
      }

      // Now prepare steps data for insertion (after profile exists)
      const recordData = {
        user_id: userData.user_id,
        username: userData.username,
        date: today,
        step_count: todayStepsData.steps
      };

      // Upsert steps data into user_daily_steps table (insert or update if exists)
      const { data: uploadedStepsData, error: stepsError } = await upsertData('user_daily_steps', recordData, { select: '*' });

      if (stepsError) {
        throw new Error(`Steps upload failed: ${stepsError.message}`);
      }

      setDbUploadStatus({ 
        isUploading: false, 
        error: null, 
        success: `Successfully saved ${todayStepsData.steps} steps and updated profile for ${today}` 
      });

      // Clear success message after 5 seconds
      setTimeout(() => {
        setDbUploadStatus(prev => ({ ...prev, success: null }));
      }, 5000);

    } catch (error) {
      console.error('Database upload error:', error);
      setDbUploadStatus({ 
        isUploading: false, 
        error: error.message, 
        success: null 
      });
    }
  };

  // Initialize health data check
  useEffect(() => {
    const initializeHealth = async () => {
      const available = await checkHealthAvailability();
      if (available) {
        await checkHealthPermissions();
        
        // Also get initialization status
        const initStatus = HealthService.getInitializationStatus();
        setHealthStatus(prev => ({ 
          ...prev, 
          debugData: { 
            ...prev.debugData, 
            initializationStatus: initStatus 
          }
        }));
      }
    };
    initializeHealth();
  }, []);

  const exportData = () => {
    try {
      const exportData = localDataService.exportUserData();
      
      // include additional data that might not be in localDataService
      const additionalData = {
        unlockedBadges: JSON.parse(localStorage.getItem('unlockedBadges') || '[]'),
        unwrappedMilestones: JSON.parse(localStorage.getItem('unwrappedMilestones') || '[]'),
        viewedBadges: JSON.parse(localStorage.getItem('viewedBadges') || '[]'),
        weatherData: JSON.parse(localStorage.getItem('weatherData') || 'null')
      };
      
      // combine 
      const completeExportData = {
        ...exportData,
        additionalData
      };
      
      // create a blob
      const jsonString = JSON.stringify(completeExportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // create filename with current date
      const now = new Date();
      const dateString = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      const filename = `Stepno-export_${dateString}.json`;
      
      // check if in a secure context for web share API
      const isSecureContext = window.isSecureContext || location.protocol === 'https:';
      console.log('Secure context:', isSecureContext);
      console.log('User agent:', navigator.userAgent);
      
      if (isSecureContext && navigator.share) {
        console.log('Web Share API is available in secure context');
        
        // Check if this is a mobile device
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        console.log('Mobile device detected:', isMobileDevice);
        
        if (navigator.canShare && typeof navigator.canShare === 'function') {
          const file = new File([blob], filename, { type: 'application/json' });
          const shareDataWithFile = {
            title: 'Stepno Data Export',
            text: `Your exported steps data from ${dateString}`,
            files: [file]
          };
          
          try {
            if (navigator.canShare(shareDataWithFile)) {
              console.log('File sharing is supported, attempting to share with file');
              navigator.share(shareDataWithFile)
                .then(() => {
                  console.log('Data exported successfully via share with file');
                  alert('Data exported successfully');
                })
                .catch((error) => {
                  console.log('File share failed:', error);
                  fallbackToTextShare(blob, filename, dateString);
                });
              return;
            }
          } catch (error) {
            console.log('canShare check failed:', error);
          }
        }
        
        // fallback to text only share
        fallbackToTextShare(blob, filename, dateString);
      } else {
        // fallback again
        console.log('Web Share API not available - using download fallback');
        console.log('Reasons: Secure context:', isSecureContext, 'Navigator.share:', !!navigator.share);
        downloadFile(blob, filename);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('There was an error exporting your data. Please try again.');
    }
  };
  
  const fallbackToTextShare = (blob, filename, dateString) => {
    // Try text-only share with informative message
    const shareData = {
      title: 'Stepno Data Export',
      text: `Export your Stepno data from ${dateString}. The file will be downloaded after sharing.`,
      url: window.location.href
    };
    
    console.log('Attempting text-only share');
    navigator.share(shareData)
      .then(() => {
        console.log('Text share completed, now triggering download');
        setTimeout(() => {
          downloadFile(blob, filename);
        }, 800);
      })
      .catch((error) => {
        console.log('Text share failed, falling back to download only:', error);
        downloadFile(blob, filename);
      });
  };

  const importData = () => {
    try {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.json,application/json';
      fileInput.style.display = 'none';
      
      fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) {
          return;
        }
        
        // josn file type
        if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
          alert('Please select a valid JSON file.');
          return;
        }
        
        // limit size
        const maxSize = 10 * 1024 * 1024; // 10mb
        if (file.size > maxSize) {
          alert('File is too large. Please select a file smaller than 10MB.');
          return;
        }
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            const importedData = JSON.parse(e.target.result);
            
            // validate structure
            if (!importedData.stepsData || !importedData.userProfile) {
              alert('Invalid file format. Please select a valid Stepno export file');
              return;
            }
            
            // show confirmation window
            const stepsCount = importedData.stepsData.length;
            const exportDate = importedData.exportDate ? new Date(importedData.exportDate).toLocaleDateString() : 'Unknown';
            
            const confirmMessage = `Import data with ${stepsCount} step entries from ${exportDate}?\n\nThis will merge with your existing data. Newer entries will take precedence.`;
            
            if (window.confirm(confirmMessage)) {
              const result = localDataService.importUserData(importedData, { merge: true });
              
              if (result.success) {
                // import additional data if present
                if (importedData.additionalData) {
                  const additional = importedData.additionalData;
                  
                  if (additional.unlockedBadges && Array.isArray(additional.unlockedBadges)) {
                    const currentBadges = JSON.parse(localStorage.getItem('unlockedBadges') || '[]');
                    const mergedBadges = [...new Set([...currentBadges, ...additional.unlockedBadges])];
                    localStorage.setItem('unlockedBadges', JSON.stringify(mergedBadges));
                  }
                  
                  if (additional.unwrappedMilestones && Array.isArray(additional.unwrappedMilestones)) {
                    const currentMilestones = JSON.parse(localStorage.getItem('unwrappedMilestones') || '[]');
                    const mergedMilestones = [...new Set([...currentMilestones, ...additional.unwrappedMilestones])];
                    localStorage.setItem('unwrappedMilestones', JSON.stringify(mergedMilestones));
                  }
                  
                  if (additional.viewedBadges && Array.isArray(additional.viewedBadges)) {
                    const currentViewed = JSON.parse(localStorage.getItem('viewedBadges') || '[]');
                    const mergedViewed = [...new Set([...currentViewed, ...additional.viewedBadges])];
                    localStorage.setItem('viewedBadges', JSON.stringify(mergedViewed));
                  }
                  
                  if (additional.weatherData && additional.weatherData !== null) {
                    localStorage.setItem('weatherData', JSON.stringify(additional.weatherData));
                  }
                }
                
                alert(`Data imported successfully! ${result.importedEntries} entries were processed.`);
                
                // trigger settings update event
                window.dispatchEvent(new Event('settingsUpdate'));
                
                // reload the page just in case
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              } else {
                alert('Import failed. Please try again.');
              }
            }
          } catch (error) {
            console.error('Error parsing JSON file:', error);
            alert('Invalid JSON file. Please select a valid Stepno export file.');
          }
        };
        
        reader.onerror = () => {
          alert('Error reading file. Please try again.');
        };
        
        reader.readAsText(file);
      });
      
      // trigger file picker
      document.body.appendChild(fileInput);
      fileInput.click();
      document.body.removeChild(fileInput);
      
    } catch (error) {
      console.error('Error importing data:', error);
      alert('There was an error importing your data. Please try again.');
    }
  };

  const downloadFile = (blob, filename) => {
    try {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      link.style.display = 'none';
      link.setAttribute('download', filename);
      
      // trigger download
      document.body.appendChild(link);
      
      // ensure the link is in the DOM
      setTimeout(() => {
        link.click();
        
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
      }, 10);
      
      const message = isMobileDevice && navigator.clipboard && window.isSecureContext 
        ? 'Data exported successfully! File downloaded'
        : 'Data exported successfully!';
      
      alert(message);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again or check your browser settings.');
    }
  };

  const wipeAllData = () => {
    const confirmWipe = window.confirm(
      'Are you sure you want to wipe all your data? This action cannot be undone.'
    );
    
    if (confirmWipe) {
      try {
        localDataService.clearAllData();
        
        localStorage.removeItem('unlockedBadges');
        localStorage.removeItem('unwrappedMilestones');
        localStorage.removeItem('viewedBadges');
        localStorage.removeItem('weatherData');
        localStorage.removeItem('userHeight');
        localStorage.removeItem('userWeight');
        localStorage.removeItem('userGender');
        localStorage.removeItem('userEnableWeather');
        localStorage.removeItem('appVersion');
        
        //alert('All data has been wiped successfully. The page will reload.');
        // Reload the page to refresh all components and reset state
        window.location.reload();
      } catch (error) {
        console.error('Error wiping data:', error);
        alert('There was an error wiping your data. Please try again.');
      }
    }
  };

  // Function to get all localStorage data including sync tracking
  const getAllLocalStorageData = () => {
    const data = {};
    
    // Get all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      try {
        const value = localStorage.getItem(key);
        // Try to parse as JSON, fallback to string
        try {
          data[key] = JSON.parse(value);
        } catch {
          data[key] = value;
        }
      } catch (error) {
        data[key] = `Error reading: ${error.message}`;
      }
    }

    // Get specific data from localDataService for better formatting
    try {
      data['_syncTracking'] = localDataService.getSyncTracking();
      data['_stepsData'] = localDataService.getAllStepsData();
      data['_userProfile'] = localDataService.getUserProfile();
      data['_storageInfo'] = localDataService.getStorageInfo();
    } catch (error) {
      data['_serviceError'] = error.message;
    }

    return data;
  };

  // Update localStorage data periodically for live debugging
  useEffect(() => {
    const updateLocalStorageData = () => {
      setLocalStorageData(getAllLocalStorageData());
    };

    // Initial load
    updateLocalStorageData();

    // Update every 2 seconds for live view
    const interval = setInterval(updateLocalStorageData, 2000);

    // Update on storage events
    const handleStorageChange = () => updateLocalStorageData();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('settingsUpdate', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('settingsUpdate', handleStorageChange);
    };
  }, []);

  // Manual sync function for testing
  const triggerManualSync = async () => {
    try {
      console.log('[MANUAL SYNC] Triggering manual sync...');
      
      // First invalidate and refetch sync query to get fresh Health Connect data
      await queryClient.invalidateQueries({ queryKey: ['smartSync'] });
      await queryClient.refetchQueries({ queryKey: ['smartSync'] });
      
      // Then refresh main steps data to reflect any changes
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['stepsData'] });
        queryClient.refetchQueries({ queryKey: ['stepsData'] });
      }, 1000); // Small delay to let sync complete first
      
      console.log('[MANUAL SYNC] Manual sync triggered');
    } catch (error) {
      console.error('[MANUAL SYNC] Manual sync failed:', error);
    }
  };

  return (
    <>
      <XPBar/>
      <PageTransition>
        <div className="settings-container">
          <div className="gender-settings">
            <div className="gender-switch">
              <button 
                className={`gender-button ${settings.gender === 'M' ? 'active' : ''}`}
                onClick={() => updateSettings({ gender: 'M' })}
              >
                <svg width="29" height="30" viewBox="0 0 29 30" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_1100_2)"><path d="M12.8409 9.71252C11.914 10.3819 11.1245 11.8752 11.1245 14.0808L11.9827 27.5719C11.7556 27.5939 11.5447 27.6997 11.3914 27.8686C11.238 28.0376 11.153 28.2576 11.153 28.4858C11.153 28.714 11.238 28.934 11.3914 29.103C11.5447 29.272 11.7556 29.3778 11.9827 29.3998H13.1412C13.3066 29.3972 13.4681 29.3495 13.6085 29.262C13.7488 29.1745 13.8626 29.0503 13.9376 28.9028C14.0126 28.7555 14.046 28.5905 14.0342 28.4254C14.0225 28.2605 13.9659 28.1019 13.8707 27.9666V21.2039C13.8707 21.0605 13.9277 20.923 14.0291 20.8216C14.1305 20.7203 14.268 20.6633 14.4114 20.6633C14.5548 20.6633 14.6923 20.7203 14.7937 20.8216C14.8951 20.923 14.9521 21.0605 14.9521 21.2039V27.9666C14.8572 28.1013 14.8008 28.2591 14.7886 28.4234C14.7765 28.5876 14.8092 28.7521 14.8832 28.8992C14.9571 29.0463 15.0697 29.1706 15.2088 29.2588C15.3479 29.347 15.5084 29.3957 15.673 29.3998H16.8401C17.0673 29.3778 17.2781 29.272 17.4314 29.103C17.5848 28.934 17.6698 28.714 17.6698 28.4858C17.6698 28.2576 17.5848 28.0376 17.4314 27.8686C17.2781 27.6997 17.0673 27.5939 16.8401 27.5719L17.6983 14.0636C17.6983 11.858 16.9002 10.3648 15.9819 9.69536C15.4781 9.86185 14.9506 9.94595 14.42 9.94424C13.8846 9.95179 13.3515 9.87361 12.8409 9.71252ZM18.8998 4.9323C18.8998 4.04456 18.6366 3.17674 18.1434 2.43864C17.6502 1.70052 16.9492 1.12523 16.129 0.785514C15.3089 0.445791 14.4064 0.356907 13.5358 0.530094C12.6651 0.70328 11.8654 1.13076 11.2376 1.75848C10.6099 2.3862 10.1824 3.18592 10.0092 4.05666C9.83603 4.92732 9.92494 5.82981 10.2646 6.64992C10.6044 7.47011 11.1796 8.17109 11.9178 8.6643C12.6558 9.15752 13.5237 9.42073 14.4114 9.42073C15.0008 9.42073 15.5845 9.30461 16.129 9.07908C16.6736 8.85345 17.1684 8.52287 17.5852 8.10612C18.002 7.68929 18.3326 7.19454 18.5582 6.64992C18.7837 6.10538 18.8998 5.52171 18.8998 4.9323Z" fill="#5F84FF"></path><path d="M10.7391 12.8487L7.6306 18.2328C7.27511 18.8485 7.48607 19.6358 8.10179 19.9913C8.7175 20.3468 9.50481 20.1358 9.86029 19.5201L12.9688 14.1361C13.3243 13.5203 13.1133 12.733 12.4976 12.3776C11.8819 12.0221 11.0946 12.233 10.7391 12.8487Z" fill="#5F84FF"></path><path d="M17.9456 12.8487L21.0541 18.2328C21.4096 18.8485 21.1986 19.6358 20.5829 19.9913C19.9672 20.3468 19.1799 20.1358 18.8244 19.5201L15.7159 14.1361C15.3604 13.5203 15.5714 12.733 16.1871 12.3776C16.8028 12.0221 17.5901 12.233 17.9456 12.8487Z" fill="#5F84FF"></path></g><defs><clipPath id="clip0_1100_2"><rect width="28.8" height="28.8" fill="white" transform="translate(0.199951 0.600098)"></rect></clipPath></defs></svg>
              </button>
              <button 
                className={`gender-button girl ${settings.gender === 'F' ? 'active' : ''}`}
                onClick={() => updateSettings({ gender: 'F' })}
              >
                <svg width="29" height="30" viewBox="0 0 29 30" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_1100_11)"><path d="M13.3398 9.71252C12.4129 10.3819 11.6234 11.8752 11.6234 14.0808L12.4816 27.5719C12.2545 27.5939 12.0436 27.6997 11.8903 27.8686C11.7369 28.0376 11.6519 28.2576 11.6519 28.4858C11.6519 28.714 11.7369 28.934 11.8903 29.103C12.0436 29.272 12.2545 29.3778 12.4816 29.3998H13.6402C13.8055 29.3972 13.967 29.3495 14.1074 29.262C14.2477 29.1745 14.3615 29.0503 14.4365 28.9028C14.5115 28.7555 14.5449 28.5905 14.5331 28.4254C14.5214 28.2605 14.4648 28.1019 14.3696 27.9666V21.2039C14.3696 21.0605 14.4266 20.923 14.528 20.8216C14.6294 20.7203 14.7669 20.6633 14.9103 20.6633C15.0537 20.6633 15.1912 20.7203 15.2926 20.8216C15.394 20.923 15.451 21.0605 15.451 21.2039V27.9666C15.3561 28.1013 15.2997 28.2591 15.2875 28.4234C15.2754 28.5876 15.3081 28.7521 15.3821 28.8992C15.456 29.0463 15.5686 29.1706 15.7078 29.2588C15.8468 29.347 16.0073 29.3957 16.1719 29.3998H17.339C17.5662 29.3778 17.777 29.272 17.9303 29.103C18.0837 28.934 18.1687 28.714 18.1687 28.4858C18.1687 28.2576 18.0837 28.0376 17.9303 27.8686C17.777 27.6997 17.5662 27.5939 17.339 27.5719L18.1972 14.0636C18.1972 11.858 17.3991 10.3648 16.4808 9.69536C15.977 9.86185 15.4495 9.94595 14.9189 9.94424C14.3835 9.95179 13.8504 9.87361 13.3398 9.71252ZM19.3987 4.9323C19.3987 4.04456 19.1355 3.17674 18.6423 2.43864C18.1491 1.70052 17.4481 1.12523 16.6279 0.785514C15.8078 0.445791 14.9053 0.356907 14.0347 0.530094C13.164 0.70328 12.3643 1.13076 11.7365 1.75848C11.1088 2.3862 10.6813 3.18592 10.5081 4.05666C10.3349 4.92732 10.4238 5.82981 10.7635 6.64992C11.1033 7.47011 11.6786 8.17109 12.4167 8.6643C13.1548 9.15752 14.0226 9.42073 14.9103 9.42073C15.4997 9.42073 16.0834 9.30461 16.6279 9.07908C17.1725 8.85345 17.6673 8.52287 18.0841 8.10612C18.5009 7.68929 18.8316 7.19454 19.0571 6.64992C19.2826 6.10538 19.3987 5.52171 19.3987 4.9323Z" fill="#FF5F5F"></path><path d="M18.599 11.8765L21.7075 17.2606C22.0629 17.8763 21.852 18.6636 21.2363 19.0191C20.6205 19.3746 19.8332 19.1636 19.4778 18.5479L16.3693 13.1639C16.0138 12.5482 16.2247 11.7608 16.8405 11.4054C17.4562 11.0499 18.2435 11.2608 18.599 11.8765Z" fill="#FF5F5F"></path><path d="M10.7067 11.4891L7.59822 16.8732C7.24274 17.4889 7.4537 18.2762 8.06941 18.6317C8.68512 18.9872 9.47243 18.7762 9.82791 18.1605L12.9364 12.7764C13.2919 12.1607 13.0809 11.3734 12.4652 11.0179C11.8495 10.6624 11.0622 10.8734 10.7067 11.4891Z" fill="#FF5F5F"></path><path d="M14.1515 12.492L9.07955 22.6359C8.88008 23.0348 9.17018 23.5042 9.61621 23.5042H20.4846C20.9453 23.5042 21.2341 23.0065 21.0056 22.6065L15.2091 12.4627C14.9713 12.0466 14.3658 12.0634 14.1515 12.492Z" fill="#FF5F5F"></path></g><defs><clipPath id="clip0_1100_11"><rect width="28.8" height="28.8" fill="white" transform="translate(0 0.600098)"></rect></clipPath></defs></svg>
              </button>
            </div>
          </div>

          <div className="height-settings">
            <h2>Adjust height</h2>
            <div className="height-adjuster">
              <button 
                className="height-button decrease"
                onClick={() => adjustHeight(-1)}
              >
                <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_1090_2)"><path d="M23.84 24.13C22.6 25 22.68 27 22.68 29.85V37C22.3644 37.0093 22.0654 37.1436 21.8488 37.3733C21.6322 37.603 21.5157 37.9094 21.525 38.225C21.5343 38.5406 21.6686 38.8396 21.8983 39.0562C22.128 39.2728 22.4344 39.3893 22.75 39.38H24.27C24.5812 39.3747 24.8777 39.2467 25.095 39.0238C25.3123 38.801 25.4327 38.5013 25.43 38.19C25.4353 37.9075 25.3355 37.6331 25.15 37.42V33.46C25.15 33.2717 25.2248 33.0911 25.358 32.958C25.4911 32.8248 25.6717 32.75 25.86 32.75C26.0483 32.75 26.2289 32.8248 26.362 32.958C26.4952 33.0911 26.57 33.2717 26.57 33.46V37.4C26.4118 37.5702 26.307 37.783 26.2683 38.0121C26.2297 38.2412 26.259 38.4766 26.3525 38.6893C26.4461 38.902 26.5999 39.0826 26.7949 39.2089C26.9899 39.3352 27.2177 39.4016 27.45 39.4H29C29.1576 39.4039 29.3144 39.3768 29.4615 39.3201C29.6086 39.2635 29.7431 39.1784 29.8573 39.0697C29.9715 38.9611 30.0632 38.831 30.1272 38.6869C30.1911 38.5429 30.2261 38.3876 30.23 38.23C30.2339 38.0724 30.2068 37.9156 30.1501 37.7685C30.0935 37.6214 30.0084 37.4869 29.8997 37.3727C29.7911 37.2585 29.661 37.1668 29.5169 37.1028C29.3729 37.0389 29.2176 37.0039 29.06 37V29.85C29.06 26.96 29.14 24.99 27.91 24.13C27.2643 24.3423 26.5897 24.4536 25.91 24.46C25.2067 24.4629 24.5076 24.3514 23.84 24.13ZM31.74 17.87C31.74 16.709 31.3957 15.5741 30.7507 14.6088C30.1057 13.6435 29.189 12.8911 28.1164 12.4468C27.0438 12.0025 25.8635 11.8863 24.7248 12.1128C23.5862 12.3393 22.5402 12.8984 21.7193 13.7193C20.8984 14.5402 20.3393 15.5862 20.1128 16.7248C19.8863 17.8635 20.0025 19.0438 20.4468 20.1164C20.8911 21.189 21.6435 22.1057 22.6088 22.7507C23.5741 23.3957 24.709 23.74 25.87 23.74C27.4268 23.74 28.9199 23.1216 30.0207 22.0207C31.1216 20.9199 31.74 19.4268 31.74 17.87Z" fill="currentColor"></path></g><defs><clipPath id="clip0_1090_2"><rect width="11.74" height="27.36" fill="white" transform="translate(20 12)"></rect></clipPath></defs></svg>
              </button>
              <div className="height-value-container">
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={settings.height}
                    className="height-value"
                    initial={{ y: isIncreasing ? 20 : -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.15 }}
                  >
                    {settings.height} cm
                  </motion.span>
                </AnimatePresence>
              </div>
              <button 
                className="height-button increase"
                onClick={() => adjustHeight(1)}
              >
                <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_1090_6)"><path d="M24.1 20.21C23.66 20.72 23.4 21.74 23.4 23.75V42.3H22.76C22.4444 42.3 22.1417 42.4254 21.9185 42.6485C21.6954 42.8717 21.57 43.1744 21.57 43.49C21.57 43.8056 21.6954 44.1083 21.8385 44.3315C22.0617 44.5546 22.3644 44.68 22.76 44.68H24.29C24.4445 44.6787 24.5972 44.6468 24.7393 44.5862C24.8814 44.5256 25.0101 44.4374 25.118 44.3267C25.2258 44.2161 25.3107 44.0852 25.3677 43.9416C25.4247 43.798 25.4526 43.6445 25.45 43.49C25.4484 43.2009 25.3458 42.9215 25.16 42.7V33.07C25.1638 32.9811 25.1853 32.8938 25.2232 32.8133C25.2611 32.7328 25.3147 32.6607 25.3808 32.6011C25.4469 32.5415 25.5242 32.4957 25.6082 32.4663C25.6922 32.437 25.7812 32.4246 25.87 32.43C25.9588 32.4246 26.0478 32.437 26.1318 32.4663C26.2158 32.4957 26.2931 32.5415 26.3592 32.6011C26.4253 32.6607 26.4789 32.7328 26.5168 32.8133C26.5547 32.8938 26.5762 32.9811 26.58 33.07V42.68C26.3913 42.9005 26.2853 43.1798 26.28 43.47C26.2787 43.625 26.3079 43.7787 26.366 43.9223C26.4241 44.066 26.5099 44.1968 26.6185 44.3073C26.7272 44.4178 26.8565 44.5059 26.9992 44.5664C27.1419 44.6269 27.295 44.6587 27.45 44.66H29C29.2865 44.6226 29.5496 44.4823 29.7403 44.2651C29.9309 44.048 30.0361 43.7689 30.0361 43.48C30.0361 43.1911 29.9309 42.912 29.7403 42.6949C29.5496 42.4777 29.2865 42.3374 29 42.3H28.35V23.75C28.35 21.75 28.09 20.75 27.64 20.21C27.0635 20.3706 26.4684 20.4547 25.87 20.46C25.2716 20.454 24.6766 20.37 24.1 20.21ZM31.74 17.87C31.74 16.709 31.3957 15.5741 30.7507 14.6088C30.1057 13.6435 29.189 12.8911 28.1164 12.4468C27.0438 12.0025 25.8635 11.8863 24.7248 12.1128C23.5862 12.3393 22.5402 12.8984 21.7193 13.7193C20.8984 14.5402 20.3393 15.5862 20.1128 16.7248C19.8863 17.8635 20.0025 19.0438 20.4468 20.1164C20.8911 21.189 21.6435 22.1057 22.6088 22.7507C23.5741 23.3957 24.709 23.74 25.87 23.74C27.4268 23.74 28.9199 23.1216 30.0207 22.0207C31.1216 20.9199 31.74 19.4268 31.74 17.87Z" fill="currentColor"></path></g><defs><clipPath id="clip0_1090_6"><rect width="11.74" height="36.68" fill="white" transform="translate(20 8)"></rect></clipPath></defs></svg>
              </button>
            </div>
          </div>

          <div className="weight-settings">
            <h2>Adjust weight</h2>
            <div className="weight-adjuster">
              <button 
                className="weight-button decrease"
                onClick={() => adjustWeight(-1)}
              >
                <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_1090_9)"><path d="M23.94 19.17C22.6 20 22.68 22 22.68 25V42.62C22.3644 42.62 22.0617 42.7454 21.8385 42.9685C21.6154 43.1917 21.49 43.4944 21.49 43.81C21.49 44.1256 21.6154 44.4283 21.8385 44.6515C22.0617 44.8746 22.3644 45 22.68 45H24.21C24.4296 45.0021 24.6456 44.9438 24.8344 44.8316C25.0232 44.7194 25.1776 44.5575 25.2807 44.3636C25.3839 44.1697 25.4318 43.9512 25.4194 43.7319C25.4069 43.5126 25.3345 43.301 25.21 43.12V34.28C25.2203 34.1014 25.3007 33.934 25.4336 33.8142C25.5665 33.6944 25.7413 33.6318 25.92 33.64C26.0088 33.6346 26.0978 33.647 26.1818 33.6763C26.2658 33.7057 26.3431 33.7515 26.4092 33.8111C26.4753 33.8707 26.5289 33.9428 26.5668 34.0233C26.6047 34.1038 26.6262 34.1911 26.63 34.28V43.12C26.4937 43.3244 26.4207 43.5644 26.42 43.81C26.4144 44.1136 26.5271 44.4075 26.7342 44.6296C26.9414 44.8517 27.2267 44.9845 27.53 45H29.05C29.3656 45 29.6683 44.8746 29.8915 44.6515C30.1146 44.4283 30.24 44.1256 30.24 43.81C30.24 43.4944 30.1146 43.1917 29.8915 42.9685C29.6683 42.7454 29.3656 42.62 29.05 42.62V25C29.05 22 29.13 20 27.79 19.22C27.1639 19.4086 26.5139 19.5062 25.86 19.51C25.207 19.4891 24.5604 19.3746 23.94 19.17ZM31.74 12.87C31.74 11.709 31.3957 10.5741 30.7507 9.60881C30.1057 8.64349 29.189 7.89112 28.1164 7.44683C27.0438 7.00254 25.8635 6.8863 24.7248 7.11279C23.5862 7.33929 22.5402 7.89835 21.7193 8.71929C20.8984 9.54022 20.3393 10.5862 20.1128 11.7248C19.8863 12.8635 20.0025 14.0438 20.4468 15.1164C20.8911 16.189 21.6435 17.1057 22.6088 17.7507C23.5741 18.3957 24.709 18.74 25.87 18.74C27.4268 18.74 28.9199 18.1216 30.0207 17.0207C31.1216 15.9199 31.74 14.4268 31.74 12.87Z" fill="currentColor"></path></g><defs><clipPath id="clip0_1090_9"><rect width="11.74" height="38" fill="white" transform="translate(20 7)"></rect></clipPath></defs></svg>
              </button>
              <div className="weight-value-container">
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={settings.weight}
                    className="weight-value"
                    initial={{ y: isIncreasing ? 20 : -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.15 }}
                  >
                    {settings.weight} kg
                  </motion.span>
                </AnimatePresence>
              </div>
              <button 
                className="weight-button increase"
                onClick={() => adjustWeight(1)}
              >
                <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_1090_24)"><path d="M31.35 41.55H31.15L31.71 37.36C33.24 35.04 34.85 31.78 34.85 28.94C34.85 24.37 32.56 21.01 28.94 19.94C28.1488 20.2739 27.2988 20.4459 26.44 20.4459C25.5812 20.4459 24.7312 20.2739 23.94 19.94C20.29 21 18 24.37 18 28.94C18 31.94 19.77 35.33 21.35 37.66L21.88 41.55H21.68C21.2945 41.55 20.9247 41.7024 20.6511 41.9741C20.3776 42.2457 20.2226 42.6145 20.22 43V43.44C20.22 44.25 20.87 44.66 21.68 44.66H24.6C25.4 44.66 25.82 44.01 25.82 43.2V37.2C25.82 37.0117 25.8948 36.8311 26.028 36.698C26.1611 36.5648 26.3417 36.49 26.53 36.49C26.7183 36.49 26.8989 36.5648 26.93 36.698C26.96 36.8311 26.98 36.96 26.98 37.2V43.28C27.2653 43.625 27.4309 44.003 27.43 44.46C27.4245 44.8636 27.2818 45.2424 27.042 45.54C26.8023 45.8376 26.4854 46.02 26.14 46.02H24.6C24.3135 46.02 24.0504 45.8823 23.8597 45.6651C23.6691 45.448 23.5639 45.1689 23.5639 44.88C23.5639 44.5911 23.6691 44.312 23.8597 44.0949C24.0504 43.8777 24.3135 43.7374 24.6 43.7374H25.25V25.185C25.25 23.185 25.09 22.185 24.64 21.645C24.0635 21.8056 23.4684 21.8897 22.87 21.895C22.2716 21.889 21.6766 21.805 21.1 21.645C20.5235 21.4844 19.9284 21.3003 19.33 21.01C18.7535 20.8494 18.1584 20.5653 17.56 20.1C16.9835 19.9394 16.3884 19.6553 15.79 19.185C15.2135 19.0244 14.6184 18.7403 14.02 18.27C13.4435 18.1094 12.8484 17.8253 12.25 17.355C11.6735 17.1944 11.0784 16.9103 10.48 16.44C9.9035 16.2794 9.3084 15.9953 8.71 15.525C8.1335 15.3644 7.5384 15.0803 6.94 14.61C6.3635 14.4494 5.7684 14.1653 5.17 13.695C4.5935 13.5344 3.9984 13.2503 3.4 12.78C2.8235 12.6194 2.2284 12.3353 1.63 11.865C1.0535 11.7044 0.4584 11.4203 0 10.95C0.4584 10.7894 0.9168 10.5053 1.49 10.345C2.0665 10.1844 2.6616 9.9003 3.25 9.43C3.8265 9.2694 4.4216 8.9853 5.01 8.515C5.5865 8.3544 6.1816 8.0703 6.77 7.6C7.3465 7.4394 7.9416 7.1553 8.53 6.685C9.1065 6.5244 9.7016 6.2403 10.29 5.77C10.8665 5.6094 11.4616 5.3253 12.05 4.855C12.6265 4.6944 13.2216 4.4103 13.81 3.94C14.3865 3.7794 14.9816 3.4953 15.57 3.025C16.1465 2.8644 16.7416 2.5803 17.33 2.11C17.9065 1.9494 18.5016 1.6653 19.09 1.195C19.6665 1.0344 20.2616 0.7503 20.85 0.28C21.4265 0.1194 22.0216 0.0353 22.61 0Z" fill="currentColor"></path></g><defs><clipPath id="clip0_1090_24"><rect width="16.85" height="36.68" fill="white" transform="translate(18 8)"></rect></clipPath></defs></svg>
              </button>
            </div>
          </div>

          <div className="weather-settings">
            <h2>Weather Data</h2>
            <div className="weather-toggle">
              <label className="toggle-switch">
                <input
                  disabled
                  type="checkbox"
                  checked={settings.enableWeather}
                  onChange={() => updateSettings({ enableWeather: !settings.enableWeather })}
                />
                <span className="toggle-slider"></span>
              </label>
              <span className="toggle-label">
                {settings.enableWeather ? 'Weather data is enabled' : 'Weather data is disabled'}
              </span>
            </div>
          </div>

          <div className="health-connect-settings">
            <h2>Health Connect Debug</h2>
            
            <div className="health-status-section">
              <div className="health-status-grid">
                <div className="status-item">
                  <span className="status-label">Available:</span>
                  <span className={`status-value ${healthStatus.isAvailable === true ? 'success' : healthStatus.isAvailable === false ? 'error' : 'unknown'}`}>
                    {healthStatus.isAvailable === null ? '...' : healthStatus.isAvailable ? 'Yes' : 'No'}
                  </span>
                </div>
                
                <div className="status-item">
                  <span className="status-label">Permissions:</span>
                  <span className={`status-value ${healthStatus.hasPermissions === true ? 'success' : healthStatus.hasPermissions === false ? 'error' : 'unknown'}`}>
                    {healthStatus.hasPermissions === null ? '...' : healthStatus.hasPermissions ? 'Granted' : 'Not granted'}
                  </span>
                </div>
                
                <div className="status-item">
                  <span className="status-label">Loading:</span>
                  <span className={`status-value ${healthStatus.isLoading ? 'warning' : ''}`}>
                    {healthStatus.isLoading ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
              
              {healthStatus.error && (
                <div className="health-error">
                  <strong>Error:</strong> {healthStatus.error}
                </div>
              )}
            </div>
            
            <div className="health-actions-section">
              <div className="health-buttons">
                <button 
                  className="health-button primary"
                  onClick={checkHealthAvailability}
                  disabled={healthStatus.isLoading}
                >
                  Check Availability
                </button>
                
                <button 
                  className="health-button primary"
                  onClick={checkHealthPermissions}
                  disabled={healthStatus.isLoading || !healthStatus.isAvailable}
                >
                  Check Permissions
                </button>
                
                <button 
                  className="health-button primary"
                  onClick={requestHealthPermissions}
                  disabled={healthStatus.isLoading || !healthStatus.isAvailable}
                >
                  Request Permissions
                </button>
                
                <button 
                  className="health-button primary"
                  onClick={testHealthInitialization}
                  disabled={healthStatus.isLoading}
                >
                  Test Initialization
                </button>
                
                <button 
                  className="health-button secondary"
                  onClick={getHealthData}
                  disabled={healthStatus.isLoading || !healthStatus.hasPermissions}
                >
                  Get Health Data
                </button>
                
                <button 
                  className="health-button secondary"
                  onClick={openHealthConnectSettings}
                  disabled={healthStatus.isLoading}
                >
                  Open Settings
                </button>
                
                <button 
                  className="health-button secondary"
                  onClick={showHealthConnectInPlayStore}
                  disabled={healthStatus.isLoading}
                >
                  Open Play Store
                </button>
              </div>
            </div>
            
            {healthStatus.debugData && (
              <div className="health-debug-section">
                <details>
                  <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' }}>
                  Debug Data
                  </summary>
                  <div className="debug-data-container">
                    <pre style={{ 
                      fontSize: '11px', 
                      overflow: 'auto', 
                      backgroundColor: '#f5f5f5', 
                      padding: '10px', 
                      borderRadius: '5px',
                      maxHeight: '300px',
                      border: '1px solid #ddd',
                      color:'#000000'
                    }}>
                      {JSON.stringify(healthStatus.debugData, null, 2)}
                    </pre>
                  </div>
                </details>
              </div>
            )}
          </div>

          <div className="localstorage-debug-settings">
            <h2>LocalStorage Debug (Live)</h2>
            
            <div className="localstorage-debug-section">
              <div className="sync-tracking-highlight">
                <h3>Sync Tracking Status</h3>
                <div className="sync-status-grid">
                  <div className="sync-status-item">
                    <span className="sync-label">Last Synced Date:</span>
                    <span className="sync-value">
                      {localStorageData.syncTracking?.lastSyncedDate || 'null'}
                    </span>
                  </div>
                  <div className="sync-status-item">
                    <span className="sync-label">Last Synced Time:</span>
                    <span className="sync-value">
                      {localStorageData.syncTracking?.lastSyncedTime ? 
                        new Date(localStorageData.syncTracking.lastSyncedTime).toLocaleString() : 
                        'null'
                      }
                    </span>
                  </div>
                  <div className="sync-status-item">
                    <span className="sync-label">Minutes Since Last Sync:</span>
                    <span className="sync-value">
                      {localStorageData.syncTracking?.lastSyncedTime ? 
                        Math.round((new Date() - new Date(localStorageData.syncTracking.lastSyncedTime)) / (1000 * 60)) :
                        'N/A'
                      }
                    </span>
                  </div>
                  <div className="sync-status-item">
                    <span className="sync-label">Raw Sync Time (ISO):</span>
                    <span className="sync-value" style={{ fontSize: '11px' }}>
                      {localStorageData.syncTracking?.lastSyncedTime || 'null'}
                    </span>
                  </div>
                  <div className="sync-status-item">
                    <span className="sync-label">Current Time:</span>
                    <span className="sync-value">
                      {new Date().toLocaleString()}
                    </span>
                  </div>
                  <div className="sync-status-item">
                    <span className="sync-label">Sync Status:</span>
                    <span className="sync-value">
                      {'Monitoring...'}
                    </span>
                  </div>
                  <div className="sync-status-item">
                    <span className="sync-label">Query Loading:</span>
                    <span className={`sync-value ${syncStatus.isLoading ? 'warning' : ''}`}>
                      {syncStatus.isLoading ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="sync-status-item">
                    <span className="sync-label">Query Fetching:</span>
                    <span className={`sync-value ${syncStatus.isFetching ? 'warning' : ''}`}>
                      {syncStatus.isFetching ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="sync-status-item">
                    <span className="sync-label">Query Error:</span>
                    <span className={`sync-value ${syncStatus.isError ? 'error' : 'success'}`}>
                      {syncStatus.isError ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="sync-status-item">
                    <span className="sync-label">Last Query Update:</span>
                    <span className="sync-value" style={{ fontSize: '11px' }}>
                      {syncStatus.dataUpdatedAt ? new Date(syncStatus.dataUpdatedAt).toLocaleString() : 'Never'}
                    </span>
                  </div>
                </div>
                
                <div style={{ marginTop: '15px' }}>
                  <button 
                    onClick={triggerManualSync}
                    disabled={syncStatus.isLoading || syncStatus.isFetching}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: syncStatus.isLoading || syncStatus.isFetching ? '#ccc' : '#1976d2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: syncStatus.isLoading || syncStatus.isFetching ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}
                  >
                    {syncStatus.isLoading || syncStatus.isFetching ? 'Syncing...' : 'Manual Sync'}
                  </button>
                  
                  {syncStatus.syncResult && (
                    <div style={{ 
                      marginTop: '10px', 
                      fontSize: '12px',
                      padding: '8px',
                      borderRadius: '4px',
                      backgroundColor: syncStatus.syncResult.success ? '#e8f5e8' : '#ffe8e8',
                      border: `1px solid ${syncStatus.syncResult.success ? '#4caf50' : '#f44336'}`
                    }}>
                      <strong>Last Sync Result:</strong> {syncStatus.syncResult.success ? 'Success' : 'Failed'}
                      {syncStatus.syncResult.dataSynced && (
                        <div>Days synced: {syncStatus.syncResult.dataSynced.length}</div>
                      )}
                      {syncStatus.syncResult.error && (
                        <div>Error: {syncStatus.syncResult.error}</div>
                      )}
                      {syncStatus.syncResult.message && (
                        <div>Message: {syncStatus.syncResult.message}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <details style={{ marginTop: '20px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '10px' }}>
                All LocalStorage Data (Updates every 2 seconds)
              </summary>
              <div className="localstorage-data-container">
                <pre style={{ 
                  fontSize: '11px', 
                  overflow: 'auto', 
                  backgroundColor: '#f5f5f5', 
                  padding: '15px', 
                  borderRadius: '5px',
                  maxHeight: '400px',
                  border: '1px solid #ddd',
                  color: '#000000',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {JSON.stringify(localStorageData, null, 2)}
                </pre>
              </div>
            </details>
            
            <div style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
              <p>🔄 Auto-updates every 2 seconds</p>
              <p>📊 Prefixed items (_syncTracking, _stepsData, etc.) are formatted service data</p>
              <p>🗃️ Raw localStorage keys show actual stored values</p>
            </div>
          </div>

          <div className="data-settings">
            <h2>Data Management</h2>
            <div className="data-actions-section">
              <div className="import-export-section">
                <div className="import-export-buttons">
                  <button 
                    className="import-data-button"
                    onClick={importData}
                  >
                    Import Data
                  </button>
                  <button 
                    className="export-data-button"
                    onClick={exportData}
                  >
                    Export Data
                  </button>
                </div>
              </div>
              <div className="wipe-data-section">
                <button 
                  className="wipe-data-button"
                  onClick={wipeAllData}
                >
                  Wipe All Data
                </button>
                <p className="wipe-data-warning">
                  Permanently delete all of your steps data
                </p>
              </div>
            </div>
          </div>

          <div className="database-upload-settings">
            <h2>Database Upload</h2>
            <div className="database-upload-section">
              <button 
                className="upload-to-database-button"
                onClick={uploadStepDataToDatabase}
                disabled={dbUploadStatus.isUploading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: dbUploadStatus.isUploading ? '#ccc' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: dbUploadStatus.isUploading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '10px'
                }}
              >
                {dbUploadStatus.isUploading ? 'Uploading...' : 'Upload Steps & Profile to Database'}
              </button>
              
              {dbUploadStatus.success && (
                <div style={{
                  background: 'rgba(76, 175, 80, 0.1)',
                  border: '1px solid rgba(76, 175, 80, 0.3)',
                  borderRadius: '6px',
                  padding: '10px',
                  color: '#4CAF50',
                  fontSize: '14px',
                  marginBottom: '10px'
                }}>
                  ✅ {dbUploadStatus.success}
                </div>
              )}
              
              {dbUploadStatus.error && (
                <div style={{
                  background: 'rgba(244, 67, 54, 0.1)',
                  border: '1px solid rgba(244, 67, 54, 0.3)',
                  borderRadius: '6px',
                  padding: '10px',
                  color: '#f44336',
                  fontSize: '14px',
                  marginBottom: '10px'
                }}>
                  ❌ {dbUploadStatus.error}
                </div>
              )}
              
              <p style={{
                fontSize: '12px',
                color: '#666',
                margin: '0'
              }}>
                Upload today's step count and your profile (including selected badge) to the remote Supabase database
              </p>
            </div>
          </div>
        </div>
      </PageTransition>
    </>
  );
};

export default SettingsMenu;
