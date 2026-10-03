import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, ExternalLink, Trash2 } from 'lucide-react';
import { CATEGORIES, FEATURES, url } from '../config/site';
import { api } from '../lib/api';
import { hoursText } from '../lib/format';
import type { Availability, Destination, Policy, Product, ProductOption } from '../lib/types';
import { ErrorBox } from '../components/ui';

// ---------------------------------------------------------------- defaults
const DEFAULT_AVAILABILITY: Availability = { weekdays: [], closed: [], from: '', until: '', leadHours: 24, times: [], dateRequired: true };

const newOption = (perUnit = false): ProductOption => ({
  id: '', name: '', description: '', pricingUnit: perUnit ? 'per_unit' : 'per_person',
  prices: { adult: null, child: null, senior: null, unit: null },
  cost: { adult: null, child: null, senior: null, unit: null },
  minPax: 1, maxPax: 20, availability: { ...DEFAULT_AVAILABILITY }, active: true, sortOrder: 0,
});

const POLICY_TEMPLATES: { id: string; label: string; policy: Policy }[] = [
  { id: 'free24', label: 'Free cancellation up to 24 hours before', policy: { tiers: [{ hours: 24, refund: 100 }], note: '' } },
  { id: 'free48', label: 'Free up to 48 hours, 50% up to 24 hours', policy: { tiers: [{ hours: 48, refund: 100 }, { hours: 24, refund: 50 }], note: '' } },
  { id: 'free72', label: 'Free cancellation up to 72 hours before', policy: { tiers: [{ hours: 72, refund: 100 }], note: '' } },
  { id: 'none', label: 'Non-refundable', policy: { tiers: [], note: '' } },
];

// Category-specific facts, stored in product.attributes.
const ATTRIBUTE_FIELDS: Record<string, { key: string; label: string; type?: 'number' | 'bool'; help?: string }[]> = {
  transfer: [
    { key: 'from', label: 'From', help: 'e.g. Suvarnabhumi Airport (BKK)' },
    { key: 'to', label: 'To', help: 'e.g. Hotels in Bangkok city' },
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'maxPassengers', label: 'Most passengers', type: 'number' },
    { key: 'maxBags', label: 'Most bags', type: 'number' },
  ],
  esim: [
    { key: 'coverage', label: 'Works in', help: 'Countries covered' },
    { key: 'hotspot', label: 'Hotspot allowed', type: 'bool' },
    { key: 'needsUnlockedPhone', label: 'Needs an unlocked, eSIM-capable phone', type: 'bool' },
  ],
};

type Form = Omit<Product, 'destination' | 'fromPrice' | 'related'>;

const blank = (): Form => ({
  id: '', slug: '', destinationId: '', category: 'tour', title: '', summary: '', description: '', durationText: '',
  highlights: [], includes: [], excludes: [], itinerary: [], meetingPoint: '', pickupInfo: '', howToUse: '', indiaNotes: '',
  images: [], features: [], attributes: {}, ages: { childMin: 3, childMax: 11, seniorMin: 60 },
  cancellationPolicy: POLICY_TEMPLATES[0].policy, supplier: 'manual', status: 'draft', sortOrder: 0, options: [newOption()],
});

// ------------------------------------------------------------ small inputs
const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

const Field: React.FC<{ id: string; label: string; help?: string; children: React.ReactNode }> = ({ id, label, help, children }) => {
  return <div><label className="a-label" htmlFor={id}>{label}</label>{children}{help && <p className="a-help">{help}</p>}</div>;
};

