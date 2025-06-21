// modules/calendar/CalendarEventHandler.js - Event handling (100 lines)
// Handles all click events and user interactions

export class CalendarEventHandler {
  constructor(calendar) {
    this.calendar = calendar;
  }

  // Attach all event listeners
  attachEventListeners() {
    console.log('[event-handler] Attaching event listeners...');
    
    // Window resize events
    this.attachResizeListeners();
    
    // Keyboard event listeners
    this.attachKeyboardListeners();
    
    // Calendar cell click events (handled in renderer)
    // Add button clicks are handled during calendar generation
    
    console.log('[event-handler] Event listeners attached');
  }

  // Attach window resize listeners
  attachResizeListeners() {
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

  // Handle window resize
  handleResize() {
    console.log('[event-handler] Handling window resize...');
    this.calendar.renderer.applyFullScreenLayout();
    
    // Notify external components
    if (window.loadCalloutTable) {
      window.loadCalloutTable();
    }
  }

  // Handle add callout button click (called from renderer)
  handleAddCalloutClick(dateString) {
    console.log('[event-handler] Add callout clicked for date:', dateString);
    this.calendar.modal.openModal(dateString);
  }

  // Handle callout name click for editing (called from renderer)
  handleCalloutEditClick(dateString, callout) {
    console.log('[event-handler] Edit callout clicked for:', callout.user, 'on', dateString);
    this.calendar.modal.openModal(dateString, callout);
  }

  // Handle keyboard shortcuts
  handleKeyboardShortcuts(event) {
    // ESC to close modal
    if (event.key === 'Escape') {
      const modal = document.getElementById('calloutModal');
      if (modal && modal.style.display !== 'none') {
        this.calendar.modal.closeModal();
      }
    }
    
    // Ctrl+R to refresh (prevent default and use our refresh)
    if (event.ctrlKey && event.key === 'r') {
      event.preventDefault();
      this.calendar.refreshCallouts();
    }
  }

  // Handle modal click outside to close
  handleModalBackdropClick(event) {
    const modal = document.getElementById('calloutModal');
    if (event.target === modal) {
      this.calendar.modal.closeModal();
    }
  }

  // Attach keyboard event listeners
  attachKeyboardListeners() {
    document.addEventListener('keydown', (event) => {
      this.handleKeyboardShortcuts(event);
    });
    
    // Modal backdrop click
    const modal = document.getElementById('calloutModal');
    if (modal) {
      modal.addEventListener('click', (event) => {
        this.handleModalBackdropClick(event);
      });
    }
  }

  // Handle navigation button clicks (if you have prev/next month buttons)
  handleNavigationClick(direction) {
    let newMonth = this.calendar.currentMonth;
    let newYear = this.calendar.currentYear;
    
    if (direction === 'prev') {
      newMonth--;
      if (newMonth < 0) {
        newMonth = 11;
        newYear--;
      }
    } else if (direction === 'next') {
      newMonth++;
      if (newMonth > 11) {
        newMonth = 0;
        newYear++;
      }
    }
    
    this.calendar.updateMonthYear(newMonth, newYear);
  }

  // Handle today button click
  handleTodayClick() {
    const today = new Date();
    this.calendar.updateMonthYear(today.getMonth(), today.getFullYear());
  }

  // Detach all event listeners (for cleanup)
  detachEventListeners() {
    console.log('[event-handler] Detaching event listeners...');
    
    // Remove window listeners
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('orientationchange', this.handleResize);
    
    // Remove keyboard listeners
    document.removeEventListener('keydown', this.handleKeyboardShortcuts);
    
    console.log('[event-handler] Event listeners detached');
  }
}