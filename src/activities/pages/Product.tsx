import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Clock, MapPin, ShieldCheck, Ticket, X } from 'lucide-react';
import { brand, categoryById, featureLabel, FEATURES, absoluteUrl, url, whatsappLink } from '../config/site';
import { useApi, getToken } from '../lib/api';
import { Counts, freeUntil, isoDate, openDates, parseIso, people, sellableTypes, total, PaxType } from '../lib/booking';
import { dateTime, hoursText, inr, longDate, time12, weekday } from '../lib/format';
import type { Product, ProductOption } from '../lib/types';
import { CardGrid, ErrorBox, Loading, Photo, ProductCard, useSeo } from '../components/ui';
import { NotFound } from './NotFound';

const PAX_LABEL: Record<PaxType, string> = { adult: 'Adult', child: 'Child', senior: 'Senior' };

function ageRule(t: PaxType, p: Product) {
  if (t === 'child') return `${p.ages.childMin}–${p.ages.childMax} years`;
  if (t === 'senior') return `${p.ages.seniorMin}+ years`;
  return p.options.some((o) => o.prices.senior !== null) ? `${p.ages.childMax + 1}–${p.ages.seniorMin - 1} years` : `${p.ages.childMax + 1}+ years`;
}

function unitWord(category: string, n: number) {
  const one = category === 'transfer' ? 'vehicle' : category === 'esim' ? 'eSIM' : 'unit';
  return n === 1 ? one : `${one}s`;
}

