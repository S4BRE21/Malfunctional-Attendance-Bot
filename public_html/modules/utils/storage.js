// storage.js - localStorage utilities
const FF_KEY = 'ffUsers';

export function getFriendsFamilyUsers() {
  try {
    const data = localStorage.getItem(FF_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function setFriendsFamilyUsers(users) {
  try {
    localStorage.setItem(FF_KEY, JSON.stringify(users));
  } catch {
    // ignore
  }
}
