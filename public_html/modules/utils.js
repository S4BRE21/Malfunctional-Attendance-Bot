// Module: utils.js - WORLDWIDE TIMEZONE VERSION COMPLETE
// Version: 2.0
// Updated: 2025-06-17
// Notes: Comprehensive utility functions with worldwide timezone support

// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED TIMEZONE MANAGEMENT - WORLDWIDE SUPPORT
// ═══════════════════════════════════════════════════════════════════════════════

// Server timezone (EST) - the authoritative timezone for the application
export function getServerTimezone() {
  return 'America/New_York'; // EST/EDT timezone
}

// Get user's local timezone
export function getUserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('[utils] Could not detect user timezone, falling back to server timezone');
    return getServerTimezone();
  }
}

// Get all supported timezones
export function getSupportedTimezones() {
  return [
    // North America
    'America/New_York',    // EST/EDT
    'America/Chicago',     // CST/CDT
    'America/Denver',      // MST/MDT
    'America/Los_Angeles', // PST/PDT
    'America/Toronto',     // EST/EDT
    'America/Vancouver',   // PST/PDT
    
    // Europe
    'Europe/London',       // GMT/BST
    'Europe/Paris',        // CET/CEST
    'Europe/Berlin',       // CET/CEST
    'Europe/Rome',         // CET/CEST
    'Europe/Madrid',       // CET/CEST
    'Europe/Amsterdam',    // CET/CEST
    'Europe/Stockholm',    // CET/CEST
    'Europe/Moscow',       // MSK
    
    // Asia Pacific
    'Asia/Tokyo',          // JST
    'Asia/Shanghai',       // CST
    'Asia/Hong_Kong',      // HKT
    'Asia/Singapore',      // SGT
    'Asia/Kolkata',        // IST
    'Asia/Dubai',          // GST
    'Australia/Sydney',    // AEST/AEDT
    'Australia/Melbourne', // AEST/AEDT
    'Australia/Perth',     // AWST
    
    // Other regions
    'Pacific/Auckland',    // NZST/NZDT
    'Africa/Cairo',        // EET
    'America/Sao_Paulo',   // BRT
    'America/Mexico_City'  // CST/CDT
  ];
}

// Convert date/time from user timezone to server timezone (EST)
export function convertToServerTime(date, userTimezone = null) {
  try {
    const sourceTimezone = userTimezone || getUserTimezone();
    const serverTimezone = getServerTimezone();
    
    // If already in server timezone, return as-is
    if (sourceTimezone === serverTimezone) {
      return new Date(date);
    }
    
    // Parse the date in the user's timezone
    let sourceDate;
    if (typeof date === 'string') {
      // Handle date strings - assume they are in user's local context
      sourceDate = new Date(date + 'T12:00:00'); // Use noon to avoid DST issues
    } else {
      sourceDate = new Date(date);
    }
    
    // Get timezone offset difference
    const sourceOffset = getTimezoneOffset(sourceTimezone, sourceDate);
    const serverOffset = getTimezoneOffset(serverTimezone, sourceDate);
    const offsetDiff = sourceOffset - serverOffset;
    
    // Apply offset difference
    const serverTime = new Date(sourceDate.getTime() + (offsetDiff * 60000));
    
    console.log(`[utils] Converted ${sourceDate.toISOString()} from ${sourceTimezone} to ${serverTime.toISOString()} in ${serverTimezone}`);
    
    return serverTime;
    
  } catch (error) {
    console.error('[utils] Error converting to server time:', error);
    return new Date(date); // Fallback to original date
  }
}

// Convert date/time from server timezone (EST) to user timezone
export function convertFromServerTime(date, targetTimezone = null) {
  try {
    const userTimezone = targetTimezone || getUserTimezone();
    const serverTimezone = getServerTimezone();
    
    // If target is server timezone, return as-is
    if (userTimezone === serverTimezone) {
      return new Date(date);
    }
    
    const serverDate = new Date(date);
    
    // Get timezone offset difference
    const serverOffset = getTimezoneOffset(serverTimezone, serverDate);
    const userOffset = getTimezoneOffset(userTimezone, serverDate);
    const offsetDiff = serverOffset - userOffset;
    
    // Apply offset difference
    const userTime = new Date(serverDate.getTime() - (offsetDiff * 60000));
    
    return userTime;
    
  } catch (error) {
    console.error('[utils] Error converting from server time:', error);
    return new Date(date); // Fallback to original date
  }
}

// Get timezone offset in minutes for a specific timezone and date
function getTimezoneOffset(timezone, date) {
  try {
    // Create a date formatter for the timezone
    const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
    const localDate = new Date(utcDate.toLocaleString('en-US', { timeZone: timezone }));
    return (utcDate.getTime() - localDate.getTime()) / 60000;
  } catch (error) {
    console.warn(`[utils] Could not get offset for timezone ${timezone}:`, error);
    return 0;
  }
}

