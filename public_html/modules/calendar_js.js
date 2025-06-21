// modules/calendar.js - Main calendar class (120 lines)
// Coordinates between calendar modules in the calendar/ subfolder

import { getUserTimezone, getServerTimezone } from './utils.js';

// Import calendar modules from subfolder
import { CalendarRenderer } from './calendar/CalendarRenderer.js';
import { CalloutManager } from './calendar/CalloutManager.js';
import { CalloutModal } from './calendar/CalloutModal.js';
import { CalendarEventHandler } from './calendar/CalendarEventHandler.js';
import { TimezoneHelper } from './calendar/TimezoneHelper.js';

export class AttendanceCalendar {
  constructor() {
    // Core state
    this.currentMonth = new Date().getMonth();
    this.currentYear = new Date().getFullYear();
    this.container = document.getElementById("calendar");
    this.headerContainer = document.getElementById("calendarHeader");
    
    // Data storage
    this.callouts = [];
    this.currentEditingCallout = null;
    this.existingCalloutToReplace = null;
    
    // Timezone setup
    this.userTimezone = getUserTimezone();
    this.serverTimezone = getServerTimezone();
    
    // Initialize all supporting modules
    this.timezoneHelper = new TimezoneHelper(this);
    this.renderer = new CalendarRenderer(this);
    this.calloutManager = new CalloutManager(this);
    this.modal = new CalloutModal(this);
    this.eventHandler = new CalendarEventHandler(this);
    
    // Start initialization
    this.initPromise = this.initialize();
  }

  async initialize() {
    console.log('[calendar] Starting timezone-aware initialization...');
    console.log(`[calendar] User timezone: ${this.userTimezone}`);
    console.log(`[calendar] Server timezone: ${this.serverTimezone}`);
    
    try {
      if (!this.container || !this.headerContainer) {
        console.error('[calendar] Required containers not found');
        return;
      }
      
      // Initialize in proper sequence
      await this.renderer.generateCalendar();
      await this.calloutManager.fetchCallouts();
      this.renderer.renderCallouts();
      
      // Initialize UI components
      this.modal.initialize();
      this.eventHandler.attachEventListeners();
      
      // Initialize dropdown if available
      this.initializeDropdown();
      
      // Apply layout
      this.renderer.applyFullScreenLayout();
      
      // Notify external components
      if (window.loadCalloutTable) {
        window.loadCalloutTable();
      }
      
      console.log('[calendar] Timezone-aware initialization complete');
    } catch (error) {
      console.error('[calendar] Initialization failed:', error);
    }
  }

  async initializeDropdown() {
    try {
      const { CDropdown } = await import('./cdropdown.js');
      const dropdown = new CDropdown(this);
      dropdown.render();
      dropdown.attachListeners();
      dropdown.syncWithCalendar();
      window.cdropdown = dropdown;
    } catch (err) {
      console.log('[calendar] Dropdown not available:', err.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PUBLIC API - These methods maintain the same interface for other modules
  // ═══════════════════════════════════════════════════════════════════════════════

  // Calendar generation and rendering (delegates to renderer)
  async generateCalendar() {
    return await this.renderer.generateCalendar();
  }

  renderCallouts() {
    return this.renderer.renderCallouts();
  }

  updateCalendarWithCallouts() {
    return this.renderer.updateCalendarWithCallouts();
  }

  ensureFullScreenLayout() {
    return this.renderer.applyFullScreenLayout();
  }

  // Callout management (delegates to callout manager)
  async fetchCallouts() {
    return await this.calloutManager.fetchCallouts();
  }

  async refreshCallouts() {
    console.log('[calendar] Refreshing timezone-aware callouts...');
    await this.calloutManager.fetchCallouts();
    this.renderer.renderCallouts();
    this.initializeDropdown();
    this.renderer.applyFullScreenLayout();
    
    if (window.loadCalloutTable) {
      window.loadCalloutTable();
    }
  }

  // Modal operations (delegates to modal)
  openCalloutModal(dateString, editCallout = null) {
    return this.modal.openModal(dateString, editCallout);
  }

  closeEnhancedModal() {
    return this.modal.closeModal();
  }

  // Month/year navigation
  async updateMonthYear(month, year) {
    this.currentMonth = month;
    this.currentYear = year;
    await this.renderer.generateCalendar();
    this.renderer.renderCallouts();
    this.renderer.applyFullScreenLayout();
    
    if (window.loadCalloutTable) {
      window.loadCalloutTable();
    }
  }

  // Event handling
  handleResize() {
    console.log('[calendar] Handling window resize...');
    this.renderer.applyFullScreenLayout();
    
    if (window.loadCalloutTable) {
      window.loadCalloutTable();
    }
  }

  addEventListeners() {
    return this.eventHandler.attachEventListeners();
  }

  // Utility methods (delegates to appropriate modules)
  calculateWeeksNeeded(year, month) {
    return this.renderer.calculateWeeksNeeded(year, month);
  }

  isPastDate(year, month, day) {
    return this.renderer.isPastDate(year, month, day);
  }

  // Calendar info
  getCalendarInfo() {
    const weeksNeeded = this.renderer.calculateWeeksNeeded(this.currentYear, this.currentMonth);
    const monthName = new Date(this.currentYear, this.currentMonth, 1)
      .toLocaleDateString('en-US', { month: 'long' });
    
    return {
      year: this.currentYear,
      month: this.currentMonth + 1,
      monthName: monthName,
      weeksNeeded: weeksNeeded,
      totalCells: weeksNeeded * 7,
      calloutsCount: this.callouts.length,
      containerHeight: this.container ? this.container.offsetHeight : 0,
      containerWidth: this.container ? this.container.offsetWidth : 0,
      userTimezone: this.userTimezone,
      serverTimezone: this.serverTimezone,
      timezoneOffset: new Date().getTimezoneOffset()
    };
  }

  // Timezone helper methods (delegates to timezone helper)
  convertToUserTimezone(date, fromTimezone, toTimezone) {
    return this.timezoneHelper.convertToUserTimezone(date, fromTimezone, toTimezone);
  }

  convertToServerTimezone(date, fromTimezone) {
    return this.timezoneHelper.convertToServerTimezone(date, fromTimezone);
  }
}