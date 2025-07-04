// Local Data Service - Manages all user data in localStorage
// Replaces the external API calls with local JSON storage

const STORAGE_KEYS = {
  STEPS_DATA: 'stepsData',
  USER_PROFILE: 'userProfile',
  APP_VERSION: 'appVersion',
  SYNC_TRACKING: 'syncTracking'
};

const CURRENT_VERSION = '1.0.0';

class LocalDataService {
  constructor() {
    this.initializeStorage();
  }

  // Initialize storage structure if it doesn't exist
  initializeStorage() {
    // Check if this is a first-time user or if we need to migrate
    const currentVersion = localStorage.getItem(STORAGE_KEYS.APP_VERSION);
    
    if (!currentVersion) {
      // First time setup
      this.setupFirstTimeUser();
    } else if (currentVersion !== CURRENT_VERSION) {
      // Handle future migrations here
      this.migrateData(currentVersion, CURRENT_VERSION);
    }
    
    // Ensure all required storage keys exist
    if (!localStorage.getItem(STORAGE_KEYS.STEPS_DATA)) {
      localStorage.setItem(STORAGE_KEYS.STEPS_DATA, JSON.stringify([]));
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.USER_PROFILE)) {
      this.initializeUserProfile();
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.SYNC_TRACKING)) {
      this.initializeSyncTracking();
    }
  }

  // Setup for first-time users
  setupFirstTimeUser() {
    localStorage.setItem(STORAGE_KEYS.APP_VERSION, CURRENT_VERSION);
    localStorage.setItem(STORAGE_KEYS.STEPS_DATA, JSON.stringify([]));
    this.initializeUserProfile();
  }

  // Initialize user profile with default values
  initializeUserProfile() {
    const defaultProfile = {
      height: parseInt(localStorage.getItem('userHeight')) || 170,
      weight: parseInt(localStorage.getItem('userWeight')) || 70,
      gender: localStorage.getItem('userGender') || 'M',
      enableWeather: localStorage.getItem('userEnableWeather') === 'true' || false,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(defaultProfile));
  }

  // Initialize sync tracking with default values
  initializeSyncTracking() {
    const defaultSyncTracking = {
      lastSyncedDate: null, // Last date we successfully synced data for
      lastSyncedTime: null, // Last time we performed any sync operation
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    localStorage.setItem(STORAGE_KEYS.SYNC_TRACKING, JSON.stringify(defaultSyncTracking));
  }

  // Get all steps data
  getAllStepsData() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STEPS_DATA);
      const stepsData = JSON.parse(data) || [];
      // Sort by date (oldest first) to match the original API behavior
      return stepsData.sort((a, b) => new Date(a.formatted_date) - new Date(b.formatted_date));
    } catch (error) {
      console.error('Error fetching steps data:', error);
      return [];
    }
  }

  // Add new step entry
  addStepsData(stepsEntry) {
    try {
      const { steps, formatted_date } = stepsEntry;
      
      // Validate input
      if (!steps || !formatted_date) {
        throw new Error('Steps and date are required');
      }

      if (steps < 0) {
        throw new Error('Steps cannot be negative');
      }

      const currentData = this.getAllStepsData();
      
      // Check if entry for this date already exists
      const existingEntryIndex = currentData.findIndex(
        entry => entry.formatted_date === formatted_date
      );

      const newEntry = {
        steps: parseInt(steps),
        formatted_date,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (existingEntryIndex >= 0) {
        // Update existing entry
        currentData[existingEntryIndex] = {
          ...currentData[existingEntryIndex],
          steps: parseInt(steps),
          updated_at: new Date().toISOString()
        };
      } else {
        // Add new entry
        currentData.push(newEntry);
      }

      // Save back to localStorage
      localStorage.setItem(STORAGE_KEYS.STEPS_DATA, JSON.stringify(currentData));
      
      // Return success response similar to the original API
      return {
        success: true,
        message: 'Steps data added successfully',
        data_added: newEntry
      };
    } catch (error) {
      console.error('Error adding steps data:', error);
      throw error;
    }
  }

  // Get steps data for a specific date
  getStepsForDate(date) {
    const allData = this.getAllStepsData();
    return allData.find(entry => entry.formatted_date === date);
  }

  // Update steps for a specific date
  updateStepsForDate(date, steps) {
    return this.addStepsData({ steps, formatted_date: date });
  }

  // Delete steps data for a specific date
  deleteStepsForDate(date) {
    try {
      const currentData = this.getAllStepsData();
      const filteredData = currentData.filter(entry => entry.formatted_date !== date);
      
      localStorage.setItem(STORAGE_KEYS.STEPS_DATA, JSON.stringify(filteredData));
      
      return {
        success: true,
        message: 'Steps data deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting steps data:', error);
      throw error;
    }
  }

  // Get user profile
  getUserProfile() {
    try {
      const profile = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      return JSON.parse(profile) || {};
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return {};
    }
  }

  // Update user profile
  updateUserProfile(profileData) {
    try {
      const currentProfile = this.getUserProfile();
      const updatedProfile = {
        ...currentProfile,
        ...profileData,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updatedProfile));
      
      return {
        success: true,
        message: 'Profile updated successfully',
        profile: updatedProfile
      };
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Get sync tracking data
  getSyncTracking() {
    try {
      const syncTracking = localStorage.getItem(STORAGE_KEYS.SYNC_TRACKING);
      return JSON.parse(syncTracking) || {};
    } catch (error) {
      console.error('Error fetching sync tracking:', error);
      return {};
    }
  }

  // Update last synced date
  updateLastSyncedDate(date) {
    try {
      const currentTracking = this.getSyncTracking();
      const updatedTracking = {
        ...currentTracking,
        lastSyncedDate: date,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem(STORAGE_KEYS.SYNC_TRACKING, JSON.stringify(updatedTracking));
      return updatedTracking;
    } catch (error) {
      console.error('Error updating last synced date:', error);
      throw error;
    }
  }

  // Update last synced time
  updateLastSyncedTime(time = null) {
    try {
      const currentTracking = this.getSyncTracking();
      const updatedTracking = {
        ...currentTracking,
        lastSyncedTime: time || new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem(STORAGE_KEYS.SYNC_TRACKING, JSON.stringify(updatedTracking));
      return updatedTracking;
    } catch (error) {
      console.error('Error updating last synced time:', error);
      throw error;
    }
  }

  // Update both sync tracking values at once
  updateSyncTracking(date, time = null) {
    try {
      const currentTracking = this.getSyncTracking();
      const updatedTracking = {
        ...currentTracking,
        lastSyncedDate: date,
        lastSyncedTime: time || new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem(STORAGE_KEYS.SYNC_TRACKING, JSON.stringify(updatedTracking));
      return updatedTracking;
    } catch (error) {
      console.error('Error updating sync tracking:', error);
      throw error;
    }
  }

  // Export all user data as JSON
  exportUserData() {
    try {
      const exportData = {
        version: CURRENT_VERSION,
        exportDate: new Date().toISOString(),
        userProfile: this.getUserProfile(),
        stepsData: this.getAllStepsData(),
        syncTracking: this.getSyncTracking(),
        metadata: {
          totalEntries: this.getAllStepsData().length,
          dateRange: this.getDateRange()
        }
      };
      
      return exportData;
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw error;
    }
  }

  // Import user data from JSON
  importUserData(importData, options = { overwrite: false, merge: true }) {
    try {
      // Validate import data structure
      if (!importData.stepsData || !importData.userProfile) {
        throw new Error('Invalid import data format');
      }

      if (options.overwrite) {
        // Complete overwrite
        localStorage.setItem(STORAGE_KEYS.STEPS_DATA, JSON.stringify(importData.stepsData));
        localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(importData.userProfile));
        if (importData.syncTracking) {
          localStorage.setItem(STORAGE_KEYS.SYNC_TRACKING, JSON.stringify(importData.syncTracking));
        }
      } else if (options.merge) {
        // Merge data (default behavior)
        this.mergeImportedData(importData);
      }

      return {
        success: true,
        message: 'Data imported successfully',
        importedEntries: importData.stepsData.length
      };
    } catch (error) {
      console.error('Error importing user data:', error);
      throw error;
    }
  }

  // Merge imported data with existing data
  mergeImportedData(importData) {
    // Merge steps data (prefer newer entries)
    const currentStepsData = this.getAllStepsData();
    const importedStepsData = importData.stepsData;
    
    const mergedData = [...currentStepsData];
    
    importedStepsData.forEach(importedEntry => {
      const existingIndex = mergedData.findIndex(
        entry => entry.formatted_date === importedEntry.formatted_date
      );
      
      if (existingIndex >= 0) {
        // Compare timestamps and keep the newer one
        const existingDate = new Date(mergedData[existingIndex].updated_at || mergedData[existingIndex].created_at);
        const importedDate = new Date(importedEntry.updated_at || importedEntry.created_at);
        
        if (importedDate > existingDate) {
          mergedData[existingIndex] = importedEntry;
        }
      } else {
        mergedData.push(importedEntry);
      }
    });
    
    localStorage.setItem(STORAGE_KEYS.STEPS_DATA, JSON.stringify(mergedData));
    
    // Merge profile data (prefer imported data for most fields)
    const currentProfile = this.getUserProfile();
    const mergedProfile = {
      ...currentProfile,
      ...importData.userProfile,
      lastUpdated: new Date().toISOString()
    };
    
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(mergedProfile));

    // Merge sync tracking data if available (prefer imported data)
    if (importData.syncTracking) {
      const currentSyncTracking = this.getSyncTracking();
      const mergedSyncTracking = {
        ...currentSyncTracking,
        ...importData.syncTracking,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem(STORAGE_KEYS.SYNC_TRACKING, JSON.stringify(mergedSyncTracking));
    }
  }

  // Get date range of stored data
  getDateRange() {
    const data = this.getAllStepsData();
    if (data.length === 0) return null;
    
    const dates = data.map(entry => entry.formatted_date).sort();
    return {
      earliest: dates[0],
      latest: dates[dates.length - 1],
      totalDays: dates.length
    };
  }

  // Get storage usage information
  getStorageInfo() {
    const stepsDataSize = JSON.stringify(this.getAllStepsData()).length;
    const profileSize = JSON.stringify(this.getUserProfile()).length;
    
    return {
      stepsDataSize,
      profileSize,
      totalSize: stepsDataSize + profileSize,
      entryCount: this.getAllStepsData().length
    };
  }

  // Clear all data (use with caution)
  clearAllData() {
    localStorage.removeItem(STORAGE_KEYS.STEPS_DATA);
    localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
    localStorage.removeItem(STORAGE_KEYS.APP_VERSION);
    localStorage.removeItem(STORAGE_KEYS.SYNC_TRACKING);
    
    // Reinitialize
    this.initializeStorage();
    
    return {
      success: true,
      message: 'All data cleared successfully'
    };
  }

  // Migration function for future versions
  migrateData(fromVersion, toVersion) {
    console.log(`Migrating data from version ${fromVersion} to ${toVersion}`);
    
    // Future migrations will be handled here
    switch (fromVersion) {
      case '1.0.0':
        // Example migration logic
        break;
      default:
        console.warn(`No migration path from ${fromVersion} to ${toVersion}`);
    }
    
    localStorage.setItem(STORAGE_KEYS.APP_VERSION, toVersion);
  }

  // Check if this is a first-time user (no steps data)
  isFirstTimeUser() {
    const stepsData = this.getAllStepsData();
    const profile = this.getUserProfile();
    
    return stepsData.length === 0 && !profile.hasCompletedFirstEntry;
  }

  // Check if user has any steps data
  hasAnyStepsData() {
    return this.getAllStepsData().length > 0;
  }

  // Mark that user has completed their first step entry
  markFirstEntryCompleted() {
    const profile = this.getUserProfile();
    const updatedProfile = {
      ...profile,
      hasCompletedFirstEntry: true,
      firstEntryDate: new Date().toISOString()
    };
    
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updatedProfile));
    return updatedProfile;
  }

  // Check if user has set up their profile (height/weight)
  hasProfileSetup() {
    const profile = this.getUserProfile();
    return profile.height !== 170 || profile.weight !== 70; // Not default values
  }

  // Get onboarding status
  getOnboardingStatus() {
    return {
      isFirstTime: this.isFirstTimeUser(),
      hasStepsData: this.hasAnyStepsData(),
      hasProfileSetup: this.hasProfileSetup(),
      totalEntries: this.getAllStepsData().length
    };
  }
}

// Create and export a singleton instance
const localDataService = new LocalDataService();
export default localDataService;