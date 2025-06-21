// public_html/modules/utils/dateFormat.js
// ───────────────────────────────────────────────────────────────────────────────
// Date formatting utilities for display in the user's timezone
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Format a date (or ISO date-string) as a localized date string:
 * “Weekday, Month Day, Year”
 */
export function formatDateForUser(date, tz = null) {
  const userTz = tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dt = typeof date === 'string'
    ? new Date(date + 'T00:00:00')
    : new Date(date);
  return dt.toLocaleDateString('en-US', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
    timeZone: userTz
  });
}

/**
 * Format a date (or Date object / ISO-string) as a localized time string:
 * e.g. “3:45 PM”
 */
export function formatTimeForUser(date, tz = null) {
  const userTz = tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dt = typeof date === 'string'
    ? new Date(date)
    : new Date(date);
  return dt.toLocaleTimeString('en-US', {
    hour:     'numeric',
    minute:   '2-digit',
    timeZone: userTz
  });
}
