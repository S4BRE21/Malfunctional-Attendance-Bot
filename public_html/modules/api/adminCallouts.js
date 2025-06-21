// modules/adminCallouts.js - TIMEZONE-AWARE VERSION with FIXED DATE FORMATTING
// Version: 2.3 - Clean version without timezone banners
// Updated: 2025-06-18
// Notes: Enhanced with worldwide timezone support, fixed date parsing, no user IDs, bigger names

import { fetchCallouts, deleteCallout } from './calloutAPI.js';
import { 
  formatDateForUser, 
  getUserTimezone, 
  getServerTimezone,
  getTimezoneAbbreviation,
  formatTimeForUser 
} from '/modules/utils.js';

// ═══════════════════════════════════════════════════════════════════════════════
// FIXED: TIMEZONE-AWARE UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function formatDateDisplay(dateString) {
  if (!dateString) return 'Invalid Date';
  
  try {
    console.log('[adminCallouts] Formatting date:', dateString); // Debug log
    
    const userTimezone = getUserTimezone();
    const serverTimezone = getServerTimezone();
    
    // FIXED: Handle different date string formats
    let date;
    
    if (typeof dateString === 'string') {
      // Handle YYYY-MM-DD format (most common from database)
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        date = new Date(dateString + 'T12:00:00.000Z'); // Use UTC to avoid timezone shifts
      }
      // Handle ISO format (2025-06-18T00:00:00.000Z)
      else if (dateString.includes('T')) {
        date = new Date(dateString);
      }
      // Handle other formats
      else {
        date = new Date(dateString);
      }
    } else {
      date = new Date(dateString);
    }
    
    // FIXED: Validate date object
    if (isNaN(date.getTime())) {
      console.error('[adminCallouts] Invalid date created from:', dateString);
      return `Invalid Date (${dateString})`;
    }
    
    // FIXED: Format date in user's timezone
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: userTimezone
    });
    
    return formattedDate;
  } catch (error) {
    console.error('[adminCallouts] Error formatting date:', error, 'Input:', dateString);
    return `Error: ${dateString}`;
  }
}

function getRelativeDate(dateString) {
  if (!dateString) return '';
  
  try {
    const userTimezone = getUserTimezone();
    
    // FIXED: Better date parsing
    let date;
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      date = new Date(dateString + 'T12:00:00.000Z');
    } else {
      date = new Date(dateString);
    }
    
    if (isNaN(date.getTime())) {
      return '';
    }
    
    // Get today in user's timezone
    const today = new Date();
    const userToday = new Date(today.toLocaleDateString('en-US', { timeZone: userTimezone }) + 'T12:00:00.000Z');
    
    const diffTime = date.getTime() - userToday.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 1) return `In ${diffDays} days`;
    if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
    
    return '';
  } catch (error) {
    console.error('[adminCallouts] Error getting relative date:', error);
    return '';
  }
}

function formatTimestampDisplay(timestamp) {
  if (!timestamp) return 'Unknown';
  
  try {
    const userTimezone = getUserTimezone();
    
    // FIXED: Handle different timestamp formats
    let date;
    if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      date = new Date(timestamp);
    }
    
    if (isNaN(date.getTime())) {
      console.error('[adminCallouts] Invalid timestamp:', timestamp);
      return 'Invalid Time';
    }
    
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: userTimezone,
      hour12: true
    });
  } catch (error) {
    console.error('[adminCallouts] Error formatting timestamp:', error);
    return 'Unknown';
  }
}

