// modules/api/adminAPI.js - Enhanced with statistics dashboard and role system

let allUsers = [];
let filteredUsers = [];
let currentNameFilter = 'all';
let currentRoleFilter = 'all';

export async function fetchUsers() {
  const res = await fetch('/api/admin/users');
  if (!res.ok) throw new Error('Failed to load users');
  const data = await res.json();
  return data.users || data;
}

export async function fetchCallouts() {
  const res = await fetch('/api/callouts');
  if (!res.ok) throw new Error('Failed to load callouts');
  return res.json();
}

// Calculate statistics for dashboard
function calculateStatistics(users, callouts) {
  const adminCount = users.filter(u => u.is_admin).length;
  const ffCount = users.filter(u => isUserInFFList(u.id)).length; // Only F&F users
  const raiderCount = users.length - ffCount; // Everyone else (including admins) is a raider
  const totalCallouts = callouts.length;
  
  // Calculate this week's callouts
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const thisWeekCallouts = callouts.filter(c => new Date(c.date) >= startOfWeek).length;
  
  // Calculate today's callouts
  const today = new Date().toISOString().split('T')[0];
  const todayCallouts = callouts.filter(c => c.date === today).length;
  
  return {
    adminCount,
    raiderCount,
    ffCount,
    totalUsers: users.length,
    totalCallouts,
    thisWeekCallouts,
    todayCallouts,
    adminPercentage: users.length > 0 ? ((adminCount / users.length) * 100).toFixed(1) : 0,
    raiderPercentage: users.length > 0 ? ((raiderCount / users.length) * 100).toFixed(1) : 0,
    ffPercentage: users.length > 0 ? ((ffCount / users.length) * 100).toFixed(1) : 0
  };
}

// Render statistics dashboard
function renderStatisticsDashboard(stats) {
  return `
    <!-- Panel Header -->
    <div class="panel-header">
      <h1 class="panel-title">
        🛠️ Enhanced Admin Control Panel
      </h1>
      <p class="panel-subtitle">Complete User & Callout Management with Role Statistics</p>
    </div>

    <!-- Top Statistics Grid -->
    <div class="stats-grid">
      <div class="stat-card admins">
        <div class="stat-number">${stats.adminCount}</div>
        <div class="stat-label">Officers</div>
      </div>
      <div class="stat-card raiders">
        <div class="stat-number">${stats.raiderCount}</div>
        <div class="stat-label">Raiders</div>
      </div>
      <div class="stat-card friends-family">
        <div class="stat-number">${stats.ffCount}</div>
        <div class="stat-label">Friends & Family</div>
      </div>
      <div class="stat-card total-callouts">
        <div class="stat-number">${stats.totalCallouts}</div>
        <div class="stat-label">Total Callouts</div>
      </div>
    </div>

    <!-- Bottom Statistics Grid -->
    <div class="stats-grid bottom-row">
      <div class="stat-card this-week">
        <div class="stat-number">${stats.thisWeekCallouts}</div>
        <div class="stat-label">This Week</div>
      </div>
      <div class="stat-card today">
        <div class="stat-number">${stats.todayCallouts}</div>
        <div class="stat-label">Today</div>
      </div>
    </div>
  `;
}

// Render role distribution section
function renderRoleDistribution(stats) {
  return `
    <div class="role-distribution">
      <h3 class="section-title">
        👥 User Role Distribution
      </h3>
      <div class="role-grid">
        <div class="role-card admins">
          <div class="stat-number">${stats.adminCount}</div>
          <div class="stat-label">Officers</div>
        </div>
        <div class="role-card raiders">
          <div class="stat-number">${stats.raiderCount}</div>
          <div class="stat-label">Raiders</div>
        </div>
        <div class="role-card friends-family">
          <div class="stat-number">${stats.ffCount}</div>
          <div class="stat-label">Friends & Family</div>
        </div>
      </div>
    </div>

    <!-- Summary Bar -->
    <div class="summary-bar">
      📊 ${stats.totalUsers} total users • ${stats.raiderPercentage}% Raiders • ${stats.ffPercentage}% F&F • ${stats.adminPercentage}% Officers • Server Time: EST (UTC-5)
    </div>
  `;
}

