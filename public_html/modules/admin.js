import { loadUserTable } from './api/adminAPI.js';

document.addEventListener('DOMContentLoaded', () => {
  const adminBtn = document.querySelector('#admin-btn');
  if (adminBtn) {
    adminBtn.addEventListener('click', () => {
      document.getElementById('calendar').classList.add('hidden');
      document.getElementById('admin-panel').classList.remove('hidden');
      loadUserTable();
    });
  }
});