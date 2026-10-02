export function inr(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return '';
  return '₹' + Math.round(amount).toLocaleString('en-IN');
}

const DAY = new Intl.DateTimeFormat('en-IN', { weekday: 'short' });
const LONG = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const WHEN = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export const weekday = (d: Date) => DAY.format(d);
export const longDate = (d: Date) => LONG.format(d);
export const dateTime = (d: Date) => WHEN.format(d);

export function time12(t: string) {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 || 12;
  return m ? `${hh}:${String(m).padStart(2, '0')} ${suffix}` : `${hh} ${suffix}`;
}

export function hoursText(h: number) {
  if (h % 24 === 0 && h >= 24) return `${h / 24} day${h === 24 ? '' : 's'}`;
  return `${h} hour${h === 1 ? '' : 's'}`;
}
