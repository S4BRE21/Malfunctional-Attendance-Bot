// public_html/modules/utils/timezone.js
// ───────────────────────────────────────────────────────────────────────────────
// Timezone utilities including IANA lookups & conversions
// ───────────────────────────────────────────────────────────────────────────────

/** @returns {string} IANA zone of the server */
export function getServerTimezone() {
  return 'America/New_York';
}

/** @returns {string} IANA zone of the user (fallback to server) */
export function getUserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return getServerTimezone();
  }
}

/**
 * Return the short abbreviation for a given IANA timezone:
 * e.g. “CDT”, “PST”
 */
export function getTimezoneAbbreviation(tz = null) {
  const zone = tz || getUserTimezone();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone:     zone,
    timeZoneName: 'short'
  }).formatToParts(new Date());
  return parts.find(p => p.type === 'timeZoneName')?.value || zone;
}

function getOffsetMinutes(timezone, date) {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const tzDate = new Date(
    new Date(utcMs).toLocaleString('en-US', { timeZone: timezone })
  );
  return (date.getTime() - tzDate.getTime()) / 60000;
}

/** Convert a date (or ISO string) from user timezone → server timezone */
export function convertToServerTime(date, userTimezone = null) {
  const sourceTz = userTimezone || getUserTimezone();
  const serverTz = getServerTimezone();
  const srcDate = typeof date === 'string'
    ? new Date(date + 'T12:00:00')
    : new Date(date);
  const offsetSrc = getOffsetMinutes(sourceTz, srcDate);
  const offsetSrv = getOffsetMinutes(serverTz, srcDate);
  return new Date(srcDate.getTime() + (offsetSrc - offsetSrv) * 60000);
}

/** Convert a date (or ISO string) from server timezone → user timezone */
export function convertFromServerTime(date, targetTimezone = null) {
  const serverTz = getServerTimezone();
  const userTz   = targetTimezone || getUserTimezone();
  const srvDate  = new Date(date);
  const offsetSrv = getOffsetMinutes(serverTz, srvDate);
  const offsetUsr = getOffsetMinutes(userTz, srvDate);
  return new Date(srvDate.getTime() + (offsetSrv - offsetUsr) * 60000);
}

/**
 * Convert a “YYYY-MM-DD” string (calendar cell) in user’s zone
 * to “YYYY-MM-DD” in server’s zone.
 */
export function convertUserTodayToServerDate(dateStr, userTz, serverTz) {
  const [y, m, d] = dateStr.split('-').map(n => parseInt(n, 10));
  const utcMid = new Date(Date.UTC(y, m - 1, d));
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: serverTz,
    year:     'numeric',
    month:    '2-digit',
    day:      '2-digit'
  });
  return fmt.format(utcMid);
}
