import { useQuery, useQueryClient } from '@tanstack/react-query';
import localDataService from '../services/localDataService';
import healthService from '../services/healthService';
import { useEffect, useRef } from 'react';

// Module-level flag to track if initial startup sync has been triggered
// This persists across component mounts/unmounts during navigation
let hasTriggeredInitialSync = false;

// Reset the startup flag on page refresh/app restart
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    hasTriggeredInitialSync = false;
  });
}

// Local data fetcher that mimics the original API structure
const fetchStepsData = async () => {
  console.log('[QUERY] fetchStepsData called - fetching from localStorage');
  // Get data from local storage instead of API
  const localData = localDataService.getAllStepsData();
  
  // Return in the same format as the original API expected by components
  return localData;
};

// Smart sync fetcher using the new getLatestData function
const fetchLatestData = async () => {
  try {
    console.log('[QUERY] fetchLatestData called - starting Health Connect sync...');
    const syncResult = await healthService.getLatestData();
    console.log('[QUERY] fetchLatestData completed:', syncResult);
    return syncResult;
  } catch (error) {
    console.error('[QUERY] fetchLatestData failed:', error);
    return { success: false, error: error.message, dataSynced: [] };
  }
};

export function useStepsData() {
  console.log('[HOOK] useStepsData hook called/mounted');
  const queryClient = useQueryClient();
  
  // Main steps data query - simplified and stable
  const stepsQuery = useQuery({
    queryKey: ['stepsData'],
    queryFn: fetchStepsData,
    staleTime: 1000 * 60 * 5, // Fresh for 5 minutes - stable during navigation
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false, // Disable to prevent unnecessary refetches
    refetchOnMount: false, // Don't refetch on mount - data should be stable during navigation
    refetchOnReconnect: false, // Don't refetch on reconnect - local data doesn't need network
  });

  // Smart sync query - runs on app startup and periodically
  const syncQuery = useQuery({
    queryKey: ['smartSync'],
    queryFn: fetchLatestData,
    refetchInterval: 1000 * 60 * 10, // 10 minutes between automatic syncs
    refetchIntervalInBackground: true, // Continue refetching when app is in background
    staleTime: 0, // Always consider stale so refetch interval works
    gcTime: 1000 * 60 * 15, // Keep in cache for 15 minutes
    enabled: true, // Always enabled for smart syncing
    retry: 2, // Retry failed syncs up to 2 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchOnMount: false, // Don't refetch on component mount - rely on interval and manual triggers
    refetchOnWindowFocus: false, // Don't refetch on window focus to prevent tab switch syncs
  });

  // Trigger immediate sync and data load on app startup (only once per app session)
  useEffect(() => {
    console.log('[STARTUP] useEffect running, hasTriggeredInitialSync:', hasTriggeredInitialSync);
    if (!hasTriggeredInitialSync) {
      hasTriggeredInitialSync = true;
      console.log('[STARTUP] Triggering initial data load and sync on app startup...');
      
      // First ensure main steps data is loaded
      console.log('[STARTUP] Invalidating and refetching stepsData query');
      queryClient.invalidateQueries({ queryKey: ['stepsData'] });
      queryClient.refetchQueries({ queryKey: ['stepsData'] });
      
      // Then trigger sync for fresh Health Connect data
      console.log('[STARTUP] Invalidating and refetching smartSync query');
      queryClient.invalidateQueries({ queryKey: ['smartSync'] });
      queryClient.refetchQueries({ queryKey: ['smartSync'] });
    } else {
      console.log('[STARTUP] Skipping startup sync - already triggered');
    }
  }, [queryClient]);

  // Update main steps data when sync completes successfully - simplified approach
  useEffect(() => {
    if (syncQuery.data) {
      console.log(`[SYNC] Processing sync result:`, syncQuery.data);
      
      if (syncQuery.data.success) {
        console.log(`[SYNC] Sync data structure:`, {
          success: syncQuery.data.success,
          dataSynced: syncQuery.data.dataSynced,
          errors: syncQuery.data.errors,
          lastSyncedTime: syncQuery.data.lastSyncedTime
        });
        
        // Always refresh main steps data after successful sync
        console.log(`[SYNC] Smart sync completed successfully - triggering steps data refresh`);
        
        // Use a timeout to avoid immediate re-render loops
        setTimeout(() => {
          console.log('[SYNC] Invalidating stepsData query due to successful sync');
          queryClient.invalidateQueries({ queryKey: ['stepsData'] });
        }, 100);
      } else if (syncQuery.data.healthConnectAvailable === false) {
        // Health Connect is not available - this is expected on some devices
        console.log('[SYNC] Health Connect not available on this device - sync disabled');
        // Don't treat this as an error, just continue with local data only
      } else {
        // Other sync errors
        console.log('[SYNC] Sync failed with error:', syncQuery.data.error);
      }
    }
  }, [syncQuery.data, queryClient]);

  return {
    ...stepsQuery,
    syncStatus: {
      isLoading: syncQuery.isLoading,
      isError: syncQuery.isError,
      isFetching: syncQuery.isFetching,
      lastSync: syncQuery.data?.lastSyncedTime,
      syncResult: syncQuery.data,
      error: syncQuery.error,
      dataUpdatedAt: syncQuery.dataUpdatedAt
    }
  };
}

// Additional hook for adding steps data locally
export function useAddStepsData() {
  const addStepsData = async (stepsEntry) => {
    return localDataService.addStepsData(stepsEntry);
  };

  return { addStepsData };
}