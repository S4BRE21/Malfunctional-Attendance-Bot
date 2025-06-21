// dateFormat.js - date formatting utilities
export function formatDateForUser(date, tz = null) {
  const userTz = tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dt = typeof date === 'string' ? new Date(date + 'T00:00:00') : new Date(date);
  return dt.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: userTz
  });
}
