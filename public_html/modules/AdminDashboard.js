// modules/AdminDashboard.js - Simplified orchestrator using composition
// REFACTORED: From 1,600 lines to ~150 lines using modular architecture

import { DashboardAPI } from './dashboard/DashboardAPI.js';
import { DashboardStats } from './dashboard/DashboardStats.js';
import { DashboardUtils } from './dashboard/DashboardUtils.js';

export class AdminDashboard {
  constructor() {
    this.container = null;
    this.currentSection = 'analytics';
    this.isOpen = false;
    
    // Composition: Use focused modules instead of massive single class
    this.api = new DashboardAPI(this);
    this.stats = new DashboardStats(this);
    this.utils = new DashboardUtils();
    
    // User Management and Callout Management modules will be imported when needed
    this.users = null;
    this.callouts = null;
    
    this.initPromise = this.initialize();
  }

  async initialize() {
    console.log('[AdminDashboard] Initializing modular admin dashboard...');
    
    // Create the dashboard container
    this.createDashboardHTML();
    
    // Attach event listeners
    this.attachEventListeners();
    
    console.log('[AdminDashboard] Modular dashboard initialized');
  }

  createDashboardHTML() {
    // Remove existing dashboard if present
    const existing = document.getElementById('adminDashboard');
    if (existing) {
      existing.remove();
    }

    // Create dashboard container - much cleaner structure
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
              <div class="dashboard-stat-item">
                <span class="dashboard-stat-label">This Week</span>
                <span class="dashboard-stat-value week" id="thisWeekCount">0</span>
              </div>
              <div class="dashboard-stat-item">
                <span class="dashboard-stat-label">Today</span>
                <span class="dashboard-stat-value today" id="todayCount">0</span>
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
            <!-- Content sections loaded by respective modules -->
            <div id="analyticsContent" class="dashboard-content-section active">
              <!-- Analytics content populated by DashboardStats.renderStatisticsDashboard() -->
            </div>
            <div id="usersContent" class="dashboard-content-section">
              <!-- Users content loaded by UserManagement module -->
            </div>
            <div id="calloutsContent" class="dashboard-content-section">
              <!-- Callouts content loaded by CalloutManagement module -->
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
      closeBtn.addEventListener('click', () => this.close());
    }

    // Quick add callout button
    const quickAddBtn = this.container.querySelector('#quickAddCallout');
    if (quickAddBtn) {
      quickAddBtn.addEventListener('click', () => this.openAddCalloutModal());
    }

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  async open() {
    console.log('[AdminDashboard] Opening modular dashboard...');
    
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

    // Load data using API module
    await this.loadDashboardData();

    // Switch to analytics by default
    this.switchSection('analytics');

    console.log('[AdminDashboard] Modular dashboard opened');
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
      console.log('[AdminDashboard] Loading dashboard data via API module...');

      // Use API module to load data
      const data = await this.api.loadDashboardData();

      // Use stats module to calculate and update statistics
      this.stats.calculateStatistics(data.users, data.callouts);
      this.stats.updateSidebarStats();

      console.log('[AdminDashboard] Data loaded via modular architecture');
    } catch (error) {
      console.error('[AdminDashboard] Error loading data:', error);
      this.utils.showErrorMessage(`Failed to load dashboard data: ${error.message}`);
    }
  }

  async switchSection(section) {
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

    // Update header and load content
    const title = this.container.querySelector('#contentTitle');
    const subtitle = this.container.querySelector('#contentSubtitle');

    switch(section) {
      case 'users':
        title.innerHTML = '<i class="fas fa-users"></i> User Management';
        subtitle.textContent = 'Manage user roles, permissions, and access controls';
        // TODO: Load UserManagement module when created
        activeContent.innerHTML = '<div style="padding: 40px; text-align: center; color: #94a3b8;">User Management module will be loaded here</div>';
        break;
      case 'callouts':
        title.innerHTML = '<i class="fas fa-calendar-alt"></i> Callout Management';
        subtitle.textContent = 'View, edit, and manage all attendance callouts';
        // TODO: Load CalloutManagement module when created
        activeContent.innerHTML = '<div style="padding: 40px; text-align: center; color: #94a3b8;">Callout Management module will be loaded here</div>';
        break;
      case 'analytics':
        title.innerHTML = '<i class="fas fa-chart-line"></i> Analytics & Reports';
        subtitle.textContent = 'Comprehensive insights and performance analytics';
        this.loadAnalyticsSection();
        break;
    }

    this.currentSection = section;
  }

  loadAnalyticsSection() {
    const analyticsContent = this.container.querySelector('#analyticsContent');
    if (analyticsContent) {
      // Use stats module to render comprehensive analytics
      analyticsContent.innerHTML = this.stats.renderStatisticsDashboard();
    }
  }

  openAddCalloutModal() {
    this.close();
    
    const calloutModal = document.getElementById('calloutModal');
    if (calloutModal && window.calendar) {
      const today = new Date().toISOString().split('T')[0];
      window.calendar.openCalloutModal(today);
    }
  }

  async refresh() {
    if (this.isOpen) {
      // Use API module to refresh data
      await this.api.refresh();
      
      // Refresh current section
      if (this.currentSection === 'analytics') {
        this.loadAnalyticsSection();
      }
    }
  }
}

// Global functions for backwards compatibility
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
