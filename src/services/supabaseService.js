import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Test the connection to Supabase
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('user_daily_steps')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('Supabase connection test failed:', error)
      return { success: false, message: error.message }
    }
    
    console.log('Supabase connection successful')
    return { success: true, message: 'Connected successfully' }
  } catch (err) {
    console.error('Supabase connection error:', err)
    return { success: false, message: err.message }
  }
}

/**
 * Generic function to select all data from a table
 * @param {string} tableName - Name of the table to query
 * @param {object} options - Query options (columns, filters, etc.)
 * @returns {Promise<{data: array|null, error: object|null}>}
 */
export const selectAllData = async (tableName, options = {}) => {
  try {
    let query = supabase.from(tableName)
    
    // Select specific columns or all
    if (options.columns) {
      query = query.select(options.columns)
    } else {
      query = query.select('*')
    }
    
    // Apply filters if provided
    if (options.filters) {
      Object.entries(options.filters).forEach(([column, value]) => {
        query = query.eq(column, value)
      })
    }
    
    // Apply ordering if provided
    if (options.orderBy) {
      query = query.order(options.orderBy.column, { 
        ascending: options.orderBy.ascending ?? true 
      })
    }
    
    // Apply limit if provided
    if (options.limit) {
      query = query.limit(options.limit)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error(`Error selecting data from ${tableName}:`, error)
      return { data: null, error }
    }
    
    return { data, error: null }
  } catch (err) {
    console.error(`Unexpected error selecting data from ${tableName}:`, err)
    return { data: null, error: err }
  }
}

/**
 * Generic function to insert new data into a table
 * @param {string} tableName - Name of the table to insert into
 * @param {object|array} data - Data to insert (single object or array of objects)
 * @param {object} options - Insert options
 * @returns {Promise<{data: array|null, error: object|null}>}
 */
export const insertData = async (tableName, data, options = {}) => {
  try {
    let query = supabase.from(tableName).insert(data)
    
    // Return inserted data if requested
    if (options.select) {
      query = query.select(options.select)
    }
    
    const { data: insertedData, error } = await query
    
    if (error) {
      console.error(`Error inserting data into ${tableName}:`, error)
      return { data: null, error }
    }
    
    console.log(`Successfully inserted data into ${tableName}`)
    return { data: insertedData, error: null }
  } catch (err) {
    console.error(`Unexpected error inserting data into ${tableName}:`, err)
    return { data: null, error: err }
  }
}

/**
 * Generic function to update data in a table
 * @param {string} tableName - Name of the table to update
 * @param {object} updates - Object containing the updates
 * @param {object} filters - Object containing the filter conditions
 * @param {object} options - Update options
 * @returns {Promise<{data: array|null, error: object|null}>}
 */
export const updateData = async (tableName, updates, filters, options = {}) => {
  try {
    let query = supabase.from(tableName).update(updates)
    
    // Apply filters
    Object.entries(filters).forEach(([column, value]) => {
      query = query.eq(column, value)
    })
    
    // Return updated data if requested
    if (options.select) {
      query = query.select(options.select)
    }
    
    const { data: updatedData, error } = await query
    
    if (error) {
      console.error(`Error updating data in ${tableName}:`, error)
      return { data: null, error }
    }
    
    console.log(`Successfully updated data in ${tableName}`)
    return { data: updatedData, error: null }
  } catch (err) {
    console.error(`Unexpected error updating data in ${tableName}:`, err)
    return { data: null, error: err }
  }
}

/**
 * Generic function to delete data from a table
 * @param {string} tableName - Name of the table to delete from
 * @param {object} filters - Object containing the filter conditions
 * @param {object} options - Delete options
 * @returns {Promise<{data: array|null, error: object|null}>}
 */
export const deleteData = async (tableName, filters, options = {}) => {
  try {
    let query = supabase.from(tableName)
    
    // Apply filters
    Object.entries(filters).forEach(([column, value]) => {
      query = query.delete().eq(column, value)
    })
    
    // Return deleted data if requested
    if (options.select) {
      query = query.select(options.select)
    }
    
    const { data: deletedData, error } = await query
    
    if (error) {
      console.error(`Error deleting data from ${tableName}:`, error)
      return { data: null, error }
    }
    
    console.log(`Successfully deleted data from ${tableName}`)
    return { data: deletedData, error: null }
  } catch (err) {
    console.error(`Unexpected error deleting data from ${tableName}:`, err)
    return { data: null, error: err }
  }
}

