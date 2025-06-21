// modules/dashboard/DashboardAPI.js - Data fetching and API integration
// Extracted from adminDashboard.js for better separation of concerns

export class DashboardAPI {
  constructor(dashboard) {
    this.dashboard = dashboard;
    this.users = [];
    this.callouts = [];
  }

  // Fetch users from API
  async fetchUsers() {
    try {
      console.log('[DashboardAPI] Fetching users...');
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch users`);
      }
      const data = await response.json();
      this.users = data.users || data;
      console.log(`[DashboardAPI] Fetched ${this.users.length} users`);
      return this.users;
    } catch (error) {
      console.error('[DashboardAPI] Error fetching users:', error);
      this.users = [];
      throw error;
    }
  }

  // Fetch callouts from API
  async fetchCallouts() {
    try {
      console.log('[DashboardAPI] Fetching callouts...');
      const response = await fetch('/api/callouts');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch callouts`);
      }
      this.callouts = await response.json();
      console.log(`[DashboardAPI] Fetched ${this.callouts.length} callouts`);
      return this.callouts;
    } catch (error) {
      console.error('[DashboardAPI] Error fetching callouts:', error);
      this.callouts = [];
      throw error;
    }
  }

  // Load all dashboard data
  async loadDashboardData() {
    try {
      console.log('[DashboardAPI] Loading dashboard data...');

      // Fetch data in parallel for better performance
      const [users, callouts] = await Promise.allSettled([
        this.fetchUsers(),
        this.fetchCallouts()
      ]);

      // Handle users result
      if (users.status === 'fulfilled') {
        this.users = users.value;
      } else {
        console.warn('[DashboardAPI] Failed to load users:', users.reason);
        this.users = [];
      }

      // Handle callouts result
      if (callouts.status === 'fulfilled') {
        this.callouts = callouts.value;
      } else {
        console.warn('[DashboardAPI] Failed to load callouts:', callouts.reason);
        this.callouts = [];
      }

      console.log('[DashboardAPI] Data loaded successfully');
      return {
        users: this.users,
        callouts: this.callouts
      };
    } catch (error) {
      console.error('[DashboardAPI] Error loading dashboard data:', error);
      throw error;
    }
  }

  // User management API calls
  async promoteUser(userId) {
    try {
      console.log(`[DashboardAPI] Promoting user ${userId}...`);
      const response = await fetch(`/api/admin/promote/${userId}`, { 
        method: 'PUT' 
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log(`[DashboardAPI] User ${userId} promoted successfully`);
      return result;
    } catch (error) {
      console.error(`[DashboardAPI] Error promoting user ${userId}:`, error);
      throw error;
    }
  }

  async demoteUser(userId) {
    try {
      console.log(`[DashboardAPI] Demoting user ${userId}...`);
      const response = await fetch(`/api/admin/demote/${userId}`, { 
        method: 'PUT' 
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log(`[DashboardAPI] User ${userId} demoted successfully`);
      return result;
    } catch (error) {
      console.error(`[DashboardAPI] Error demoting user ${userId}:`, error);
      throw error;
    }
  }

  async deleteUser(userId) {
    try {
      console.log(`[DashboardAPI] Deleting user ${userId}...`);
      const response = await fetch(`/api/admin/users/${userId}`, { 
        method: 'DELETE' 
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log(`[DashboardAPI] User ${userId} deleted successfully`);
      return result;
    } catch (error) {
      console.error(`[DashboardAPI] Error deleting user ${userId}:`, error);
      throw error;
    }
  }

  // Callout management API calls
  async deleteCallout(calloutId) {
    try {
      console.log(`[DashboardAPI] Deleting callout ${calloutId}...`);
      const response = await fetch(`/api/callouts/${calloutId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      console.log(`[DashboardAPI] Callout ${calloutId} deleted successfully`);
      return true;
    } catch (error) {
      console.error(`[DashboardAPI] Error deleting callout ${calloutId}:`, error);
      throw error;
    }
  }

  // Refresh all data
  async refresh() {
    try {
      console.log('[DashboardAPI] Refreshing all data...');
      await this.loadDashboardData();
      
      // Notify dashboard components to update
      if (this.dashboard.stats) {
        this.dashboard.stats.calculateStatistics(this.users, this.callouts);
        this.dashboard.stats.updateSidebarStats();
      }

      console.log('[DashboardAPI] Data refresh complete');
      return {
        users: this.users,
        callouts: this.callouts
      };
    } catch (error) {
      console.error('[DashboardAPI] Error refreshing data:', error);
      throw error;
    }
  }

  // Getters for cached data
  getUsers() { return this.users; }
  getCallouts() { return this.callouts; }
  getUserById(userId) { return this.users.find(user => user.id === userId); }
  getCalloutById(calloutId) { return this.callouts.find(callout => callout.id === calloutId); }
}