// ----------------------------------------------------------- date picker
function MonthCalendar({ open, value, onPick }: { open: Set<string>; value: string; onPick: (d: string) => void }) {
  const first = value ? parseIso(value) : new Date();
  const [month, setMonth] = useState(new Date(first.getFullYear(), first.getMonth(), 1));
  const days: (Date | null)[] = [];
  for (let i = 0; i < month.getDay(); i += 1) days.push(null);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  for (let d = 1; d <= end; d += 1) days.push(new Date(month.getFullYear(), month.getMonth(), d));
  const label = month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  return (
    <div className="a-card p-3">
      <div className="flex items-center justify-between mb-2">
        <button type="button" className="a-stepper" aria-label="Previous month" onClick={() => shift(-1)}><ChevronLeft size={18} /></button>
        <span className="font-bold text-sm">{label}</span>
        <button type="button" className="a-stepper" aria-label="Next month" onClick={() => shift(1)}><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs a-muted mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          if (!d) return <span key={i} />;
          const iso = isoDate(d);
          const ok = open.has(iso);
          return (
            <button key={i} type="button" disabled={!ok} onClick={() => onPick(iso)} aria-pressed={value === iso}
              aria-label={longDate(d) + (ok ? '' : ' — not available')}
              className="a-pick a-pick-solid text-sm font-semibold text-center"
              style={{ height: 40, opacity: ok ? 1 : 0.3, textDecoration: ok ? 'none' : 'line-through' }}>
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------- booking panel
function BookingPanel({ product, onTotal }: { product: Product; onTotal: (t: { total: number; summary: string } | null) => void }) {
  const options = product.options;
  const [optionId, setOptionId] = useState(options[0]?.id || '');
  const option = options.find((o) => o.id === optionId) as ProductOption | undefined;
  const a = option?.availability;
  const dates = useMemo(() => (a ? openDates(a) : []), [a]);
  const openSet = useMemo(() => new Set(dates), [dates]);
  const [date, setDate] = useState('');
  const [showCal, setShowCal] = useState(false);
  const [time, setTime] = useState('');
  const [counts, setCounts] = useState<Counts>({ adult: 2, child: 0, senior: 0, unit: 1 });

  // Keep the picks valid when the option changes underneath them.
  useEffect(() => {
    if (date && !openSet.has(date)) setDate('');
    if (time && a && !a.times.includes(time)) setTime('');
    if (option && option.pricingUnit === 'per_person' && !sellableTypes(option).includes('adult')) {
      setCounts((c) => ({ ...c, adult: 0 }));
    }
  }, [optionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const types = option ? sellableTypes(option) : [];
  const amount = option ? total(option, counts) : 0;
  const n = option ? people(option, counts) : 0;
  const who = !option ? '' : option.pricingUnit === 'per_unit'
    ? `${counts.unit} ${unitWord(product.category, counts.unit)}`
    : types.filter((t) => counts[t]).map((t) => `${counts[t]} ${PAX_LABEL[t].toLowerCase()}${counts[t] > 1 ? 's' : ''}`).join(', ');
  const when = date ? `${weekday(parseIso(date))} ${parseIso(date).getDate()} ${parseIso(date).toLocaleDateString('en-IN', { month: 'short' })}${time ? `, ${time12(time)}` : ''}` : '';
  const summary = [who, when].filter(Boolean).join(' · ');

  useEffect(() => {
    onTotal(amount > 0 ? { total: amount, summary } : null);
  }, [amount, summary]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!option || !a) return <p className="a-muted">This experience has no options on sale right now. Ask us on WhatsApp.</p>;

  const needsDate = a.dateRequired;
  const needsTime = a.times.length > 0;
  const tooFew = n < (option.pricingUnit === 'per_unit' ? 1 : option.minPax);
  const tooMany = option.pricingUnit === 'per_person' && n > option.maxPax;
  const complete = (!needsDate || date) && (!needsTime || time) && !tooFew && !tooMany && amount > 0;
  const deadline = date ? freeUntil(product.cancellationPolicy, date, a) : null;

  const message = [
    `Hi ${brand.name}, I'd like to book:`,
    `${product.title}${options.length > 1 ? ` — ${option.name}` : ''}`,
    date && `Date: ${longDate(parseIso(date))}${time ? ` at ${time12(time)}` : ''}`,
    `Travellers: ${who}`,
    `Price shown: ${inr(amount)}`,
    absoluteUrl(`/${product.destination?.slug}/${product.slug}`),
  ].filter(Boolean).join('\n');

  const set = (k: keyof Counts, d: number) => setCounts((c) => ({ ...c, [k]: Math.max(0, c[k] + d) }));

  return (
    <div className="flex flex-col gap-5">
      {options.length > 1 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="font-extrabold mb-2">Choose an option</legend>
          {options.map((o) => {
            const base = o.pricingUnit === 'per_unit' ? o.prices.unit : o.prices.adult;
            return (
              <button key={o.id} type="button" className="a-pick p-3 flex flex-col gap-1" aria-pressed={o.id === optionId} onClick={() => setOptionId(o.id)}>
                <span className="flex justify-between gap-3 w-full">
                  <span className="font-bold text-[15px]">{o.name}</span>
                  {base ? <span className="font-extrabold whitespace-nowrap">{inr(base)}</span> : null}
                </span>
                {o.description && <span className="text-[13px] leading-snug a-muted">{o.description}</span>}
              </button>
            );
          })}
        </fieldset>
      )}

      {needsDate && (
        <fieldset className="flex flex-col gap-2">
          <legend className="font-extrabold mb-2">Pick a date</legend>
          {dates.length === 0 ? (
            <p className="text-sm a-muted">No dates are open in the next few months. Ask us on WhatsApp.</p>
          ) : (
            <>
              <div className="a-scroll-x -mx-1 px-1">
                <div className="flex gap-2 w-max">
                  {dates.slice(0, 10).map((d) => {
                    const dt = parseIso(d);
                    return (
                      <button key={d} type="button" className="a-pick a-pick-solid flex flex-col items-center justify-center" style={{ width: 60, height: 64 }}
                        aria-pressed={date === d} aria-label={longDate(dt)} onClick={() => { setDate(d); setShowCal(false); }}>
                        <span className="text-[11px] font-semibold">{weekday(dt)}</span>
                        <span className="text-lg font-extrabold leading-none">{dt.getDate()}</span>
                        <span className="text-[10px]">{dt.toLocaleDateString('en-IN', { month: 'short' })}</span>
                      </button>
                    );
                  })}
                  <button type="button" className="a-pick text-[13px] font-semibold px-3" style={{ height: 64, borderStyle: 'dashed' }}
                    aria-expanded={showCal} onClick={() => setShowCal(!showCal)}>All dates</button>
                </div>
              </div>
              {showCal && <MonthCalendar open={openSet} value={date} onPick={(d) => { setDate(d); setShowCal(false); }} />}
              {date && !dates.slice(0, 10).includes(date) && <span className="text-sm font-semibold">Selected: {longDate(parseIso(date))}</span>}
            </>
          )}
        </fieldset>
      )}

      {needsTime && (
        <fieldset className="flex flex-col gap-2">
          <legend className="font-extrabold mb-2">Pick a time</legend>
          <div className="flex flex-wrap gap-2">
            {a.times.map((t) => (
              <button key={t} type="button" className="a-pick a-pick-solid px-4 text-sm font-semibold" style={{ minHeight: 44 }}
                aria-pressed={time === t} onClick={() => setTime(t)}>{time12(t)}</button>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="flex flex-col">
        <legend className="font-extrabold mb-1">{option.pricingUnit === 'per_unit' ? 'How many?' : 'Who is going?'}</legend>
        {option.pricingUnit === 'per_unit' ? (
          <Row label={unitWord(product.category, 2).replace(/^./, (c) => c.toUpperCase())} rule={`${inr(option.prices.unit)} each`}
            value={counts.unit} dec={() => set('unit', -1)} inc={() => set('unit', 1)} min={1} max={20} />
        ) : types.map((t) => (
          <Row key={t} label={PAX_LABEL[t]} rule={`${ageRule(t, product)} · ${inr(option.prices[t])} each`}
            value={counts[t]} dec={() => set(t, -1)} inc={() => set(t, 1)} min={0} max={option.maxPax} />
        ))}
        {option.pricingUnit === 'per_person' && product.ages.childMin > 0 && (
          <span className="text-xs a-muted mt-2">Children under {product.ages.childMin} go free and do not need a ticket.</span>
        )}
        {tooFew && option.minPax > 1 && <span className="text-sm mt-2" style={{ color: 'var(--a-danger)' }}>This option needs at least {option.minPax} people.</span>}
        {tooMany && <span className="text-sm mt-2" style={{ color: 'var(--a-danger)' }}>This option takes up to {option.maxPax} people. Ask us on WhatsApp for a larger group.</span>}
      </fieldset>

      <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: 'var(--a-surface)' }}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-bold">Total</span>
          <span className="text-2xl font-extrabold">{inr(amount)}</span>
        </div>
        <span className="text-xs font-semibold" style={{ color: 'var(--a-success)' }}>Final price · GST included · no forex or card fee</span>
        {deadline && (
          <span className="text-[13px] flex items-center gap-1" style={{ color: deadline > new Date() ? 'var(--a-success)' : 'var(--a-muted)' }}>
            <ShieldCheck size={15} /> {deadline > new Date() ? `Free cancellation until ${dateTime(deadline)}` : 'Free cancellation has passed for this date'}
          </span>
        )}
      </div>

      <a href={complete ? whatsappLink(message) : undefined} target="_blank" rel="noopener" aria-disabled={!complete}
        className="a-btn a-btn-wa" style={{ minHeight: 54, fontSize: 16, opacity: complete ? 1 : 0.5, pointerEvents: complete ? 'auto' : 'none' }}>
        Book on WhatsApp
      </a>
      <span className="text-xs a-muted -mt-3 leading-relaxed">
        {complete ? 'Online payment opens soon. Our team confirms your booking and price on WhatsApp.' : `Choose ${[needsDate && !date && 'a date', needsTime && !time && 'a time', tooFew && 'travellers'].filter(Boolean).join(', ') || 'your options'} to continue.`}
      </span>
    </div>
  );
}

const Row: React.FC<{ label: string; rule: string; value: number; dec: () => void; inc: () => void; min: number; max: number }> = ({ label, rule, value, dec, inc, min, max }) => {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b" style={{ borderColor: 'var(--a-line)' }}>
      <span className="flex flex-col">
        <span className="font-bold text-[15px]">{label}</span>
        <span className="text-xs a-muted">{rule}</span>
      </span>
      <span className="flex items-center gap-2">
        <button type="button" className="a-stepper" aria-label={`Fewer: ${label}`} onClick={dec} disabled={value <= min}>−</button>
        <span className="w-6 text-center font-extrabold" aria-live="polite">{value}</span>
        <button type="button" className="a-stepper" aria-label={`More: ${label}`} onClick={inc} disabled={value >= max}>+</button>
      </span>
    </div>
  );
};

// ----------------------------------------------------------------- sections
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 pt-6 border-t" style={{ borderColor: 'var(--a-line)' }}>
      <h2 className="text-lg font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

function Facts({ product }: { product: Product }) {
  const at = product.attributes as Record<string, any>;
  const rows: [string, string][] = [];
  if (product.category === 'transfer') {
    if (at.from) rows.push(['From', at.from]);
    if (at.to) rows.push(['To', at.to]);
    if (at.vehicle) rows.push(['Vehicle', at.vehicle]);
    if (at.maxPassengers) rows.push(['Passengers', `Up to ${at.maxPassengers}`]);
    if (at.maxBags) rows.push(['Luggage', `Up to ${at.maxBags} bags`]);
  }
  if (product.category === 'esim') {
    if (at.coverage) rows.push(['Works in', at.coverage]);
    if (at.hotspot !== undefined) rows.push(['Hotspot', at.hotspot ? 'Allowed' : 'Not allowed']);
    if (at.needsUnlockedPhone) rows.push(['Your phone', 'Must be eSIM-capable and unlocked']);
  }
  if (!rows.length) return null;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[15px]">
      {rows.map(([k, v]) => (
        <React.Fragment key={k}><dt className="a-muted">{k}</dt><dd className="font-semibold m-0">{v}</dd></React.Fragment>
      ))}
    </dl>
  );
}

function PolicyTable({ product }: { product: Product }) {
  const tiers = product.cancellationPolicy.tiers;
  const rows: { when: string; what: string; tone: string }[] = [];
  tiers.forEach((t, i) => {
    const next = tiers[i - 1];
    rows.push({
      when: next ? `${hoursText(t.hours)} to ${hoursText(next.hours)} before` : `Up to ${hoursText(t.hours)} before`,
      what: t.refund === 100 ? 'Full refund' : `${t.refund}% refund`,
      tone: t.refund === 100 ? 'success' : 'accent',
    });
  });
  const last = tiers[tiers.length - 1];
  rows.push({ when: last ? `Less than ${hoursText(last.hours)} before, or no-show` : 'Any time after booking', what: 'No refund', tone: 'danger' });
  const bg = { success: 'var(--a-success-soft)', accent: 'var(--a-accent-soft)', danger: 'var(--a-danger-soft)' } as Record<string, string>;
  const fg = { success: 'var(--a-success)', accent: 'var(--a-accent-ink)', danger: 'var(--a-danger)' } as Record<string, string>;
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--a-line)' }}>
        {rows.map((r) => (
          <div key={r.when} className="flex justify-between gap-3 px-4 py-3 text-sm" style={{ background: bg[r.tone] }}>
            <span className="font-semibold">{r.when}</span>
            <span className="font-extrabold whitespace-nowrap" style={{ color: fg[r.tone] }}>{r.what}</span>
          </div>
        ))}
      </div>
      {product.cancellationPolicy.note && <p className="text-sm">{product.cancellationPolicy.note}</p>}
      <p className="text-xs a-muted">Times are counted back from the start of the activity. Refunds go back the way you paid, within 5–7 working days. If the operator cancels, you always get 100% back.</p>
    </div>
  );
}

function List({ items, icon }: { items: string[]; icon: 'yes' | 'no' | 'dot' }) {
  return (
    <ul className="flex flex-col gap-2 m-0 p-0 list-none">
      {items.map((x) => (
        <li key={x} className="flex gap-2 text-[15px] leading-snug">
          {icon === 'yes' && <Check size={18} className="shrink-0" style={{ color: 'var(--a-success)' }} />}
          {icon === 'no' && <X size={18} className="shrink-0" style={{ color: 'var(--a-danger)' }} />}
          {icon === 'dot' && <span className="shrink-0 mt-2 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--a-accent)' }} />}
          <span>{x}</span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- the page
export function ProductPage() {
  const { dest = '', product: slug = '' } = useParams();
  const { search } = useLocation();
  const preview = new URLSearchParams(search).has('preview') && !!getToken();
  const { data: p, error, loading, slow } = useApi<Product>(`/public/products/${encodeURIComponent(slug)}${preview ? '?preview=1' : ''}`, preview);
  const [sticky, setSticky] = useState<{ total: number; summary: string } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useSeo({
    title: p ? `${p.title}${p.destination ? `, ${p.destination.name}` : ''}` : undefined,
    description: p ? `${p.summary} Final price in rupees, GST included.`.trim() : undefined,
    path: `/${dest}/${slug}`,
  });

  if (error?.status === 404) return <NotFound />;
  if (loading || !p) {
    return <div className="a-wrap py-6">{error ? <ErrorBox message={error.message} /> : <Loading slow={slow} rows={1} />}</div>;
  }
  // One product, one address: an old or mistyped destination redirects.
  if (p.destination && p.destination.slug !== dest) {
    return <Navigate to={url(`/${p.destination.slug}/${p.slug}${search}`)} replace />;
  }

  const cat = categoryById(p.category);
  const indiaFeatures = FEATURES.filter((f) => f.india && p.features.includes(f.id));

  return (
    <>
      {p.status !== 'published' && (
        <div className="text-center text-sm font-bold py-2" style={{ background: 'var(--a-accent-soft)', color: 'var(--a-accent-ink)' }}>
          Draft preview — travellers cannot see this page until it is published.
          {p.attributes.sample ? ' This is a SAMPLE: check every price and fact before publishing.' : ''}
        </div>
      )}
      <div className="a-wrap pt-4 pb-28 lg:pb-12">
        <nav className="text-sm a-muted mb-3 flex flex-wrap gap-1">
          <Link to={url('/')} className="underline">Home</Link> /
          {p.destination && <Link to={url(`/${p.destination.slug}`)} className="underline">{p.destination.name}</Link>}
        </nav>

        <div className={`grid gap-3 mb-5 ${p.images.length > 1 ? 'md:grid-cols-[2fr_1fr]' : ''}`}>
          <Photo src={p.images[0]} alt={p.title} tint="#3A4A6E" label={cat?.short}
            className={`w-full rounded-2xl aspect-[16/10] ${p.images.length > 1 ? '' : 'md:aspect-[21/8]'}`} />
          {p.images.length > 1 && (
            <div className="hidden md:grid gap-3 grid-rows-2">
              {p.images.slice(1, 3).map((src) => <Photo key={src} src={src} alt="" className="w-full h-full rounded-2xl" />)}
            </div>
          )}
          {p.images.length > 1 && (
            <div className="md:hidden a-scroll-x"><div className="flex gap-2 w-max">
              {p.images.slice(1).map((src) => <Photo key={src} src={src} alt="" className="rounded-xl" style={{ width: 120, height: 80 }} />)}
            </div></div>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] items-start">
          <div className="flex flex-col gap-5 min-w-0">
            <div className="flex flex-col gap-3">
              <span className="text-sm font-semibold a-muted flex items-center gap-1 flex-wrap">
                {p.destination?.name} · {cat?.label}{p.durationText && <> · <Clock size={14} /> {p.durationText}</>}
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold leading-tight">{p.title}</h1>
              {p.summary && <p className="text-[16px] leading-relaxed">{p.summary}</p>}
              {p.features.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {p.features.map((f) => <span key={f} className="a-chip" style={{ fontSize: 13, padding: '6px 10px' }}><Check size={14} />{featureLabel(f)}</span>)}
                </div>
              )}
            </div>

            {(p.indiaNotes || indiaFeatures.length > 0) && (
              <div className="rounded-2xl p-4 flex flex-col gap-1" style={{ background: '#FFF8EC', border: '1px solid #F0D7AE' }}>
                <span className="font-extrabold text-sm" style={{ color: 'var(--a-accent-ink)' }}>Good to know for Indian travellers</span>
                <span className="text-sm leading-relaxed" style={{ color: '#5A4416' }}>
                  {[indiaFeatures.map((f) => f.label).join(' · '), p.indiaNotes].filter(Boolean).join('. ')}
                </span>
              </div>
            )}

            <div ref={panelRef} id="book" className="lg:hidden a-card p-4 scroll-mt-20">
              <BookingPanel product={p} onTotal={setSticky} />
            </div>

            {p.highlights.length > 0 && <Section title="Highlights"><List items={p.highlights} icon="dot" /></Section>}
            <Facts product={p} />
            {(p.includes.length > 0 || p.excludes.length > 0) && (
              <Section title="What's included">
                <div className="grid gap-5 sm:grid-cols-2">
                  {p.includes.length > 0 && <List items={p.includes} icon="yes" />}
                  {p.excludes.length > 0 && <List items={p.excludes} icon="no" />}
                </div>
              </Section>
            )}
            {p.itinerary.length > 0 && (
              <Section title="The day, step by step">
                <ol className="flex flex-col gap-3 m-0 p-0 list-none">
                  {p.itinerary.map((s, i) => (
                    <li key={i} className="flex gap-4 text-[15px] leading-snug">
                      <span className="shrink-0 w-20 font-extrabold" style={{ color: 'var(--a-primary)' }}>{s.time}</span><span>{s.text}</span>
                    </li>
                  ))}
                </ol>
              </Section>
            )}
            {(p.pickupInfo || p.meetingPoint) && (
              <Section title={p.pickupInfo ? 'Pickup' : 'Where to go'}>
                {p.pickupInfo && <p className="a-prose m-0 flex gap-2"><MapPin size={18} className="shrink-0 mt-1" />{p.pickupInfo}</p>}
                {p.meetingPoint && <p className="a-prose m-0 flex gap-2"><MapPin size={18} className="shrink-0 mt-1" />{p.meetingPoint}</p>}
              </Section>
            )}
            {p.howToUse && <Section title="How to use your ticket"><p className="a-prose m-0 flex gap-2"><Ticket size={18} className="shrink-0 mt-1" />{p.howToUse}</p></Section>}
            {p.description && <Section title="About this experience"><p className="a-prose m-0">{p.description}</p></Section>}
            <Section title="If your plans change"><PolicyTable product={p} /></Section>
            <Section title={`Booked with ${brand.name}, looked after by us`}>
              <p className="text-[15px] leading-relaxed m-0">Our team confirms every booking with the operator before your trip, and you can reach a real person on WhatsApp in {brand.supportLanguages}. Your GST invoice comes from {brand.legalName}.</p>
            </Section>
          </div>

          <aside className="hidden lg:block sticky top-20">
            <div className="a-card p-5 shadow-sm"><BookingPanel product={p} onTotal={() => {}} /></div>
          </aside>
        </div>

        {p.related && p.related.length > 0 && (
          <section className="mt-12 flex flex-col gap-4">
            <h2 className="text-xl font-extrabold">More in {p.destination?.name}</h2>
            <CardGrid>{p.related.map((r) => <ProductCard key={r.id} p={r} />)}</CardGrid>
          </section>
        )}
      </div>

      <div className="lg:hidden fixed left-0 right-0 bottom-0 z-30 bg-white border-t px-4 pt-3 pb-4 flex items-center justify-between gap-3"
        style={{ borderColor: 'var(--a-line)' }}>
        <span className="flex flex-col min-w-0">
          <span className="text-xs a-muted truncate">{sticky?.summary || (p.fromPrice ? 'from' : '')}</span>
          <span className="text-xl font-extrabold">{inr(sticky?.total ?? p.fromPrice?.amount)}</span>
          <span className="text-[11px] font-semibold" style={{ color: 'var(--a-success)' }}>Final price · GST incl.</span>
        </span>
        <button type="button" className="a-btn" onClick={() => panelRef.current?.scrollIntoView({ behavior: 'smooth' })}>Check dates</button>
      </div>
    </>
  );
}
