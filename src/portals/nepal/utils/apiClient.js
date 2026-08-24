// Talks to the new Nepal portal backend (server/, deployed separately on
// Render). Mirrors the pattern already used by src/config/api.ts for the
// main site's InTravWeb integration: a VITE_*_API_BASE env var with a
// sensible fallback.
//
// Phase 0 wired up ADMIN. Phase 2 (this file's current state) wires up
// B2C/B2B too: real signup/login (same /auth/* endpoints, just no longer
// admin-only), real booking persistence, and public read-only master data
// (getPublicDb) so admin-managed cities/hotels/pricing reach travelers and
// agents instead of a static fixtures file.

const viteEnv = (typeof import.meta !== 'undefined' && import.meta.env) || {};
const API_BASE = (viteEnv.VITE_NEPAL_API_BASE || 'https://tripguru-nepal-api.onrender.com')
  .replace(/\/+$/, '') + '/api/nepal';

// Each portal (admin/b2b/b2c) is its own independent login session in this
// browser, matching the pre-existing per-route `currentUser` pattern in
// App.jsx (see its `nepal_quote_user_<route>` storage) -- you can be logged
// into Admin and B2B as different accounts in the same browser at once.
// Tokens are therefore stored in a separate slot per role rather than one
// shared slot. (An earlier version used a single shared token/role pair;
// that let a session "leak" across portals -- e.g. switching from a logged-in
// B2C tab straight to #/b2b, with no B2B login at all, would still carry the
// B2C bearer token into B2B API calls and show the traveler's own bookings
// on the agent dashboard. Discovered via live testing after the Phase 2
// deploy and fixed here.)
const TOKEN_KEY_PREFIX = 'nepal_auth_token_';

function currentRouteRole() {
  if (typeof window === 'undefined') return 'b2c';
  const hash = window.location.hash;
  if (hash.startsWith('#/b2b')) return 'b2b';
  if (hash.startsWith('#/admin')) return 'admin';
  return 'b2c';
}

// `role` defaults to whichever portal route we're currently on -- every
// caller in this file is already invoked in a route-scoped context (an
// admin-only effect, a b2c/b2b-only effect, a login handler on the active
// route, etc.) so this resolves to the right slot without callers having to
// pass it explicitly. Pass an explicit role (e.g. isAdminSession() does)
// when you need a specific portal's session regardless of the current route.
export function getToken(role = currentRouteRole()) {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY_PREFIX + role);
}

export function getStoredRole() {
  if (typeof window === 'undefined') return null;
  return getToken() ? currentRouteRole() : null;
}

export function setSession(token, role) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY_PREFIX + role, token);
}

export function clearSession(role = currentRouteRole()) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY_PREFIX + role);
}

// True only when we have a token specifically issued to an admin -- this is
// what seedData.js checks to decide localStorage vs API. Always checks the
// admin slot regardless of the current route, since it means "is there a
// genuine admin login in this browser", not "is the current route admin".
export function isAdminSession() {
  return !!getToken('admin');
}

