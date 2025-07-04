/**
 * Date utilities for consistent local date handling
 * Avoids timezone conversion issues by working with local dates directly
 */

/**
 * Get today's date in local timezone as YYYY-MM-DD format
 * @returns {string} Date string in YYYY-MM-DD format (local timezone)
 */
export const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get today's local date string
 * @returns {string} Today's date in YYYY-MM-DD format (local timezone)
 */
export const getTodayLocalDateString = () => {
  return getLocalDateString(new Date());
};

/**
 * Check if a date string matches today's local date
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {boolean} True if the date matches today
 */
export const isToday = (dateString) => {
  return dateString === getTodayLocalDateString();
};

/**
 * Convert a Date object to local date string
 * @param {Date} date - Date object
 * @returns {string} Date string in YYYY-MM-DD format (local timezone)
 */
export const dateToLocalString = (date) => {
  return getLocalDateString(date);
}; 