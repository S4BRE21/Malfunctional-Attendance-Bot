// modules/auth.js - Enhanced authentication management with timezone support
// Fixed version - only imports functions that exist in utils.js

import { 
  getUserTimezone,
  getServerTimezone, 
  getTimezoneAbbreviation
} from './utils.js';

export class AuthManager {
  constructor() {
    this.user = null;
    this.listeners = [];
    
    // TIMEZONE: Add timezone properties
    this.userTimezone = null;
    this.serverTimezone = getServerTimezone();
    this.timezoneDetected = false;
    
    this.initPromise = this.initialize();
  }

  // TIMEZONE: Built-in timezone validation (since it's not in utils.js)
  validateTimezone(tz) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      return true;
    } catch (e) {
      return false;
    }
  }

  // TIMEZONE: Enhanced initialization with timezone detection
  async initialize() {
    console.log('[auth] Initializing timezone-aware authentication...');
    
    // TIMEZONE: Detect user's timezone first
    await this.detectTimezone();
    
    // Original initialization
    await this.loadUserData();
    
    console.log('[auth] Timezone-aware authentication initialized');
    console.log(`[auth] User timezone: ${this.userTimezone}`);
    console.log(`[auth] Server timezone: ${this.serverTimezone}`);
  }

  // TIMEZONE: Detect and validate user's timezone
  async detectTimezone() {
    try {
      console.log('[auth] Detecting user timezone...');
      
      // Get timezone from browser
      this.userTimezone = getUserTimezone();
      
      // Validate the detected timezone
      if (!this.validateTimezone(this.userTimezone)) {
        console.warn(`[auth] Invalid timezone detected: ${this.userTimezone}, falling back to UTC`);
        this.userTimezone = 'UTC';
      }
      
      this.timezoneDetected = true;
      
      // Store timezone preference in localStorage for persistence
      try {
        localStorage.setItem('userTimezone', this.userTimezone);
        localStorage.setItem('timezoneDetectedAt', new Date().toISOString());
      } catch (e) {
        console.warn('[auth] Could not store timezone preference:', e);
      }
      
      console.log(`[auth] Timezone detected and validated: ${this.userTimezone}`);
      
      // Notify listeners about timezone detection
      this.notifyListeners('timezoneDetected', {
        userTimezone: this.userTimezone,
        serverTimezone: this.serverTimezone,
        abbreviation: getTimezoneAbbreviation(this.userTimezone)
      });
      
    } catch (error) {
      console.error('[auth] Error detecting timezone:', error);
      this.userTimezone = 'UTC'; // Fallback to UTC
      this.timezoneDetected = false;
    }
  }

  // TIMEZONE: Enhanced loadUserData with timezone info
  async loadUserData() {
    try {
      console.log('[auth] Loading user data from /api/user...');
      const response = await fetch('/api/user');
      
      if (response.ok) {
        const userData = await response.json();
        this.user = {
          ...userData,
          isAdmin: userData.is_admin === 1 || userData.is_admin === true,
          // TIMEZONE: Add timezone info to user object
          timezone: this.userTimezone,
          serverTimezone: this.serverTimezone,
          timezoneAbbr: getTimezoneAbbreviation(this.userTimezone)
        };
        
        console.log('[auth] User authenticated with timezone info:', this.user.username);
        console.log(`[auth] User timezone: ${this.user.timezone} (${this.user.timezoneAbbr})`);
        
        this.notifyListeners('login', this.user);
      } else {
        this.user = null;
        console.log('[auth] No user authenticated');
        this.notifyListeners('logout', null);
      }
    } catch (error) {
      console.error('[auth] Failed to load user data:', error);
      this.user = null;
      this.notifyListeners('error', error);
    }
  }

  // TIMEZONE: Enhanced login with timezone info
  login() {
    console.log('[auth] Redirecting to Discord OAuth...');
    console.log(`[auth] User timezone will be: ${this.userTimezone}`);
    
    // Store timezone info for post-login restoration
    try {
      sessionStorage.setItem('preLoginTimezone', this.userTimezone);
      sessionStorage.setItem('timezoneDetected', this.timezoneDetected.toString());
    } catch (e) {
      console.warn('[auth] Could not store pre-login timezone info:', e);
    }
    
    window.location.href = '/auth/discord';
  }

  // TIMEZONE: Enhanced logout with timezone cleanup
  logout() {
    console.log('[auth] Logging out...');
    
    // Clear timezone preferences on logout if desired
    try {
      sessionStorage.removeItem('timezoneInfoShown');
      sessionStorage.removeItem('preLoginTimezone');
    } catch (e) {
      console.warn('[auth] Could not clear timezone session data:', e);
    }
    
    window.location.href = '/logout';
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.user !== null;
  }

  // TIMEZONE: Enhanced getCurrentUser with timezone info
  getCurrentUser() {
    if (!this.user) return null;
    
    return {
      ...this.user,
      timezone: this.userTimezone,
      serverTimezone: this.serverTimezone,
      timezoneAbbr: getTimezoneAbbreviation(this.userTimezone),
      timezoneDetected: this.timezoneDetected
    };
  }

  // Get user avatar URL
  getUserAvatarUrl(size = 64) {
    if (!this.user || !this.user.avatar) {
      return 'https://cdn.discordapp.com/embed/avatars/0.png';
    }
    return `https://cdn.discordapp.com/avatars/${this.user.id}/${this.user.avatar}.png?size=${size}`;
  }

  // Get display name
  getDisplayName() {
    if (!this.user) return null;
    return this.user.global_name || this.user.username;
  }

  // TIMEZONE: Get timezone info
  getTimezoneInfo() {
    return {
      userTimezone: this.userTimezone,
      serverTimezone: this.serverTimezone,
      userAbbr: getTimezoneAbbreviation(this.userTimezone),
      serverAbbr: getTimezoneAbbreviation(this.serverTimezone),
      isDifferent: this.userTimezone !== this.serverTimezone,
      detected: this.timezoneDetected
    };
  }

  // TIMEZONE: Update user's timezone preference
  async updateTimezone(newTimezone) {
    if (!this.validateTimezone(newTimezone)) {
      console.error('[auth] Invalid timezone:', newTimezone);
      return false;
    }
    
    const oldTimezone = this.userTimezone;
    this.userTimezone = newTimezone;
    
    try {
      localStorage.setItem('userTimezone', newTimezone);
      
      // Update user object if authenticated
      if (this.user) {
        this.user.timezone = newTimezone;
        this.user.timezoneAbbr = getTimezoneAbbreviation(newTimezone);
      }
      
      console.log(`[auth] Timezone updated from ${oldTimezone} to ${newTimezone}`);
      
      // Notify listeners about timezone change
      this.notifyListeners('timezoneChanged', {
        oldTimezone,
        newTimezone,
        userAbbr: getTimezoneAbbreviation(newTimezone)
      });
      
      return true;
    } catch (error) {
      console.error('[auth] Failed to update timezone:', error);
      this.userTimezone = oldTimezone; // Rollback
      return false;
    }
  }

  // Refresh authentication status
  async refresh() {
    console.log('[auth] Refreshing authentication status...');
    await this.loadUserData();
  }

  // Event listener management
  addEventListener(eventType, callback) {
    this.listeners.push({ eventType, callback });
  }

  removeEventListener(eventType, callback) {
    this.listeners = this.listeners.filter(
      listener => !(listener.eventType === eventType && listener.callback === callback)
    );
  }

  notifyListeners(eventType, data) {
    this.listeners
      .filter(listener => listener.eventType === eventType)
      .forEach(listener => listener.callback(data));
  }

  // Check if user has specific permissions (for future use)
  hasPermission(permission) {
    // This could be expanded based on your user roles system
    return this.isAuthenticated();
  }

  // TIMEZONE: Enhanced export with timezone data
  exportUserData() {
    return {
      isAuthenticated: this.isAuthenticated(),
      user: this.user,
      timezone: {
        user: this.userTimezone,
        server: this.serverTimezone,
        userAbbr: getTimezoneAbbreviation(this.userTimezone),
        serverAbbr: getTimezoneAbbreviation(this.serverTimezone),
        isDifferent: this.userTimezone !== this.serverTimezone,
        detected: this.timezoneDetected
      },
      timestamp: new Date().toISOString(),
      localTime: new Date().toLocaleString('en-US', { timeZone: this.userTimezone }),
      serverTime: new Date().toLocaleString('en-US', { timeZone: this.serverTimezone })
    };
  }

  // TIMEZONE: Get formatted time in user's timezone
  getFormattedUserTime(date = new Date()) {
    try {
      return date.toLocaleString('en-US', {
        timeZone: this.userTimezone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return date.toLocaleString();
    }
  }

  // TIMEZONE: Get formatted time in server timezone
  getFormattedServerTime(date = new Date()) {
    try {
      return date.toLocaleString('en-US', {
        timeZone: this.serverTimezone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return date.toLocaleString();
    }
  }
}