// modules/api/userAPI.js

export async function fetchCurrentUser() {
  const res = await fetch('/api/user');
  if (!res.ok) throw new Error('Failed to fetch user');
  return res.json();
}

export async function fetchAdminInfo() {
  const res = await fetch('/api/admin/info');
  if (!res.ok) throw new Error('Failed to fetch admin info');
  return res.json();
}
