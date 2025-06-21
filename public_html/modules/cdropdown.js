// FIXED: Properly exported CDropdown class with full screen support
export class CDropdown {
  constructor(calendarInstance) {
    this.calendar = calendarInstance;
    this.container = document.getElementById('rolodexDropdownContainer');
  }

  render() {
    if (!this.container) {
      console.warn('[cdropdown] Container not found');
      return;
    }

    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const yearRange = [2025, 2026, 2027]; // FIXED: Limited range 2025-2027

    this.container.innerHTML = `
      <div class="cdropdown">
        <div class="cdropdown-group">
          <select id="monthSelect">
            ${months.map((m, i) => `<option value="${i}">${m}</option>`).join("")}
          </select>
        </div>

        <div class="cdropdown-group">
          <select id="yearSelect">
            ${yearRange.map(y => `<option value="${y}">${y}</option>`).join("")}
          </select>
        </div>
      </div>
    `;

    this.attachListeners();
    this.syncWithCalendar();
    console.log('[cdropdown] Dropdown rendered and synced');
  }

  attachListeners() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');

    if (monthSelect && yearSelect) {
      monthSelect.addEventListener('change', () => this.updateCalendar());
      yearSelect.addEventListener('change', () => this.updateCalendar());
    }
  }

  // FIXED: Update calendar with proper full screen layout
  async updateCalendar() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');

    const newMonth = parseInt(monthSelect.value, 10);
    const newYear = parseInt(yearSelect.value, 10);

    // FIXED: Use the new updateMonthYear method that ensures full screen
    await this.calendar.updateMonthYear(newMonth, newYear);

    this.syncWithCalendar();
    
    console.log(`[cdropdown] Calendar updated to ${newYear}-${newMonth + 1}`);
  }

  syncWithCalendar() {
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');

    if (monthSelect && yearSelect) {
      monthSelect.value = this.calendar.currentMonth;
      yearSelect.value = this.calendar.currentYear;
    }
  }
}

// FIXED: Initialize only when calendar is ready (removed DOMContentLoaded wrapper)
if (typeof window !== 'undefined' && window.calendar) {
  const dropdown = new CDropdown(window.calendar);
  dropdown.render();
  dropdown.attachListeners();
  dropdown.syncWithCalendar();
  window.cdropdown = dropdown;
}