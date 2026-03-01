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
function getFormattedMonth(date = null) {
  const currentDate = date || new Date();
  return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
}

/**
 * Get previous month in format "Month YYYY" (e.g., "January 2023")
 * @returns {string} Formatted previous month string
 */
function getPreviousMonthFormatted() {
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
function parseFormattedMonth(formattedMonth) {
  const [monthName, yearStr] = formattedMonth.split(' ');
  const monthIndex = MONTHS.indexOf(monthName);
  const year = parseInt(yearStr, 10);

  return {
    monthIndex,
    year
  };
}

/**
 * Format date string to DD/MM/YYYY format
 * @param {string|Date} dateString - Date to format
 * @returns {string} Formatted date string or empty string
 */
function formatDateToDDMMYYYY(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '';
  }
}

/**
 * Format an ISO date-time string to dd/MM/yyyy HH:mm:ss
 * @param {string} dateTimeString - ISO date string
 * @returns {string} Formatted date and time or original string on error
 */
function formatDateTime(dateTimeString) {
  try {
    const { DateTime } = require('luxon');
    const dt = DateTime.fromISO(dateTimeString);
    return dt.toFormat('dd/MM/yyyy HH:mm:ss');
  } catch {
    return dateTimeString;
  }
}

module.exports = {
  MONTHS,
  getFormattedMonth,
  getPreviousMonthFormatted,
  parseFormattedMonth,
  formatDateToDDMMYYYY,
  formatDateTime,
}; 