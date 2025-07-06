import { selectAllData, getLeaderboardWithProfiles, getWeeklyLeaderboardWithProfiles, getAllTimeLeaderboardWithProfiles } from './supabaseService';
import { getLocalDateString } from '../helpers/dateUtils';

class LeaderboardService {
  
  // Get yesterday's date in YYYY-MM-DD format (using local timezone)
  getYesterdayDate() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return getLocalDateString(yesterday);
  }

  // Get top users for yesterday's steps
  async getYesterdayLeaderboard(limit = 50) {
    try {
      const yesterdayDate = this.getYesterdayDate();
      
      const { data, error, success } = await getLeaderboardWithProfiles(yesterdayDate, limit);

      if (!success || error) {
        throw new Error(error?.message || 'Failed to fetch leaderboard data');
      }

      return {
        success: true,
        data: data || [],
        date: yesterdayDate,
        totalEntries: (data || []).length
      };
    } catch (error) {
      console.error('Error fetching yesterday leaderboard:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  // Get leaderboard for a specific date
  async getLeaderboardForDate(date, limit = 10) {
    try {
      const { data, error, success } = await getLeaderboardWithProfiles(date, limit);

      if (!success || error) {
        throw new Error(error?.message || 'Failed to fetch leaderboard data');
      }

      return {
        success: true,
        data: data || [],
        date: date,
        totalEntries: (data || []).length
      };
    } catch (error) {
      console.error('Error fetching leaderboard for date:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  // Get user's rank for yesterday
  async getUserRankYesterday(userId) {
    try {
      const yesterdayDate = this.getYesterdayDate();
      
      // Get all entries for yesterday, ordered by step count
      const { data, error } = await selectAllData('user_daily_steps', {
        columns: 'user_id, step_count',
        filters: { date: yesterdayDate },
        orderBy: { 
          column: 'step_count', 
          ascending: false 
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // Find user's rank
      const userIndex = (data || []).findIndex(entry => entry.user_id === userId);
      
      if (userIndex === -1) {
        return {
          success: false,
          message: 'User not found in yesterday\'s data',
          rank: null
        };
      }

      return {
        success: true,
        rank: userIndex + 1,
        stepCount: data[userIndex].step_count,
        totalEntries: data.length,
        date: yesterdayDate
      };
    } catch (error) {
      console.error('Error fetching user rank:', error);
      return {
        success: false,
        error: error.message,
        rank: null
      };
    }
  }

  // Get user's rank for this week
  async getUserRankWeekly(userId) {
    try {
      // Get current week's date range (Monday to Sunday)
      const now = new Date();
      const currentDay = now.getDay();
      const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
      
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      
      const startDate = getLocalDateString(monday);
      const endDate = getLocalDateString(sunday);

      // Get all weekly data and calculate ranks
      const { data, error, success } = await getWeeklyLeaderboardWithProfiles(startDate, endDate, 1000); // Get all users

      if (!success || error) {
        throw new Error(error?.message || 'Failed to fetch weekly leaderboard data');
      }

      // Find user's rank
      const userIndex = (data || []).findIndex(entry => entry.user_id === userId);
      
      if (userIndex === -1) {
        return {
          success: false,
          message: 'User not found in this week\'s data',
          rank: null
        };
      }

      return {
        success: true,
        rank: userIndex + 1,
        stepCount: data[userIndex].step_count,
        totalEntries: data.length,
        date: `${startDate} to ${endDate}`
      };
    } catch (error) {
      console.error('Error fetching user weekly rank:', error);
      return {
        success: false,
        error: error.message,
        rank: null
      };
    }
  }

  // Get user's rank for all-time
  async getUserRankAllTime(userId) {
    try {
      // Get all-time data and calculate ranks
      const { data, error, success } = await getAllTimeLeaderboardWithProfiles(1000); // Get all users

      if (!success || error) {
        throw new Error(error?.message || 'Failed to fetch all-time leaderboard data');
      }

      // Find user's rank
      const userIndex = (data || []).findIndex(entry => entry.user_id === userId);
      
      if (userIndex === -1) {
        return {
          success: false,
          message: 'User not found in all-time data',
          rank: null
        };
      }

      return {
        success: true,
        rank: userIndex + 1,
        stepCount: data[userIndex].step_count,
        totalEntries: data.length,
        date: 'All Time'
      };
    } catch (error) {
      console.error('Error fetching user all-time rank:', error);
      return {
        success: false,
        error: error.message,
        rank: null
      };
    }
  }

  // Get this week's leaderboard (sum from Monday to Sunday)
  async getWeeklyLeaderboard(limit = 100) {
    try {
      // Get current week's date range (Monday to Sunday)
      const now = new Date();
      const currentDay = now.getDay();
      const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // Handle Sunday as day 0
      
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      
      const startDate = getLocalDateString(monday);
      const endDate = getLocalDateString(sunday);

      const { data, error, success } = await getWeeklyLeaderboardWithProfiles(startDate, endDate, limit);

      if (!success || error) {
        throw new Error(error?.message || 'Failed to fetch weekly leaderboard data');
      }

      return {
        success: true,
        data: data || [],
        date: `${startDate} to ${endDate}`,
        totalEntries: (data || []).length
      };
    } catch (error) {
      console.error('Error fetching weekly leaderboard:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  // Get all-time leaderboard (sum of all steps across all dates)
  async getAllTimeLeaderboard(limit = 100) {
    try {
      const { data, error, success } = await getAllTimeLeaderboardWithProfiles(limit);

      if (!success || error) {
        throw new Error(error?.message || 'Failed to fetch all-time leaderboard data');
      }

      return {
        success: true,
        data: data || [],
        date: 'All Time',
        totalEntries: (data || []).length
      };
    } catch (error) {
      console.error('Error fetching all-time leaderboard:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  // Get leaderboard entries around a user's position (contextual ranking)
  async getLeaderboardAroundUser(userId, type = 'yesterday', contextSize = 3) {
    try {
      let allData;
      let userRankData;

      // Get all leaderboard data and user rank based on type
      switch (type) {
        case 'yesterday':
          allData = await this.getYesterdayLeaderboard(1000); // Get all users
          userRankData = await this.getUserRankYesterday(userId);
          break;
        case 'weekly':
          allData = await this.getWeeklyLeaderboard(1000);
          userRankData = await this.getUserRankWeekly(userId);
          break;
        case 'alltime':
          allData = await this.getAllTimeLeaderboard(1000);
          userRankData = await this.getUserRankAllTime(userId);
          break;
        default:
          throw new Error(`Unknown leaderboard type: ${type}`);
      }

      if (!allData.success || !userRankData.success) {
        throw new Error('Failed to fetch leaderboard or user rank data');
      }

      const userRank = userRankData.rank;
      const allEntries = allData.data;

      // Calculate the range around the user's position
      const startIndex = Math.max(0, userRank - contextSize - 1);
      const endIndex = Math.min(allEntries.length, userRank + contextSize);

      // Get the contextual entries
      const contextualEntries = allEntries.slice(startIndex, endIndex);

      return {
        success: true,
        data: contextualEntries,
        userRank: userRank,
        userSteps: userRankData.stepCount,
        totalEntries: allEntries.length,
        date: allData.date,
        startRank: startIndex + 1,
        endRank: endIndex
      };
    } catch (error) {
      console.error('Error fetching contextual leaderboard:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

}

// Create and export singleton instance
const leaderboardService = new LeaderboardService();
export default leaderboardService; 