export async function loadUserTable() {
  const container = document.getElementById('userTableContainer');
  if (!container) throw new Error('User container element not found');
  
  try {
    // Fetch both users and callouts for statistics
    allUsers = await fetchUsers();
    const callouts = await fetchCallouts();
    
    // Calculate statistics
    const stats = calculateStatistics(allUsers, callouts);
    
    // Update badge counts
    const usersBadge = document.getElementById('usersBadge');
    if (usersBadge) {
      usersBadge.textContent = allUsers.length;
    }
    
    // Sort users: Admins first, then regular users, both alphabetically
    allUsers.sort((a, b) => {
      // First sort by admin status (admins first)
      if (a.is_admin && !b.is_admin) return -1;
      if (!a.is_admin && b.is_admin) return 1;
      
      // Then sort alphabetically by name within each group
      const nameA = (a.global_name || a.username).toLowerCase();
      const nameB = (b.global_name || b.username).toLowerCase();
      return nameA.localeCompare(nameB);
    });
    
    // Apply current filters
    applyUserFilters();
    
    // Render the enhanced admin panel with statistics
    container.innerHTML = `
      ${renderStatisticsDashboard(stats)}
      ${renderRoleDistribution(stats)}
      ${renderUserTable()}
    `;
    
    // Setup filter listeners
    setupUserFilterListeners();
    
  } catch (err) {
    container.innerHTML = '<div class="error">Error loading users</div>';
    console.error('[adminAPI] Failed to load user table:', err);
  }
}

