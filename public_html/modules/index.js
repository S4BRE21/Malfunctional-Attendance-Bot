// modules/index.js - Enhanced main entrypoint with timezone initialization
// Fixed imports to match actual utils.js functions

import { HeaderManager } from './header.js';
import { AttendanceCalendar } from './calendar.js';
import { showError } from './errors.js';
import { 
  getUserTimezone,
  getServerTimezone,
  getTimezoneAbbreviation 
} from './utils.js';

// TIMEZONE: Global timezone state
let globalTimezoneInfo = {
  userTimezone: null,
  serverTimezone: null,
  detected: false,
  initialized: false
};

// TIMEZONE: Built-in timezone validation (since it's not in your utils.js)
function validateTimezone(tz) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch (e) {
    return false;
  }
}

// TIMEZONE: Pre-initialization timezone detection
async function initializeTimezoneSystem() {
  console.log('[index] Initializing timezone system...');
  
  try {
    // Detect user's timezone
    const userTimezone = getUserTimezone();
    const serverTimezone = getServerTimezone();
    
    // Validate detected timezone
    if (!validateTimezone(userTimezone)) {
      console.warn(`[index] Invalid user timezone detected: ${userTimezone}, falling back to UTC`);
      globalTimezoneInfo.userTimezone = 'UTC';
    } else {
      globalTimezoneInfo.userTimezone = userTimezone;
    }
    
    globalTimezoneInfo.serverTimezone = serverTimezone;
    globalTimezoneInfo.detected = true;
    globalTimezoneInfo.initialized = true;
    
    // Store timezone info globally for other modules
    window.timezoneInfo = globalTimezoneInfo;
    
    console.log(`[index] Timezone system initialized:`);
    console.log(`  - User timezone: ${globalTimezoneInfo.userTimezone} (${getTimezoneAbbreviation(userTimezone)})`);
    console.log(`  - Server timezone: ${globalTimezoneInfo.serverTimezone} (${getTimezoneAbbreviation(serverTimezone)})`);
    
    // Store in localStorage for persistence
    try {
      localStorage.setItem('systemTimezone', JSON.stringify({
        user: globalTimezoneInfo.userTimezone,
        server: globalTimezoneInfo.serverTimezone,
        detectedAt: new Date().toISOString()
      }));
    } catch (e) {
      console.warn('[index] Could not store timezone info:', e);
    }
    
    return globalTimezoneInfo;
    
  } catch (error) {
    console.error('[index] Error initializing timezone system:', error);
    
    // Fallback to basic timezone setup
    globalTimezoneInfo = {
      userTimezone: 'UTC',
      serverTimezone: getServerTimezone(),
      detected: false,
      initialized: false
    };
    
    window.timezoneInfo = globalTimezoneInfo;
    return globalTimezoneInfo;
  }
}

// TIMEZONE: Wait for timezone initialization before proceeding
async function waitForTimezoneReady() {
  const maxWait = 5000; // 5 seconds max wait
  const startTime = Date.now();
  
  while (!globalTimezoneInfo.initialized && (Date.now() - startTime) < maxWait) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  if (!globalTimezoneInfo.initialized) {
    console.warn('[index] Timezone initialization timeout, proceeding with fallback');
  }
  
  return globalTimezoneInfo.initialized;
}

// TIMEZONE: Enhanced error handling with timezone context
function handleInitializationError(error, context) {
  console.error(`[index] ${context} error:`, error);
  
  const timezoneContext = globalTimezoneInfo.initialized ? 
    `User TZ: ${globalTimezoneInfo.userTimezone}, Server TZ: ${globalTimezoneInfo.serverTimezone}` :
    'Timezone not initialized';
  
  showError(`Failed to initialize ${context}`, {
    ...error,
    timezoneInfo: timezoneContext
  });
}

// TIMEZONE: Main initialization with timezone-aware startup
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('[index] Starting timezone-aware application initialization...');
    
    // STEP 1: Initialize timezone system first
    console.log('[index] Step 1: Timezone system initialization...');
    await initializeTimezoneSystem();
    
    // STEP 2: Wait for timezone to be ready
    console.log('[index] Step 2: Waiting for timezone readiness...');
    await waitForTimezoneReady();
    
    // STEP 3: Initialize header with timezone awareness
    console.log('[index] Step 3: Initializing timezone-aware header...');
    const header = new HeaderManager();
    await header.initPromise;
    
    // Make auth globally available with timezone info
    window.auth = header.getAuth();
    
    // STEP 4: Initialize timezone-aware calendar
    console.log('[index] Step 4: Initializing timezone-aware calendar...');
    const calendar = new AttendanceCalendar();
    await calendar.initPromise;
    
    // Make calendar globally available
    window.calendar = calendar;
    
    // STEP 5: Pre-initialize admin dashboard for faster loading
    console.log('[index] Step 5: Pre-initializing admin dashboard...');
    try {
      const { AdminDashboard } = await import('./adminDashboard.js');
      window.adminDashboard = new AdminDashboard();
      await window.adminDashboard.initPromise;
      console.log('[index] Admin dashboard pre-initialized');
    } catch (error) {
      console.warn('[index] Admin dashboard pre-initialization failed:', error);
      // Not critical - will be initialized when needed
    }

    // STEP 6: Setup timezone event listeners
    console.log('[index] Step 6: Setting up timezone event listeners...');
    setupTimezoneEventListeners();
    
    // STEP 7: Final validation and status report
    console.log('[index] Step 7: Final validation...');
    validateSystemIntegrity();
    
    console.log('[index] ✅ Timezone-aware application initialization complete!');
    console.log(`[index] 🌍 System running with user timezone: ${globalTimezoneInfo.userTimezone}`);
    
    // Log timezone conversion status without showing notifications
    if (globalTimezoneInfo.userTimezone !== globalTimezoneInfo.serverTimezone) {
      console.log('[index] 🔄 Timezone conversion active');
    }
    
  } catch (err) {
    console.error('[index] Fatal initialization error:', err);
    handleInitializationError(err, 'application');
  }
});