function truncateText(text, maxLength) {
  if (!text) return '';
  return text.length <= maxLength ? text : text.substring(0, maxLength) + '...';
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// FIXED: Add debug function to check data format
function debugCalloutData(callouts) {
  console.group('[adminCallouts] Debug Data Format');
  
  if (callouts.length > 0) {
    const sample = callouts[0];
    console.log('Sample callout data:', sample);
    console.log('Date field type:', typeof sample.date);
    console.log('Date field value:', sample.date);
    console.log('Timestamp field type:', typeof sample.timestamp);
    console.log('Timestamp field value:', sample.timestamp);
    
    // Test date parsing
    try {
      const testDate = new Date(sample.date + 'T12:00:00.000Z');
      console.log('Parsed date:', testDate);
      console.log('Is valid:', !isNaN(testDate.getTime()));
    } catch (e) {
      console.error('Date parsing error:', e);
    }
  }
  
  console.groupEnd();
}

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL VARIABLES FOR FILTERING AND STATE
// ═══════════════════════════════════════════════════════════════════════════════

let allCallouts = [];
let filteredCallouts = [];
let currentUserFilter = 'all';
let currentDateFilter = 'all';
let currentStatusFilter = 'all';

// ═══════════════════════════════════════════════════════════════════════════════
// FIXED: MAIN LOAD FUNCTION WITH ENHANCED TIMEZONE AWARENESS (NO BANNERS)
// ═══════════════════════════════════════════════════════════════════════════════

export async function loadCalloutTable() {
  const container = document.getElementById("calloutTableContainer");
  if (!container) return;

  try {
    console.log('[adminCallouts] Loading callouts with enhanced timezone support...');
    
    const callouts = await fetchCallouts();
    allCallouts = callouts;
    
    // FIXED: Add debugging
    debugCalloutData(allCallouts);
    
    // Add timezone information to each callout with error handling
    allCallouts = allCallouts.map(callout => {
      try {
        return {
          ...callout,
          displayDate: formatDateDisplay(callout.date),
          relativeDate: getRelativeDate(callout.date),
          displayTimestamp: formatTimestampDisplay(callout.timestamp)
        };
      } catch (error) {
        console.error('[adminCallouts] Error processing callout:', callout.id, error);
        return {
          ...callout,
          displayDate: `Error: ${callout.date}`,
          relativeDate: '',
          displayTimestamp: 'Error'
        };
      }
    });
    
    // Sort callouts: LATE (with delay) first, then OUT, then by date
    allCallouts.sort((a, b) => {
      // LATE callouts come first
      if (a.status === 'LATE' && b.status !== 'LATE') return -1;
      if (a.status !== 'LATE' && b.status === 'LATE') return 1;
      
      // Within LATE callouts, sort by delay (highest first)
      if (a.status === 'LATE' && b.status === 'LATE') {
        const delayA = a.delay_minutes || 0;
        const delayB = b.delay_minutes || 0;
        return delayB - delayA;
      }
      
      // For OUT callouts or mixed, sort by date (newest first)
      return new Date(b.date) - new Date(a.date);
    });
    
    // Apply current filters
    applyFilters();
    
    // Render the table (no timezone banners shown)
    renderCalloutTable();
    
    console.log(`[adminCallouts] Loaded ${allCallouts.length} callouts with enhanced timezone support`);
  } catch (err) {
    console.error('[adminCallouts] Failed to load callouts:', err);
    container.textContent = "Error loading callouts.";
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED FILTER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function createFilterDropdowns() {
  // Get unique users
  const uniqueUsers = [...new Set(allCallouts.map(c => c.user))].sort();
  
  // Get unique dates for current month (in user's timezone)
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const currentMonthDates = allCallouts
    .filter(c => {
      const calloutDate = new Date(c.date + 'T12:00:00');
      return calloutDate.getMonth() === currentMonth && calloutDate.getFullYear() === currentYear;
    })
    .map(c => c.date)
    .filter((date, index, self) => self.indexOf(date) === index)
    .sort();

  const filterHtml = `
    <tr class="filter-row">
      <th></th>
      <th>
        <select id="userFilter" class="filter-dropdown">
          <option value="all">All Users</option>
          ${uniqueUsers.map(user => `
            <option value="${escapeHtml(user)}" ${currentUserFilter === user ? 'selected' : ''}>
              ${escapeHtml(user)}
            </option>
          `).join('')}
        </select>
      </th>
      <th>
        <select id="statusFilter" class="filter-dropdown">
          <option value="all">All Status</option>
          <option value="LATE" ${currentStatusFilter === 'LATE' ? 'selected' : ''}>Late</option>
          <option value="OUT" ${currentStatusFilter === 'OUT' ? 'selected' : ''}>Out</option>
        </select>
      </th>
      <th>
        <select id="dateFilter" class="filter-dropdown">
          <option value="all">All Dates</option>
          ${currentMonthDates.map(date => `
            <option value="${date}" ${currentDateFilter === date ? 'selected' : ''}>
              ${formatDateDisplay(date)}
            </option>
          `).join('')}
        </select>
      </th>
      <th></th>
      <th></th>
      <th></th>
      <th></th>
    </tr>
  `;
  
  return filterHtml;
}

function applyFilters() {
  filteredCallouts = allCallouts.filter(callout => {
    // User filter
    if (currentUserFilter !== 'all' && callout.user !== currentUserFilter) {
      return false;
    }
    
    // Status filter
    if (currentStatusFilter !== 'all' && callout.status !== currentStatusFilter) {
      return false;
    }
    
    // Date filter
    if (currentDateFilter !== 'all' && callout.date !== currentDateFilter) {
      return false;
    }
    
    return true;
  });
}

function setupFilterListeners() {
  const userFilter = document.getElementById('userFilter');
  const statusFilter = document.getElementById('statusFilter');
  const dateFilter = document.getElementById('dateFilter');
  
  if (userFilter) {
    userFilter.addEventListener('change', (e) => {
      currentUserFilter = e.target.value;
      applyFilters();
      renderCalloutTable();
      setupFilterListeners();
    });
  }
  
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      currentStatusFilter = e.target.value;
      applyFilters();
      renderCalloutTable();
      setupFilterListeners();
    });
  }
  
  if (dateFilter) {
    dateFilter.addEventListener('change', (e) => {
      currentDateFilter = e.target.value;
      applyFilters();
      renderCalloutTable();
      setupFilterListeners();
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED TABLE RENDERING WITH TIMEZONE SUPPORT - NO IDs, BIGGER NAMES (NO BANNERS)
// ═══════════════════════════════════════════════════════════════════════════════

function renderCalloutTable() {
  console.log('[adminCallouts] Rendering timezone-aware callout table with bigger names...');
  
  const container = document.getElementById("calloutTableContainer");
  if (!container) {
    console.error('[adminCallouts] calloutTableContainer not found in DOM');
    return;
  }

  const table = document.createElement("table");
  table.className = "admin-callout-table";
  
  // Enhanced table header (timezone abbreviation shown only in column header)
  const tableHeader = `
    <thead>
      <tr>
        <th>ID</th>
        <th>USER</th>
        <th>STATUS</th>
        <th>DATE (${getTimezoneAbbreviation(getUserTimezone())})</th>
        <th>REASON</th>
        <th>DELAY</th>
        <th>CREATED</th>
        <th>ACTIONS</th>
      </tr>
      ${createFilterDropdowns()}
    </thead>
  `;
  
  // Enhanced table rows with timezone-aware data and bigger names (NO IDs)
  const tableRows = filteredCallouts.map(c => {
    const escapedUser = escapeHtml(c.user);
    const escapedReason = escapeHtml(c.reason || '');
    const reasonDisplay = c.reason ? 
      `<span title="${c.reason}">${truncateText(c.reason, 30)}</span>` : 
      '<em class="no-reason">No reason</em>';
    
    const delayDisplay = c.status === 'LATE' ? 
      (c.delay_minutes ? 
        `<span class="delay-badge">${c.delay_minutes} min</span>` : 
        '<em class="no-delay">No delay specified</em>') : 
      '<span class="not-applicable">N/A</span>';
    
    return `
      <tr data-callout-id="${c.id}">
        <td>
          <span class="callout-id">#${c.id}</span>
        </td>
        <td>
          <div class="user-info">
            <span class="user-name">${escapedUser}</span>
          </div>
        </td>
        <td>
          <span class="status-badge ${c.status.toLowerCase()}">${c.status}</span>
        </td>
        <td>
          <div class="date-cell">
            <span class="date-main">${c.displayDate}</span>
            <small class="date-relative">${c.relativeDate}</small>
          </div>
        </td>
        <td>
          <div class="reason-cell">
            ${reasonDisplay}
          </div>
        </td>
        <td>
          <div class="delay-cell">
            ${delayDisplay}
          </div>
        </td>
        <td>
          <div class="timestamp-cell">
            <span class="timestamp-main">${c.displayTimestamp}</span>
          </div>
        </td>
        <td>
          <div class="action-buttons">
            <button class="edit-btn-enhanced" 
                    onclick="editCalloutFromAdmin(${c.id}, '${escapedUser}', '${c.status}', '${c.date}', '${escapedReason}', ${c.delay_minutes || 0})" 
                    title="Edit Callout">
              ✏️ Edit
            </button>
            <button class="delete-btn-enhanced" 
                    onclick="deleteCalloutFromAdmin(${c.id})" 
                    title="Delete Callout">
              🗑️ Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
  
  table.innerHTML = tableHeader + '<tbody>' + tableRows + '</tbody>';

  // Remove existing button and create new Add Callout button
  const existingBtn = document.getElementById("adminAddCalloutBtn");
  if (existingBtn) {
    existingBtn.remove();
  }

  // Enhanced Add Callout button (no timezone notice in tooltip)
  const addBtn = document.createElement("button");
  addBtn.textContent = "+ Add Callout";
  addBtn.id = "adminAddCalloutBtn";
  addBtn.className = "admin-add-callout-btn-enhanced";
  addBtn.title = "Add callout";
  
  // Enhanced onclick handler
  addBtn.onclick = () => {
    console.log('[adminCallouts] Opening timezone-aware add callout modal...');
    
    try {
      const currentUser = window.auth?.getCurrentUser();
      if (!currentUser) {
        alert('You must be logged in to add callouts');
        return;
      }
      
      const displayName = currentUser?.global_name || currentUser?.username || 'Unknown User';
      
      // Get current date in user's timezone
      const userTimezone = getUserTimezone();
      const today = new Date();
      const userToday = today.toLocaleDateString('en-CA', { timeZone: userTimezone });
      
      // Close admin modal
      const adminModal = document.getElementById('adminModal');
      if (adminModal) {
        adminModal.style.display = 'none';
      }
      
      // Open callout modal
      const calloutModal = document.getElementById('calloutModal');
      if (!calloutModal) {
        console.error('[adminCallouts] Callout modal not found');
        alert('Error: Callout form not available. Please refresh the page.');
        if (adminModal) adminModal.style.display = 'flex';
        return;
      }
      
      // Pre-fill form with timezone awareness
      const elements = {
        user: document.getElementById('calloutUser'),
        date: document.getElementById('calloutDate'),
        status: document.getElementById('calloutStatus'),
        reason: document.getElementById('calloutReason'),
        delay: document.getElementById('calloutDelay'),
        title: document.getElementById('calloutModalTitle'),
        outBtn: document.getElementById('statusOutBtn'),
        lateBtn: document.getElementById('statusLateBtn'),
        delayGroup: document.getElementById('delayFieldGroup'),
        charCount: document.getElementById('reasonCharCount')
      };
      
      // Check all elements exist
      const missingElements = Object.keys(elements).filter(key => !elements[key]);
      if (missingElements.length > 0) {
        console.error('[adminCallouts] Missing elements:', missingElements);
        alert(`Error: Form elements missing: ${missingElements.join(', ')}`);
        if (adminModal) adminModal.style.display = 'flex';
        return;
      }
      
      // Set form values (no timezone info shown in title)
      elements.user.value = displayName;
      elements.date.value = userToday;
      elements.status.value = 'OUT';
      elements.title.textContent = 'Add New Callout';
      
      // Set default status
      elements.outBtn.classList.add('active');
      elements.lateBtn.classList.remove('active');
      elements.delayGroup.style.display = 'none';
      
      // Clear form fields
      elements.reason.value = '';
      elements.delay.value = '';
      elements.charCount.textContent = '0';
      
      // Clear validation
      ['userValidation', 'dateValidation', 'delayValidation', 'reasonValidation'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
          element.className = 'input-validation';
          element.textContent = '';
        }
      });
      
      // Reset calendar context
      if (window.calendar) {
        window.calendar.currentEditingCallout = null;
      }
      
      // Show modal
      calloutModal.style.display = 'flex';
      
      // Focus first input
      setTimeout(() => {
        elements.user.focus();
      }, 100);
      
      console.log('[adminCallouts] Timezone-aware callout modal opened successfully');
      
    } catch (error) {
      console.error('[adminCallouts] Error opening callout form:', error);
      alert(`Error opening callout form: ${error.message}`);
      
      const adminModal = document.getElementById('adminModal');
      if (adminModal) {
        adminModal.style.display = 'flex';
      }
    }
  };

  // Add button to header
  const calloutSection = document.getElementById('calloutTableSection');
  if (calloutSection) {
    const existingHeader = calloutSection.querySelector('h3');
    if (existingHeader && !existingHeader.querySelector('#adminAddCalloutBtn')) {
      existingHeader.style.cssText = "display: inline-block; margin-bottom: 15px; margin-right: 0;";
      existingHeader.appendChild(addBtn);
    }
  }
  
  // Add table to container
  container.innerHTML = "";
  container.appendChild(table);
  
  // Setup filter listeners
  setupFilterListeners();
  
  console.log(`[adminCallouts] Rendered ${filteredCallouts.length} of ${allCallouts.length} callouts with bigger names (no IDs)`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENHANCED EDIT AND DELETE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

window.editCalloutFromAdmin = function(id, user, status, date, reason, delay) {
  console.log('[adminCallouts] Editing callout with timezone support:', id);
  
  try {
    // Close admin modal
    const adminModal = document.getElementById('adminModal');
    if (adminModal) {
      adminModal.style.display = 'none';
    }
    
    // Create callout object for editing
    const calloutData = {
      id: id,
      user: user,
      status: status,
      date: date,
      reason: reason || '',
      delay_minutes: delay || 0
    };
    
    const calloutModal = document.getElementById('calloutModal');
    if (!calloutModal) {
      console.error('[adminCallouts] Callout modal not found for editing');
      alert('Error: Cannot open edit form. Please refresh the page.');
      return;
    }
    
    // Pre-fill form for editing with timezone info
    const elements = {
      user: document.getElementById('calloutUser'),
      date: document.getElementById('calloutDate'),
      status: document.getElementById('calloutStatus'),
      reason: document.getElementById('calloutReason'),
      delay: document.getElementById('calloutDelay'),
      title: document.getElementById('calloutModalTitle'),
      outBtn: document.getElementById('statusOutBtn'),
      lateBtn: document.getElementById('statusLateBtn'),
      delayGroup: document.getElementById('delayFieldGroup'),
      charCount: document.getElementById('reasonCharCount')
    };
    
    if (elements.user) elements.user.value = user;
    if (elements.date) elements.date.value = date;
    if (elements.status) elements.status.value = status;
    if (elements.reason) elements.reason.value = reason || '';
    if (elements.delay) elements.delay.value = delay || '';
    
    // Set title (no timezone info shown)
    if (elements.title) {
      elements.title.textContent = `Edit Callout for ${formatDateDisplay(date)}`;
    }
    
    // Set status buttons
    if (elements.outBtn) elements.outBtn.classList.remove('active');
    if (elements.lateBtn) elements.lateBtn.classList.remove('active');
    
    if (status === 'LATE') {
      if (elements.lateBtn) elements.lateBtn.classList.add('active');
      if (elements.delayGroup) elements.delayGroup.style.display = 'flex';
    } else {
      if (elements.outBtn) elements.outBtn.classList.add('active');
      if (elements.delayGroup) elements.delayGroup.style.display = 'none';
    }
    
    // Update character counter
    if (elements.charCount && elements.reason) {
      elements.charCount.textContent = elements.reason.value.length;
    }
    
    // Store editing ID
    const form = document.getElementById('calloutForm');
    if (form) {
      form.dataset.editingId = id;
    }
    
    // Show modal
    calloutModal.style.display = 'flex';
    console.log('[adminCallouts] Edit modal opened with timezone support for callout:', id);
    
  } catch (error) {
    console.error('[adminCallouts] Error opening edit modal:', error);
    alert('Error opening edit form. Please try again.');
  }
}

window.deleteCalloutFromAdmin = async function(calloutId) {
  if (!confirm(`Delete callout #${calloutId}? This action cannot be undone.`)) return;
  
  try {
    console.log('[adminCallouts] Deleting callout:', calloutId);
    
    const response = await fetch(`/api/callouts/${calloutId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }
    
    // Refresh everything
    if (window.calendar && window.calendar.refreshCallouts) {
      await window.calendar.refreshCallouts();
    }
    await loadCalloutTable();
    
    // Show simple success message
    const successMsg = document.createElement('div');
    successMsg.className = 'notification-banner success-banner';
    successMsg.innerHTML = '✅ Callout deleted successfully!';
    document.body.appendChild(successMsg);
    setTimeout(() => successMsg.remove(), 3000);
    
  } catch (error) {
    console.error('[adminCallouts] Error deleting callout:', error);
    alert(`Failed to delete callout: ${error.message}`);
  }
};