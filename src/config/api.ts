const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const configuredBase = typeof viteEnv?.VITE_TRAVWEB_API_BASE === 'string'
  ? viteEnv.VITE_TRAVWEB_API_BASE.trim()
  : '';
const API_BASE = (configuredBase || 'https://travweb-api.onrender.com').replace(/\/+$/, '');

export const TRIPGURU_OFFERS_API = `${API_BASE}/api/offers/public/tripguru`;
export const TRIPGURU_LEADS_API = `${API_BASE}/api/leads/tripguru`;
