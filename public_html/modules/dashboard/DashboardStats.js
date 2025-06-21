// modules/dashboard/DashboardStats.js - Statistics calculation and display
// Extracted from adminDashboard.js for better modularity

export class DashboardStats {
  constructor(dashboard) {
    this.dashboard = dashboard;
    this.stats = {};
  }

  // Calculate comprehensive statistics
  calculateStatistics(users = [], callouts = []) {
    console.log('[DashboardStats] Calculating statistics...');
    
    // User statistics
    const adminCount = users.filter(u => u.is_admin).length;
    const ffUsers = this.getFriendsFamilyUsers(users);
    const ffCount = ffUsers.length;
    const raiderCount = users.length - ffCount;

    // Callout statistics
    const totalCallouts = callouts.length;
    
    // This week's callouts
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const thisWeekCallouts = callouts.filter(c => new Date(c.date) >= startOfWeek);
    
    // Today's callouts
    const today = new Date().toISOString().split('T')[0];
    const todayCallouts = callouts.filter(c => c.date === today);

    // Status breakdown
    const weekLateCallouts = thisWeekCallouts.filter(c => c.status === 'LATE');
    const weekOutCallouts = thisWeekCallouts.filter(c => c.status === 'OUT');
    const todayLateCallouts = todayCallouts.filter(c => c.status === 'LATE');
    const todayOutCallouts = todayCallouts.filter(c => c.status === 'OUT');

    // Active users
    const activeUsers = new Set(callouts.map(c => c.user)).size;

    this.stats = {
      adminCount,
      raiderCount,
      ffCount,
      totalUsers: users.length,
      activeUsers,
      totalCallouts,
      thisWeekCallouts: thisWeekCallouts.length,
      todayCallouts: todayCallouts.length,
      weekLateCallouts: weekLateCallouts.length,
      weekOutCallouts: weekOutCallouts.length,
      todayLateCallouts: todayLateCallouts.length,
      todayOutCallouts: todayOutCallouts.length,
      adminPercentage: users.length > 0 ? ((adminCount / users.length) * 100).toFixed(1) : 0,
      raiderPercentage: users.length > 0 ? ((raiderCount / users.length) * 100).toFixed(1) : 0,
      ffPercentage: users.length > 0 ? ((ffCount / users.length) * 100).toFixed(1) : 0
    };

    console.log('[DashboardStats] Statistics calculated:', this.stats);
    return this.stats;
  }

  // Get Friends & Family users
  getFriendsFamilyUsers(users) {
    try {
      const ffUsers = JSON.parse(localStorage.getItem('ffUsers') || '[]');
      return users.filter(user => ffUsers.includes(user.id));
    } catch (e) {
      return [];
    }
  }

  // Update sidebar statistics display
  updateSidebarStats() {
    if (!this.dashboard.container) return;
    
    console.log('[DashboardStats] Updating sidebar statistics...');
    
    const stats = this.stats;
    const elements = {
      usersBadgeCount: stats.totalUsers,
      calloutsBadgeCount: stats.totalCallouts,
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
      const element = this.dashboard.container.querySelector(`#${id}`);
      if (element) {
        element.textContent = value;
      }
    });
  }

  // Render statistics dashboard
  renderStatisticsDashboard() {
    const stats = this.stats;
    return `
      <div class="panel-header">
        <h1 class="panel-title">🛠️ Enhanced Admin Control Panel</h1>
        <p class="panel-subtitle">Complete User & Callout Management with Role Statistics</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card admins">
          <div class="stat-number">${stats.adminCount}</div>
          <div class="stat-label">Officers</div>
          <div class="stat-percentage">${stats.adminPercentage}%</div>
        </div>
        <div class="stat-card raiders">
          <div class="stat-number">${stats.raiderCount}</div>
          <div class="stat-label">Raiders</div>
          <div class="stat-percentage">${stats.raiderPercentage}%</div>
        </div>
        <div class="stat-card friends-family">
          <div class="stat-number">${stats.ffCount}</div>
          <div class="stat-label">Friends & Family</div>
          <div class="stat-percentage">${stats.ffPercentage}%</div>
        </div>
        <div class="stat-card total-callouts">
          <div class="stat-number">${stats.totalCallouts}</div>
          <div class="stat-label">Total Callouts</div>
        </div>
      </div>

      <div class="stats-grid bottom-row">
        <div class="stat-card this-week">
          <div class="stat-number">${stats.thisWeekCallouts}</div>
          <div class="stat-label">This Week</div>
        </div>
        <div class="stat-card today">
          <div class="stat-number">${stats.todayCallouts}</div>
          <div class="stat-label">Today</div>
        </div>
        <div class="stat-card active-users">
          <div class="stat-number">${stats.activeUsers}</div>
          <div class="stat-label">Active Users</div>
        </div>
      </div>
    `;
  }

  getCurrentStats() {
    return { ...this.stats };
  }
}
