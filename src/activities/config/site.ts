// Where the activities section lives and how it reaches its API. Nothing in
// the section may hard-code a domain or the /activities path: everything
// goes through BASE_PATH and url(), so moving to its own domain is setting
// VITE_ACTIVITIES_BASE_PATH to "" and VITE_ACTIVITIES_API_BASE to the new API.
import brandJson from './brand.json';
import categoriesJson from './categories.json';

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env || {};

export const BASE_PATH = (env.VITE_ACTIVITIES_BASE_PATH ?? '/activities').replace(/\/+$/, '');

// The API runs inside the Nepal portal's server for now, so its address is
// derived from that one unless a dedicated address is set.
const nepalBase = (env.VITE_NEPAL_API_BASE || 'https://tripguru-nepal-api.onrender.com').replace(/\/+$/, '').replace(/\/api\/nepal$/, '');
export const API_BASE = (env.VITE_ACTIVITIES_API_BASE || `${nepalBase}/api/activities`).replace(/\/+$/, '');

// Until launch every page carries noindex, so Google does not list a half-
// stocked shop. Flip to true on launch day.
export const LAUNCHED = false;

export const brand = brandJson;
export type Category = (typeof categoriesJson.categories)[number];
export const CATEGORIES: Category[] = categoriesJson.categories;
export const categoryById = (id: string) => CATEGORIES.find((c) => c.id === id);
export const categoryBySlug = (slug: string) => CATEGORIES.find((c) => c.slug === slug);

export function url(path = '') {
  const p = path.startsWith('/') ? path : `/${path}`;
  return (BASE_PATH + (p === '/' ? '' : p)) || '/';
}

export function absoluteUrl(path = '') {
  return typeof window === 'undefined' ? url(path) : window.location.origin + url(path);
}

export function fill(template: string) {
  return template.replace(/\{name\}/g, brand.name).replace(/\{legalName\}/g, brand.legalName);
}

export const footerLine = () => fill(brand.footerLine);

export function pageTitle(title?: string) {
  return title ? `${title} | ${brand.name}` : `${brand.name} — ${brand.tagline}`;
}

export function whatsappLink(text: string) {
  return `https://wa.me/${brand.whatsappNumber}?text=${encodeURIComponent(text)}`;
}

// The text logo: the name, with the part from logoAccentFrom on in the accent
// colour. A new name with no sensible split just sets it past the end.
export function logoParts() {
  const at = Number(brand.logoAccentFrom);
  if (!Number.isFinite(at) || at <= 0 || at >= brand.name.length) return [brand.name, ''];
  return [brand.name.slice(0, at), brand.name.slice(at)];
}

// What each product feature is called on the page. Ids are stored on the
// product; labels can change here freely.
export const FEATURES: { id: string; label: string; india?: boolean }[] = [
  { id: 'hotel_pickup', label: 'Hotel pickup', india: true },
  { id: 'veg', label: 'Vegetarian meals', india: true },
  { id: 'jain', label: 'Jain meals', india: true },
  { id: 'hindi_guide', label: 'Hindi-speaking guide', india: true },
  { id: 'mobile_ticket', label: 'Mobile ticket' },
  { id: 'instant_confirmation', label: 'Instant confirmation' },
  { id: 'instant_delivery', label: 'Delivered instantly' },
  { id: 'meet_and_greet', label: 'Meet & greet' },
  { id: 'private', label: 'Private' },
  { id: 'senior_price', label: 'Senior price' },
  { id: 'skip_the_line', label: 'Skip the line' },
  { id: 'wheelchair', label: 'Wheelchair friendly' },
];
export const featureLabel = (id: string) => FEATURES.find((f) => f.id === id)?.label || id;