/**
 * Generic function to upsert (insert or update) data in a table
 * @param {string} tableName - Name of the table to upsert into
 * @param {object|array} data - Data to upsert (single object or array of objects)
 * @param {object} options - Upsert options
 * @returns {Promise<{data: array|null, error: object|null}>}
 */
export const upsertData = async (tableName, data, options = {}) => {
  try {
    let query = supabase.from(tableName).upsert(data, {
      onConflict: options.onConflict || undefined,
      ignoreDuplicates: options.ignoreDuplicates || false
    })
    
    // Return upserted data if requested
    if (options.select) {
      query = query.select(options.select)
    }
    
    const { data: upsertedData, error } = await query
    
    if (error) {
      console.error(`Error upserting data into ${tableName}:`, error)
      return { data: null, error }
    }
    
    console.log(`Successfully upserted data into ${tableName}`)
    return { data: upsertedData, error: null }
  } catch (err) {
    console.error(`Unexpected error upserting data into ${tableName}:`, err)
    return { data: null, error: err }
  }
}

/**
 * Function to get a single record by ID
 * @param {string} tableName - Name of the table to query
 * @param {string|number} id - ID of the record
 * @param {string} idColumn - Name of the ID column (defaults to 'id')
 * @param {string} columns - Columns to select (defaults to '*')
 * @returns {Promise<{data: object|null, error: object|null}>}
 */
export const getById = async (tableName, id, idColumn = 'id', columns = '*') => {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select(columns)
      .eq(idColumn, id)
      .single()
    
    if (error) {
      console.error(`Error getting record by ID from ${tableName}:`, error)
      return { data: null, error }
    }
    
    return { data, error: null }
  } catch (err) {
    console.error(`Unexpected error getting record by ID from ${tableName}:`, err)
    return { data: null, error: err }
  }
}

/**
 * Upsert user profile data into the user_profiles table
 * @param {object} profileData - User profile data to upsert
 * @returns {Promise<{data: object|null, error: object|null, success: boolean}>}
 */
export const upsertUserProfile = async (profileData) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(profileData, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error upserting user profile:', error);
      return { data: null, error, success: false };
    }

    console.log('Successfully upserted user profile:', data);
    return { data, error: null, success: true };
  } catch (err) {
    console.error('Unexpected error upserting user profile:', err);
    return { data: null, error: err, success: false };
  }
};

/**
 * Get leaderboard data with user profiles (joins user_daily_steps with user_profiles)
 * @param {string} date - Date to filter by (YYYY-MM-DD format)
 * @param {number} limit - Maximum number of entries to return
 * @returns {Promise<{data: array|null, error: object|null, success: boolean}>}
 */
export const getLeaderboardWithProfiles = async (date, limit = 10) => {
  try {
    const { data, error } = await supabase
      .from('user_daily_steps')
      .select(`
        user_id,
        username,
        step_count,
        date,
        user_profiles (
          username,
          selected_badge,
          created_at,
          updated_at
        )
      `)
      .eq('date', date)
      .order('step_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching leaderboard with profiles:', error);
      return { data: null, error, success: false };
    }

    // Transform the data to include profile information at the top level
    const transformedData = (data || []).map((entry, index) => ({
      ...entry,
      rank: index + 1,
      profile: entry.user_profiles || null
    }));

    console.log('Successfully fetched leaderboard with profiles:', transformedData);
    return { data: transformedData, error: null, success: true };
  } catch (err) {
    console.error('Unexpected error fetching leaderboard with profiles:', err);
    return { data: null, error: err, success: false };
  }
};

/**
 * Get weekly leaderboard data with user profiles (aggregated from Monday to Sunday)
 * @param {string} startDate - Start date (Monday) in YYYY-MM-DD format
 * @param {string} endDate - End date (Sunday) in YYYY-MM-DD format
 * @param {number} limit - Maximum number of entries to return
 * @returns {Promise<{data: array|null, error: object|null, success: boolean}>}
 */
