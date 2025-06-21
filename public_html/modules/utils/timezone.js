// timezone.js - timezone utilities
export function getServerTimezone() {
  return 'America/New_York';
}

export function getUserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return getServerTimezone();
  }
}

function getOffsetMinutes(timezone, date) {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const tzDate = new Date(
    new Date(utcMs).toLocaleString('en-US', { timeZone: timezone })
  );
  return (date.getTime() - tzDate.getTime()) / 60000;
}

export function convertToServerTime(date, userTimezone = null) {
  const sourceTz = userTimezone || getUserTimezone();
  const serverTz = getServerTimezone();
  const srcDate = typeof date === 'string'
    ? new Date(date + 'T12:00:00')
    : new Date(date);
  const offsetSrc = getOffsetMinutes(sourceTz, srcDate);
  const offsetSrv = getOffsetMinutes(serverTz, srcDate);
  const dtMs = srcDate.getTime() + (offsetSrc - offsetSrv) * 60000;
  return new Date(dtMs);
}

export function convertFromServerTime(date, targetTimezone = null) {
  const serverTz = getServerTimezone();
  const userTz = targetTimezone || getUserTimezone();
  const srvDate = new Date(date);
  const offsetSrv = getOffsetMinutes(serverTz, srvDate);
  const offsetUsr = getOffsetMinutes(userTz, srvDate);
  const dtMs = srvDate.getTime() + (offsetSrv - offsetUsr) * 60000;
  return new Date(dtMs);
}

export function convertUserTodayToServerDate(dateStr, userTz, serverTz) {
  const [y, m, d] = dateStr.split('-').map(n => parseInt(n, 10));
  const utcMid = new Date(Date.UTC(y, m - 1, d));
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: serverTz,
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
  return fmt.format(utcMid);
}
