// modules/calendar/TimezoneHelper.js - Timezone utilities (80 lines)
// Handles all timezone conversions and formatting

import { 
  convertFromServerTime, 
  convertToServerTime,
  formatDateForUser,
  formatDateForComparison
} from '../utils.js';

export class TimezoneHelper {
  constructor(calendar) {
    this.calendar = calendar;
    this.userTimezone = calendar.userTimezone;
    this.serverTimezone = calendar.serverTimezone;
  }

  // Convert date from server timezone to user timezone
  convertToUserTimezone(date, fromTimezone = null, toTimezone = null) {
    // Use your existing convertFromServerTime function
    return convertFromServerTime(date);
  }

  // Convert date from user timezone to server timezone
  convertToServerTimezone(date, fromTimezone = null) {
    // Use your existing convertToServerTime function
    return convertToServerTime(date);
  }

  // Format date for user display
  formatDateForUser(date) {
    return formatDateForUser(date, this.userTimezone);
  }

  // Format date for server comparison
  formatDateForComparison(dateString) {
    return formatDateForComparison(dateString, this.userTimezone);
  }

  // Get timezone information
  getTimezoneInfo() {
    return {
      userTimezone: this.userTimezone,
      serverTimezone: this.serverTimezone,
      userOffset: new Date().getTimezoneOffset(),
      isDST: this.isDaylightSavingTime()
    };
  }

  // Check if currently in daylight saving time
  isDaylightSavingTime() {
    const today = new Date();
    const january = new Date(today.getFullYear(), 0, 1);
    const july = new Date(today.getFullYear(), 6, 1);
    
    return Math.max(january.getTimezoneOffset(), july.getTimezoneOffset()) !== today.getTimezoneOffset();
  }

  // Convert callout data for API submission
  prepareCalloutForServer(calloutData, userDate) {
    return {
      ...calloutData,
      date: this.formatDateForComparison(userDate)
    };
  }

  // Convert callout data from server for display
  prepareCalloutForDisplay(callout) {
    return {
      ...callout,
      displayDate: this.formatDateForUser(callout.date),
      userDate: this.convertToUserTimezone(callout.date)
    };
  }

  // Get current date in user timezone
  getCurrentUserDate() {
    const now = new Date();
    return new Date(now.toLocaleDateString('en-US', { timeZone: this.userTimezone }));
  }

  // Get current date in server timezone
  getCurrentServerDate() {
    const now = new Date();
    return new Date(now.toLocaleDateString('en-US', { timeZone: this.serverTimezone }));
  }

  // Check if date is today in user timezone
  isToday(date) {
    const today = this.getCurrentUserDate();
    const checkDate = new Date(date);
    
    return checkDate.getFullYear() === today.getFullYear() &&
           checkDate.getMonth() === today.getMonth() &&
           checkDate.getDate() === today.getDate();
  }

  // Check if date is in the past in user timezone
  isPastDate(date) {
    const today = this.getCurrentUserDate();
    const checkDate = new Date(date);
    return checkDate < today;
  }

  // Check if date is in the future in user timezone
  isFutureDate(date) {
    const today = this.getCurrentUserDate();
    const checkDate = new Date(date);
    return checkDate > today;
  }
}