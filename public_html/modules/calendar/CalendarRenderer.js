// modules/calendar/CalendarRenderer.js - DOM generation and layout (180 lines)
// Handles all calendar visual rendering and layout management

import { formatDateForUser, getUserTimezone } from '../utils.js';

export class CalendarRenderer {
  constructor(calendar) {
    this.calendar = calendar;
    this.container = calendar.container;
    this.headerContainer = calendar.headerContainer;
    this.userTimezone = getUserTimezone();
  }

  // Generate calendar header with day names
  generateCalendarHeader() {
    if (!this.headerContainer) return;

    this.headerContainer.innerHTML = "";
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    dayNames.forEach((dayName) => {
      const headerCell = document.createElement("div");
      headerCell.className = "calendar-header-day";
      headerCell.textContent = dayName;
      this.headerContainer.appendChild(headerCell);
    });
    
    // Create dropdown container if it doesn't exist
    if (!document.getElementById('rolodexDropdownContainer')) {
      const mainHeader = document.getElementById('header');
      if (mainHeader) {
        const dropdownContainer = document.createElement('div');
        dropdownContainer.id = 'rolodexDropdownContainer';
        dropdownContainer.className = 'cdropdown-header';
        mainHeader.appendChild(dropdownContainer);
      }
    }
  }

  // Calculate if month needs 5 or 6 weeks
  calculateWeeksNeeded(year, month) {
    const firstDay = new Date(year, month, 1);
    const startDay = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalDaysNeeded = startDay + daysInMonth;
    return totalDaysNeeded > 35 ? 6 : 5;
  }

  // Check if date is in the past (user timezone)
  isPastDate(year, month, day) {
    const today = new Date();
    const userToday = new Date(today.toLocaleDateString('en-US', { timeZone: this.userTimezone }));
    const checkDate = new Date(year, month, day);
    return checkDate < userToday;
  }

  // Main calendar generation
  async generateCalendar() {
    if (!this.container) return;

    this.generateCalendarHeader();
    this.container.innerHTML = "";

    const firstDay = new Date(this.calendar.currentYear, this.calendar.currentMonth, 1);
    const startDay = firstDay.getDay();
    const daysInMonth = new Date(this.calendar.currentYear, this.calendar.currentMonth + 1, 0).getDate();
    const weeksNeeded = this.calculateWeeksNeeded(this.calendar.currentYear, this.calendar.currentMonth);
    
    this.container.className = `calendar-grid weeks-${weeksNeeded}`;
    this.applyFullScreenLayout();
    
    console.log(`[renderer] ${this.calendar.currentYear}-${this.calendar.currentMonth + 1} needs ${weeksNeeded} weeks`);

    let dateCounter = 1;
    const totalCells = weeksNeeded * 7;

    // Get today's date in user's timezone
    const today = new Date();
    const userToday = new Date(today.toLocaleDateString('en-US', { timeZone: this.userTimezone }));
    const todayYear = userToday.getFullYear();
    const todayMonth = userToday.getMonth();
    const todayDate = userToday.getDate();

    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement("div");
      cell.className = "calendar-day";

      if (i >= startDay && dateCounter <= daysInMonth) {
        this.createCurrentMonthCell(cell, dateCounter, todayYear, todayMonth, todayDate);
        dateCounter++;
      } else {
        this.createAdjacentMonthCell(cell, i, startDay, daysInMonth, userToday);
      }

      this.container.appendChild(cell);
    }

