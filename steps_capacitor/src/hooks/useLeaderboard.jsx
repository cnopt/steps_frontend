import { useQuery } from '@tanstack/react-query';
import leaderboardService from '../services/leaderboardService';
import userService from '../services/userService';

export function useLeaderboard(type = 'yesterday', options = {}) {
  const { limit = 5, enabled = true } = options;

  const leaderboardQuery = useQuery({
    queryKey: ['leaderboard', type, limit],
    queryFn: async () => {
      switch (type) {
        case 'yesterday':
          return await leaderboardService.getYesterdayLeaderboard(limit);
        case 'weekly':
          return await leaderboardService.getWeeklyLeaderboard(limit);
        default:
          throw new Error(`Unknown leaderboard type: ${type}`);
      }
    },
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    enabled: enabled,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    ...leaderboardQuery,
    leaderboard: leaderboardQuery.data?.data || [],
    isSuccess: leaderboardQuery.data?.success || false,
    date: leaderboardQuery.data?.date,
    totalEntries: leaderboardQuery.data?.totalEntries || 0
  };
}

export function useUserRank(type = 'yesterday', options = {}) {
  const { enabled = true } = options;
  const userId = userService.getUserId();

  const rankQuery = useQuery({
    queryKey: ['userRank', type, userId],
    queryFn: async () => {
      if (!userId) {
        return { success: false, message: 'No user ID found' };
      }

      switch (type) {
        case 'yesterday':
          return await leaderboardService.getUserRankYesterday(userId);
        default:
          throw new Error(`Unknown rank type: ${type}`);
      }
    },
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    enabled: enabled && !!userId,
    retry: 2,
  });

  return {
    ...rankQuery,
    rank: rankQuery.data?.rank,
    stepCount: rankQuery.data?.stepCount,
    totalEntries: rankQuery.data?.totalEntries,
    isSuccess: rankQuery.data?.success || false
  };
} 