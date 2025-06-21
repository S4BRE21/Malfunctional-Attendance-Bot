// modules/calendar/CalloutModal.js - Form handling and validation (140 lines)
// Handles all modal UI interactions and form management

import { 
  formatDateForUser, 
  formatDateForComparison, 
  convertFromServerTime 
} from '../utils.js';

export class CalloutModal {
  constructor(calendar) {
    this.calendar = calendar;
  }

  // Initialize modal event handlers
  initialize() {
    console.log('[modal] Initializing modal handlers...');
    
    // Status button handlers
    const lateBtn = document.getElementById('statusLateBtn');
    const outBtn = document.getElementById('statusOutBtn');
    
    if (lateBtn && outBtn) {
      lateBtn.addEventListener('click', () => this.setStatus('LATE'));
      outBtn.addEventListener('click', () => this.setStatus('OUT'));
    }
    
    // Form validation and character counter
    const reasonTextarea = document.getElementById('calloutReason');
    const charCount = document.getElementById('reasonCharCount');
    
    if (reasonTextarea && charCount) {
      reasonTextarea.addEventListener('input', () => this.updateCharacterCount());
    }
    
    // Date change handler
    const dateInput = document.getElementById('calloutDate');
    if (dateInput) {
      dateInput.addEventListener('change', () => {
        this.checkExistingCallout(dateInput.value);
      });
    }
    
    // Form submission handler
    const form = document.getElementById('calloutForm');
    if (form) {
      form.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }
    
    // Cancel and close button handlers
    const cancelBtn = document.getElementById('calloutCancel');
    const closeBtn = document.getElementById('calloutModalClose');
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeModal());
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal());
    }
    
    console.log('[modal] Modal handlers initialized');
  }

  // Open callout modal
  openModal(dateString, editCallout = null) {
    console.log('[modal] Opening callout modal for date:', dateString);
    
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
      console.error('[modal] Callout modal not found in HTML');
      return;
    }
    
    // Set current editing state
    this.calendar.currentEditingCallout = editCallout;
    
    // Set title with formatted date
    const displayDate = formatDateForUser(dateString, this.calendar.userTimezone);
    
    if (editCallout) {
      title.textContent = `Edit Callout for ${displayDate}`;
    } else {
      title.textContent = `Add Callout for ${displayDate}`;
    }
    
    // Pre-fill form values
    this.populateForm(editCallout, displayName, dateString);
    
    // Check for existing callouts
    this.checkExistingCallout(dateString);
    
    // Clear validation messages
    this.clearValidationMessages();
    
    // Show modal with animation
    modal.style.display = 'flex';
    
    // Focus on first input
    setTimeout(() => {
      const firstInput = modal.querySelector('.form-input-enhanced');
      if (firstInput) firstInput.focus();
    }, 100);
    
    console.log('[modal] Callout modal opened successfully');
  }

  // Close modal
  closeModal() {
    const modal = document.getElementById('calloutModal');
    if (modal) {
      modal.style.display = 'none';
      this.calendar.currentEditingCallout = null;
      this.calendar.existingCalloutToReplace = null;
      this.clearValidationMessages();
    }
  }

  // Populate form with data
  populateForm(editCallout, displayName, dateString) {
    // Set user name
    document.getElementById('calloutUser').value = editCallout ? editCallout.user : displayName;
    
    // Set date (convert from server timezone if editing)
    let formDate = dateString;
    if (editCallout) {
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
    this.updateCharacterCount();
  }

  // Set status with visual feedback
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
      delayInput.setAttribute('required', 'required');
    } else {
      outBtn.classList.add('active');
      delayGroup.style.display = 'none';
      delayInput.removeAttribute('required');
    }
    
    statusInput.value = status;
    console.log('[modal] Status set to:', status);
  }

  // Update character counter
  updateCharacterCount() {
    const reasonTextarea = document.getElementById('calloutReason');
    const charCount = document.getElementById('reasonCharCount');
    
    if (reasonTextarea && charCount) {
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
    }
  }

  // Check for existing callouts on selected date
  async checkExistingCallout(dateString) {
    try {
      console.log('[modal] Checking existing callout for date:', dateString);
      
      const serverDate = formatDateForComparison(dateString, this.calendar.userTimezone);
      console.log('[modal] Converted date for comparison:', serverDate);
      
      const existingCallouts = this.calendar.callouts.filter(callout => {
        const calloutDate = new Date(callout.date).toISOString().split("T")[0];
        return calloutDate === serverDate;
      });
      
      const warningDiv = document.getElementById('existingCalloutWarning');
      const warningText = document.getElementById('existingCalloutText');
      
      if (existingCallouts.length > 0 && !this.calendar.currentEditingCallout) {
        const callout = existingCallouts[0];
        const statusText = callout.status === 'LATE' ? 
          `Late (${callout.delay_minutes || 0} minutes)` : 'Out';
        
        const userDateDisplay = formatDateForUser(callout.date, this.calendar.userTimezone);
        warningText.textContent = `You already have a ${statusText} callout for ${userDateDisplay}. Saving will replace the existing callout.`;
        warningDiv.style.display = 'flex';
      } else {
        warningDiv.style.display = 'none';
      }
    } catch (error) {
      console.error('[modal] Error checking existing callout:', error);
      const warningDiv = document.getElementById('existingCalloutWarning');
      if (warningDiv) {
        warningDiv.style.display = 'none';
      }
    }
  }

  // Handle form submission
  async handleFormSubmit(event) {
    event.preventDefault();
    
    // Clear previous validation messages
    this.clearValidationMessages();
    
    // Get form data
    const formData = new FormData(event.target);
    const status = formData.get('status');
    const userDate = formData.get('date');
    const serverDate = formatDateForComparison(userDate, this.calendar.userTimezone);
    
    const calloutData = {
      user: formData.get('user').trim(),
      status: status,
      date: serverDate,
      delay: status === 'LATE' ? parseInt(formData.get('delay')) || null : null,
      reason: formData.get('reason').trim() || null
    };
    
    // Validate form data
    const validation = this.calendar.calloutManager.validateCalloutData(calloutData, userDate);
    if (!validation.isValid) {
      this.showValidationErrors(validation.errors);
      return;
    }
    
    try {
      console.log('[modal] Submitting callout:', calloutData);
      
      // Save callout through manager
      const result = await this.calendar.calloutManager.saveCallout(calloutData, userDate);
      
      if (result !== false) {
        // Close modal on success
        this.closeModal();
        
        // Show success message
        const action = (this.calendar.currentEditingCallout || this.calendar.existingCalloutToReplace) ? 'updated' : 'added';
        this.showSuccessMessage(`Callout ${action} successfully!`);
      }
      
    } catch (error) {
      console.error('[modal] Error submitting callout:', error);
      this.showValidationError('userValidation', `Failed to save callout: ${error.message}`);
    }
  }

  // Show validation errors
  showValidationErrors(errors) {
    errors.forEach(error => {
      const elementId = error.field + 'Validation';
      this.showValidationError(elementId, error.message);
    });
  }

  // Show validation error
  showValidationError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
      element.className = 'input-validation error';
      element.textContent = `❌ ${message}`;
    }
  }

  // Show validation success
  showValidationSuccess(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
      element.className = 'input-validation success';
      element.textContent = `✅ ${message}`;
    }
  }

  // Clear validation messages
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

  // Show success message
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
}