// TIMEZONE: Setup event listeners for timezone-related events
function setupTimezoneEventListeners() {
  console.log('[index] Setting up timezone event listeners...');
  
  // Listen for timezone changes from auth manager
  if (window.auth) {
    window.auth.addEventListener('timezoneChanged', (data) => {
      console.log('[index] Timezone changed:', data);
      
      // Update global timezone info
      globalTimezoneInfo.userTimezone = data.newTimezone;
      window.timezoneInfo = globalTimezoneInfo;
      
      // Refresh calendar with new timezone
      if (window.calendar) {
        window.calendar.userTimezone = data.newTimezone;
        window.calendar.refreshCallouts();
      }
    });
    
    window.auth.addEventListener('timezoneDetected', (data) => {
      console.log('[index] Timezone detected by auth:', data);
    });
  }
  
  // Listen for timezone changes in the browser (rare but possible)
  if ('Intl' in window && 'DateTimeFormat' in Intl) {
    const observer = {
      check: () => {
        const currentTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (currentTz !== globalTimezoneInfo.userTimezone) {
          console.log(`[index] Browser timezone changed from ${globalTimezoneInfo.userTimezone} to ${currentTz}`);
          handleTimezoneChange(currentTz);
        }
      }
    };
    
    // Check every 30 seconds for timezone changes
    setInterval(observer.check, 30000);
  }
}

// TIMEZONE: Handle timezone changes
async function handleTimezoneChange(newTimezone) {
  if (!validateTimezone(newTimezone)) {
    console.warn('[index] Invalid new timezone detected:', newTimezone);
    return;
  }
  
  const oldTimezone = globalTimezoneInfo.userTimezone;
  globalTimezoneInfo.userTimezone = newTimezone;
  window.timezoneInfo = globalTimezoneInfo;
  
  // Update auth manager if available
  if (window.auth && window.auth.updateTimezone) {
    await window.auth.updateTimezone(newTimezone);
  }
  
  // Update calendar if available
  if (window.calendar) {
    window.calendar.userTimezone = newTimezone;
    await window.calendar.refreshCallouts();
  }
  
  console.log(`[index] System timezone updated from ${oldTimezone} to ${newTimezone}`);
}

// TIMEZONE: Validate system integrity
function validateSystemIntegrity() {
  const checks = [];
  
  // Check if timezone system is initialized
  checks.push({
    name: 'Timezone System',
    status: globalTimezoneInfo.initialized,
    details: globalTimezoneInfo.initialized ? 
      `User: ${globalTimezoneInfo.userTimezone}, Server: ${globalTimezoneInfo.serverTimezone}` :
      'Not initialized'
  });
  
  // Check if auth is available
  checks.push({
    name: 'Authentication',
    status: !!window.auth,
    details: window.auth ? 'Available' : 'Not available'
  });
  
  // Check if calendar is available
  checks.push({
    name: 'Calendar',
    status: !!window.calendar,
    details: window.calendar ? 'Available' : 'Not available'
  });
  
  // Check if admin dashboard is available
  checks.push({
    name: 'Admin Dashboard',
    status: !!window.adminDashboard,
    details: window.adminDashboard ? 'Available' : 'Not available'
  });
  
  // Check timezone conversion status
  const conversionActive = globalTimezoneInfo.userTimezone !== globalTimezoneInfo.serverTimezone;
  checks.push({
    name: 'Timezone Conversion',
    status: true,
    details: conversionActive ? 'Active' : 'Not needed (same timezone)'
  });
  
  console.log('[index] System integrity check:');
  checks.forEach(check => {
    const status = check.status ? '✅' : '❌';
    console.log(`[index]   ${status} ${check.name}: ${check.details}`);
  });
  
  const failedChecks = checks.filter(check => !check.status);
  if (failedChecks.length > 0) {
    console.warn(`[index] ${failedChecks.length} system checks failed`);
  } else {
    console.log('[index] ✅ All system checks passed');
  }
}

// TIMEZONE: Export timezone utilities for global access
window.getSystemTimezoneInfo = () => globalTimezoneInfo;
window.refreshTimezoneSystem = initializeTimezoneSystem;
window.validateSystemTimezone = validateSystemIntegrity;