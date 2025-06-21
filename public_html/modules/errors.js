// Module: errors.js
// Version: 1.1
// Updated: 2025-06-09
// Notes: Removed inline CSS - now uses CSS classes from components.css

let errorLog = [];

export function showError(message, context = null, duration = 8000) {
  const timestamp = new Date().toISOString();
  const error = { message, context, timestamp };

  console.error('[ERROR]', message);
  if (context) console.warn('[CONTEXT]', context);

  errorLog.push(error);
  displayErrorBanner(message, duration);
  
  // Optionally send to monitoring service
  if (window.errorReporting) {
    window.errorReporting.captureError(error);
  }
}

export function showWarning(message, context = null, duration = 5000) {
  const timestamp = new Date().toISOString();
  const warning = { message, context, timestamp, type: 'warning' };

  console.warn('[WARNING]', message);
  if (context) console.warn('[CONTEXT]', context);

  errorLog.push(warning);
  displayWarningBanner(message, duration);
}

export function showSuccess(message, duration = 3000) {
  const timestamp = new Date().toISOString();
  const success = { message, timestamp, type: 'success' };

  console.log('[SUCCESS]', message);
  errorLog.push(success);
  displaySuccessBanner(message, duration);
}

export function getErrorLog() {
  return [...errorLog]; // Return copy to prevent mutation
}

export function clearErrorLog() {
  errorLog = [];
}

export function exportErrorLog() {
  const logData = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    errors: errorLog
  };
  
  const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `error-log-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function displayErrorBanner(message, duration) {
  createBanner(message, 'error', duration);
}

function displayWarningBanner(message, duration) {
  createBanner(message, 'warning', duration);
}

function displaySuccessBanner(message, duration) {
  createBanner(message, 'success', duration);
}

function createBanner(message, type, duration) {
  // Remove existing banner of same type
  const existingBanner = document.getElementById(`${type}Banner`);
  if (existingBanner) {
    existingBanner.remove();
  }

  const banner = document.createElement("div");
  banner.id = `${type}Banner`;
  banner.className = `notification-banner ${type}-banner`;
  banner.textContent = `[${type.toUpperCase()}] ${message}`;

  // Add close button for errors and warnings - using CSS classes instead of inline styles
  if (type !== 'success') {
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.className = 'notification-close';
    closeBtn.addEventListener('click', () => banner.remove());
    banner.appendChild(closeBtn);
  }

  document.body.appendChild(banner);

  // Auto-remove after duration
  setTimeout(() => {
    if (banner && banner.parentNode) {
      banner.classList.add('slide-out');
      setTimeout(() => {
        if (banner.parentNode) {
          banner.parentNode.removeChild(banner);
        }
      }, 300);
    }
  }, duration);
}