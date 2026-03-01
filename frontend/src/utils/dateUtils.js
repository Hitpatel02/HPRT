import { format } from 'date-fns';

/**
 * Format a date string from YYYY-MM-DD to DD/MM/YYYY
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {string} - Formatted date string in DD/MM/YYYY format
 */
export const formatDateForDisplay = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy');
  } catch (error) {
    return dateString;
  }
};

/**
 * Get today's date in YYYY-MM-DD format using local timezone
 * @returns {string} - Today's date in YYYY-MM-DD format
 */
export const getTodayDate = () => {
  // Create a new Date object with the current time
  const today = new Date();
  
  // Get local date values - this ensures we use the client's timezone
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  // Format as YYYY-MM-DD
  return `${year}-${month}-${day}`;
};

/**
 * Format a date object to DD/MM/YYYY format
 * @param {Date} date - Date object
 * @returns {string} - Formatted date string in DD/MM/YYYY format
 */
export const formatDate = (date) => {
  if (!date) return '';
  try {
    return format(date, 'dd/MM/yyyy');
  } catch (error) {
    return '';
  }
}; 


/**
 * Date utility functions
 */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Get current month in format "Month YYYY" (e.g., "January 2023")
 * @param {Date} date - Optional date object (defaults to current date)
 * @returns {string} Formatted month string
 */
export const getFormattedMonth = (date = null) => {
  const currentDate = date || new Date();
  return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
}

/**
 * Get previous month in format "Month YYYY" (e.g., "January 2023")
 * @returns {string} Formatted previous month string
 */
export const getPreviousMonthFormatted = () => {
  const currentDate = new Date();
  // Go back one month
  currentDate.setMonth(currentDate.getMonth() - 1);
  return getFormattedMonth(currentDate);
}

/**
 * Parse a formatted month string into month index and year
 * @param {string} formattedMonth - Month in format "Month YYYY" (e.g., "January 2023")
 * @returns {Object} Object with month index and year
 */
export const parseFormattedMonth = (formattedMonth) => {
  const [monthName, yearStr] = formattedMonth.split(' ');
  const monthIndex = MONTHS.indexOf(monthName);
  const year = parseInt(yearStr, 10);
  
  return {
    monthIndex,
    year
  };
}