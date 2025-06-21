// string.js - string manipulation utilities
export function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

export function escapeHtml(str) {
  return str.replace(/[&<>"']/g, match => {
    const escape = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
    return escape[match];
  });
}

export function sanitizeInput(input) {
  return input.trim();
}
