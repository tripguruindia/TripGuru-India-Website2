import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { url } from '../config/site';
import type { Destination } from '../lib/types';
import { ErrorBox } from '../components/ui';

type Row = Destination & { published_products: number; all_products: number };

const EMPTY = { name: '', slug: '', country: '', tagline: '', description: '', heroImage: '', tint: '#2F5D8C', sortOrder: 0, published: true };

const Editor: React.FC<{ initial: Partial<Row>; onSaved: () => void; onCancel: () => void }> = ({ initial, onSaved, onCancel }) => {
  const [d, setD] = useState({ ...EMPTY, ...initial });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const field = (k: keyof typeof EMPTY, label: string, help?: string, area = false) => (
    <div>
      <label className="a-label" htmlFor={`d-${k}`}>{label}</label>
      {area
        ? <textarea id={`d-${k}`} className="a-textarea" value={String(d[k] ?? '')} onChange={(e) => setD({ ...d, [k]: e.target.value })} />
        : <input id={`d-${k}`} className="a-input" value={String(d[k] ?? '')} onChange={(e) => setD({ ...d, [k]: e.target.value })} />}
      {help && <p className="a-help">{help}</p>}
    </div>
  );
  return (
    <form className="a-card p-5 flex flex-col gap-4" onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      setError('');
      try {
        const body = { ...d, sortOrder: Number(d.sortOrder) || 0 };
        if (initial.id) await api(`/admin/destinations/${initial.id}`, { method: 'PATCH', body, auth: true });
        else await api('/admin/destinations', { method: 'POST', body, auth: true });
        onSaved();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
    }}>
      <div className="grid gap-4 md:grid-cols-2">
        {field('name', 'Name')}
        {field('slug', 'Web address', `Leave blank to make it from the name. The page will be at ${url('/')}/<this>`)}
        {field('country', 'Country')}
        {field('tagline', 'One line under the name', 'e.g. "Bangkok · Phuket · Pattaya"')}
        {field('heroImage', 'Photo (web address of the image)', 'Must start with https://. Leave blank for a coloured tile.')}
        <div>
          <label className="a-label" htmlFor="d-tint">Tile colour (when there is no photo)</label>
          <input id="d-tint" type="color" className="a-input" style={{ padding: 4 }} value={d.tint} onChange={(e) => setD({ ...d, tint: e.target.value })} />
        </div>
        {field('sortOrder', 'Position in the list', 'Lower comes first')}
      </div>
      {field('description', 'About this destination (optional)', 'A short paragraph shown at the top of its page.', true)}
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={d.published} onChange={(e) => setD({ ...d, published: e.target.checked })} style={{ width: 20, height: 20 }} />
        Show on the site
      </label>
      {error && <ErrorBox message={error} />}
      <div className="flex gap-2">
        <button className="a-btn" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" className="a-btn a-btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
};

export function DestinationsAdmin() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<string | null>(null);

  const load = () => api<Row[]>('/admin/destinations', { auth: true }).then(setRows).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Destinations</h1>
        <button type="button" className="a-btn" onClick={() => setEditing('new')}>New destination</button>
      </div>
      {error && <ErrorBox message={error} />}
      {editing === 'new' && <Editor initial={{}} onSaved={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />}
      {rows?.map((r) => editing === r.id ? (
        <Editor key={r.id} initial={r} onSaved={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />
      ) : (
        <div key={r.id} className="a-card p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-lg shrink-0" style={{ background: r.tint }} />
            <div>
              <div className="font-bold">{r.name} {!r.published && <span className="a-chip a-chip-amber">Hidden</span>}</div>
              <div className="text-xs a-muted">{url(`/${r.slug}`)} · {r.published_products} live of {r.all_products} products</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to={url(`/${r.slug}`)} target="_blank" className="a-btn a-btn-ghost a-btn-sm">View</Link>
            <button type="button" className="a-btn a-btn-ghost a-btn-sm" onClick={() => setEditing(r.id)}>Edit</button>
            {r.all_products === 0 && (
              <button type="button" className="a-btn a-btn-danger a-btn-sm" onClick={async () => {
                if (!window.confirm(`Delete ${r.name}? This cannot be undone.`)) return;
                try { await api(`/admin/destinations/${r.id}`, { method: 'DELETE', auth: true }); load(); } catch (e) { setError((e as Error).message); }
              }}>Delete</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
