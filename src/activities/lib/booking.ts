// What a traveller has picked on a product page, which dates are open, and
// what it costs. Pure functions, no React, so the cart and checkout (Phase 2)
// price things exactly as the product page did.
import type { Availability, Policy, ProductOption } from './types';

export type PaxType = 'adult' | 'child' | 'senior';
export const PAX_TYPES: PaxType[] = ['adult', 'child', 'senior'];

export function isoDate(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseIso(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// When an activity on `date` starts, for notice purposes: its first time
// slot, or 9 am when it has none.
function startOf(date: string, a: Availability) {
  const d = parseIso(date);
  const [h, min] = (a.times[0] || '09:00').split(':').map(Number);
  d.setHours(h, min, 0, 0);
  return d;
}

export function isOpen(date: string, a: Availability, now = new Date()) {
  if (a.from && date < a.from) return false;
  if (a.until && date > a.until) return false;
  if (a.closed.includes(date)) return false;
  if (a.weekdays.length && !a.weekdays.includes(parseIso(date).getDay())) return false;
  return startOf(date, a).getTime() - now.getTime() >= a.leadHours * 3600 * 1000;
}

export function openDates(a: Availability, days = 120, now = new Date()) {
  const out: string[] = [];
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let i = 0; i < days; i += 1) {
    const s = isoDate(d);
    if (isOpen(s, a, now)) out.push(s);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function sellableTypes(o: ProductOption): PaxType[] {
  if (o.pricingUnit === 'per_unit') return [];
  return PAX_TYPES.filter((t) => o.prices[t] !== null && o.prices[t] !== undefined);
}

export type Counts = Record<PaxType | 'unit', number>;

export function total(o: ProductOption, counts: Counts) {
  if (o.pricingUnit === 'per_unit') return (o.prices.unit || 0) * counts.unit;
  return sellableTypes(o).reduce((sum, t) => sum + (o.prices[t] || 0) * counts[t], 0);
}

export function people(o: ProductOption, counts: Counts) {
  if (o.pricingUnit === 'per_unit') return counts.unit;
  return sellableTypes(o).reduce((n, t) => n + counts[t], 0);
}

// Free cancellation deadline, in words, for a chosen date.
export function freeUntil(policy: Policy, date: string, a: Availability) {
  const free = policy.tiers.filter((t) => t.refund === 100).sort((x, y) => y.hours - x.hours).pop();
  if (!free || !date) return null;
  const deadline = new Date(startOf(date, a).getTime() - free.hours * 3600 * 1000);
  return deadline;
}