    this.applyFullScreenLayout();
    console.log(`[renderer] Generated ${totalCells} cells (${weeksNeeded} weeks)`);
  }

  // Create cell for current month day
  createCurrentMonthCell(cell, dateCounter, todayYear, todayMonth, todayDate) {
    const cellDate = new Date(this.calendar.currentYear, this.calendar.currentMonth, dateCounter);
    const isoDate = cellDate.toISOString().split("T")[0];
    
    cell.setAttribute("data-date", isoDate);
    
    const isToday = (this.calendar.currentYear === todayYear && 
                    this.calendar.currentMonth === todayMonth && 
                    dateCounter === todayDate);
    
    const isPastDay = this.isPastDate(this.calendar.currentYear, this.calendar.currentMonth, dateCounter);
    
    cell.innerHTML = `
      ${!isPastDay ? `<button class="add-callout-btn" data-date="${isoDate}">ADD CALLOUT</button>` : ''}
      <div class="day-number">
        <span class="callout-total-late">0</span>
        <span class="day-number-text">${dateCounter}</span>
        <span class="callout-total-out">0</span>
      </div>
      <div class="callout-split-container">
        <div class="callout-split-left"></div>
        <div class="callout-split-right"></div>
      </div>
    `;

    if (isToday) {
      cell.classList.add("current-day");
    } else if (isPastDay) {
      cell.classList.add("past-day");
    }

    // Add click handler for add button
    if (!isPastDay) {
      const addBtn = cell.querySelector('.add-callout-btn');
      if (addBtn) {
        addBtn.onclick = (e) => {
          e.stopPropagation();
          this.calendar.openCalloutModal(isoDate);
        };
      }
    }
  }

  // Create cell for adjacent month day
  createAdjacentMonthCell(cell, i, startDay, daysInMonth, userToday) {
    cell.classList.add("adjacent-month");
    
    let actualDate;
    if (i < startDay) {
      // Previous month
      const prevMonth = this.calendar.currentMonth === 0 ? 11 : this.calendar.currentMonth - 1;
      const prevYear = this.calendar.currentMonth === 0 ? this.calendar.currentYear - 1 : this.calendar.currentYear;
      const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
      const dayNumber = daysInPrevMonth - (startDay - i - 1);
      actualDate = new Date(prevYear, prevMonth, dayNumber);
    } else {
      // Next month
      const nextMonth = this.calendar.currentMonth === 11 ? 0 : this.calendar.currentMonth + 1;
      const nextYear = this.calendar.currentMonth === 11 ? this.calendar.currentYear + 1 : this.calendar.currentYear;
      const dayNumber = i - startDay - daysInMonth + 1;
      actualDate = new Date(nextYear, nextMonth, dayNumber);
    }
    
    const isoDate = actualDate.toISOString().split("T")[0];
    const dayNumber = actualDate.getDate();
    const isPastAdjacentDate = actualDate < userToday;
    
    cell.setAttribute("data-date", isoDate);
    
    cell.innerHTML = `
      ${!isPastAdjacentDate ? `<button class="add-callout-btn" data-date="${isoDate}">ADD CALLOUT</button>` : ''}
      <div class="day-number">
        <span class="callout-total-late">0</span>
        <span class="day-number-text">${dayNumber}</span>
        <span class="callout-total-out">0</span>
      </div>
      <div class="callout-split-container">
        <div class="callout-split-left"></div>
        <div class="callout-split-right"></div>
      </div>
    `;

    if (!isPastAdjacentDate) {
      const addBtn = cell.querySelector('.add-callout-btn');
      if (addBtn) {
        addBtn.onclick = (e) => {
          e.stopPropagation();
          this.calendar.openCalloutModal(isoDate);
        };
      }
    }
  }

  // Apply full screen layout
  applyFullScreenLayout() {
    if (!this.container) return;
    
    this.container.style.height = '100%';
    this.container.style.width = '100%';
    this.container.style.display = 'grid';
    this.container.style.boxSizing = 'border-box';
    
    const weeksNeeded = this.calculateWeeksNeeded(this.calendar.currentYear, this.calendar.currentMonth);
    this.container.className = `calendar-grid weeks-${weeksNeeded}`;
    
    this.container.offsetHeight; // Force reflow
    console.log(`[renderer] Full screen layout applied - ${weeksNeeded} weeks`);
  }

  // Main callout rendering method
  renderCallouts() {
    return this.updateCalendarWithCallouts();
  }

  // Update calendar with callout data
  updateCalendarWithCallouts() {
    console.log('[renderer] Updating calendar with callouts...', this.calendar.callouts);
    
    if (!this.calendar.callouts || !this.calendar.callouts.length) {
      console.log('[renderer] No callouts to display');
      return;
    }

    const dayCells = this.container.querySelectorAll(".calendar-day");

    dayCells.forEach(cell => {
      const date = cell.getAttribute("data-date");
      if (!date) return;

      const matching = this.calendar.callouts.filter(c => {
        const calloutDate = new Date(c.date).toISOString().split("T")[0];
        return calloutDate === date;
      });

      this.updateDayCell(cell, date, matching);
    });

    console.log('[renderer] Calendar updated with callouts');
  }

  // Update individual day cell with callouts
  updateDayCell(cell, date, callouts) {
    const leftCell = cell.querySelector('.callout-split-left');
    const rightCell = cell.querySelector('.callout-split-right');
    const lateTotal = cell.querySelector('.callout-total-late');
    const outTotal = cell.querySelector('.callout-total-out');

    if (!leftCell || !rightCell || !lateTotal || !outTotal) {
      console.warn(`[renderer] Split cell elements not found for date: ${date}`);
      return;
    }

    const lateCallouts = callouts.filter(c => c.status === 'LATE');
    const outCallouts = callouts.filter(c => c.status === 'OUT');

    // Update totals
    lateTotal.textContent = lateCallouts.length;
    outTotal.textContent = outCallouts.length;

    // Clear existing content
    leftCell.innerHTML = '';
    rightCell.innerHTML = '';
    leftCell.classList.remove('has-callouts', 'many-callouts', 'very-many-callouts', 'extremely-many-callouts');
    rightCell.classList.remove('has-callouts', 'many-callouts', 'very-many-callouts', 'extremely-many-callouts');

    // Render LATE callouts (left side with green delays)
    if (lateCallouts.length > 0) {
      this.renderLateCallouts(leftCell, lateCallouts, date);
    }

    // Render OUT callouts (right side)
    if (outCallouts.length > 0) {
      this.renderOutCallouts(rightCell, outCallouts, date);
    }
  }

  // Render LATE callouts with yellow names + green delays
  renderLateCallouts(leftCell, lateCallouts, date) {
    leftCell.classList.add('has-callouts');
    
    const responsiveClass = this.getResponsiveClass(lateCallouts.length);
    if (responsiveClass) {
      leftCell.classList.add(responsiveClass);
    }
    
    lateCallouts.forEach((callout) => {
      const nameElement = document.createElement('div');
      nameElement.className = 'callout-name late';
      
      const userName = callout.user;
      const delayMinutes = callout.delay_minutes;
      
      if (delayMinutes && delayMinutes > 0) {
        nameElement.innerHTML = `${userName} <span class="delay-text">+${delayMinutes}min</span>`;
      } else {
        nameElement.textContent = userName;
      }
      
      const delayText = delayMinutes ? ` (+${delayMinutes}min)` : '';
      const reasonText = callout.reason ? `\nReason: ${callout.reason}` : '';
      const dateDisplay = formatDateForUser(callout.date, this.userTimezone);
      
      nameElement.title = `LATE: ${callout.user}${delayText}\nDate: ${dateDisplay}${reasonText}\n\nClick to edit this callout`;
      
      nameElement.onclick = (e) => {
        e.stopPropagation();
        this.calendar.openCalloutModal(date, callout);
      };
      
      leftCell.appendChild(nameElement);
    });
  }

  // Render OUT callouts with red names
  renderOutCallouts(rightCell, outCallouts, date) {
    rightCell.classList.add('has-callouts');
    
    const responsiveClass = this.getResponsiveClass(outCallouts.length);
    if (responsiveClass) {
      rightCell.classList.add(responsiveClass);
    }
    
    outCallouts.forEach((callout) => {
      const nameElement = document.createElement('div');
      nameElement.className = 'callout-name out';
      nameElement.textContent = callout.user;
      
      const reasonText = callout.reason ? `\nReason: ${callout.reason}` : '';
      const dateDisplay = formatDateForUser(callout.date, this.userTimezone);
      
      nameElement.title = `OUT: ${callout.user}\nDate: ${dateDisplay}${reasonText}\n\nClick to edit this callout`;
      
      nameElement.onclick = (e) => {
        e.stopPropagation();
        this.calendar.openCalloutModal(date, callout);
      };
      
      rightCell.appendChild(nameElement);
    });
  }

  // Get responsive class based on callout count
  getResponsiveClass(count) {
    if (count >= 7) return 'extremely-many-callouts';
    if (count >= 5) return 'very-many-callouts';
    if (count >= 3) return 'many-callouts';
    return '';
  }
}