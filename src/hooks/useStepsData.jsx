import { useQuery } from '@tanstack/react-query';
import localDataService from '../services/localDataService';

// Local data fetcher that mimics the original API structure
const fetchStepsData = async () => {
  // Get data from local storage instead of API
  const localData = localDataService.getAllStepsData();
  
  // Return in the same format as the original API expected by components
  return localData;
};

export function useStepsData() {
  return useQuery({
    queryKey: ['stepsData'],
    queryFn: fetchStepsData,
    // Add some additional options for local data
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  });
}

// Additional hook for adding steps data locally
export function useAddStepsData() {
  const addStepsData = async (stepsEntry) => {
    return localDataService.addStepsData(stepsEntry);
  };

  return { addStepsData };
}