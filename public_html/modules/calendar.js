// modules/calendar.js - Enhanced with one callout per day validation - FIXED TIMEZONE ERRORS
// Complete working version - drop-in replacement

import { 
  formatDateForUser, 
  getUserTimezone, 
  getServerTimezone,
  getTimezoneAbbreviation,
  formatTimeForUser,
  convertFromServerTime,
  convertToServerTime,
  formatDateForComparison
} from './utils.js';

export class AttendanceCalendar {
  constructor() {
    this.currentMonth = new Date().getMonth();
    this.currentYear = new Date().getFullYear();
    this.container = document.getElementById("calendar");
    this.headerContainer = document.getElementById("calendarHeader");
    this.callouts = [];
    this.currentEditingCallout = null;
    this.existingCalloutToReplace = null; // NEW: Track callout to replace
    
    // TIMEZONE: Add timezone properties
    this.userTimezone = getUserTimezone();
    this.serverTimezone = getServerTimezone();
    
    // FIXED: Complete initialization chain
    this.initPromise = this.initialize();
  }

  // TIMEZONE: Helper functions using your existing utils
  convertToUserTimezone(date, fromTimezone, toTimezone) {
    // Use your existing convertFromServerTime
    return convertFromServerTime(date);
  }

  convertToServerTimezone(date, fromTimezone) {
    // Use your existing convertToServerTime  
    return convertToServerTime(date);
  }

  // TIMEZONE: Enhanced initialization with timezone setup
  async initialize() {
    console.log('[calendar] Starting timezone-aware initialization...');
    console.log(`[calendar] User timezone: ${this.userTimezone}`);
    console.log(`[calendar] Server timezone: ${this.serverTimezone}`);
    
    try {
      // FIXED: Ensure containers exist before proceeding
      if (!this.container || !this.headerContainer) {
        console.error('[calendar] Required containers not found');
        return;
      }
      
      await this.generateCalendar();
      await this.fetchCallouts();
      this.renderCallouts();
      
      // Initialize enhanced modal functionality
      this.initializeEnhancedModal();
      
      // FIXED: Initialize dropdown after calendar is ready
      import('./cdropdown.js').then(({ CDropdown }) => {
        const dropdown = new CDropdown(this);
        dropdown.render();
        dropdown.attachListeners();
        dropdown.syncWithCalendar();
        window.cdropdown = dropdown;
      }).catch(err => {
        console.log('[calendar] Dropdown not available:', err.message);
      });

      // FIXED: Ensure proper full screen layout after initialization
      this.ensureFullScreenLayout();

      // Notify admin panel to refresh table if present
      if (window.loadCalloutTable) {
        window.loadCalloutTable();
      }
      
      console.log('[calendar] Timezone-aware initialization complete');
    } catch (error) {
      console.error('[calendar] Initialization failed:', error);
    }
  }

