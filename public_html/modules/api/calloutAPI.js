// modules/api/calloutAPI.js

export async function fetchCallouts() {
  const res = await fetch('/api/callouts');
  if (!res.ok) throw new Error('Failed to fetch callouts');
  return res.json();
}

export async function postCallout(data) {
  const res = await fetch('/api/callouts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to post callout');
  return res.json();
}

export async function deleteCallout(id) {
  const res = await fetch(`/api/callouts/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete callout');
  return res.json();
}
