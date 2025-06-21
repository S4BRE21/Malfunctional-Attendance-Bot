// modules/adminDashboard.js - FIXED VERSION - Export issue resolved
// Integrates with existing adminAPI.js and adminCallouts.js

class AdminDashboard {
  constructor() {
    this.container = null;
    this.currentSection = 'analytics';
    this.isOpen = false;
    this.users = [];
    this.callouts = [];
    this.stats = {};
    
    this.initPromise = this.initialize();
  }

  async initialize() {
    console.log('[AdminDashboard] Initializing modern admin dashboard...');
    
    // Create the dashboard container
    this.createDashboardHTML();
    
    // Attach event listeners
    this.attachEventListeners();
    
    console.log('[AdminDashboard] Dashboard initialized');
  }

  createDashboardHTML() {
    // Remove existing dashboard if present
    const existing = document.getElementById('adminDashboard');
    if (existing) {
      existing.remove();
    }

    // Create dashboard container
    const dashboardHTML = `
      <div id="adminDashboard" class="admin-dashboard-container">
        <!-- Sidebar -->
        <div class="admin-dashboard-sidebar">
          <!-- Header -->
          <div class="dashboard-sidebar-header">
            <div class="dashboard-user-greeting" id="dashboardUserGreeting">
              Hello <span class="name">Admin</span>
            </div>
            <div class="dashboard-panel-title">
              <i class="fas fa-cogs"></i>
              Admin Panel
            </div>
          </div>

          <!-- Navigation -->
          <nav class="dashboard-sidebar-nav">
            <div class="dashboard-nav-item">
              <div class="dashboard-nav-link" data-section="users">
                <div class="dashboard-nav-link-content">
                  <i class="fas fa-users dashboard-nav-icon"></i>
                  <span>User Management</span>
                </div>
                <span class="dashboard-nav-badge" id="usersBadgeCount">0</span>
              </div>
            </div>

            <div class="dashboard-nav-item">
              <div class="dashboard-nav-link" data-section="callouts">
                <div class="dashboard-nav-link-content">
                  <i class="fas fa-calendar-alt dashboard-nav-icon"></i>
                  <span>Callout Management</span>
                </div>
                <span class="dashboard-nav-badge" id="calloutsBadgeCount">0</span>
              </div>
            </div>

            <div class="dashboard-nav-item">
              <div class="dashboard-nav-link active" data-section="analytics">
                <div class="dashboard-nav-link-content">
                  <i class="fas fa-chart-line dashboard-nav-icon"></i>
                  <span>Analytics & Reports</span>
                </div>
              </div>
            </div>
          </nav>

          <!-- Quick Stats -->
          <div class="dashboard-sidebar-section">
            <div class="dashboard-section-title">
              <i class="fas fa-bolt"></i>
              Quick Stats
            </div>
            <div class="dashboard-stat-grid" id="quickStatsGrid">
              <div class="dashboard-stat-item">
                <span class="dashboard-stat-label">Officers</span>
                <span class="dashboard-stat-value officers" id="officersCount">0</span>
              </div>
              <div class="dashboard-stat-item">
                <span class="dashboard-stat-label">Raiders</span>
                <span class="dashboard-stat-value raiders" id="raidersCount">0</span>
              </div>
              <div class="dashboard-stat-item">
                <span class="dashboard-stat-label">Friends & Family</span>
                <span class="dashboard-stat-value ff" id="ffCount">0</span>
              </div>
              <div class="dashboard-stat-item">
                <span class="dashboard-stat-label">Total Callouts</span>
                <span class="dashboard-stat-value callouts" id="totalCalloutsCount">0</span>
              </div>
            </div>
          </div>

          <!-- Recent Activity -->
          <div class="dashboard-sidebar-section">
            <div class="dashboard-section-title">
              <i class="fas fa-chart-bar"></i>
              Recent Activity
            </div>
            <div class="dashboard-stat-grid" id="recentActivityGrid">
              <div class="dashboard-stat-item">
                <span class="dashboard-stat-label">This Week</span>
                <span class="dashboard-stat-value week" id="thisWeekCount">0</span>
              </div>
              <div class="dashboard-stat-item">
                <span class="dashboard-stat-label">Today</span>
                <span class="dashboard-stat-value today" id="todayCount">0</span>
              </div>
              <div class="dashboard-stat-item">
                <span class="dashboard-stat-label">Late</span>
                <span class="dashboard-stat-value late" id="weekLateCount">0</span>
              </div>
              <div class="dashboard-stat-item">
                <span class="dashboard-stat-label">Out</span>
                <span class="dashboard-stat-value out" id="weekOutCount">0</span>
              </div>
            </div>
          </div>

          <!-- Callouts for Today -->
          <div class="dashboard-sidebar-section">
            <div class="dashboard-section-title">
              <i class="fas fa-clock"></i>
              Callouts for Today
            </div>
            <div class="dashboard-stat-grid" id="todayCalloutsGrid">
              <div class="dashboard-stat-item">
                <span class="dashboard-stat-label">Late</span>
                <span class="dashboard-stat-value late" id="todayLateCount">0</span>
              </div>
              <div class="dashboard-stat-item">
                <span class="dashboard-stat-label">Out</span>
                <span class="dashboard-stat-value out" id="todayOutCount">0</span>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="dashboard-quick-actions">
            <button class="dashboard-quick-action-btn" id="quickAddCallout">
              <i class="fas fa-plus"></i>
              Add Callout
            </button>
          </div>
        </div>

        <!-- Main Content -->
        <div class="admin-dashboard-content">
          <!-- Content Header -->
          <div class="dashboard-content-header">
            <div>
              <div class="dashboard-content-title" id="contentTitle">
                <i class="fas fa-chart-line"></i>
                Analytics & Reports
              </div>
              <div class="dashboard-content-subtitle" id="contentSubtitle">
                Comprehensive insights and performance analytics
              </div>
            </div>
            <button class="dashboard-close-btn" id="closeDashboard">
              <i class="fas fa-times"></i>
              Close
            </button>
          </div>

          <!-- Content Body -->
          <div class="dashboard-content-body">
            <!-- Analytics Content (Default) -->
            <div id="analyticsContent" class="dashboard-content-section active">
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center;">
                <div style="width: 160px; height: 160px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1)); border: 2px solid rgba(59, 130, 246, 0.2); border-radius: 24px; display: flex; align-items: center; justify-content: center; margin-bottom: 32px; font-size: 4rem; color: #3b82f6; box-shadow: 0 8px 32px rgba(59, 130, 246, 0.2); backdrop-filter: blur(10px);">
                  <i class="fas fa-chart-pie"></i>
                </div>
                <div style="font-size: 1.875rem; font-weight: 700; color: #f8fafc; margin-bottom: 12px; letter-spacing: -0.025em;">Analytics Dashboard</div>
                <div style="font-size: 1.125rem; color: #94a3b8; max-width: 480px; line-height: 1.6;">
                  Advanced reporting and data visualization tools coming soon. Monitor user activity, track trends, and generate comprehensive reports.
                </div>
              </div>
            </div>

            <!-- Users Content -->
            <div id="usersContent" class="dashboard-content-section">
              <div class="dashboard-stats-cards" id="usersStatsCards">
                <div class="dashboard-stat-card">
                  <div class="dashboard-stat-card-number officers">Loading...</div>
                  <div class="dashboard-stat-card-label">Officers</div>
                </div>
                <div class="dashboard-stat-card">
                  <div class="dashboard-stat-card-number raiders">Loading...</div>
                  <div class="dashboard-stat-card-label">Raiders</div>
                </div>
                <div class="dashboard-stat-card">
                  <div class="dashboard-stat-card-number ff">Loading...</div>
                  <div class="dashboard-stat-card-label">Friends & Family</div>
                </div>
                <div class="dashboard-stat-card">
                  <div class="dashboard-stat-card-number">Loading...</div>
                  <div class="dashboard-stat-card-label">Total Users</div>
                </div>
              </div>
              <div class="dashboard-data-container">
                <div class="dashboard-table-header">
                  <i class="fas fa-users"></i>
                  User Management
                </div>
                <div class="dashboard-table-content" id="usersTableContent">
                  <div style="padding: 20px; text-align: center; color: #94a3b8;">
                    Loading user data...
                  </div>
                </div>
              </div>
            </div>

            <!-- Callouts Content -->
            <div id="calloutsContent" class="dashboard-content-section">
              <div class="dashboard-stats-cards" id="calloutsStatsCards">
                <div class="dashboard-stat-card">
                  <div class="dashboard-stat-card-number callouts">Loading...</div>
                  <div class="dashboard-stat-card-label">Total Callouts</div>
                </div>
                <div class="dashboard-stat-card">
                  <div class="dashboard-stat-card-number week">Loading...</div>
                  <div class="dashboard-stat-card-label">This Week</div>
                </div>
                <div class="dashboard-stat-card">
                  <div class="dashboard-stat-card-number today">Loading...</div>
                  <div class="dashboard-stat-card-label">Today</div>
                </div>
                <div class="dashboard-stat-card">
                  <div class="dashboard-stat-card-number">Loading...</div>
                  <div class="dashboard-stat-card-label">Active Users</div>
                </div>
              </div>
              <div class="dashboard-data-container">
                <div class="dashboard-table-header">
                  <i class="fas fa-calendar-alt"></i>
                  Callout Management
                </div>
                <div class="dashboard-table-content" id="calloutsTableContent">
                  <div style="padding: 20px; text-align: center; color: #94a3b8;">
                    Loading callout data...
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', dashboardHTML);
    this.container = document.getElementById('adminDashboard');
  }

  attachEventListeners() {
    if (!this.container) return;

    // Navigation links
    this.container.querySelectorAll('.dashboard-nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.dataset.section;
        this.switchSection(section);
      });
    });

    // Close button
    const closeBtn = this.container.querySelector('#closeDashboard');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.close();
      });
    }

    // Quick add callout button
    const quickAddBtn = this.container.querySelector('#quickAddCallout');
    if (quickAddBtn) {
      quickAddBtn.addEventListener('click', () => {
        this.openAddCalloutModal();
      });
    }

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  async open() {
    console.log('[AdminDashboard] Opening dashboard...');
    
    if (!this.container) {
      console.error('[AdminDashboard] Container not found');
      return;
    }

    // Update user greeting
    const currentUser = window.auth?.getCurrentUser();
    if (currentUser) {
      const greeting = this.container.querySelector('#dashboardUserGreeting');
      if (greeting) {
        const displayName = currentUser.global_name || currentUser.username || 'Admin';
        greeting.innerHTML = `Hello <span class="name">${displayName}</span>`;
      }
    }

    // Show dashboard
    this.container.classList.add('active');
    this.isOpen = true;

    // Load data
    await this.loadDashboardData();

    // Switch to analytics by default
    this.switchSection('analytics');

    console.log('[AdminDashboard] Dashboard opened');
  }

  close() {
    console.log('[AdminDashboard] Closing dashboard...');
    
    if (this.container) {
      this.container.classList.remove('active');
    }
    this.isOpen = false;

    console.log('[AdminDashboard] Dashboard closed');
  }

  async loadDashboardData() {
    try {
      console.log('[AdminDashboard] Loading dashboard data...');

      // Try to fetch data from APIs
      let users = [];
      let callouts = [];

      try {
        const { fetchUsers } = await import('./api/adminAPI.js');
        users = await fetchUsers();
        console.log('[AdminDashboard] Loaded users:', users.length);
      } catch (error) {
        console.warn('[AdminDashboard] Could not load users:', error);
      }

      try {
        const { fetchCallouts } = await import('./api/calloutAPI.js');
        callouts = await fetchCallouts();
        console.log('[AdminDashboard] Loaded callouts:', callouts.length);
      } catch (error) {
        console.warn('[AdminDashboard] Could not load callouts:', error);
      }

      this.users = users;
      this.callouts = callouts;

      // Calculate statistics
      this.calculateStatistics();

      // Update sidebar stats
      this.updateSidebarStats();

      console.log('[AdminDashboard] Data loaded successfully');
    } catch (error) {
      console.error('[AdminDashboard] Error loading data:', error);
    }
  }

  calculateStatistics() {
    // User stats
    const adminCount = this.users.filter(u => u.is_admin).length;
    const ffUsers = this.getFriendsFamilyUsers();
    const ffCount = ffUsers.length;
    const raiderCount = this.users.length - ffCount; // Everyone else (including admins) is a raider

    // Callout stats
    const totalCallouts = this.callouts.length;
    
    // This week's callouts
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const thisWeekCallouts = this.callouts.filter(c => new Date(c.date) >= startOfWeek);
    
    // Today's callouts
    const today = new Date().toISOString().split('T')[0];
    const todayCallouts = this.callouts.filter(c => c.date === today);

    // Status breakdown
    const weekLateCallouts = thisWeekCallouts.filter(c => c.status === 'LATE');
    const weekOutCallouts = thisWeekCallouts.filter(c => c.status === 'OUT');
    const todayLateCallouts = todayCallouts.filter(c => c.status === 'LATE');
    const todayOutCallouts = todayCallouts.filter(c => c.status === 'OUT');

    this.stats = {
      adminCount,
      raiderCount,
      ffCount,
      totalUsers: this.users.length,
      totalCallouts,
      thisWeekCallouts: thisWeekCallouts.length,
      todayCallouts: todayCallouts.length,
      weekLateCallouts: weekLateCallouts.length,
      weekOutCallouts: weekOutCallouts.length,
      todayLateCallouts: todayLateCallouts.length,
      todayOutCallouts: todayOutCallouts.length
    };

    console.log('[AdminDashboard] Calculated stats:', this.stats);
  }

  getFriendsFamilyUsers() {
    try {
      const ffUsers = JSON.parse(localStorage.getItem('ffUsers') || '[]');
      return this.users.filter(user => ffUsers.includes(user.id));
    } catch (e) {
      return [];
    }
  }

  updateSidebarStats() {
    const stats = this.stats;

    // Update badge counts
    const usersBadge = this.container.querySelector('#usersBadgeCount');
    const calloutsBadge = this.container.querySelector('#calloutsBadgeCount');
    
    if (usersBadge) usersBadge.textContent = stats.totalUsers;
    if (calloutsBadge) calloutsBadge.textContent = stats.totalCallouts;

    // Update quick stats
    const elements = {
      officersCount: stats.adminCount,
      raidersCount: stats.raiderCount,
      ffCount: stats.ffCount,
      totalCalloutsCount: stats.totalCallouts,
      thisWeekCount: stats.thisWeekCallouts,
      todayCount: stats.todayCallouts,
      weekLateCount: stats.weekLateCallouts,
      weekOutCount: stats.weekOutCallouts,
      todayLateCount: stats.todayLateCallouts,
      todayOutCount: stats.todayOutCallouts
    };

    Object.entries(elements).forEach(([id, value]) => {
      const element = this.container.querySelector(`#${id}`);
      if (element) {
        element.textContent = value;
      }
    });
  }

  switchSection(section) {
    console.log(`[AdminDashboard] Switching to section: ${section}`);

    // Update navigation
    this.container.querySelectorAll('.dashboard-nav-link').forEach(link => {
      link.classList.remove('active');
    });
    
    const activeLink = this.container.querySelector(`[data-section="${section}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
    }

    // Update content
    this.container.querySelectorAll('.dashboard-content-section').forEach(content => {
      content.classList.remove('active');
    });

    const activeContent = this.container.querySelector(`#${section}Content`);
    if (activeContent) {
      activeContent.classList.add('active');
    }

    // Update header
    const title = this.container.querySelector('#contentTitle');
    const subtitle = this.container.querySelector('#contentSubtitle');

    switch(section) {
      case 'users':
        title.innerHTML = '<i class="fas fa-users"></i> User Management';
        subtitle.textContent = 'Manage user roles, permissions, and access controls';
        this.loadUsersSection();
        break;
      case 'callouts':
        title.innerHTML = '<i class="fas fa-calendar-alt"></i> Callout Management';
        subtitle.textContent = 'View, edit, and manage all attendance callouts';
        this.loadCalloutsSection();
        break;
      case 'analytics':
        title.innerHTML = '<i class="fas fa-chart-line"></i> Analytics & Reports';
        subtitle.textContent = 'Comprehensive insights and performance analytics';
        break;
    }

    this.currentSection = section;
  }

  async loadUsersSection() {
    console.log('[AdminDashboard] Loading users section...');
    
    const statsCards = this.container.querySelector('#usersStatsCards');
    const tableContent = this.container.querySelector('#usersTableContent');

    if (statsCards) {
      statsCards.innerHTML = `
        <div class="dashboard-stat-card">
          <div class="dashboard-stat-card-number officers">${this.stats.adminCount}</div>
          <div class="dashboard-stat-card-label">Officers</div>
        </div>
        <div class="dashboard-stat-card">
          <div class="dashboard-stat-card-number raiders">${this.stats.raiderCount}</div>
          <div class="dashboard-stat-card-label">Raiders</div>
        </div>
        <div class="dashboard-stat-card">
          <div class="dashboard-stat-card-number ff">${this.stats.ffCount}</div>
          <div class="dashboard-stat-card-label">Friends & Family</div>
        </div>
        <div class="dashboard-stat-card">
          <div class="dashboard-stat-card-number">${this.stats.totalUsers}</div>
          <div class="dashboard-stat-card-label">Total Users</div>
        </div>
      `;
    }

    if (tableContent) {
      // Generate actual user table content
      await this.generateUserTable(tableContent);
    }
  }

  async generateUserTable(container) {
    try {
      console.log('[AdminDashboard] Generating user table...');
      
      if (this.users.length === 0) {
        container.innerHTML = `
          <div style="padding: 40px; text-align: center; color: #94a3b8;">
            <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 16px; opacity: 0.5;"></i>
            <div style="font-size: 1.2rem; margin-bottom: 8px;">No Users Found</div>
            <div style="font-size: 0.9rem;">Unable to load user data from the server.</div>
          </div>
        `;
        return;
      }

      // Sort users: Admins first, then by name
      const sortedUsers = [...this.users].sort((a, b) => {
        if (a.is_admin && !b.is_admin) return -1;
        if (!a.is_admin && b.is_admin) return 1;
        const nameA = (a.global_name || a.username || '').toLowerCase();
        const nameB = (b.global_name || b.username || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });

      // Generate table HTML
      let tableHTML = `
        <table style="width: 100%; border-collapse: collapse; color: #f8fafc;">
          <thead>
            <tr style="background: rgba(59, 130, 246, 0.1); border-bottom: 1px solid rgba(148, 163, 184, 0.2);">
              <th style="padding: 16px; text-align: left; font-weight: 600; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.1em;">User</th>
              <th style="padding: 16px; text-align: center; font-weight: 600; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.1em;">Role</th>
              <th style="padding: 16px; text-align: center; font-weight: 600; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.1em;">Actions</th>
            </tr>
          </thead>
          <tbody>
      `;

      sortedUsers.forEach(user => {
        const userName = user.global_name || user.username || 'Unknown';
        const userAvatar = userName.charAt(0).toUpperCase();
        const isAdmin = user.is_admin;
        const isFF = this.getFriendsFamilyUsers().some(ffUser => ffUser.id === user.id);
        const isDarkSparrow = user.id === '232260865452146688';
        
        let roleText = 'RAIDER';
        let roleClass = 'raiders';
        
        if (isAdmin) {
          roleText = 'OFFICER 👑';
          roleClass = 'officers';
        } else if (isFF) {
          roleText = 'FRIENDS & FAMILY';
          roleClass = 'ff';
        }

        tableHTML += `
          <tr style="border-bottom: 1px solid rgba(148, 163, 184, 0.1); transition: background 0.2s ease;" 
              onmouseover="this.style.background='rgba(59, 130, 246, 0.05)'"
              onmouseout="this.style.background='transparent'">
            <td style="padding: 16px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #4caf50, #2e7d32); display: flex; align-items: center; justify-content: center; font-weight: bold; color: white;">
                  ${userAvatar}
                </div>
                <div>
                  <div style="font-weight: 600; font-size: 1.1rem; color: #f8fafc;">${userName}</div>
                  <div style="font-size: 0.8rem; color: #94a3b8; font-family: monospace;">${user.id}</div>
                </div>
              </div>
            </td>
            <td style="padding: 16px; text-align: center;">
              <span style="color: ${roleClass === 'officers' ? '#fbbf24' : roleClass === 'ff' ? '#06b6d4' : '#10b981'}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; padding: 0.4rem 1rem; border: 2px solid; border-radius: 6px; font-size: 0.8rem; display: inline-block;">
                ${roleText}
              </span>
            </td>
            <td style="padding: 16px; text-align: center;">
              <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; max-width: 300px; margin: 0 auto;">
                <button onclick="window.adminDashboard.promoteUser('${user.id}')" 
                        style="background: none; border: 2px solid #10b981; color: #10b981; border-radius: 6px; padding: 0.4rem 0.8rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; ${isAdmin ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
                        ${isAdmin ? 'disabled' : ''}
                        onmouseover="if(!this.disabled) { this.style.background = 'rgba(16, 185, 129, 0.15)'; this.style.transform = 'translateY(-1px)'; }"
                        onmouseout="if(!this.disabled) { this.style.background = 'none'; this.style.transform = 'translateY(0)'; }">
                  Promote
                </button>
                <button onclick="window.adminDashboard.toggleFF('${user.id}')" 
                        style="background: none; border: 2px solid #06b6d4; color: #06b6d4; border-radius: 6px; padding: 0.4rem 0.8rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; ${isAdmin ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
                        ${isAdmin ? 'disabled' : ''}
                        onmouseover="if(!this.disabled) { this.style.background = 'rgba(6, 182, 212, 0.15)'; this.style.transform = 'translateY(-1px)'; }"
                        onmouseout="if(!this.disabled) { this.style.background = 'none'; this.style.transform = 'translateY(0)'; }">
                  ${isFF ? '→ Raider' : '→ F&F'}
                </button>
                <button onclick="window.adminDashboard.demoteUser('${user.id}')" 
                        style="background: none; border: 2px solid #ff9800; color: #ff9800; border-radius: 6px; padding: 0.4rem 0.8rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; ${(!isAdmin || isDarkSparrow) ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
                        ${(!isAdmin || isDarkSparrow) ? 'disabled' : ''}
                        onmouseover="if(!this.disabled) { this.style.background = 'rgba(255, 152, 0, 0.15)'; this.style.transform = 'translateY(-1px)'; }"
                        onmouseout="if(!this.disabled) { this.style.background = 'none'; this.style.transform = 'translateY(0)'; }">
                  Demote
                </button>
                <button onclick="window.adminDashboard.deleteUser('${user.id}')" 
                        style="background: none; border: 2px solid #ef4444; color: #ef4444; border-radius: 6px; padding: 0.4rem 0.8rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; ${isDarkSparrow ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
                        ${isDarkSparrow ? 'disabled' : ''}
                        onmouseover="if(!this.disabled) { this.style.background = 'rgba(239, 68, 68, 0.15)'; this.style.transform = 'translateY(-1px)'; }"
                        onmouseout="if(!this.disabled) { this.style.background = 'none'; this.style.transform = 'translateY(0)'; }">
                  Delete
                </button>
              </div>
            </td>
          </tr>
        `;
      });

      tableHTML += `
          </tbody>
        </table>
      `;

      container.innerHTML = tableHTML;
      console.log('[AdminDashboard] User table generated successfully');
      
    } catch (error) {
      console.error('[AdminDashboard] Error generating user table:', error);
      container.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #ef4444;">
          <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 16px;"></i>
          <div style="font-size: 1.2rem; margin-bottom: 8px;">Error Loading Users</div>
          <div style="font-size: 0.9rem;">${error.message}</div>
        </div>
      `;
    }
  }

  async loadCalloutsSection() {
    console.log('[AdminDashboard] Loading callouts section...');
    
    const statsCards = this.container.querySelector('#calloutsStatsCards');
    const tableContent = this.container.querySelector('#calloutsTableContent');

    if (statsCards) {
      statsCards.innerHTML = `
        <div class="dashboard-stat-card">
          <div class="dashboard-stat-card-number callouts">${this.stats.totalCallouts}</div>
          <div class="dashboard-stat-card-label">Total Callouts</div>
        </div>
        <div class="dashboard-stat-card">
          <div class="dashboard-stat-card-number week">${this.stats.thisWeekCallouts}</div>
          <div class="dashboard-stat-card-label">This Week</div>
        </div>
        <div class="dashboard-stat-card">
          <div class="dashboard-stat-card-number today">${this.stats.todayCallouts}</div>
          <div class="dashboard-stat-card-label">Today</div>
        </div>
        <div class="dashboard-stat-card">
          <div class="dashboard-stat-card-number">${this.getActiveUsersCount()}</div>
          <div class="dashboard-stat-card-label">Active Users</div>
        </div>
      `;
    }

    if (tableContent) {
      await this.generateCalloutTable(tableContent);
    }
  }

  async generateCalloutTable(container) {
    try {
      console.log('[AdminDashboard] Generating callout table...');
      
      if (this.callouts.length === 0) {
        container.innerHTML = `
          <div style="padding: 40px; text-align: center; color: #94a3b8;">
            <i class="fas fa-calendar-alt" style="font-size: 3rem; margin-bottom: 16px; opacity: 0.5;"></i>
            <div style="font-size: 1.2rem; margin-bottom: 8px;">No Callouts Found</div>
            <div style="font-size: 0.9rem;">No attendance callouts have been recorded yet.</div>
          </div>
        `;
        return;
      }

      // Sort callouts by date (newest first)
      const sortedCallouts = [...this.callouts].sort((a, b) => new Date(b.date) - new Date(a.date));

      let tableHTML = `
        <table style="width: 100%; border-collapse: collapse; color: #f8fafc;">
          <thead>
            <tr style="background: rgba(59, 130, 246, 0.1); border-bottom: 1px solid rgba(148, 163, 184, 0.2);">
              <th style="padding: 16px; text-align: left; font-weight: 600; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.1em;">User</th>
              <th style="padding: 16px; text-align: center; font-weight: 600; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.1em;">Status</th>
              <th style="padding: 16px; text-align: center; font-weight: 600; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.1em;">Date</th>
              <th style="padding: 16px; text-align: center; font-weight: 600; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.1em;">Delay</th>
              <th style="padding: 16px; text-align: left; font-weight: 600; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.1em;">Reason</th>
              <th style="padding: 16px; text-align: center; font-weight: 600; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.1em;">Actions</th>
            </tr>
          </thead>
          <tbody>
      `;

      sortedCallouts.slice(0, 50).forEach(callout => { // Limit to 50 most recent
        const date = new Date(callout.date).toLocaleDateString();
        const statusColor = callout.status === 'LATE' ? '#fbbf24' : '#ef4444';
        const delayText = callout.status === 'LATE' && callout.delay_minutes ? 
          `${callout.delay_minutes} min` : 'N/A';
        const reason = callout.reason || 'No reason provided';

        tableHTML += `
          <tr style="border-bottom: 1px solid rgba(148, 163, 184, 0.1); transition: background 0.2s ease;" 
              onmouseover="this.style.background='rgba(59, 130, 246, 0.05)'"
              onmouseout="this.style.background='transparent'">
            <td style="padding: 16px;">
              <div style="font-weight: 600; color: #f8fafc;">${callout.user}</div>
            </td>
            <td style="padding: 16px; text-align: center;">
              <span style="color: ${statusColor}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; padding: 0.4rem 0.8rem; border: 2px solid ${statusColor}; border-radius: 6px; font-size: 0.8rem; display: inline-block;">
                ${callout.status}
              </span>
            </td>
            <td style="padding: 16px; text-align: center; color: #94a3b8;">
              ${date}
            </td>
            <td style="padding: 16px; text-align: center; color: #94a3b8;">
              ${delayText}
            </td>
            <td style="padding: 16px; color: #94a3b8; max-width: 200px; word-break: break-word;">
              ${reason.length > 50 ? reason.substring(0, 50) + '...' : reason}
            </td>
            <td style="padding: 16px; text-align: center;">
              <div style="display: flex; gap: 8px; justify-content: center;">
                <button onclick="window.adminDashboard.editCallout(${callout.id})" 
                        style="background: none; border: 2px solid #3b82f6; color: #3b82f6; border-radius: 6px; padding: 0.4rem 0.8rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease;"
                        onmouseover="this.style.background = 'rgba(59, 130, 246, 0.15)'; this.style.transform = 'translateY(-1px)';"
                        onmouseout="this.style.background = 'none'; this.style.transform = 'translateY(0)';">
                  Edit
                </button>
                <button onclick="window.adminDashboard.deleteCallout(${callout.id})" 
                        style="background: none; border: 2px solid #ef4444; color: #ef4444; border-radius: 6px; padding: 0.4rem 0.8rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease;"
                        onmouseover="this.style.background = 'rgba(239, 68, 68, 0.15)'; this.style.transform = 'translateY(-1px)';"
                        onmouseout="this.style.background = 'none'; this.style.transform = 'translateY(0)';">
                  Delete
                </button>
              </div>
            </td>
          </tr>
        `;
      });

      tableHTML += `
          </tbody>
        </table>
      `;

      container.innerHTML = tableHTML;
      console.log('[AdminDashboard] Callout table generated successfully');
      
    } catch (error) {
      console.error('[AdminDashboard] Error generating callout table:', error);
      container.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #ef4444;">
          <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 16px;"></i>
          <div style="font-size: 1.2rem; margin-bottom: 8px;">Error Loading Callouts</div>
          <div style="font-size: 0.9rem;">${error.message}</div>
        </div>
      `;
    }
  }

  getActiveUsersCount() {
    const uniqueUsers = new Set(this.callouts.map(c => c.user));
    return uniqueUsers.size;
  }

  openAddCalloutModal() {
    this.close();
    
    const calloutModal = document.getElementById('calloutModal');
    if (calloutModal && window.calendar) {
      const today = new Date().toISOString().split('T')[0];
      window.calendar.openCalloutModal(today);
    }
  }

  // User action methods
  async promoteUser(userId) {
    if (confirm('Promote this user to Officer?')) {
      try {
        const { promoteUser } = await import('./api/adminAPI.js');
        await promoteUser(userId);
        await this.refresh();
      } catch (error) {
        alert('Failed to promote user: ' + error.message);
      }
    }
  }

  async demoteUser(userId) {
    if (userId === '232260865452146688') {
      alert('DarkSparrow cannot be demoted - Owner protection enabled.');
      return;
    }
    if (confirm('Demote this user to Raider?')) {
      try {
        const { demoteUser } = await import('./api/adminAPI.js');
        await demoteUser(userId);
        await this.refresh();
      } catch (error) {
        alert('Failed to demote user: ' + error.message);
      }
    }
  }

  async deleteUser(userId) {
    if (userId === '232260865452146688') {
      alert('DarkSparrow cannot be deleted - Owner protection enabled.');
      return;
    }
    if (confirm('⚠️ WARNING: Delete this user?\n\nThis will permanently remove the user and ALL their callouts.\nThis action cannot be undone!')) {
      try {
        const { deleteUser } = await import('./api/adminAPI.js');
        await deleteUser(userId);
        await this.refresh();
      } catch (error) {
        alert('Failed to delete user: ' + error.message);
      }
    }
  }

  async toggleFF(userId) {
    const user = this.users.find(u => u.id === userId);
    if (!user) return;
    
    if (user.is_admin) {
      alert('Officers cannot be assigned F&F role.');
      return;
    }

    const isCurrentlyFF = this.getFriendsFamilyUsers().some(ffUser => ffUser.id === userId);
    const action = isCurrentlyFF ? 'Convert to Raider' : 'Add to F&F';
    
    if (confirm(`${action} for ${user.global_name || user.username}?`)) {
      try {
        let ffUsers = JSON.parse(localStorage.getItem('ffUsers') || '[]');
        
        if (isCurrentlyFF) {
          ffUsers = ffUsers.filter(id => id !== userId);
        } else {
          ffUsers.push(userId);
        }
        
        localStorage.setItem('ffUsers', JSON.stringify(ffUsers));
        await this.refresh();
      } catch (error) {
        alert('Failed to update F&F status: ' + error.message);
      }
    }
  }

  // Callout action methods
  async editCallout(calloutId) {
    alert('Edit callout functionality would open here for callout #' + calloutId);
  }

  async deleteCallout(calloutId) {
    if (confirm('Delete this callout? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/callouts/${calloutId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete callout');
        }
        
        await this.refresh();
        if (window.calendar && window.calendar.refreshCallouts) {
          await window.calendar.refreshCallouts();
        }
      } catch (error) {
        alert('Failed to delete callout: ' + error.message);
      }
    }
  }

  async refresh() {
    if (this.isOpen) {
      await this.loadDashboardData();
      
      // Refresh current section
      if (this.currentSection === 'users') {
        this.loadUsersSection();
      } else if (this.currentSection === 'callouts') {
        this.loadCalloutsSection();
      }
    }
  }
}

// Global functions for existing code compatibility
window.loadUserTable = async function() {
  if (window.adminDashboard) {
    await window.adminDashboard.refresh();
  }
};

window.loadCalloutTable = async function() {
  if (window.adminDashboard) {
    await window.adminDashboard.refresh();
  }
};

// FIXED: Single export statement only
export { AdminDashboard };