export const getWeeklyLeaderboardWithProfiles = async (startDate, endDate, limit = 10) => {
  try {
    // First get all step data within the date range
    const { data: stepData, error: stepError } = await supabase
      .from('user_daily_steps')
      .select('user_id, username, step_count, date')
      .gte('date', startDate)
      .lte('date', endDate);

    if (stepError) {
      console.error('Error fetching weekly step data:', stepError);
      return { data: null, error: stepError, success: false };
    }

    // Group by user and sum steps
    const weeklyData = {};
    (stepData || []).forEach(entry => {
      if (!weeklyData[entry.user_id]) {
        weeklyData[entry.user_id] = {
          user_id: entry.user_id,
          username: entry.username,
          step_count: 0
        };
      }
      weeklyData[entry.user_id].step_count += entry.step_count;
    });

    // Get user IDs for profile lookup
    const userIds = Object.keys(weeklyData);
    
    if (userIds.length === 0) {
      return { data: [], error: null, success: true };
    }

    // Fetch user profiles
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, username, selected_badge, created_at, updated_at')
      .in('user_id', userIds);

    if (profileError) {
      console.error('Error fetching user profiles:', profileError);
      // Continue without profiles rather than failing completely
    }

    // Create profile lookup map
    const profileMap = {};
    (profiles || []).forEach(profile => {
      profileMap[profile.user_id] = profile;
    });

    // Combine step data with profiles and sort
    const combinedData = Object.values(weeklyData)
      .map(entry => ({
        ...entry,
        user_profiles: profileMap[entry.user_id] || null
      }))
      .sort((a, b) => b.step_count - a.step_count)
      .slice(0, limit)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
        profile: entry.user_profiles || null
      }));

    console.log('Successfully fetched weekly leaderboard with profiles:', combinedData);
    return { data: combinedData, error: null, success: true };
  } catch (err) {
    console.error('Unexpected error fetching weekly leaderboard with profiles:', err);
    return { data: null, error: err, success: false };
  }
};

/**
 * Get all-time leaderboard data with user profiles (aggregated across all dates)
 * @param {number} limit - Maximum number of entries to return
 * @returns {Promise<{data: array|null, error: object|null, success: boolean}>}
 */
export const getAllTimeLeaderboardWithProfiles = async (limit = 10) => {
  try {
    // First get all step data
    const { data: stepData, error: stepError } = await supabase
      .from('user_daily_steps')
      .select('user_id, username, step_count');

    if (stepError) {
      console.error('Error fetching all-time step data:', stepError);
      return { data: null, error: stepError, success: false };
    }

    // Group by user and sum steps
    const allTimeData = {};
    (stepData || []).forEach(entry => {
      if (!allTimeData[entry.user_id]) {
        allTimeData[entry.user_id] = {
          user_id: entry.user_id,
          username: entry.username,
          step_count: 0
        };
      }
      allTimeData[entry.user_id].step_count += entry.step_count;
    });

    // Get user IDs for profile lookup
    const userIds = Object.keys(allTimeData);
    
    if (userIds.length === 0) {
      return { data: [], error: null, success: true };
    }

    // Fetch user profiles
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, username, selected_badge, created_at, updated_at')
      .in('user_id', userIds);

    if (profileError) {
      console.error('Error fetching user profiles:', profileError);
      // Continue without profiles rather than failing completely
    }

    // Create profile lookup map
    const profileMap = {};
    (profiles || []).forEach(profile => {
      profileMap[profile.user_id] = profile;
    });

    // Combine step data with profiles and sort
    let combinedData = Object.values(allTimeData)
      .map(entry => ({
        ...entry,
        user_profiles: profileMap[entry.user_id] || null
      }))
      .sort((a, b) => b.step_count - a.step_count);

    // Only apply limit if it's specified and greater than 0
    if (limit && limit > 0) {
      combinedData = combinedData.slice(0, limit);
    }

    // Add rank information
    combinedData = combinedData.map((entry, index) => ({
      ...entry,
      rank: index + 1,
      profile: entry.user_profiles || null
    }));

    console.log('Successfully fetched all-time leaderboard with profiles:', combinedData);
    return { data: combinedData, error: null, success: true };
  } catch (err) {
    console.error('Unexpected error fetching all-time leaderboard with profiles:', err);
    return { data: null, error: err, success: false };
  }
};

// Export the Supabase client for direct use if needed
export default supabase 