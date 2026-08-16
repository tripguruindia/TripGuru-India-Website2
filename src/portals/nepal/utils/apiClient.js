// Talks to the new Nepal portal backend (server/, deployed separately on
// Render). Mirrors the pattern already used by src/config/api.ts for the
// main site's InTravWeb integration: a VITE_*_API_BASE env var with a
// sensible fallback.
//
// Phase 0 scope: only the ADMIN side of the app is wired to this API.
// B2C/B2B keep using the original localStorage-backed data (see
// data/seedData.js) until those portals get their own backend wiring.

const viteEnv = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const API_BASE = (viteEnv.VITE_NEPAL_API_BASE || 'https://tripguru-nepal-api.onrender.com')
  .replace(/\/+$/, '') + '/api/nepal';

const TOKEN_KEY = 'nepal_auth_token';
const ROLE_KEY = 'nepal_auth_role';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredRole() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ROLE_KEY);
}

export function setSession(token, role) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
}

// True only when we have both a token AND it was issued to an admin --
// this is what seedData.js checks to decide localStorage vs API.
export function isAdminSession() {
  return !!getToken() && getStoredRole() === 'admin';
}

async function apiFetch(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    clearSession();
  }

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // no body
  }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.details = data && data.details;
    throw err;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export async function apiLogin(email, password) {
  const result = await apiFetch('/auth/login', { method: 'POST', body: { email, password }, auth: false });
  setSession(result.token, result.user.role);
  return result;
}

export async function apiSignup(payload) {
  const result = await apiFetch('/auth/signup', { method: 'POST', body: payload, auth: false });
  setSession(result.token, result.user.role);
  return result;
}

export function apiLogoutLocal() {
  clearSession();
}

// ---------------------------------------------------------------------------
// Admin aggregate + generic per-resource sync used by seedData.js
// ---------------------------------------------------------------------------
export async function getAdminDb() {
  return apiFetch('/admin/db');
}

const ARRAY_RESOURCES = {
  hotels: { idKey: 'id', base: 'hotels' },
  vehicles: { idKey: 'id', base: 'vehicles' },
  activities: { idKey: 'id', base: 'activities' },
  packages: { idKey: 'id', base: 'packages' },
  routes: { idKey: 'key', base: 'routes' },
  // Leads are created by public visitors (no admin POST route exists) --
  // admin only ever removes entries, so in practice only the DELETE path
  // of syncArrayResource is exercised here.
  leads: { idKey: 'id', base: 'leads' },
  // users is intentionally excluded here -- user creation needs a password
  // and edits go through explicit handlers (handleAddUserSubmit /
  // handleEditUserSave / resetUserPassword) rather than generic array diffing.
};

async function syncArrayResource(base, idKey, oldArr, newArr) {
  const oldById = new Map((oldArr || []).map((item) => [item[idKey], item]));
  const newById = new Map((newArr || []).map((item) => [item[idKey], item]));

  const ops = [];
  for (const [id, item] of newById) {
    const prev = oldById.get(id);
    if (!prev) {
      ops.push(apiFetch(`/admin/${base}`, { method: 'POST', body: item }));
    } else if (JSON.stringify(prev) !== JSON.stringify(item)) {
      ops.push(apiFetch(`/admin/${base}/${encodeURIComponent(id)}`, { method: 'PUT', body: item }));
    }
  }
  for (const [id] of oldById) {
    if (!newById.has(id)) {
      ops.push(apiFetch(`/admin/${base}/${encodeURIComponent(id)}`, { method: 'DELETE' }));
    }
  }
  return Promise.all(ops);
}

// Diffs `newDb` against `oldDb` per top-level key and pushes only what
// changed. Called from seedData.js's saveDB() when isAdminSession() is
// true. `cities` and `settings` don't fit the id-keyed array pattern so
// they're handled directly here.
export async function syncAdminDb(oldDb, newDb) {
  const jobs = [];

  for (const key of Object.keys(ARRAY_RESOURCES)) {
    if (newDb[key] !== oldDb?.[key]) {
      const { idKey, base } = ARRAY_RESOURCES[key];
      jobs.push(syncArrayResource(base, idKey, oldDb?.[key], newDb[key]));
    }
  }

  if (newDb.cities !== oldDb?.cities) {
    jobs.push(apiFetch('/admin/cities', { method: 'PUT', body: { cities: newDb.cities } }));
  }

  if (newDb.settings !== oldDb?.settings) {
    jobs.push(apiFetch('/admin/settings', { method: 'PUT', body: newDb.settings }));
  }

  await Promise.all(jobs);
}

// ---------------------------------------------------------------------------
// Users -- explicit calls (not generic diffing) because create needs a
// password and edits never touch the password field (see resetUserPassword).
// ---------------------------------------------------------------------------
export async function createUser(payload) {
  return apiFetch('/admin/users', { method: 'POST', body: payload });
}

export async function updateUser(id, payload) {
  return apiFetch(`/admin/users/${encodeURIComponent(id)}`, { method: 'PUT', body: payload });
}

export async function deleteUser(id) {
  return apiFetch(`/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function resetUserPassword(id, newPassword) {
  return apiFetch(`/admin/users/${encodeURIComponent(id)}/reset-password`, {
    method: 'POST',
    body: { newPassword },
  });
}