// Text areas that edit a list, one item per line. They keep their own text so
// a blank line being typed is not swallowed on every keystroke.
function LinesArea({ id, value, onChange, rows = 4, placeholder }: { id: string; value: string[]; onChange: (v: string[]) => void; rows?: number; placeholder?: string }) {
  const [text, setText] = useState(value.join('\n'));
  useEffect(() => { if (lines(text).join('\n') !== value.join('\n')) setText(value.join('\n')); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return <textarea id={id} className="a-textarea" rows={rows} placeholder={placeholder} value={text}
    onChange={(e) => { setText(e.target.value); onChange(lines(e.target.value)); }} />;
}

function Money({ id, value, onChange, placeholder = 'Not sold' }: { id: string; value: number | null | undefined; onChange: (v: number | null) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 a-muted">₹</span>
      <input id={id} className="a-input" style={{ paddingLeft: 26 }} inputMode="numeric" placeholder={placeholder}
        value={value === null || value === undefined ? '' : String(value)}
        onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); onChange(v === '' ? null : Number(v)); }} />
    </div>
  );
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const OptionEditor: React.FC<{
  o: ProductOption; i: number; count: number; category: string;
  onChange: (o: ProductOption) => void; onRemove: () => void; onMove: (d: number) => void;
}> = ({ o, i, count, category, onChange, onRemove, onMove }) => {
  const a = o.availability;
  const setA = (patch: Partial<Availability>) => onChange({ ...o, availability: { ...a, ...patch } });
  const setP = (k: keyof ProductOption['prices'], v: number | null) => onChange({ ...o, prices: { ...o.prices, [k]: v } });
  const setC = (k: keyof ProductOption['prices'], v: number | null) => onChange({ ...o, cost: { ...(o.cost || newOption().cost!), [k]: v } });
  const id = (k: string) => `o${i}-${k}`;
  const unitWord = category === 'transfer' ? 'vehicle' : category === 'esim' ? 'eSIM' : 'unit';

  return (
    <div className="a-card p-4 flex flex-col gap-4" style={{ opacity: o.active ? 1 : 0.7 }}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-extrabold">Option {i + 1}</span>
        <span className="flex gap-1">
          <button type="button" className="a-stepper" aria-label="Move up" disabled={i === 0} onClick={() => onMove(-1)}><ArrowUp size={16} /></button>
          <button type="button" className="a-stepper" aria-label="Move down" disabled={i === count - 1} onClick={() => onMove(1)}><ArrowDown size={16} /></button>
          <button type="button" className="a-stepper" aria-label="Remove option" onClick={onRemove}><Trash2 size={16} /></button>
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field id={id('name')} label="Option name" help='e.g. "Standard camp", "Sedan (up to 3 people)", "5 GB · 8 days"'>
          <input id={id('name')} className="a-input" value={o.name} onChange={(e) => onChange({ ...o, name: e.target.value })} />
        </Field>
        <Field id={id('desc')} label="What's different about it (optional)">
          <input id={id('desc')} className="a-input" value={o.description} onChange={(e) => onChange({ ...o, description: e.target.value })} />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="a-label">How is it priced?</legend>
        <div className="flex flex-wrap gap-2">
          {(['per_person', 'per_unit'] as const).map((u) => (
            <button key={u} type="button" className="a-pick a-pick-solid px-4 text-sm font-semibold" style={{ minHeight: 44 }}
              aria-pressed={o.pricingUnit === u} onClick={() => onChange({ ...o, pricingUnit: u })}>
              {u === 'per_person' ? 'Per person (adult / child / senior)' : `Per ${unitWord}`}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <span className="a-label">Selling price — what the traveller pays, GST included</span>
        {o.pricingUnit === 'per_unit' ? (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <Field id={id('unit')} label={`Per ${unitWord}`}><Money id={id('unit')} value={o.prices.unit} onChange={(v) => setP('unit', v)} placeholder="0" /></Field>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-3">
            <Field id={id('adult')} label="Adult"><Money id={id('adult')} value={o.prices.adult} onChange={(v) => setP('adult', v)} /></Field>
            <Field id={id('child')} label="Child"><Money id={id('child')} value={o.prices.child} onChange={(v) => setP('child', v)} /></Field>
            <Field id={id('senior')} label="Senior"><Money id={id('senior')} value={o.prices.senior} onChange={(v) => setP('senior', v)} /></Field>
          </div>
        )}
        <p className="a-help">Leave a box empty if that traveller type is not sold on this option (it is not the same as ₹0).</p>
      </div>

      <details>
        <summary className="text-sm font-semibold cursor-pointer">Your cost from the operator (private — for profit reports)</summary>
        <div className="grid gap-3 grid-cols-3 mt-3">
          {o.pricingUnit === 'per_unit'
            ? <Field id={id('nunit')} label={`Per ${unitWord}`}><Money id={id('nunit')} value={o.cost?.unit} onChange={(v) => setC('unit', v)} placeholder="—" /></Field>
            : (['adult', 'child', 'senior'] as const).map((t) => (
              <Field key={t} id={id('n' + t)} label={t[0].toUpperCase() + t.slice(1)}><Money id={id('n' + t)} value={o.cost?.[t]} onChange={(v) => setC(t, v)} placeholder="—" /></Field>
            ))}
        </div>
      </details>

      {o.pricingUnit === 'per_person' && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <Field id={id('min')} label="Fewest people"><input id={id('min')} className="a-input" inputMode="numeric" value={o.minPax} onChange={(e) => onChange({ ...o, minPax: Number(e.target.value.replace(/\D/g, '')) || 1 })} /></Field>
          <Field id={id('max')} label="Most people"><input id={id('max')} className="a-input" inputMode="numeric" value={o.maxPax} onChange={(e) => onChange({ ...o, maxPax: Number(e.target.value.replace(/\D/g, '')) || 1 })} /></Field>
        </div>
      )}

      <fieldset className="flex flex-col gap-3 rounded-xl p-3" style={{ background: 'var(--a-surface)' }}>
        <legend className="a-label px-1">When can it be booked?</legend>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={a.dateRequired} onChange={(e) => setA({ dateRequired: e.target.checked })} style={{ width: 20, height: 20 }} />
          The traveller picks a date {category === 'esim' && '(usually off for eSIMs)'}
        </label>
        {a.dateRequired && (
          <>
            <div>
              <span className="a-label">Runs on</span>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((d, n) => {
                  const on = a.weekdays.length === 0 || a.weekdays.includes(n);
                  return (
                    <button key={d} type="button" className="a-pick a-pick-solid text-sm font-semibold" style={{ width: 52, minHeight: 40 }} aria-pressed={on}
                      onClick={() => {
                        const current = a.weekdays.length ? a.weekdays : [0, 1, 2, 3, 4, 5, 6];
                        const next = on ? current.filter((x) => x !== n) : [...current, n].sort();
                        setA({ weekdays: next.length === 7 ? [] : next });
                      }}>{d}</button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Field id={id('lead')} label="Notice needed (hours)" help={`Bookings close ${hoursText(a.leadHours)} before the start.`}>
                <input id={id('lead')} className="a-input" inputMode="numeric" value={a.leadHours} onChange={(e) => setA({ leadHours: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
              </Field>
              <Field id={id('from')} label="On sale from (optional)"><input id={id('from')} type="date" className="a-input" value={a.from} onChange={(e) => setA({ from: e.target.value })} /></Field>
              <Field id={id('until')} label="On sale until (optional)"><input id={id('until')} type="date" className="a-input" value={a.until} onChange={(e) => setA({ until: e.target.value })} /></Field>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field id={id('times')} label="Start times (optional)" help="24-hour, separated by commas: 09:00, 14:30. Leave empty if there are none.">
                <input id={id('times')} className="a-input" defaultValue={a.times.join(', ')}
                  onBlur={(e) => setA({ times: e.target.value.split(/[,\s]+/).filter((t) => /^\d{1,2}:\d{2}$/.test(t)).map((t) => t.padStart(5, '0')) })} />
              </Field>
              <Field id={id('closed')} label="Closed dates (optional)" help="One date per line, e.g. 2026-12-25">
                <LinesArea id={id('closed')} rows={2} value={a.closed} onChange={(v) => setA({ closed: v })} />
              </Field>
            </div>
          </>
        )}
      </fieldset>

      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={o.active} onChange={(e) => onChange({ ...o, active: e.target.checked })} style={{ width: 20, height: 20 }} />
        On sale
      </label>
    </div>
  );
};

// ------------------------------------------------------------- the editor
export function ProductEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<Form | null>(id ? null : blank());
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Destination[]>('/admin/destinations', { auth: true }).then(setDestinations).catch((e) => setError(e.message));
    if (id) api<Product>(`/admin/products/${id}`, { auth: true }).then((p) => setForm(p)).catch((e) => setError(e.message));
  }, [id]);

  if (!form) return error ? <ErrorBox message={error} /> : <p className="a-muted">Loading…</p>;

  const set = (patch: Partial<Form>) => { setForm({ ...form, ...patch }); setSaved(''); };
  const setAttr = (k: string, v: unknown) => set({ attributes: { ...form.attributes, [k]: v } });
  const isSample = !!form.attributes.sample;
  const dest = destinations.find((d) => d.id === form.destinationId);
  const policyMatch = POLICY_TEMPLATES.find((t) => JSON.stringify(t.policy.tiers) === JSON.stringify(form.cancellationPolicy.tiers));

  async function save(status: string) {
    if (!form) return;
    let body: Form = { ...form, status };
    if (status === 'published' && isSample) {
      if (!window.confirm('This is a SAMPLE product. Have you checked and corrected every price, time and fact? Publishing makes it visible to travellers.')) return;
      const { sample, ...rest } = form.attributes;
      body = { ...body, attributes: rest, slug: form.slug.replace(/^sample-/, '') };
    }
    setBusy(true);
    setError('');
    try {
      const r = form.id
        ? await api<Product>(`/admin/products/${form.id}`, { method: 'PUT', body, auth: true })
        : await api<Product>('/admin/products', { method: 'POST', body, auth: true });
      setForm(r);
      setSaved(status === 'published' ? 'Saved and live on the site.' : 'Saved as a draft.');
      if (!form.id) navigate(url(`/admin/products/${r.id}`), { replace: true });
    } catch (e) {
      setError((e as Error).message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusy(false);
    }
  }

  const previewHref = form.id && dest ? url(`/${dest.slug}/${form.slug}?preview=1`) : '';
  const fid = (k: string) => `p-${k}`;

  return (
    <div className="flex flex-col gap-5 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to={url('/admin')} className="text-sm underline a-muted">← All products</Link>
          <h1 className="text-2xl font-extrabold mt-1">{form.id ? form.title || 'Untitled' : 'New product'}</h1>
          <span className={`a-chip mt-1 ${form.status === 'published' ? 'a-chip-green' : 'a-chip-amber'}`}>
            {form.status === 'published' ? 'Live on the site' : form.status === 'archived' ? 'Archived' : 'Draft — travellers cannot see it'}
          </span>
        </div>
        {previewHref && <a href={previewHref} target="_blank" rel="noopener" className="a-btn a-btn-ghost a-btn-sm"><ExternalLink size={16} /> Preview page</a>}
      </div>

      {isSample && (
        <div className="rounded-2xl p-4 text-sm font-semibold" style={{ background: 'var(--a-accent-soft)', color: 'var(--a-accent-ink)' }}>
          SAMPLE product, made to show how a finished product looks. Every price, time and fact in it is an example — check and correct all of it before publishing.
        </div>
      )}
      {error && <ErrorBox message={error} />}

      <section className="a-card p-5 flex flex-col gap-4">
        <h2 className="text-lg font-extrabold">The basics</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field id={fid('title')} label="Title"><input id={fid('title')} className="a-input" value={form.title} onChange={(e) => set({ title: e.target.value })} /></Field>
          <Field id={fid('slug')} label="Web address" help={dest ? `${url(`/${dest.slug}/`)}${form.slug || '(made from the title)'}` : 'Leave blank to make it from the title.'}>
            <input id={fid('slug')} className="a-input" value={form.slug} onChange={(e) => set({ slug: e.target.value })} />
          </Field>
          <Field id={fid('dest')} label="Destination">
            <select id={fid('dest')} className="a-select" value={form.destinationId} onChange={(e) => set({ destinationId: e.target.value })}>
              <option value="">Choose…</option>
              {destinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field id={fid('cat')} label="Category">
            <select id={fid('cat')} className="a-select" value={form.category} onChange={(e) => set({ category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}{c.live ? '' : ' (coming soon — cannot be published yet)'}</option>)}
            </select>
          </Field>
          <Field id={fid('dur')} label="Duration (optional)" help='e.g. "6 hours", "Full day", "8 days"'>
            <input id={fid('dur')} className="a-input" value={form.durationText} onChange={(e) => set({ durationText: e.target.value })} />
          </Field>
          <Field id={fid('order')} label="Position in lists" help="Lower comes first.">
            <input id={fid('order')} className="a-input" inputMode="numeric" value={form.sortOrder} onChange={(e) => set({ sortOrder: Number(e.target.value.replace(/[^0-9-]/g, '')) || 0 })} />
          </Field>
        </div>
        <Field id={fid('sum')} label="Summary" help="One or two sentences, shown under the title and in Google.">
          <textarea id={fid('sum')} className="a-textarea" rows={2} value={form.summary} onChange={(e) => set({ summary: e.target.value })} />
        </Field>
        <Field id={fid('img')} label="Photos" help="One image web address per line, starting with https://. The first is the main photo.">
          <LinesArea id={fid('img')} rows={3} value={form.images} onChange={(v) => set({ images: v })} />
        </Field>
      </section>

      <section className="a-card p-5 flex flex-col gap-4">
        <h2 className="text-lg font-extrabold">For Indian travellers</h2>
        <div>
          <span className="a-label">Tick everything that is true</span>
          <div className="flex flex-wrap gap-2">
            {FEATURES.map((f) => (
              <button key={f.id} type="button" className="a-pick a-pick-solid px-3 text-sm font-semibold" style={{ minHeight: 40 }}
                aria-pressed={form.features.includes(f.id)}
                onClick={() => set({ features: form.features.includes(f.id) ? form.features.filter((x) => x !== f.id) : [...form.features, f.id] })}>{f.label}</button>
            ))}
          </div>
        </div>
        <Field id={fid('india')} label="Notes Indians look for (optional)" help="Food (veg / Jain), Hindi guide, what to wear at a temple, travelling with parents…">
          <textarea id={fid('india')} className="a-textarea" rows={2} value={form.indiaNotes} onChange={(e) => set({ indiaNotes: e.target.value })} />
        </Field>
        <div className="grid gap-3 grid-cols-3">
          <Field id={fid('cmin')} label="Child from age"><input id={fid('cmin')} className="a-input" inputMode="numeric" value={form.ages.childMin} onChange={(e) => set({ ages: { ...form.ages, childMin: Number(e.target.value.replace(/\D/g, '')) || 0 } })} /></Field>
          <Field id={fid('cmax')} label="Child up to age"><input id={fid('cmax')} className="a-input" inputMode="numeric" value={form.ages.childMax} onChange={(e) => set({ ages: { ...form.ages, childMax: Number(e.target.value.replace(/\D/g, '')) || 0 } })} /></Field>
          <Field id={fid('smin')} label="Senior from age"><input id={fid('smin')} className="a-input" inputMode="numeric" value={form.ages.seniorMin} onChange={(e) => set({ ages: { ...form.ages, seniorMin: Number(e.target.value.replace(/\D/g, '')) || 60 } })} /></Field>
        </div>
        <p className="a-help -mt-2">Children younger than "Child from age" go free.</p>
      </section>

      {ATTRIBUTE_FIELDS[form.category] && (
        <section className="a-card p-5 flex flex-col gap-4">
          <h2 className="text-lg font-extrabold">{CATEGORIES.find((c) => c.id === form.category)?.label} details</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {ATTRIBUTE_FIELDS[form.category].map((f) => f.type === 'bool' ? (
              <label key={f.key} className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={!!form.attributes[f.key]} onChange={(e) => setAttr(f.key, e.target.checked)} style={{ width: 20, height: 20 }} />{f.label}
              </label>
            ) : (
              <Field key={f.key} id={fid(f.key)} label={f.label} help={f.help}>
                <input id={fid(f.key)} className="a-input" inputMode={f.type === 'number' ? 'numeric' : undefined} value={String(form.attributes[f.key] ?? '')}
                  onChange={(e) => setAttr(f.key, f.type === 'number' ? (Number(e.target.value.replace(/\D/g, '')) || '') : e.target.value)} />
              </Field>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-extrabold">Options and prices</h2>
        {form.options.map((o, i) => (
          <OptionEditor key={o.id || `new-${i}`} o={o} i={i} count={form.options.length} category={form.category}
            onChange={(next) => set({ options: form.options.map((x, j) => (j === i ? next : x)) })}
            onRemove={() => set({ options: form.options.filter((_, j) => j !== i) })}
            onMove={(d) => {
              const next = [...form.options];
              [next[i], next[i + d]] = [next[i + d], next[i]];
              set({ options: next });
            }} />
        ))}
        <button type="button" className="a-btn a-btn-ghost self-start"
          onClick={() => set({ options: [...form.options, newOption(['transfer', 'esim'].includes(form.category))] })}>Add an option</button>
      </section>

      <section className="a-card p-5 flex flex-col gap-4">
        <h2 className="text-lg font-extrabold">What the page says</h2>
        <Field id={fid('hl')} label="Highlights" help="One per line."><LinesArea id={fid('hl')} value={form.highlights} onChange={(v) => set({ highlights: v })} /></Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field id={fid('inc')} label="Included" help="One per line."><LinesArea id={fid('inc')} value={form.includes} onChange={(v) => set({ includes: v })} /></Field>
          <Field id={fid('exc')} label="Not included" help="One per line."><LinesArea id={fid('exc')} value={form.excludes} onChange={(v) => set({ excludes: v })} /></Field>
        </div>
        <Field id={fid('it')} label="The day, step by step (optional)" help='One step per line, time first then a "|": 2:30 pm | Pickup from your hotel'>
          <LinesArea id={fid('it')} rows={5}
            value={form.itinerary.map((s) => (s.time ? `${s.time} | ${s.text}` : s.text))}
            onChange={(v) => set({ itinerary: v.map((l) => { const [t, ...rest] = l.split('|'); return rest.length ? { time: t.trim(), text: rest.join('|').trim() } : { time: '', text: t.trim() }; }) })} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field id={fid('pick')} label="Pickup (optional)" help="Where and when the driver collects them."><textarea id={fid('pick')} className="a-textarea" value={form.pickupInfo} onChange={(e) => set({ pickupInfo: e.target.value })} /></Field>
          <Field id={fid('meet')} label="Meeting point (optional)" help="If they make their own way there."><textarea id={fid('meet')} className="a-textarea" value={form.meetingPoint} onChange={(e) => set({ meetingPoint: e.target.value })} /></Field>
        </div>
        <Field id={fid('use')} label="How to use the ticket"><textarea id={fid('use')} className="a-textarea" value={form.howToUse} onChange={(e) => set({ howToUse: e.target.value })} /></Field>
        <Field id={fid('desc')} label="Longer description (optional)"><textarea id={fid('desc')} className="a-textarea" rows={6} value={form.description} onChange={(e) => set({ description: e.target.value })} /></Field>
      </section>

      <section className="a-card p-5 flex flex-col gap-4">
        <h2 className="text-lg font-extrabold">Cancellation rule</h2>
        <div className="flex flex-col gap-2">
          {POLICY_TEMPLATES.map((t) => (
            <button key={t.id} type="button" className="a-pick p-3 text-sm font-semibold" aria-pressed={policyMatch?.id === t.id}
              onClick={() => set({ cancellationPolicy: { ...t.policy, note: form.cancellationPolicy.note } })}>{t.label}</button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <span className="a-label">Or set your own steps</span>
          {form.cancellationPolicy.tiers.map((t, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
              Cancel at least
              <input className="a-input" style={{ width: 80 }} inputMode="numeric" aria-label="Hours before" value={t.hours}
                onChange={(e) => set({ cancellationPolicy: { ...form.cancellationPolicy, tiers: form.cancellationPolicy.tiers.map((x, j) => (j === i ? { ...x, hours: Number(e.target.value.replace(/\D/g, '')) || 0 } : x)) } })} />
              hours before →
              <input className="a-input" style={{ width: 72 }} inputMode="numeric" aria-label="Refund percent" value={t.refund}
                onChange={(e) => set({ cancellationPolicy: { ...form.cancellationPolicy, tiers: form.cancellationPolicy.tiers.map((x, j) => (j === i ? { ...x, refund: Math.min(100, Number(e.target.value.replace(/\D/g, '')) || 0) } : x)) } })} />
              % back
              <button type="button" className="a-stepper" aria-label="Remove step"
                onClick={() => set({ cancellationPolicy: { ...form.cancellationPolicy, tiers: form.cancellationPolicy.tiers.filter((_, j) => j !== i) } })}><Trash2 size={16} /></button>
            </div>
          ))}
          <button type="button" className="a-btn a-btn-ghost a-btn-sm self-start"
            onClick={() => set({ cancellationPolicy: { ...form.cancellationPolicy, tiers: [...form.cancellationPolicy.tiers, { hours: 24, refund: 100 }] } })}>Add a step</button>
          <p className="a-help">Anything later than the last step, and no-shows, get nothing back. No steps means non-refundable.</p>
        </div>
        <Field id={fid('pnote')} label="Extra note on cancellation (optional)">
          <input id={fid('pnote')} className="a-input" value={form.cancellationPolicy.note} onChange={(e) => set({ cancellationPolicy: { ...form.cancellationPolicy, note: e.target.value } })} />
        </Field>
      </section>

      <div className="fixed left-0 right-0 bottom-0 z-30 bg-white border-t" style={{ borderColor: 'var(--a-line)' }}>
        <div className="a-wrap py-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--a-success)' }}>{saved}</span>
          <div className="flex gap-2">
            <button type="button" className="a-btn a-btn-ghost" disabled={busy} onClick={() => save('draft')}>{form.status === 'published' ? 'Take off the site' : 'Save draft'}</button>
            <button type="button" className="a-btn" disabled={busy} onClick={() => save('published')}>{busy ? 'Saving…' : form.status === 'published' ? 'Save' : 'Publish'}</button>
          </div>
        </div>
      </div>
      {form.id && (
        <button type="button" className="a-btn a-btn-danger self-start" onClick={async () => {
          if (!window.confirm(`Delete "${form.title}"? This cannot be undone.`)) return;
          try { await api(`/admin/products/${form.id}`, { method: 'DELETE', auth: true }); navigate(url('/admin')); } catch (e) { setError((e as Error).message); }
        }}><Trash2 size={16} /> Delete this product</button>
      )}
    </div>
  );
}