// True when the CURRENT portal route has a real backend session -- used
// where the caller just needs "is this route logged in", not a specific role.
export function isApiSession() {
  return !!getToken();
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

// The caller's own profile: contact details and, for an agent, the agency
// branding that appears on the vouchers they send their clients. The row is
// chosen server-side from the token, so there is no id to pass.
export async function updateMyProfile(payload) {
  return apiFetch('/auth/me', { method: 'PATCH', body: payload });
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
  airports: { idKey: 'id', base: 'airports' },
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
// Which side of the border a city is on. Its own route because PUT /cities
// replaces the whole list from an array of names and has no room for it.
export async function setCityCountry(city, country) {
  return apiFetch(`/admin/cities/${encodeURIComponent(city)}/country`, {
    method: 'PATCH',
    body: { country },
  });
}

// Whole-trip vehicle rates (Admin -> Vehicle Packages).
export async function saveVehiclePackage(payload) {
  return apiFetch('/admin/vehicle-packages', { method: 'POST', body: payload });
}

export async function deleteVehiclePackage(id) {
  return apiFetch(`/admin/vehicle-packages/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// Per-city builder defaults (Admin -> City Defaults). Upsert by city name;
// deleting a city's row returns it to the built-in fallback behaviour.
export async function saveCityDefaults(city, payload) {
  return apiFetch(`/admin/city-defaults/${encodeURIComponent(city)}`, {
    method: 'PUT',
    body: payload,
  });
}

export async function deleteCityDefaults(city) {
  return apiFetch(`/admin/city-defaults/${encodeURIComponent(city)}`, { method: 'DELETE' });
}

export async function createUser(payload) {
  return apiFetch('/admin/users', { method: 'POST', body: payload });
}

export async function updateUser(id, payload) {
  return apiFetch(`/admin/users/${encodeURIComponent(id)}`, { method: 'PUT', body: payload });
}

// Approve or reject an agent account. The only route that may write
// approval_status -- an agent editing his own profile deliberately cannot.
export async function setUserApproval(id, status, note) {
  return apiFetch(`/admin/users/${encodeURIComponent(id)}/approval`, {
    method: 'PATCH',
    body: { status, note: note || '' },
  });
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

// ---------------------------------------------------------------------------
// Public master data -- no auth. Cities/hotels/vehicles/routes/activities/
// packages/settings, same shape as getAdminDb() but without bookings/leads/
// users. Used by B2C/B2B to browse real, admin-managed data instead of the
// static fixtures in data/seedData.js.
// ---------------------------------------------------------------------------
export async function getPublicDb() {
  return apiFetch('/public/db', { auth: false });
}

// ---------------------------------------------------------------------------
// Bookings -- B2C/B2B wiring. POST works both logged-in and anonymous for
// B2C (guest checkout has never required an account); B2B bookings require
// a real b2b session (enforced server-side -- agent_id/commission are never
// taken from the client).
// ---------------------------------------------------------------------------
export async function createBooking(payload) {
  // auth:true (the default) is fine even for anonymous B2C checkout --
  // apiFetch only attaches the Authorization header when a token exists.
  return apiFetch('/bookings', { method: 'POST', body: payload });
}

// Amend a booking that already exists. Used when a confirmed trip is edited,
// so a correction updates the one record instead of creating a second booking
// for the same trip and counting the money twice. Ownership is checked
// server-side against the token.
export async function updateBooking(id, payload) {
  return apiFetch(`/bookings/${id}`, { method: 'PATCH', body: payload });
}

export async function getMyBookings() {
  return apiFetch('/bookings/mine');
}

// ---------------------------------------------------------------------------
// Saved quotes -- an agent's (or logged-in traveler's) work-in-progress
// proposals, before any of them become a booking. All six endpoints require a
// real session: the server scopes every read and write to the caller's own
// agent_id/user_id, so there is no "all quotes" call to make here.
//
// Unlike the localStorage builder draft (one implicit unfinished build, tied
// to one browser), these are explicit, plural, and survive a device change.
// ---------------------------------------------------------------------------
export async function listMyQuotes(status) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiFetch(`/quotes/mine${qs}`);
}

export async function getQuote(id) {
  return apiFetch(`/quotes/${encodeURIComponent(id)}`);
}

export async function createQuote(payload) {
  return apiFetch('/quotes', { method: 'POST', body: payload });
}

// Partial update -- only the keys present in `patch` are written, so callers
// can flip a status without resending the whole itinerary.
export async function updateQuote(id, patch) {
  return apiFetch(`/quotes/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch });
}

export async function deleteQuote(id) {
  return apiFetch(`/quotes/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// Returns { booking, quote, already? }. Idempotent server-side: converting an
// already-converted quote returns the existing booking rather than making a
// second one, so a double-click can't double-book a client.
export async function convertQuote(id) {
  return apiFetch(`/quotes/${encodeURIComponent(id)}/convert`, { method: 'POST' });
}

// ---------------------------------------------------------------------------
// Wallet -- read-only for an agent (getMyWallet); admin can also view any
// agent's ledger and add manual credit/debit entries (there is no automatic
// crediting on booking creation, see server/src/routes/admin.js).
// ---------------------------------------------------------------------------
export async function getMyWallet() {
  return apiFetch('/wallet/mine');
}

export async function getAgentWallet(userId) {
  return apiFetch(`/admin/users/${encodeURIComponent(userId)}/wallet`);
}

export async function addWalletTransaction(userId, payload) {
  return apiFetch(`/admin/users/${encodeURIComponent(userId)}/wallet`, { method: 'POST', body: payload });
}
