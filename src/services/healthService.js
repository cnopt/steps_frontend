import { registerPlugin } from '@capacitor/core';

import { Health } from 'capacitor-health'
import localDataService from './localDataService';
import { getTodayLocalDateString, getLocalDateString } from '../helpers/dateUtils';

class HealthService {
  constructor() {
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  /**
   * Initialize Health Connect client
   * @returns {Promise} Initialization result
   */
  async initialize() {
    // Return existing promise if initialization is already in progress
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Return immediately if already initialized
    if (this.isInitialized) {
      return { success: true, message: 'Already initialized' };
    }

    this.initializationPromise = this._performInitialization();
    return this.initializationPromise;
  }

  async _performInitialization() {
    try {
      console.log('[HEALTH] Starting Health Connect initialization...');
      
      // First check if Health Connect is available
      const availability = await this.isHealthAvailable();
      if (!availability.available) {
        console.log('[HEALTH] Health Connect is not available on this device');
        return {
          success: false,
          message: 'Health Connect not available',
          available: false
        };
      }

      console.log('[HEALTH] Health Connect is available, checking permissions...');
      
      // Check current permissions
      const permissions = await this.checkHealthPermissions();
      const hasPermissions = permissions.permissions && Object.values(permissions.permissions).some(granted => granted);
      
      if (!hasPermissions) {
        console.log('[HEALTH] No Health Connect permissions granted');
        return {
          success: false,
          message: 'No permissions granted',
          available: true,
          hasPermissions: false
        };
      }

      console.log('[HEALTH] Health Connect initialization completed successfully');
      this.isInitialized = true;
      this.initializationPromise = null;
      
      return {
        success: true,
        message: 'Health Connect initialized successfully',
        available: true,
        hasPermissions: true
      };

    } catch (error) {
      console.error('[HEALTH] Health Connect initialization failed:', error);
      this.initializationPromise = null;
      
      return {
        success: false,
        message: error.message,
        error: error.message,
        available: false,
        hasPermissions: false
      };
    }
  }

  /**
   * Ensure Health Connect is initialized before any operation
   * @returns {Promise} Initialization status
   */
  async ensureInitialized() {
    if (!this.isInitialized) {
      const result = await this.initialize();
      if (!result.success) {
        throw new Error(`Health Connect initialization failed: ${result.message}`);
      }
    }
    return true;
  }

  /**
   * Get current initialization status (for debugging)
   * @returns {Object} Current status
   */
  getInitializationStatus() {
    return {
      isInitialized: this.isInitialized,
      hasInitializationPromise: !!this.initializationPromise
    };
  }
  
  /**
   * Check if Health Connect is available
   * @returns {Promise} Availability status
   */
  async isHealthAvailable() {
    try {
      const result = await Health.isHealthAvailable();
      console.log('Health Connect availability:', result);
      return result;
    } catch (error) {
      console.error('Error checking Health Connect availability:', error);
      throw error;
    }
  }

  /**
   * Request permissions to access health data
   * @returns {Promise} Permission request result
   */
  async requestHealthPermissions() {
    try {
      const result = await Health.requestHealthPermissions({
        permissions: [
          'READ_STEPS',
          'READ_CALORIES',
          'READ_DISTANCE',
          'READ_HEART_RATE',
          'READ_HEALTH'
        ]
      });
      
      console.log('Health permissions result:', result);
      
      // Reset initialization status since permissions changed
      this.isInitialized = false;
      this.initializationPromise = null;
      
      return result;
    } catch (error) {
      console.error('Error requesting health permissions:', error);
      throw error;
    }
  }

  /**
   * Check if health permissions are granted
   * @returns {Promise} Permission status
   */
  async checkHealthPermissions() {
    try {
      const result = await Health.checkHealthPermissions({
        permissions: [
          'READ_STEPS',
          'READ_CALORIES', 
          'READ_DISTANCE',
          'READ_HEART_RATE'
        ]
      });
      
      console.log('Health permissions status:', result);
      return result;
    } catch (error) {
      console.error('Error checking health permissions:', error);
      throw error;
    }
  }

  /**
   * Get today's steps data for real-time updates
   * Designed to be called periodically (e.g., once per hour) to keep current day data fresh
   * @returns {Promise} Today's steps data
   */
  async getTodaysSteps() {
    try {
      // Ensure Health Connect is initialized before querying
      await this.ensureInitialized();
      
      const now = new Date();
      const todayISO = getTodayLocalDateString();
      
      console.log(`Querying Health Connect for today's steps: ${todayISO}`);
      
      // Use the same approach as the manual "Get Health Data" button for consistency
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startDate = startOfToday.toISOString();
      const endDate = now.toISOString();
      
      console.log(`Health Connect query: ${startDate} to ${endDate}`);
      
      // Use getStepsData method (same as manual button) instead of direct queryAggregated
      const result = await this.getStepsData(startDate, endDate);
      
      console.log('Health Connect today\'s steps RAW response:', JSON.stringify(result, null, 2));
      
      // Extract steps directly from the raw response (same way manual button shows it)
      let todaysSteps = 0;
      
      // Check multiple possible response formats and extract the steps value
      if (result && result.aggregatedData && Array.isArray(result.aggregatedData)) {
        // Look for today's data in aggregatedData array
        const todayData = result.aggregatedData.find(item => {
          const itemDate = item.startDate ? item.startDate.split('T')[0] : null;
          return itemDate === todayISO;
        });
        
        if (todayData) {
          // Try different possible field names for step count
          todaysSteps = todayData.value || todayData.steps || todayData.count || todayData.stepsCount || 0;
          console.log(`Found today's data in aggregatedData:`, todayData);
          console.log(`Extracted steps: ${todaysSteps}`);
        }
      } else if (result && Array.isArray(result)) {
        // Direct array response
        const todayData = result.find(item => {
          const itemDate = item.startDate ? item.startDate.split('T')[0] : null;
          return itemDate === todayISO;
        });
        
        if (todayData) {
          todaysSteps = todayData.value || todayData.steps || todayData.count || todayData.stepsCount || 0;
          console.log(`Found today's data in direct array:`, todayData);
          console.log(`Extracted steps: ${todaysSteps}`);
        }
      } else if (result && result.value !== undefined) {
        // Single result with value field
        todaysSteps = result.value;
        console.log(`Found single result with value: ${todaysSteps}`);
      }
      
      console.log(`Final today's steps: ${todaysSteps}`);
      
      if (todaysSteps >= 0) {
        return {
          success: true,
          date: todayISO,
          steps: parseInt(todaysSteps),
          lastUpdated: new Date().toISOString()
        };
      } else {
        console.log('No valid steps data found for today');
        return {
          success: true,
          date: todayISO,
          steps: 0,
          lastUpdated: new Date().toISOString()
        };
      }
      
    } catch (error) {
      console.error('Error getting today\'s steps from Health Connect:', error);
      return {
        success: false,
        date: getTodayLocalDateString(),
        steps: 0,
        error: error.message,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Get aggregated steps data for a date range
   * @param {string} startDate - Start date in ISO format
   * @param {string} endDate - End date in ISO format
   * @returns {Promise} Steps data
   */
  async getStepsData(startDate, endDate) {
    try {
      // Ensure Health Connect is initialized before querying
      await this.ensureInitialized();
      
      console.log(`Querying Health Connect for steps data from ${startDate} to ${endDate}`);
      
      const result = await Health.queryAggregated({
        startDate: startDate,
        endDate: endDate,
        dataType: 'steps',
        bucket: 'day'
      });
      
      console.log('Health Connect steps data response:', result);
      return result;
    } catch (error) {
      console.error('Error getting steps data from Health Connect:', error);
      throw error;
    }
  }

  /**
   * Transform health connect data to local storage format
   * @param {Object} healthData - Raw health connect data
   * @returns {Array} Transformed data array
   */
  transformHealthDataToLocalFormat(healthData) {
    try {
      console.log('Raw health data received:', healthData);
      
      if (!healthData) {
        console.log('No health data provided');
        return [];
      }

      // Handle different possible response formats
      let dataArray = [];
      
      if (healthData.aggregatedData && Array.isArray(healthData.aggregatedData)) {
        dataArray = healthData.aggregatedData;
      } else if (Array.isArray(healthData)) {
        dataArray = healthData;
      } else if (healthData.data && Array.isArray(healthData.data)) {
        dataArray = healthData.data;
      } else {
        console.log('No aggregated data found in health response');
        return [];
      }

      const transformedData = dataArray
        .filter(item => {
          // Check for steps in various possible properties
          const steps = item.steps || 
                       item.count || 
                       item.value || 
                       item.stepsCount || 
                       item.COUNT_TOTAL || 
                       (item.result && item.result.COUNT_TOTAL);
          
          // Accept any numeric value including 0
          return steps !== undefined && steps !== null && !isNaN(steps);
        })
        .map(item => {
          // Extract step count from various possible locations
          const steps = item.steps || 
                       item.count || 
                       item.value || 
                       item.stepsCount || 
                       item.COUNT_TOTAL || 
                       (item.result && item.result.COUNT_TOTAL) ||
                       0;
          
          let formattedDate = null;
          
          // Try to extract date from various possible properties
          if (item.startDate) {
            formattedDate = item.startDate.split('T')[0];
          } else if (item.date) {
            formattedDate = item.date.split('T')[0];
          } else if (item.startTime) {
            formattedDate = item.startTime.split('T')[0];
          } else if (item.time) {
            formattedDate = item.time.split('T')[0];
          }
          
          console.log('Item transformation:', { 
            originalItem: item, 
            extractedSteps: steps, 
            extractedDate: formattedDate 
          });
          
          return {
            steps: parseInt(steps),
            formatted_date: formattedDate,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        })
        .filter(item => {
          // Only filter out items with invalid date or invalid step count
          const isValid = item.formatted_date && !isNaN(item.steps) && item.steps >= 0;
          return isValid;
        })
        .reduce((acc, item) => {
          // Group by date and sum steps for the same day
          const existingDay = acc.find(day => day.formatted_date === item.formatted_date);
          if (existingDay) {
            existingDay.steps += item.steps;
            existingDay.updated_at = new Date().toISOString();
          } else {
            acc.push(item);
          }
          return acc;
        }, []);

      console.log(`Transformed ${transformedData.length} day(s) of data from ${dataArray.length} raw entries`);
      transformedData.forEach(item => {
        console.log(`Day ${item.formatted_date}: ${item.steps} steps`);
      });
      
      return transformedData;
    } catch (error) {
      console.error('Error transforming health data:', error);
      return [];
    }
  }

  /**
   * Import data from yesterday back to the beginning of current month
   * @param {Function} progressCallback - Called with progress updates (current, total, status)
   * @returns {Promise} Import results
   */
  async importRecentHealthData(progressCallback = () => {}) {
    try {
      // Ensure Health Connect is initialized before importing
      progressCallback(0, 1, 'Initializing Health Connect...');
      await this.ensureInitialized();
      
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11
      
      // Create array of months to fetch (current month only for now)
      const monthsToFetch = [
        { year: currentYear, month: currentMonth }
      ];

      progressCallback(0, monthsToFetch.length, 'Starting import...');

      const allImportedData = [];
      let currentIndex = 0;

      for (const { year, month } of monthsToFetch) {
        try {
          progressCallback(currentIndex, monthsToFetch.length, `Fetching ${year}-${String(month).padStart(2, '0')}...`);
          
          const monthData = await this.getStepsDataForMonth(year, month);
          const transformedData = this.transformHealthDataToLocalFormat(monthData);
          
          allImportedData.push(...transformedData);
          
          currentIndex++;
          progressCallback(currentIndex, monthsToFetch.length, `Completed ${year}-${String(month).padStart(2, '0')}`);
          
          // Add a small delay between requests to be respectful
          if (currentIndex < monthsToFetch.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
        } catch (error) {
          console.error(`Failed to fetch data for ${year}-${month}:`, error);
          progressCallback(currentIndex, monthsToFetch.length, `Failed ${year}-${String(month).padStart(2, '0')}: ${error.message}`);
          // Continue with other months even if one fails
        }
      }

      progressCallback(monthsToFetch.length, monthsToFetch.length, 'Import completed');

      return {
        success: true,
        importedData: allImportedData,
        monthsProcessed: monthsToFetch.length,
        totalDays: allImportedData.length
      };

    } catch (error) {
      console.error('Error during health data import:', error);
      progressCallback(0, 1, `Import failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get aggregated calories data for a date range
   * @param {string} startDate - Start date in ISO format
   * @param {string} endDate - End date in ISO format
   * @returns {Promise} Calories data
   */
  async getCaloriesData(startDate, endDate) {
    try {
      // Ensure Health Connect is initialized before querying
      await this.ensureInitialized();
      
      const result = await Health.queryAggregated({
        startDate: startDate,
        endDate: endDate,
        dataType: 'calories',
        bucket: 'day'
      });
      
      console.log('Calories data:', result);
      return result;
    } catch (error) {
      console.error('Error getting calories data:', error);
      throw error;
    }
  }

  /**
   * Open Health Connect settings (Android only)
   * @returns {Promise}
   */
  async openHealthConnectSettings() {
    try {
      await Health.openHealthConnectSettings();
    } catch (error) {
      console.error('Error opening Health Connect settings:', error);
      throw error;
    }
  }

  /**
   * Show Health Connect in Play Store (Android only)
   * @returns {Promise}
   */
  async showHealthConnectInPlayStore() {
    try {
      await Health.showHealthConnectInPlayStore();
    } catch (error) {
      console.error('Error showing Health Connect in Play Store:', error);
      throw error;
    }
  }

  /**
   * Smart syncing function that checks lastSyncedDate and lastSyncedTime
   * Fetches missing data based on sync tracking and time intervals
   * @returns {Promise} Sync results with updated data
   */
  async getLatestData() {
    try {
      console.log('[SYNC] Starting smart data sync...');
      
      const now = new Date();
      const todayISO = getTodayLocalDateString();
      const currentTime = now.toISOString();
      
      // First check if Health Connect is available and initialized
      console.log('[SYNC] Checking Health Connect availability...');
      const initResult = await this.initialize();
      
      if (!initResult.success) {
        console.log('[SYNC] Health Connect not available or not initialized:', initResult.message);
        
        // Return a graceful failure that doesn't break the app
        return {
          success: false,
          message: `Health Connect unavailable: ${initResult.message}`,
          dataSynced: [],
          errors: [`Health Connect unavailable: ${initResult.message}`],
          lastSyncedDate: null,
          lastSyncedTime: currentTime,
          healthConnectAvailable: false
        };
      }
      
      console.log('[SYNC] Health Connect initialized successfully, proceeding with sync...');
      
      // Get sync tracking data
      const syncTracking = localDataService.getSyncTracking();
      const { lastSyncedDate, lastSyncedTime } = syncTracking;
      
      console.log('[SYNC] Current sync tracking:', { lastSyncedDate, lastSyncedTime });
      
      let needsDateRangeSync = false;
      let needsTodaySync = true; // Always sync today's data for real-time updates
      let syncResults = {
        success: true,
        dataSynced: [],
        errors: [],
        lastSyncedDate: lastSyncedDate,
        lastSyncedTime: lastSyncedTime,
        healthConnectAvailable: true
      };

      // Check if we need to sync date ranges (missing days)
      if (!lastSyncedDate || lastSyncedDate < todayISO) {
        needsDateRangeSync = true;
      }

      // Perform date range sync if needed
      if (needsDateRangeSync) {
        try {
          console.log('[SYNC] Performing date range sync...');
          const dateRangeResult = await this.syncDateRange(lastSyncedDate, todayISO);
          syncResults.dataSynced.push(...dateRangeResult.dataSynced);
          syncResults.lastSyncedDate = todayISO;
          
          console.log(`[SYNC] Date range sync completed: ${dateRangeResult.dataSynced.length} days synced`);
        } catch (error) {
          console.error('[SYNC] Error during date range sync:', error);
          syncResults.errors.push(`Date range sync failed: ${error.message}`);
        }
      }

      // Always perform today's sync for real-time step updates
      try {
        console.log('[SYNC] Performing today\'s data sync...');
        const todayResult = await this.syncTodaysData();
        if (todayResult.success) {
          // Update or add today's data in results
          const existingTodayIndex = syncResults.dataSynced.findIndex(item => item.date === todayISO);
          if (existingTodayIndex >= 0) {
            syncResults.dataSynced[existingTodayIndex] = todayResult;
          } else {
            syncResults.dataSynced.push(todayResult);
          }
          console.log(`[SYNC] Today's sync completed successfully: ${todayResult.steps} steps`);
        } else {
          console.error('[SYNC] Today\'s sync failed:', todayResult.error);
          syncResults.errors.push(`Today's sync failed: ${todayResult.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('[SYNC] Error during today\'s sync:', error);
        syncResults.errors.push(`Today's sync failed: ${error.message}`);
      }

      // Only update sync tracking if we successfully synced data
      if (syncResults.dataSynced.length > 0 || syncResults.errors.length === 0) {
        localDataService.updateSyncTracking(todayISO, currentTime);
        syncResults.lastSyncedDate = todayISO;
        syncResults.lastSyncedTime = currentTime;
        console.log('[SYNC] Sync tracking updated');
      }

      console.log('[SYNC] Smart sync completed:', syncResults);
      return syncResults;

    } catch (error) {
      console.error('[SYNC] Error during smart data sync:', error);
      return {
        success: false,
        error: error.message,
        dataSynced: [],
        errors: [error.message],
        healthConnectAvailable: false
      };
    }
  }

  /**
   * Check if a given time is more than 10 minutes ago
   * @param {string} timeString - ISO time string
   * @returns {boolean} True if more than 10 minutes ago
   */
  isMoreThan10MinutesAgo(timeString) {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const lastSyncTime = new Date(timeString);
    return lastSyncTime < tenMinutesAgo;
  }

  /**
   * Sync data for a date range (from lastSyncedDate to today)
   * @param {string} fromDate - Start date (or null for current month)
   * @param {string} toDate - End date (today)
   * @returns {Promise} Sync results
   */
  async syncDateRange(fromDate, toDate) {
    try {
      let startDate;
      
      if (!fromDate) {
        // If no previous sync, start from beginning of current month (using local timezone)
        const today = new Date();
        const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        startDate = getLocalDateString(firstOfMonth);
      } else {
        // Start from day after last synced date
        const lastSyncDate = new Date(fromDate);
        lastSyncDate.setDate(lastSyncDate.getDate() + 1);
        startDate = lastSyncDate.toISOString().split('T')[0];
      }

      console.log(`Syncing date range from ${startDate} to ${toDate}`);

      const result = await this.getStepsData(
        `${startDate}T00:00:00.000Z`,
        `${toDate}T23:59:59.999Z`
      );

      const transformedData = this.transformHealthDataToLocalFormat(result);
      const dataSynced = [];

      // Add each day's data to local storage
      for (const dayData of transformedData) {
        try {
          const addResult = localDataService.addStepsData(dayData);
          if (addResult.success) {
            dataSynced.push({
              date: dayData.formatted_date,
              steps: dayData.steps,
              success: true
            });
          }
        } catch (error) {
          console.error(`Failed to save data for ${dayData.formatted_date}:`, error);
          dataSynced.push({
            date: dayData.formatted_date,
            steps: 0,
            success: false,
            error: error.message
          });
        }
      }

      return {
        success: true,
        dataSynced: dataSynced,
        dateRange: { startDate, endDate: toDate }
      };

    } catch (error) {
      console.error('Error during date range sync:', error);
      throw error;
    }
  }

  /**
   * Sync today's data specifically
   * @returns {Promise} Today's sync result
   */
  async syncTodaysData() {
    try {
      const todayResult = await this.getTodaysSteps();
      
      if (todayResult.success) {
        // Add to local storage - this handles both new entries and updates
        const addResult = localDataService.addStepsData({
          steps: todayResult.steps,
          formatted_date: todayResult.date,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        if (addResult.success) {
          return {
            success: true,
            date: todayResult.date,
            steps: todayResult.steps,
            lastUpdated: todayResult.lastUpdated
          };
        } else {
          return {
            success: false,
            date: todayResult.date,
            steps: 0,
            error: 'Failed to save data to local storage'
          };
        }
      } else {
        return {
          success: false,
          date: todayResult.date,
          steps: 0,
          error: todayResult.error || 'Failed to get today\'s steps'
        };
      }
    } catch (error) {
      const todayISO = getTodayLocalDateString();
      return {
        success: false,
        date: todayISO,
        steps: 0,
        error: error.message
      };
    }
  }
}

export default new HealthService(); 