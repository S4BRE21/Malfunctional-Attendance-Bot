// modules/calendar/CalloutManager.js - API calls and data management (150 lines)
// Handles all callout CRUD operations and data validation

import { formatDateForComparison } from '../utils.js';

export class CalloutManager {
  constructor(calendar) {
    this.calendar = calendar;
  }

  // Fetch all callouts from API
  async fetchCallouts() {
    try {
      console.log('[callout-manager] Fetching callouts from /api/callouts...');
      const response = await fetch('/api/callouts');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      this.calendar.callouts = Array.isArray(data) ? data : [];
      
      console.log(`[callout-manager] Fetched ${this.calendar.callouts.length} callouts:`, this.calendar.callouts);
      return this.calendar.callouts;
    } catch (error) {
      console.error('[callout-manager] Error fetching callouts:', error);
      this.calendar.callouts = [];
      return [];
    }
  }

  // Create new callout
  async createCallout(calloutData) {
    try {
      console.log('[callout-manager] Creating callout:', calloutData);
      
      const response = await fetch('/api/callouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calloutData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      
      const newCallout = await response.json();
      console.log('[callout-manager] Callout created successfully:', newCallout);
      
      return newCallout;
    } catch (error) {
      console.error('[callout-manager] Error creating callout:', error);
      throw error;
    }
  }

  // Update existing callout
  async updateCallout(calloutId, calloutData) {
    try {
      console.log('[callout-manager] Updating callout:', calloutId, calloutData);
      
      const response = await fetch(`/api/callouts/${calloutId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calloutData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      
      const updatedCallout = await response.json();
      console.log('[callout-manager] Callout updated successfully:', updatedCallout);
      
      return updatedCallout;
    } catch (error) {
      console.error('[callout-manager] Error updating callout:', error);
      throw error;
    }
  }

  // Delete callout
  async deleteCallout(calloutId) {
    try {
      console.log('[callout-manager] Deleting callout:', calloutId);
      
      const response = await fetch(`/api/callouts/${calloutId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      
      console.log('[callout-manager] Callout deleted successfully');
      return true;
    } catch (error) {
      console.error('[callout-manager] Error deleting callout:', error);
      throw error;
    }
  }

  // Save callout (handles both create and update)
  async saveCallout(calloutData, userDate) {
    // Check for duplicates first
    const canProceed = await this.checkForDuplicateCallout(calloutData, userDate);
    if (!canProceed) {
      return false; // User cancelled
    }

    try {
      let result;
      
      // If we're replacing an existing callout, use PUT with the existing ID
      if (this.calendar.existingCalloutToReplace && !this.calendar.currentEditingCallout) {
        result = await this.updateCallout(this.calendar.existingCalloutToReplace.id, calloutData);
      }
      // If editing a specific callout, use PUT
      else if (this.calendar.currentEditingCallout) {
        result = await this.updateCallout(this.calendar.currentEditingCallout.id, calloutData);
      }
      // Otherwise create new callout
      else {
        result = await this.createCallout(calloutData);
      }
      
      // Refresh the calendar data
      await this.fetchCallouts();
      this.calendar.renderer.renderCallouts();
      
      // Reset replacement tracker
      this.calendar.existingCalloutToReplace = null;
      
      const action = (this.calendar.currentEditingCallout || this.calendar.existingCalloutToReplace) ? 'updated' : 'added';
      console.log(`[callout-manager] Callout ${action} successfully`);
      
      return result;
    } catch (error) {
      console.error('[callout-manager] Error saving callout:', error);
      throw error;
    }
  }

  // Check for duplicate callouts with user confirmation
  async checkForDuplicateCallout(calloutData, userDate) {
    const currentUser = calloutData.user.toLowerCase();
    const checkDate = formatDateForComparison(userDate, this.calendar.userTimezone);
    
    // Find existing callouts for this user on this date
    const existingCallouts = this.calendar.callouts.filter(callout => {
      const calloutDate = new Date(callout.date).toISOString().split("T")[0];
      const sameDate = calloutDate === checkDate;
      const sameUser = callout.user.toLowerCase() === currentUser;
      
      // If we're editing, exclude the current callout from conflict check
      const isCurrentlyEditing = this.calendar.currentEditingCallout && 
                                 callout.id === this.calendar.currentEditingCallout.id;
      
      return sameDate && sameUser && !isCurrentlyEditing;
    });
    
    if (existingCallouts.length > 0) {
      const existingCallout = existingCallouts[0];
      
      // Show confirmation dialog
      const userDateDisplay = new Date(userDate).toLocaleDateString();
      const existingStatus = existingCallout.status === 'LATE' ? 
        `Late (${existingCallout.delay_minutes || 0}min)` : 'Out';
      
      const newStatus = calloutData.status === 'LATE' ?
        `Late (${calloutData.delay || 0}min)` : 'Out';
      
      const confirmed = confirm(
        `${calloutData.user} already has a callout for ${userDateDisplay}:\n\n` +
        `Current: ${existingStatus}\n` +
        `New: ${newStatus}\n\n` +
        `Only one callout per person per day is allowed.\n\n` +
        `Click OK to replace the existing callout, or Cancel to keep the current one.`
      );
      
      if (confirmed) {
        this.calendar.existingCalloutToReplace = existingCallout;
        return true;
      } else {
        return false;
      }
    }
    
    return true; // No duplicates found
  }

  // Validate callout data
  validateCalloutData(calloutData, originalUserDate) {
    const errors = [];
    
    // Validate user name
    if (!calloutData.user || calloutData.user.length === 0) {
      errors.push({ field: 'user', message: 'User name is required' });
    } else if (calloutData.user.length > 100) {
      errors.push({ field: 'user', message: 'User name must be 100 characters or less' });
    }
    
    // Validate date
    if (!originalUserDate) {
      errors.push({ field: 'date', message: 'Date is required' });
    } else {
      const selectedDate = new Date(originalUserDate + 'T12:00:00');
      const today = new Date();
      const userToday = new Date(today.toLocaleDateString('en-CA', { timeZone: this.calendar.userTimezone }));
      
      if (selectedDate < userToday) {
        errors.push({ field: 'date', message: 'Cannot create callouts for past dates' });
      }
    }
    
    // Validate delay for LATE status
    if (calloutData.status === 'LATE') {
      if (!calloutData.delay || calloutData.delay <= 0) {
        errors.push({ field: 'delay', message: 'Delay is required for LATE status' });
      } else if (calloutData.delay > 480) {
        errors.push({ field: 'delay', message: 'Delay cannot exceed 480 minutes (8 hours)' });
      }
    }
    
    // Validate reason length
    if (calloutData.reason && calloutData.reason.length > 125) {
      errors.push({ field: 'reason', message: 'Reason must be 125 characters or less' });
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // Get callouts for specific date
  getCalloutsForDate(dateString) {
    return this.calendar.callouts.filter(callout => {
      const calloutDate = new Date(callout.date).toISOString().split("T")[0];
      return calloutDate === dateString;
    });
  }

  // Get callouts for specific user
  getCalloutsForUser(userName) {
    return this.calendar.callouts.filter(callout => 
      callout.user.toLowerCase() === userName.toLowerCase()
    );
  }

  // Get callouts for date range
  getCalloutsForDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return this.calendar.callouts.filter(callout => {
      const calloutDate = new Date(callout.date);
      return calloutDate >= start && calloutDate <= end;
    });
  }

  // Get callout statistics
  getCalloutStats() {
    const total = this.calendar.callouts.length;
    const late = this.calendar.callouts.filter(c => c.status === 'LATE').length;
    const out = this.calendar.callouts.filter(c => c.status === 'OUT').length;
    
    return {
      total,
      late,
      out,
      latePercentage: total > 0 ? Math.round((late / total) * 100) : 0,
      outPercentage: total > 0 ? Math.round((out / total) * 100) : 0
    };
  }
}