  // NEW: Initialize enhanced modal functionality
  initializeEnhancedModal() {
    console.log('[calendar] Initializing timezone-aware modal...');
    
    // Status button handlers
    const lateBtn = document.getElementById('statusLateBtn');
    const outBtn = document.getElementById('statusOutBtn');
    const statusInput = document.getElementById('calloutStatus');
    const delayGroup = document.getElementById('delayFieldGroup');
    
    if (lateBtn && outBtn && statusInput && delayGroup) {
      lateBtn.addEventListener('click', () => {
        this.setStatus('LATE');
      });
      
      outBtn.addEventListener('click', () => {
        this.setStatus('OUT');
      });
    }
    
    // Form validation and character counter
    const reasonTextarea = document.getElementById('calloutReason');
    const charCount = document.getElementById('reasonCharCount');
    
    if (reasonTextarea && charCount) {
      reasonTextarea.addEventListener('input', () => {
        const count = reasonTextarea.value.length;
        charCount.textContent = count;
        
        const counter = charCount.parentElement;
        counter.classList.remove('warning', 'error');
        
        if (count > 100) {
          counter.classList.add('warning');
        }
        if (count >= 125) {
          counter.classList.add('error');
        }
      });
    }
    
    // FIXED: Enhanced date change handler with proper timezone conversion
    const dateInput = document.getElementById('calloutDate');
    if (dateInput) {
      dateInput.addEventListener('change', () => {
        this.checkExistingCallout(dateInput.value);
      });
    }
    
    // Form submission handler
    const form = document.getElementById('calloutForm');
    if (form) {
      form.addEventListener('submit', this.handleEnhancedCalloutSubmit.bind(this));
    }
    
    // Cancel button handler
    const cancelBtn = document.getElementById('calloutCancel');
    const closeBtn = document.getElementById('calloutModalClose');
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeEnhancedModal());
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeEnhancedModal());
    }
    
    console.log('[calendar] Timezone-aware modal initialized');
  }

  // NEW: Set status with visual feedback
  setStatus(status) {
    const lateBtn = document.getElementById('statusLateBtn');
    const outBtn = document.getElementById('statusOutBtn');
    const statusInput = document.getElementById('calloutStatus');
    const delayGroup = document.getElementById('delayFieldGroup');
    const delayInput = document.getElementById('calloutDelay');
    
    // Update button states
    lateBtn.classList.remove('active');
    outBtn.classList.remove('active');
    
    if (status === 'LATE') {
      lateBtn.classList.add('active');
      delayGroup.style.display = 'flex';
      delayGroup.style.animation = 'slideIn 0.3s ease-out';
      // Make delay required for LATE
      delayInput.setAttribute('required', 'required');
    } else {
      outBtn.classList.add('active');
      delayGroup.style.display = 'none';
      // Remove required for OUT
      delayInput.removeAttribute('required');
    }
    
    statusInput.value = status;
    console.log('[calendar] Status set to:', status);
  }

  // FIXED: Enhanced existing callout check with proper timezone conversion
  async checkExistingCallout(dateString) {
    try {
      console.log('[calendar] Checking existing callout for date:', dateString);
      
      // FIXED: Convert the input date to server timezone for comparison
      const serverDate = formatDateForComparison(dateString, this.userTimezone);
      
      console.log('[calendar] Converted date for comparison:', serverDate);
      
      const existingCallouts = this.callouts.filter(callout => {
        const calloutDate = new Date(callout.date).toISOString().split("T")[0];
        return calloutDate === serverDate;
      });
      
      const warningDiv = document.getElementById('existingCalloutWarning');
      const warningText = document.getElementById('existingCalloutText');
      
      if (existingCallouts.length > 0 && !this.currentEditingCallout) {
        const callout = existingCallouts[0];
        const statusText = callout.status === 'LATE' ? 
          `Late (${callout.delay_minutes || 0} minutes)` : 'Out';
        
        const userDateDisplay = formatDateForUser(callout.date, this.userTimezone);
        warningText.textContent = `You already have a ${statusText} callout for ${userDateDisplay}. Saving will replace the existing callout.`;
        warningDiv.style.display = 'flex';
      } else {
        warningDiv.style.display = 'none';
      }
    } catch (error) {
      console.error('[calendar] Error checking existing callout:', error);
      // Don't show warning if there's an error
      const warningDiv = document.getElementById('existingCalloutWarning');
      if (warningDiv) {
        warningDiv.style.display = 'none';
      }
    }
  }

  // NEW: Check for duplicate callouts with simple confirmation
  async checkForDuplicateCallout(calloutData, userDate) {
    const currentUser = calloutData.user.toLowerCase();
    
    // FIXED: Convert user date to server date for comparison
    const checkDate = formatDateForComparison(userDate, this.userTimezone);
    
    // Find existing callouts for this user on this date
    const existingCallouts = this.callouts.filter(callout => {
      const calloutDate = new Date(callout.date).toISOString().split("T")[0];
      const sameDate = calloutDate === checkDate;
      const sameUser = callout.user.toLowerCase() === currentUser;
      
      // If we're editing, exclude the current callout from conflict check
      const isCurrentlyEditing = this.currentEditingCallout && 
                                 callout.id === this.currentEditingCallout.id;
      
      return sameDate && sameUser && !isCurrentlyEditing;
    });
    
    if (existingCallouts.length > 0) {
      const existingCallout = existingCallouts[0];
      
      // Show simple confirmation dialog
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
        // Store the existing callout to replace
        this.existingCalloutToReplace = existingCallout;
        return true; // User confirmed replacement
      } else {
        return false; // User cancelled
      }
    }
    
    return true; // No duplicates found
  }

  // TIMEZONE: Enhanced callout modal opening with timezone awareness
  openCalloutModal(dateString, editCallout = null) {
    console.log('[calendar] Opening timezone-aware callout modal for date:', dateString);
    
    // Get current user info
    const currentUser = window.auth?.getCurrentUser();
    if (!currentUser) {
      this.showValidationError('userValidation', 'You must be logged in to add callouts.');
      return;
    }
    
    const displayName = currentUser?.global_name || currentUser?.username || 'Unknown';
    
    // Get modal elements
    const modal = document.getElementById('calloutModal');
    const title = document.getElementById('calloutModalTitle');
    
    if (!modal) {
      console.error('[calendar] Enhanced callout modal not found in HTML');
      return;
    }
    
    // Set current editing state
    this.currentEditingCallout = editCallout;
    
    // TIMEZONE: Set title with date only (no timezone abbreviation shown)
    const displayDate = formatDateForUser(dateString, this.userTimezone);
    
    if (editCallout) {
      title.textContent = `Edit Callout for ${displayDate}`;
    } else {
      title.textContent = `Add Callout for ${displayDate}`;
    }
    
    // Pre-fill form values with timezone conversion
    document.getElementById('calloutUser').value = editCallout ? editCallout.user : displayName;
    
    // TIMEZONE: Convert date for user's timezone if needed
    let formDate = dateString;
    if (editCallout) {
      // Convert server date to user timezone for editing using your function
      formDate = convertFromServerTime(editCallout.date);
    }
    document.getElementById('calloutDate').value = formDate;
    
    // Set status (triggers delay field visibility)
    const initialStatus = editCallout ? editCallout.status : 'OUT';
    this.setStatus(initialStatus);
    
    // Set delay if editing a LATE callout
    if (editCallout && editCallout.status === 'LATE') {
      document.getElementById('calloutDelay').value = editCallout.delay_minutes || '';
    } else {
      document.getElementById('calloutDelay').value = '';
    }
    
    // Set reason
    document.getElementById('calloutReason').value = editCallout ? (editCallout.reason || '') : '';
    
    // Update character counter
    const reasonTextarea = document.getElementById('calloutReason');
    const charCount = document.getElementById('reasonCharCount');
    if (charCount) {
      charCount.textContent = reasonTextarea.value.length;
    }
    
    // TIMEZONE: Check for existing callouts with timezone awareness
    this.checkExistingCallout(formDate);
    
    // Clear validation messages
    this.clearValidationMessages();
    
    // Show modal with animation
    modal.style.display = 'flex';
    
    // Focus on first input
    setTimeout(() => {
      const firstInput = modal.querySelector('.form-input-enhanced');
      if (firstInput) firstInput.focus();
    }, 100);
    
    console.log('[calendar] Timezone-aware callout modal opened successfully');
  }

  // NEW: Close enhanced modal
  closeEnhancedModal() {
    const modal = document.getElementById('calloutModal');
    if (modal) {
      modal.style.display = 'none';
      this.currentEditingCallout = null;
      this.existingCalloutToReplace = null;
      this.clearValidationMessages();
    }
  }

  // FIXED: Enhanced form submission with proper timezone conversion and duplicate prevention
  async handleEnhancedCalloutSubmit(event) {
    event.preventDefault();
    
    // Clear previous validation messages
    this.clearValidationMessages();
    
    // Get form data
    const formData = new FormData(event.target);
    const status = formData.get('status');
    
    // FIXED: Convert date from user timezone to server timezone using proper function
    const userDate = formData.get('date');
    const serverDate = formatDateForComparison(userDate, this.userTimezone);
    
    const calloutData = {
      user: formData.get('user').trim(),
      status: status,
      date: serverDate, // Send server timezone date to backend
      delay: status === 'LATE' ? parseInt(formData.get('delay')) || null : null,
      reason: formData.get('reason').trim() || null
    };
    
    // Enhanced validation with timezone awareness
    if (!this.validateEnhancedForm(calloutData, userDate)) {
      return; // Validation failed, messages already shown
    }
    
    // NEW: Check for duplicates and get user confirmation
    const canProceed = await this.checkForDuplicateCallout(calloutData, userDate);
    if (!canProceed) {
      return; // User cancelled
    }
    
    try {
      console.log('[calendar] Submitting timezone-aware callout:', calloutData);
      
      let response;
      
      // If we're replacing an existing callout, use PUT with the existing ID
      if (this.existingCalloutToReplace && !this.currentEditingCallout) {
        response = await fetch(`/api/callouts/${this.existingCalloutToReplace.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(calloutData)
        });
      }
      // If editing a specific callout, use PUT
      else if (this.currentEditingCallout) {
        response = await fetch(`/api/callouts/${this.currentEditingCallout.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(calloutData)
        });
      }
      // Otherwise create new callout
      else {
        response = await fetch('/api/callouts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(calloutData)
        });
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      
      // Close modal
      this.closeEnhancedModal();
      
      // Refresh callouts and calendar
      await this.refreshCallouts();
      
      const action = (this.currentEditingCallout || this.existingCalloutToReplace) ? 'updated' : 'added';
      console.log(`[calendar] Callout ${action} successfully with timezone conversion`);
      
      // TIMEZONE: Show simple success message
      this.showSuccessMessage(`Callout ${action} successfully!`);
      
      // Reset the replacement tracker
      this.existingCalloutToReplace = null;
      
    } catch (error) {
      console.error('[calendar] Error submitting callout:', error);
      this.showValidationError('userValidation', `Failed to save callout: ${error.message}`);
    }
  }

  // TIMEZONE: Enhanced form validation with timezone awareness
  validateEnhancedForm(calloutData, originalUserDate) {
    let isValid = true;
    
    // Validate user name
    if (!calloutData.user || calloutData.user.length === 0) {
      this.showValidationError('userValidation', 'User name is required');
      isValid = false;
    } else if (calloutData.user.length > 100) {
      this.showValidationError('userValidation', 'User name must be 100 characters or less');
      isValid = false;
    } else {
      this.showValidationSuccess('userValidation', 'Valid user name');
    }
    
    // TIMEZONE: Validate date with timezone awareness
    if (!originalUserDate) {
      this.showValidationError('dateValidation', 'Date is required');
      isValid = false;
    } else {
      // Check date in user's timezone
      const selectedDate = new Date(originalUserDate + 'T12:00:00');
      const today = new Date();
      const userToday = new Date(today.toLocaleDateString('en-CA', { timeZone: this.userTimezone }));
      
      if (selectedDate < userToday) {
        this.showValidationError('dateValidation', 'Cannot create callouts for past dates');
        isValid = false;
      } else {
        this.showValidationSuccess('dateValidation', 'Valid date');
      }
    }
    
    // Validate delay for LATE status
    if (calloutData.status === 'LATE') {
      if (!calloutData.delay || calloutData.delay <= 0) {
        this.showValidationError('delayValidation', 'Delay is required for LATE status');
        isValid = false;
      } else if (calloutData.delay > 480) {
        this.showValidationError('delayValidation', 'Delay cannot exceed 480 minutes (8 hours)');
        isValid = false;
      } else {
        this.showValidationSuccess('delayValidation', `${calloutData.delay} minutes`);
      }
    }
    
    // Validate reason length
    if (calloutData.reason && calloutData.reason.length > 125) {
      this.showValidationError('reasonValidation', 'Reason must be 125 characters or less');
      isValid = false;
    } else if (calloutData.reason) {
      this.showValidationSuccess('reasonValidation', 'Valid reason provided');
    }
    
    return isValid;
  }

  // NEW: Show validation error
  showValidationError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
      element.className = 'input-validation error';
      element.textContent = `❌ ${message}`;
    }
  }

  // NEW: Show validation success
  showValidationSuccess(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
      element.className = 'input-validation success';
      element.textContent = `✅ ${message}`;
    }
  }

  // NEW: Clear validation messages
  clearValidationMessages() {
    const validationElements = [
      'userValidation',
      'dateValidation', 
      'delayValidation',
      'reasonValidation'
    ];
    
    validationElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.className = 'input-validation';
        element.textContent = '';
      }
    });
  }

  // TIMEZONE: Simple success message
  showSuccessMessage(message) {
    const successMsg = document.createElement('div');
    successMsg.className = 'notification-banner success-banner';
    successMsg.innerHTML = `<span style="margin-right: 0.5rem;">✅</span>${message}`;
    successMsg.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(145deg, #4caf50, #388e3c);
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 12px;
      box-shadow: 0 8px 16px rgba(76, 175, 80, 0.3);
      z-index: 10000;
      font-weight: 600;
      animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(successMsg);
    setTimeout(() => {
      successMsg.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => successMsg.remove(), 300);
    }, 3000);
  }

  // FIXED: Ensure calendar takes full available height for true full screen
  ensureFullScreenLayout() {
    if (!this.container) return;
    
    // FIXED: Force proper full screen layout
    this.container.style.height = '100%';
    this.container.style.width = '100%';
    this.container.style.display = 'grid';
    this.container.style.boxSizing = 'border-box';
    
    // FIXED: Apply the correct grid class for weeks
    const weeksNeeded = this.calculateWeeksNeeded(this.currentYear, this.currentMonth);
    this.container.className = `calendar-grid weeks-${weeksNeeded}`;
    
    // FIXED: Force a reflow to ensure layout is applied
    this.container.offsetHeight;
    
    console.log(`[calendar] Full screen layout applied - ${weeksNeeded} weeks`);
  }

  // NEW: Fetch callouts from API
  async fetchCallouts() {
    try {
      console.log('[calendar] Fetching callouts from /api/callouts...');
      const response = await fetch('/api/callouts');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      this.callouts = Array.isArray(data) ? data : [];
      
      console.log(`[calendar] Fetched ${this.callouts.length} callouts:`, this.callouts);
      return this.callouts;
    } catch (error) {
      console.error('[calendar] Error fetching callouts:', error);
      this.callouts = [];
      return [];
    }
  }

  // NEW: Render callouts (alias for updateCalendarWithCallouts)
  renderCallouts() {
    console.log('[calendar] Rendering timezone-aware callouts to calendar...');
    this.updateCalendarWithCallouts();
  }

  generateCalendarHeader() {
    if (!this.headerContainer) return;

    // Clear existing header
    this.headerContainer.innerHTML = "";

    // Full day names
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    dayNames.forEach((dayName, index) => {
      const headerCell = document.createElement("div");
      headerCell.className = "calendar-header-day";
      headerCell.textContent = dayName;
      this.headerContainer.appendChild(headerCell);
    });
    
    // FIXED: Create dropdown in main header, positioned to align with Saturday column
    if (!document.getElementById('rolodexDropdownContainer')) {
      const mainHeader = document.getElementById('header');
      if (mainHeader) {
        const dropdownContainer = document.createElement('div');
        dropdownContainer.id = 'rolodexDropdownContainer';
        dropdownContainer.className = 'cdropdown-header';
        mainHeader.appendChild(dropdownContainer);
      }
    }
  }

  // Helper method to calculate if we need 6 weeks for this month
  calculateWeeksNeeded(year, month) {
    const firstDay = new Date(year, month, 1);
    const startDay = firstDay.getDay(); // 0 (Sun) - 6 (Sat)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Calculate total cells needed
    const totalDaysNeeded = startDay + daysInMonth;
    
    // If we need more than 35 cells (5 weeks * 7 days), we need 6 weeks
    return totalDaysNeeded > 35 ? 6 : 5;
  }

  // TIMEZONE: Enhanced past date check with timezone awareness
  isPastDate(year, month, day) {
    // Get today in user's timezone
    const today = new Date();
    const userToday = new Date(today.toLocaleDateString('en-US', { timeZone: this.userTimezone }));
    
    const checkDate = new Date(year, month, day);
    return checkDate < userToday;
  }

  async generateCalendar() {
    if (!this.container) return;

    // Generate the header first
    this.generateCalendarHeader();

    // Clear existing calendar
    this.container.innerHTML = "";

    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const startDay = firstDay.getDay(); // 0 (Sun) - 6 (Sat)
    const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();

    // Calculate how many weeks we need
    const weeksNeeded = this.calculateWeeksNeeded(this.currentYear, this.currentMonth);
    
    // FIXED: Update the container's CSS class to reflect the number of weeks
    this.container.className = `calendar-grid weeks-${weeksNeeded}`;
    
    // FIXED: Ensure grid takes full height immediately
    this.container.style.height = '100%';
    this.container.style.width = '100%';
    this.container.style.display = 'grid';
    
    // Log for debugging
    console.log(`[calendar] ${this.currentYear}-${this.currentMonth + 1} needs ${weeksNeeded} weeks`);

    let dateCounter = 1;
    const totalCells = weeksNeeded * 7; // Dynamic total based on weeks needed

    // TIMEZONE: Get today's date in user's timezone
    const today = new Date();
    const userToday = new Date(today.toLocaleDateString('en-US', { timeZone: this.userTimezone }));
    const todayYear = userToday.getFullYear();
    const todayMonth = userToday.getMonth();
    const todayDate = userToday.getDate();

    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement("div");
      cell.className = "calendar-day";

      if (i >= startDay && dateCounter <= daysInMonth) {
        // This is a day in the current month
        const cellDate = new Date(this.currentYear, this.currentMonth, dateCounter);
        const isoDate = cellDate.toISOString().split("T")[0];
        
        cell.setAttribute("data-date", isoDate);
        
        // TIMEZONE: Check if this is today in user's timezone
        const isToday = (this.currentYear === todayYear && 
                        this.currentMonth === todayMonth && 
                        dateCounter === todayDate);
        
        // TIMEZONE: Check if this is a past day in user's timezone
        const isPastDay = this.isPastDate(this.currentYear, this.currentMonth, dateCounter);
        
        // NEW: Updated cell structure WITH add button
        cell.innerHTML = `
          ${!isPastDay ? `<button class="add-callout-btn" data-date="${isoDate}">ADD CALLOUT</button>` : ''}
          <div class="day-number">
            <span class="callout-total-late">0</span>
            <span class="day-number-text">${dateCounter}</span>
            <span class="callout-total-out">0</span>
          </div>
          <div class="callout-split-container">
            <div class="callout-split-left"></div>
            <div class="callout-split-right"></div>
          </div>
        `;

        if (isToday) {
          cell.classList.add("current-day");
        } else if (isPastDay) {
          cell.classList.add("past-day");
        }

        // NEW: Add click handler for add button
        if (!isPastDay) {
          const addBtn = cell.querySelector('.add-callout-btn');
          if (addBtn) {
            addBtn.onclick = (e) => {
              e.stopPropagation();
              console.log('[calendar] Add button clicked for date:', isoDate);
              this.openCalloutModal(isoDate);
            };
          }
        }

        dateCounter++;
      } else {
        // This is a day from previous or next month
        cell.classList.add("adjacent-month");
        
        // Calculate what day this actually represents
        let actualDate;
        if (i < startDay) {
          // Previous month
          const prevMonth = this.currentMonth === 0 ? 11 : this.currentMonth - 1;
          const prevYear = this.currentMonth === 0 ? this.currentYear - 1 : this.currentYear;
          const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
          const dayNumber = daysInPrevMonth - (startDay - i - 1);
          actualDate = new Date(prevYear, prevMonth, dayNumber);
        } else {
          // Next month
          const nextMonth = this.currentMonth === 11 ? 0 : this.currentMonth + 1;
          const nextYear = this.currentMonth === 11 ? this.currentYear + 1 : this.currentYear;
          const dayNumber = i - startDay - daysInMonth + 1;
          actualDate = new Date(nextYear, nextMonth, dayNumber);
        }
        
        const isoDate = actualDate.toISOString().split("T")[0];
        const dayNumber = actualDate.getDate();
        
        // TIMEZONE: Check if past date in user's timezone
        const isPastAdjacentDate = actualDate < userToday;
        
        cell.setAttribute("data-date", isoDate);
        
        // NEW: Adjacent month cells WITH add button (for future dates only)
        cell.innerHTML = `
          ${!isPastAdjacentDate ? `<button class="add-callout-btn" data-date="${isoDate}">ADD CALLOUT</button>` : ''}
          <div class="day-number">
            <span class="callout-total-late">0</span>
            <span class="day-number-text">${dayNumber}</span>
            <span class="callout-total-out">0</span>
          </div>
          <div class="callout-split-container">
            <div class="callout-split-left"></div>
            <div class="callout-split-right"></div>
          </div>
        `;

        // NEW: Add click handler for adjacent month add button
        if (!isPastAdjacentDate) {
          const addBtn = cell.querySelector('.add-callout-btn');
          if (addBtn) {
            addBtn.onclick = (e) => {
              e.stopPropagation();
              console.log('[calendar] Add button clicked for adjacent date:', isoDate);
              this.openCalloutModal(isoDate);
            };
          }
        }
      }

      this.container.appendChild(cell);
    }

    // FIXED: Force full screen layout recalculation after generating calendar
    this.ensureFullScreenLayout();

    // Notify admin panel to refresh table if present
    if (window.loadCalloutTable) {
      window.loadCalloutTable();
    }
    
    // Log the final result
    console.log(`[calendar] Generated ${totalCells} cells (${weeksNeeded} weeks) for ${this.currentYear}-${this.currentMonth + 1}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ENHANCED: TIMEZONE-AWARE CALLOUT RENDERING WITH YELLOW NAMES + GREEN DELAYS
  // ═══════════════════════════════════════════════════════════════════════════════
  updateCalendarWithCallouts() {
    console.log('[calendar] Updating calendar with timezone-aware callouts and yellow names + green delays...', this.callouts);
    
    if (!this.callouts || !this.callouts.length) {
      console.log('[calendar] No callouts to display');
      return;
    }

    const dayCells = this.container.querySelectorAll(".calendar-day");
    console.log(`[calendar] Found ${dayCells.length} calendar cells`);

    dayCells.forEach(cell => {
      const date = cell.getAttribute("data-date");
      if (!date) return;

      // Find callouts for this date
      const matching = this.callouts.filter(c => {
        const calloutDate = new Date(c.date).toISOString().split("T")[0];
        return calloutDate === date;
      });

      // Get split cell elements AND day area totals
      const leftCell = cell.querySelector('.callout-split-left');
      const rightCell = cell.querySelector('.callout-split-right');
      const lateTotal = cell.querySelector('.callout-total-late');
      const outTotal = cell.querySelector('.callout-total-out');

      if (!leftCell || !rightCell || !lateTotal || !outTotal) {
        console.warn(`[calendar] Split cell or total elements not found for date: ${date}`);
        return;
      }

      // Separate by status
      const lateCallouts = matching.filter(c => c.status === 'LATE');
      const outCallouts = matching.filter(c => c.status === 'OUT');

      // Update day area totals
      lateTotal.textContent = lateCallouts.length;
      outTotal.textContent = outCallouts.length;

      // Clear existing content and classes
      leftCell.innerHTML = '';
      rightCell.innerHTML = '';
      leftCell.classList.remove('has-callouts', 'many-callouts', 'very-many-callouts', 'extremely-many-callouts');
      rightCell.classList.remove('has-callouts', 'many-callouts', 'very-many-callouts', 'extremely-many-callouts');

      // Helper function to determine responsive class based on callout count
      const getResponsiveClass = (count) => {
        if (count >= 7) return 'extremely-many-callouts';
        if (count >= 5) return 'very-many-callouts';
        if (count >= 3) return 'many-callouts';
        return '';
      };

      // TIMEZONE: Update LEFT side (LATE) with stacked names and GREEN DELAYS
      if (lateCallouts.length > 0) {
        leftCell.classList.add('has-callouts');
        
        // Add responsive class for font sizing based on callout count
        const responsiveClass = getResponsiveClass(lateCallouts.length);
        if (responsiveClass) {
          leftCell.classList.add(responsiveClass);
        }
        
        // Create name elements for each LATE callout with GREEN DELAYS
        lateCallouts.forEach((callout, index) => {
          const nameElement = document.createElement('div');
          nameElement.className = 'callout-name late';
          
          // UPDATED: Create name with delay structure - YELLOW NAME + GREEN DELAY
          const userName = callout.user;
          const delayMinutes = callout.delay_minutes;
          
          if (delayMinutes && delayMinutes > 0) {
            // Name in yellow + delay in green
            nameElement.innerHTML = `${userName} <span class="delay-text">+${delayMinutes}min</span>`;
          } else {
            // Just name in yellow if no delay specified
            nameElement.textContent = userName;
          }
          
          // Add comprehensive tooltip with timezone and delay info
          const delayText = delayMinutes ? ` (+${delayMinutes}min)` : '';
          const reasonText = callout.reason ? `\nReason: ${callout.reason}` : '';
          const dateDisplay = formatDateForUser(callout.date, this.userTimezone);
          
          nameElement.title = `LATE: ${callout.user}${delayText}\nDate: ${dateDisplay}${reasonText}\n\nClick to edit this callout`;
          
          // Add click handler to edit this specific callout
          nameElement.onclick = (e) => {
            e.stopPropagation();
            console.log(`[calendar] Editing LATE callout for ${callout.user} on ${date}`);
            this.openCalloutModal(date, callout);
          };
          
          leftCell.appendChild(nameElement);
        });
        
        console.log(`[calendar] Added ${lateCallouts.length} LATE names with green delays to ${date} (class: ${responsiveClass || 'normal'})`);
      }

      // TIMEZONE: Update RIGHT side (OUT) with stacked names (NO DELAYS)
      if (outCallouts.length > 0) {
        rightCell.classList.add('has-callouts');
        
        // Add responsive class for font sizing based on callout count
        const responsiveClass = getResponsiveClass(outCallouts.length);
        if (responsiveClass) {
          rightCell.classList.add(responsiveClass);
        }
        
        // Create name elements for each OUT callout (no delays shown)
        outCallouts.forEach((callout, index) => {
          const nameElement = document.createElement('div');
          nameElement.className = 'callout-name out';
          nameElement.textContent = callout.user; // Just the name in red
          
          // Add comprehensive tooltip with timezone and reason info
          const reasonText = callout.reason ? `\nReason: ${callout.reason}` : '';
          const dateDisplay = formatDateForUser(callout.date, this.userTimezone);
          
          nameElement.title = `OUT: ${callout.user}\nDate: ${dateDisplay}${reasonText}\n\nClick to edit this callout`;
          
          // Add click handler to edit this specific callout
          nameElement.onclick = (e) => {
            e.stopPropagation();
            console.log(`[calendar] Editing OUT callout for ${callout.user} on ${date}`);
            this.openCalloutModal(date, callout);
          };
          
          rightCell.appendChild(nameElement);
        });
        
        console.log(`[calendar] Added ${outCallouts.length} OUT names to ${date} (class: ${responsiveClass || 'normal'})`);
      }

      // Log successful update for days with callouts
      if (matching.length > 0) {
        console.log(`[calendar] Updated timezone-aware day with yellow names + green delays for ${date}: ${lateCallouts.length} late, ${outCallouts.length} out`);
      }
    });

    console.log('[calendar] Calendar updated with timezone-aware callouts, yellow names, and green delays');
  }

  // NEW: Refresh callouts (useful for manual refresh)
  async refreshCallouts() {
    console.log('[calendar] Refreshing timezone-aware callouts...');
    await this.fetchCallouts();
    this.renderCallouts();
    
    // FIXED: Reinitialize dropdown after refresh
    import('./cdropdown.js').then(({ CDropdown }) => {
      const dropdown = new CDropdown(this);
      dropdown.render();
      dropdown.attachListeners();
      dropdown.syncWithCalendar();
      window.cdropdown = dropdown;
    }).catch(err => {
      console.log('[calendar] Dropdown not available:', err.message);
    });

    // FIXED: Ensure full screen layout after refresh
    this.ensureFullScreenLayout();
  
    // Notify admin panel to refresh table if present
    if (window.loadCalloutTable) {
      window.loadCalloutTable();
    }
  }

  // FIXED: Update month/year and regenerate with proper full screen layout
  async updateMonthYear(month, year) {
    this.currentMonth = month;
    this.currentYear = year;
    await this.generateCalendar();
    this.renderCallouts();
    this.ensureFullScreenLayout();
  
    // Notify admin panel to refresh table if present
    if (window.loadCalloutTable) {
      window.loadCalloutTable();
    }
  }

  // FIXED: Resize handler for window resize events
  handleResize() {
    console.log('[calendar] Handling window resize...');
    this.ensureFullScreenLayout();
  
    // Notify admin panel to refresh table if present
    if (window.loadCalloutTable) {
      window.loadCalloutTable();
    }
  }

  // FIXED: Add resize event listener
  addEventListeners() {
    window.addEventListener('resize', () => {
      this.handleResize();
    });
    
    window.addEventListener('orientationchange', () => {
      // Give time for orientation change to complete
      setTimeout(() => {
        this.handleResize();
      }, 100);
    });
  }

  // TIMEZONE: Enhanced calendar info with timezone details
  getCalendarInfo() {
    const weeksNeeded = this.calculateWeeksNeeded(this.currentYear, this.currentMonth);
    const monthName = new Date(this.currentYear, this.currentMonth, 1).toLocaleDateString('en-US', { month: 'long' });
    
    return {
      year: this.currentYear,
      month: this.currentMonth + 1,
      monthName: monthName,
      weeksNeeded: weeksNeeded,
      totalCells: weeksNeeded * 7,
      calloutsCount: this.callouts.length,
      containerHeight: this.container ? this.container.offsetHeight : 0,
      containerWidth: this.container ? this.container.offsetWidth : 0,
      // TIMEZONE: Add timezone info
      userTimezone: this.userTimezone,
      serverTimezone: this.serverTimezone,
      timezoneOffset: new Date().getTimezoneOffset()
    };
  }
}