// NEW: Create centered confirmation modal
function createConfirmationModal(title, message, confirmText, cancelText, onConfirm) {
  // Remove existing modal if any
  const existingModal = document.getElementById('confirmationModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  const modal = document.createElement('div');
  modal.id = 'confirmationModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10005;
    animation: fadeIn 0.2s ease-out;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: linear-gradient(145deg, #2a2d3a, #1e1f29);
    border-radius: 15px;
    padding: 2rem;
    max-width: 400px;
    width: 90%;
    color: white;
    text-align: center;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
    border: 2px solid rgba(255, 255, 255, 0.3);
    animation: modalSlideIn 0.3s ease-out;
  `;
  
  content.innerHTML = `
    <h3 style="margin-top: 0; color: #ffc107; font-size: 1.5rem; margin-bottom: 1rem;">${title}</h3>
    <p style="margin-bottom: 2rem; line-height: 1.6; color: rgba(255, 255, 255, 0.9);">${message}</p>
    <div style="display: flex; gap: 1rem; justify-content: center;">
      <button id="confirmBtn" style="
        background: #f44336;
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: background 0.2s ease;
      ">${confirmText}</button>
      <button id="cancelBtn" style="
        background: #757575;
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: background 0.2s ease;
      ">${cancelText}</button>
    </div>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Add hover effects
  const confirmBtn = content.querySelector('#confirmBtn');
  const cancelBtn = content.querySelector('#cancelBtn');
  
  confirmBtn.addEventListener('mouseenter', () => confirmBtn.style.background = '#d32f2f');
  confirmBtn.addEventListener('mouseleave', () => confirmBtn.style.background = '#f44336');
  cancelBtn.addEventListener('mouseenter', () => cancelBtn.style.background = '#616161');
  cancelBtn.addEventListener('mouseleave', () => cancelBtn.style.background = '#757575');
  
  // Handle buttons
  confirmBtn.addEventListener('click', () => {
    modal.remove();
    onConfirm();
  });
  
  cancelBtn.addEventListener('click', () => {
    modal.remove();
  });
  
  // ESC key to cancel
  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);
  
  // Click outside to cancel
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// NEW: Helper function to determine user role for display
function getUserRole(user) {
  if (user.is_admin) {
    return 'OFFICER';
  }
  
  // Check if user has F&F role (website-side only)
  if (user.ff_role || isUserInFFList(user.id)) {
    return 'F&F';
  }
  
  // Default to RAIDER
  return 'RAIDER';
}

// NEW: Helper function to check if user is in F&F list (website-side storage)
function isUserInFFList(userId) {
  try {
    const ffUsers = JSON.parse(localStorage.getItem('ffUsers') || '[]');
    return ffUsers.includes(userId);
  } catch (e) {
    return false;
  }
}

// NEW: Helper function to add/remove user from F&F list
function toggleFFRole(userId, isFF) {
  try {
    let ffUsers = JSON.parse(localStorage.getItem('ffUsers') || '[]');
    
    if (isFF && !ffUsers.includes(userId)) {
      ffUsers.push(userId);
    } else if (!isFF && ffUsers.includes(userId)) {
      ffUsers = ffUsers.filter(id => id !== userId);
    }
    
    localStorage.setItem('ffUsers', JSON.stringify(ffUsers));
    return true;
  } catch (e) {
    console.error('[adminAPI] Error managing F&F list:', e);
    return false;
  }
}

function applyUserFilters() {
  filteredUsers = allUsers.filter(user => {
    // Name filter
    if (currentNameFilter !== 'all') {
      const userName = user.global_name || user.username;
      if (userName !== currentNameFilter) {
        return false;
      }
    }
    
    // Role filter - Updated for new role system
    if (currentRoleFilter !== 'all') {
      const userRole = getUserRole(user).toLowerCase();
      if (userRole !== currentRoleFilter) {
        return false;
      }
    }
    
    return true;
  });
}

function createUserFilterDropdowns() {
  // Get unique user names
  const uniqueNames = [...new Set(allUsers.map(u => u.global_name || u.username))].sort();
  
  const nameDropdown = `
    <select id="nameFilter" class="filter-dropdown">
      <option value="all">All Names</option>
      ${uniqueNames.map(name => `
        <option value="${escapeHtml(name)}" ${currentNameFilter === name ? 'selected' : ''}>
          ${escapeHtml(name)}
        </option>
      `).join('')}
    </select>
  `;
  
  // Updated role dropdown for new system
  const roleDropdown = `
    <select id="roleFilter" class="filter-dropdown">
      <option value="all">All Roles</option>
      <option value="admin" ${currentRoleFilter === 'admin' ? 'selected' : ''}>Officer</option>
      <option value="raider" ${currentRoleFilter === 'raider' ? 'selected' : ''}>Raider</option>
      <option value="f&f" ${currentRoleFilter === 'f&f' ? 'selected' : ''}>F&F</option>
    </select>
  `;
  
  return { nameDropdown, roleDropdown };
}

function renderUserTable() {
  const { nameDropdown, roleDropdown } = createUserFilterDropdowns();
  
  // Build table HTML with filter dropdowns in headers
  let html = '<table class="admin-user-table">';
  html += `<thead>
    <tr>
      <th>${nameDropdown}</th>
      <th>${roleDropdown}</th>
      <th class="actions-header">ACTIONS</th>
    </tr>
  </thead>`;
  html += '<tbody>';
  
  filteredUsers.forEach(u => {
    const isAdmin = u.is_admin;
    const userRole = getUserRole(u);
    const isFF = userRole === 'F&F';
    const isDarkSparrow = u.id === '232260865452146688'; // DarkSparrow protection
    
    // Button states based on new role system
    const promoteDisabled = isAdmin ? 'disabled' : '';
    const demoteDisabled = (!isAdmin || isDarkSparrow) ? 'disabled' : '';
    const ffDisabled = isAdmin ? 'disabled' : ''; // Can't make admins F&F
    
    // Format user display with crown for ALL admins
    const userDisplayName = u.global_name || u.username;
    const crownIcon = isAdmin ? ' 👑' : '';
    
    // Role styling based on new system
    let roleClass = '';
    let roleText = '';
    
    switch (userRole) {
      case 'OFFICER':
        roleClass = 'role-admin';
        roleText = 'OFFICER 👑';
        break;
      case 'F&F':
        roleClass = 'role-ff';
        roleText = 'FRIENDS & FAMILY';
        break;
      case 'RAIDER':
      default:
        roleClass = 'role-raider';
        roleText = 'RAIDER';
        break;
    }
    
    // Generate avatar letter from first character of name
    const avatarLetter = userDisplayName.charAt(0).toUpperCase();
    
    html += `<tr>
      <td>
        <div class="user-info">
          <div class="user-avatar">${avatarLetter}</div>
          <div class="user-details">
            <div class="user-name">${userDisplayName}${crownIcon}</div>
            <div class="user-id">${u.id}</div>
          </div>
        </div>
      </td>
      <td><span class="${roleClass}">${roleText}</span></td>
      <td>
        <div class="action-buttons">
          <button class="btn-enhanced promote-btn" ${promoteDisabled} onclick="window.promoteUserAction('${u.id}')" title="${isAdmin ? 'Already Officer' : 'Promote to Officer'}">
            Promote
          </button>
          <button class="btn-enhanced ff-btn" ${ffDisabled} onclick="window.toggleFFAction('${u.id}')" title="${isAdmin ? 'Officers cannot be F&F' : (isFF ? 'Remove from F&F' : 'Add to F&F')}">
            ${isFF ? '→ Raider' : '→ F&F'}
          </button>
          <button class="btn-enhanced demote-btn" ${demoteDisabled} onclick="window.demoteUserAction('${u.id}')" title="${isDarkSparrow ? 'Owner protection - cannot be demoted' : (!isAdmin ? 'Not an Officer' : 'Demote to Raider')}">
            Demote
          </button>
          <button class="btn-enhanced delete-btn" ${isDarkSparrow ? 'disabled' : ''} onclick="window.deleteUserAction('${u.id}')" title="${isDarkSparrow ? 'Owner protection - cannot be deleted' : 'Delete User'}">
            Delete
          </button>
        </div>
      </td>
    </tr>`;
  });
  html += '</tbody></table>';
  
  return html;
}

function setupUserFilterListeners() {
  const nameFilter = document.getElementById('nameFilter');
  const roleFilter = document.getElementById('roleFilter');
  
  if (nameFilter) {
    nameFilter.addEventListener('change', (e) => {
      currentNameFilter = e.target.value;
      applyUserFilters();
      refreshTable();
    });
  }
  
  if (roleFilter) {
    roleFilter.addEventListener('change', (e) => {
      currentRoleFilter = e.target.value;
      applyUserFilters();
      refreshTable();
    });
  }
}

function refreshTable() {
  const container = document.getElementById('userTableContainer');
  if (!container) return;
  
  // Only refresh the table part, not the whole dashboard
  const tableContainer = container.querySelector('.admin-user-table').parentNode;
  if (tableContainer) {
    tableContainer.innerHTML = renderUserTable();
    setupUserFilterListeners();
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export async function promoteUser(id) {
  const res = await fetch(`/api/admin/promote/${id}`, { method: 'PUT' });
  if (!res.ok) throw new Error('Failed to promote user');
  return res.json();
}

export async function demoteUser(id) {
  const res = await fetch(`/api/admin/demote/${id}`, { method: 'PUT' });
  if (!res.ok) throw new Error('Failed to demote user');
  return res.json();
}

export async function deleteUser(id) {
  const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete user');
  return res.json();
}

// NEW: F&F toggle function (website-side only)
export function toggleFFUser(id) {
  const user = allUsers.find(u => u.id === id);
  if (!user) return false;
  
  const currentRole = getUserRole(user);
  const newIsFF = currentRole !== 'F&F';
  
  return toggleFFRole(id, newIsFF);
}

// UPDATED: Streamlined actions - single confirmation, immediate refresh
window.promoteUserAction = async function(id) {
  const user = allUsers.find(u => u.id === id);
  const userName = user ? (user.global_name || user.username) : 'User';
  
  createConfirmationModal(
    'Promote to Officer',
    `Promote ${userName} to OFFICER role?`,
    'Promote',
    'Cancel',
    async () => {
      try {
        await promoteUser(id);
        await loadUserTable(); // Immediate refresh
      } catch (err) {
        alert('Failed to promote user');
        console.error(err);
      }
    }
  );
};

window.demoteUserAction = async function(id) {
  // Protect DarkSparrow from demotion
  if (id === '232260865452146688') {
    alert('DarkSparrow cannot be demoted - Owner protection enabled.');
    return;
  }
  
  const user = allUsers.find(u => u.id === id);
  const userName = user ? (user.global_name || user.username) : 'User';
  
  createConfirmationModal(
    'Demote to Raider',
    `Demote ${userName} to RAIDER role?`,
    'Demote',
    'Cancel',
    async () => {
      try {
        await demoteUser(id);
        toggleFFRole(id, false); // Also remove from F&F list if they were F&F
        await loadUserTable(); // Immediate refresh
      } catch (err) {
        alert('Failed to demote user');
        console.error(err);
      }
    }
  );
};

// UPDATED: F&F toggle action
window.toggleFFAction = async function(id) {
  const user = allUsers.find(u => u.id === id);
  if (!user) return;
  
  const currentRole = getUserRole(user);
  const isCurrentlyFF = currentRole === 'F&F';
  const userName = user.global_name || user.username;
  
  if (user.is_admin) {
    alert('Officers cannot be assigned F&F role.');
    return;
  }
  
  const action = isCurrentlyFF ? 'Convert to Raider' : 'Add to F&F';
  const description = isCurrentlyFF 
    ? `Convert ${userName} from Friends & Family to Raider?`
    : `Add ${userName} to Friends & Family?`;
  
  createConfirmationModal(
    action,
    description,
    action,
    'Cancel',
    async () => {
      try {
        const success = toggleFFUser(id);
        if (success) {
          await loadUserTable(); // Immediate refresh
        } else {
          alert('Failed to update F&F status');
        }
      } catch (err) {
        alert('Failed to update F&F status');
        console.error(err);
      }
    }
  );
};

window.deleteUserAction = async function(id) {
  // Protect DarkSparrow from deletion
  if (id === '232260865452146688') {
    alert('DarkSparrow cannot be deleted - Owner protection enabled.');
    return;
  }
  
  const user = allUsers.find(u => u.id === id);
  const userName = user ? (user.global_name || user.username) : 'User';
  
  createConfirmationModal(
    'Delete User',
    `⚠️ WARNING: Delete ${userName}?\n\nThis will permanently remove the user and ALL their callouts.\nThis action cannot be undone!`,
    'Delete',
    'Cancel',
    async () => {
      try {
        await deleteUser(id);
        toggleFFRole(id, false); // Also remove from F&F list
        await loadUserTable(); // Immediate refresh
        // Also refresh callouts table if it exists since we deleted user's callouts
        if (window.loadCalloutTable) {
          await window.loadCalloutTable();
        }
      } catch (err) {
        alert('Failed to delete user');
        console.error(err);
      }
    }
  );
};

// Add CSS for modal animations
const modalStyles = document.createElement('style');
modalStyles.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes modalSlideIn {
    from { transform: scale(0.8); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
`;
document.head.appendChild(modalStyles);