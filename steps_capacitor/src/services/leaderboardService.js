import { selectAllData } from './supabaseService';
import { getLocalDateString } from '../helpers/dateUtils';

class LeaderboardService {
  
  // Get yesterday's date in YYYY-MM-DD format (using local timezone)
  getYesterdayDate() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return getLocalDateString(yesterday);
  }

  // Get top users for yesterday's steps
  async getYesterdayLeaderboard(limit = 5) {
    try {
      const yesterdayDate = this.getYesterdayDate();
      
      const { data, error } = await selectAllData('stepno', {
        columns: 'user_id, name, step_count, date',
        filters: { date: yesterdayDate },
        orderBy: { 
          column: 'step_count', 
          ascending: false 
        },
        limit: limit
      });

      if (error) {
        throw new Error(error.message);
      }

      // Add rank to each entry
      const leaderboard = (data || []).map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

      return {
        success: true,
        data: leaderboard,
        date: yesterdayDate,
        totalEntries: leaderboard.length
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
      const { data, error } = await selectAllData('stepno', {
        columns: 'user_id, name, step_count, date',
        filters: { date: date },
        orderBy: { 
          column: 'step_count', 
          ascending: false 
        },
        limit: limit
      });

      if (error) {
        throw new Error(error.message);
      }

      const leaderboard = (data || []).map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

      return {
        success: true,
        data: leaderboard,
        date: date,
        totalEntries: leaderboard.length
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
      const { data, error } = await selectAllData('stepno', {
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

  // Get weekly leaderboard (sum of last 7 days)
  async getWeeklyLeaderboard(limit = 10) {
    try {
      // Get dates for last 7 days (using local timezone)
      const dates = [];
      for (let i = 1; i <= 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(getLocalDateString(date));
      }

      // This would require a more complex query, for now return yesterday's data
      // In a full implementation, you'd use SQL to sum steps across multiple dates
      return await this.getYesterdayLeaderboard(limit);
    } catch (error) {
      console.error('Error fetching weekly leaderboard:', error);
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