// Get current timestamp in server timezone (EST)
export function getCurrentServerTimestamp() {
  const now = new Date();
  return convertToServerTime(now).toLocaleString('en-US', {
    timeZone: getServerTimezone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

// Get current timestamp in user's local timezone
export function getCurrentUserTimestamp() {
  return new Date().toLocaleString('en-US', {
    timeZone: getUserTimezone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED DATE FORMATTING AND VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

// Format date for comparison (YYYY-MM-DD) in server timezone
export function formatDateForComparison(date, timezone = null) {
  if (!date) return null;
  
  try {
    let dateObj;
    if (typeof date === 'string') {
      if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return date; // Already in correct format
      }
      dateObj = new Date(date);
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      console.warn('[utils] Invalid date format:', date);
      return null;
    }
    
    if (isNaN(dateObj.getTime())) {
      console.warn('[utils] Invalid date:', date);
      return null;
    }
    
    // Convert to server timezone if needed
    const serverDate = timezone ? convertToServerTime(dateObj, timezone) : dateObj;
    
    const year = serverDate.getFullYear();
    const month = String(serverDate.getMonth() + 1).padStart(2, '0');
    const day = String(serverDate.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.warn('[utils] Error formatting date:', error);
    return null;
  }
}

// Format time for display in user's timezone
export function formatTimeForUser(timestamp, targetTimezone = null) {
  if (!timestamp) return 'Unknown';
  
  try {
    const userTimezone = targetTimezone || getUserTimezone();
    const date = new Date(timestamp);
    
    if (isNaN(date.getTime())) {
      return 'Invalid time';
    }
    
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: userTimezone,
      hour12: true
    });
  } catch (error) {
    console.warn('[utils] Error formatting time:', error);
    return 'Unknown';
  }
}

// Format date for display in user's timezone with timezone info
export function formatDateForUser(date, targetTimezone = null) {
  if (!date) return 'Unknown';
  
  try {
    const userTimezone = targetTimezone || getUserTimezone();
    let dateObj;
    
    if (typeof date === 'string') {
      dateObj = new Date(date + 'T00:00:00');
    } else {
      dateObj = new Date(date);
    }
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }
    
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: userTimezone
    });
    
    // Add timezone abbreviation if different from server
    if (userTimezone !== getServerTimezone()) {
      const tzAbbr = getTimezoneAbbreviation(userTimezone);
      return `${formattedDate} (${tzAbbr})`;
    }
    
    return formattedDate;
  } catch (error) {
    console.warn('[utils] Error formatting date:', error);
    return 'Unknown';
  }
}

// Get timezone abbreviation
export function getTimezoneAbbreviation(timezone) {
  try {
    const date = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short'
    });
    
    const parts = formatter.formatToParts(date);
    const timeZonePart = parts.find(part => part.type === 'timeZoneName');
    
    return timeZonePart ? timeZonePart.value : timezone;
  } catch (error) {
    return timezone;
  }
}

