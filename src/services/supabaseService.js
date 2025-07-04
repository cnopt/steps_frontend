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
      .from('stepno')
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

// Export the Supabase client for direct use if needed
export default supabase 