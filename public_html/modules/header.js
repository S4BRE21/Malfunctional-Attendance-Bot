// header.js - Clean 3-column header management with horizontal user layout
import { AuthManager } from './auth.js';

export class HeaderManager {
  constructor() {
    this.container = null;
    this.auth = new AuthManager();
    this.initPromise = this.initialize();
  }

  async initialize() {
    console.log('[header] Initializing header.');
    this.container = document.getElementById('header');
    if (!this.container) {
      console.error('[header] Header container not found');
      return;
    }

    await this.auth.initPromise;

    this.auth.addEventListener('login', () => this.render());
    this.auth.addEventListener('logout', () => this.render());
    this.auth.addEventListener('error', (error) => {
      console.error('[header] Auth error:', error);
      this.render();
    });

    this.render();
    this.attachModalHandlers();
    console.log('[header] Header initialized');
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = '';
    this.container.className = 'main-header';

    const isAuthed = this.auth.isAuthenticated();
    const isAdmin = this.auth.getCurrentUser()?.isAdmin;

    // Left column: User info or login
    const leftColumn = isAuthed
      ? `<div class="user-container">${this.renderUserSection()}</div>`
      : `<div class="login-container">${this.renderLoginSection()}</div>`;

    // Center column: Logo
    const centerColumn = `<div class="logo-container">${this.renderLogoSection()}</div>`;

    // Right column: Admin controls (dropdowns + admin button)
    const rightColumn = this.renderAdminControls(isAdmin);

    this.container.innerHTML = `${leftColumn}${centerColumn}${rightColumn}`;
    this.addEventListeners();
    
    // Create dropdown container in the right column after render
    this.setupDropdownContainer();
  }

  renderUserSection() {
    const avatarUrl = this.auth.getUserAvatarUrl(64);
    const displayName = this.auth.getDisplayName();

    return `
      <div class="user-info">
        <img src="${avatarUrl}" alt="${displayName}" class="user-avatar" />
        <div class="user-details">
          <span class="user-name">${displayName}</span>
          <button id="logoutBtn" class="logout-btn" title="Logout">
            <img src="/img/discord-red.png" alt="Discord Logout" class="discord-logout-icon" />
            <span class="logout-btn-text">Logout</span>
          </button>
        </div>
      </div>
    `;
  }

  renderLoginSection() {
    return `
      <div class="login-section">
        <button id="loginBtn" class="login-btn">
          Login With Discord 
          <img src="/img/clyde.png" alt="Clyde" class="discord-icon" />
        </button>
      </div>
    `;
  }

  renderLogoSection() {
    return `
      <div class="logo-section">
        <img src="/img/logo.png" alt="Site Logo" class="site-logo" />
      </div>
    `;
  }

  renderAdminControls(isAdmin) {
    const adminButton = isAdmin 
      ? `<button id="adminBtn" class="admin-btn">Admin</button>` 
      : '';

    return `
      <div class="admin-controls">
        <div id="rolodexDropdownContainer" class="cdropdown-header"></div>
        ${adminButton}
      </div>
    `;
  }

  setupDropdownContainer() {
    // The dropdown container is now created as part of the admin controls
    // The CDropdown module will find it and populate it
    console.log('[header] Dropdown container ready for CDropdown module');
  }

  addEventListeners() {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const adminBtn = document.getElementById('adminBtn');

    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.auth.login());
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.auth.logout());
    }

    if (adminBtn) {
      adminBtn.addEventListener('click', async () => {
        console.log('[header] Opening modern admin dashboard...');
        
        try {
          // Import and initialize admin dashboard if not already done
          if (!window.adminDashboard) {
            const { AdminDashboard } = await import('./AdminDashboard.js');
            window.adminDashboard = new AdminDashboard();
            await window.adminDashboard.initPromise;
            console.log('[header] Admin dashboard initialized');
          }
          
          // Open the dashboard
          await window.adminDashboard.open();
          console.log('[header] Admin dashboard opened successfully');
          
        } catch (error) {
          console.error('[header] Error opening admin dashboard:', error);
          alert(`Error opening admin dashboard: ${error.message}`);
        }
      });
    }
  }

  attachModalHandlers() {
    const closeBtn = document.getElementById('closeAdminModal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        console.log('[admin DEBUG] Close button clicked');
        const modal = document.getElementById('adminModal');
        if (modal) {
          modal.classList.remove('show');
          modal.style.display = 'none';
          console.log('[admin DEBUG] ✅ Admin modal closed');
        }
      });
    }

    // Add tab switching functionality
    this.setupTabSwitching();
  }

  setupTabSwitching() {
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', () => {
        console.log('[admin] Switching to tab:', button.dataset.tab);
        
        // Remove active class from all tabs
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
        
        // Add active class to clicked tab
        button.classList.add('active');
        const tabId = button.dataset.tab + '-tab';
        const targetPanel = document.getElementById(tabId);
        if (targetPanel) {
          targetPanel.classList.add('active');
        }
      });
    });
  }

  async refresh() {
    console.log('[header] Refreshing header.');
    await this.auth.refresh();
    this.render();
  }

  getAuth() {
    return this.auth;
  }
}