// Get current date in YYYY-MM-DD format (server timezone)
export function getCurrentServerDate() {
  const now = new Date();
  const serverDate = convertToServerTime(now);
  
  const year = serverDate.getFullYear();
  const month = String(serverDate.getMonth() + 1).padStart(2, '0');
  const day = String(serverDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// Get current date in user's timezone
export function getCurrentUserDate() {
  const now = new Date();
  const userTimezone = getUserTimezone();
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// Check if date is today (server timezone)
export function isToday(date) {
  const today = getCurrentServerDate();
  const checkDate = formatDateForComparison(date);
  return today === checkDate;
}

// Check if date is in the past (server timezone)
export function isPastDate(date) {
  const today = getCurrentServerDate();
  const checkDate = formatDateForComparison(date);
  return checkDate < today;
}

// Convert user's "today" to server date
export function convertUserTodayToServerDate(userTimezone = null) {
  const timezone = userTimezone || getUserTimezone();
  const now = new Date();
  
  // Get today's date in user's timezone
  const userToday = new Date(now.toLocaleDateString('en-CA', { timeZone: timezone }));
  
  // Convert to server timezone
  return formatDateForComparison(convertToServerTime(userToday, timezone));
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED VALIDATION WITH TIMEZONE SUPPORT
// ═══════════════════════════════════════════════════════════════════════════════

// Validate callout data with timezone conversion
export function validateCalloutData(callout, userTimezone = null) {
  const errors = [];
  const timezone = userTimezone || getUserTimezone();
  
  // Check required fields
  if (!callout.user || callout.user.trim().length === 0) {
    errors.push('User name is required');
  }
  
  if (!callout.status || !['LATE', 'OUT'].includes(callout.status.toUpperCase())) {
    errors.push('Valid status (LATE or OUT) is required');
  }
  
  if (!callout.date || !isValidDate(callout.date)) {
    errors.push('Valid date is required');
  } else {
    // Check if date is in the past (accounting for timezone)
    const serverDate = formatDateForComparison(callout.date, timezone);
    const todayServer = getCurrentServerDate();
    
    if (serverDate < todayServer) {
      errors.push('Cannot create callouts for past dates');
    }
  }
  
  // Validate user name length
  if (callout.user && callout.user.length > 100) {
    errors.push('User name must be 100 characters or less');
  }
  
  // Validate reason length
  if (callout.reason && callout.reason.length > 500) {
    errors.push('Reason must be 500 characters or less');
  }
  
  // Validate delay for LATE status
  if (callout.status === 'LATE' && callout.delay) {
    const delay = parseInt(callout.delay);
    if (isNaN(delay) || delay < 0 || delay > 480) {
      errors.push('Delay must be a number between 0 and 480 minutes');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors,
    convertedDate: callout.date ? formatDateForComparison(callout.date, timezone) : null
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIMEZONE UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// Get timezone display name
export function getTimezoneDisplayName(timezone) {
  try {
    const date = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'long'
    });
    
    const parts = formatter.formatToParts(date);
    const timeZonePart = parts.find(part => part.type === 'timeZoneName');
    
    return timeZonePart ? timeZonePart.value : timezone;
  } catch (error) {
    return timezone;
  }
}

// Get offset display (e.g., "UTC-5", "UTC+9")
export function getTimezoneOffsetDisplay(timezone) {
  try {
    const date = new Date();
    const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
    const localDate = new Date(utcDate.toLocaleString('en-US', { timeZone: timezone }));
    const offsetMinutes = (utcDate.getTime() - localDate.getTime()) / 60000;
    const offsetHours = offsetMinutes / 60;
    
    if (offsetHours === 0) return 'UTC±0';
    const sign = offsetHours > 0 ? '+' : '';
    return `UTC${sign}${offsetHours}`;
  } catch (error) {
    return 'UTC±0';
  }
}

// Check if timezone observes DST
export function observesDST(timezone) {
  try {
    const january = new Date(2024, 0, 1);
    const july = new Date(2024, 6, 1);
    
    const janOffset = getTimezoneOffset(timezone, january);
    const julOffset = getTimezoneOffset(timezone, july);
    
    return janOffset !== julOffset;
  } catch (error) {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// REMAINING UTILITY FUNCTIONS (unchanged from original)
// ═══════════════════════════════════════════════════════════════════════════════

// Input validation and sanitization
export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '')
    .replace(/['"]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

// Check if date string is valid (YYYY-MM-DD format)
export function isValidDate(dateString) {
  if (!dateString || typeof dateString !== 'string') return false;
  if (!dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return false;
  const date = new Date(dateString + 'T00:00:00');
  return !isNaN(date.getTime());
}

// ID generation
export function generateId(prefix = 'id') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}_${timestamp}_${random}`;
}

// Deep clone object
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
}

// String utilities
export function capitalize(str) {
  if (typeof str !== 'string' || str.length === 0) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function truncate(str, maxLength = 50, suffix = '...') {
  if (typeof str !== 'string') return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - suffix.length) + suffix;
}

// Async utilities
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED EXPORT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const timezoneUtils = {
  getServerTimezone,
  getUserTimezone,
  getSupportedTimezones,
  convertToServerTime,
  convertFromServerTime,
  getCurrentServerTimestamp,
  getCurrentUserTimestamp,
  getCurrentServerDate,
  getCurrentUserDate,
  convertUserTodayToServerDate,
  getTimezoneDisplayName,
  getTimezoneOffsetDisplay,
  getTimezoneAbbreviation,
  observesDST
};

export const dateUtils = {
  formatDateForComparison,
  formatTimeForUser,
  formatDateForUser,
  isToday,
  isPastDate,
  isValidDate,
  ...timezoneUtils
};

export const validationUtils = {
  validateCalloutData,
  sanitizeInput,
  isValidDate
};

// Module configuration
export const utilsConfig = {
  version: '2.0',
  serverTimezone: getServerTimezone(),
  userTimezone: getUserTimezone(),
  supportedTimezones: getSupportedTimezones(),
  defaultLocale: 'en-US'
};

// Default export
export default {
  ...timezoneUtils,
  ...dateUtils,
  ...validationUtils,
  generateId,
  deepClone,
  capitalize,
  truncate,
  debounce,
  sleep,
  config: utilsConfig
};