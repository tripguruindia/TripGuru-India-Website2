import React, { useEffect, useMemo, useState } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { LogOut, Plus } from 'lucide-react';
import { brand, CATEGORIES, categoryById, url } from '../config/site';
import { api, ApiError, getToken, setToken, useApi } from '../lib/api';
import { inr } from '../lib/format';
import type { Destination } from '../lib/types';
import { ErrorBox, Logo, useSeo } from '../components/ui';
import { ProductEditor } from './ProductEditor';
import { DestinationsAdmin } from './DestinationsAdmin';

interface StaffUser { id: string; email: string; name: string; role: string }

export interface AdminProductRow {
  id: string; slug: string; title: string; category: string; status: string;
  destination: { slug: string; name: string } | null; fromPrice: { amount: number } | null;
  optionCount: number; supplier: string; sample: boolean; updatedAt: string;
}

function Login({ onDone }: { onDone: (u: StaffUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="a-wrap py-16 flex justify-center">
      <form
        className="a-card p-6 w-full max-w-sm flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            const r = await api<{ token: string; user: StaffUser }>('/auth/login', { method: 'POST', body: { email, password } });
            if (!['admin', 'staff'].includes(r.user.role)) throw new ApiError('This account cannot open Admin.', 403);
            setToken(r.token);
            onDone(r.user);
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Logo />
        <h1 className="text-xl font-extrabold">Admin sign in</h1>
        <div><label className="a-label" htmlFor="ad-email">Email</label>
          <input id="ad-email" className="a-input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div><label className="a-label" htmlFor="ad-pw">Password</label>
          <input id="ad-pw" className="a-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
        {error && <p className="text-sm font-semibold m-0" style={{ color: 'var(--a-danger)' }}>{error}</p>}
        <button className="a-btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="text-xs a-muted m-0">The first visit after a quiet spell can take up to a minute while the server wakes.</p>
      </form>
    </div>
  );
}

const STATUS_CHIP: Record<string, string> = { published: 'a-chip-green', draft: 'a-chip-amber', archived: '' };

function ProductsList() {
  const { data, error, loading, slow } = useApi<AdminProductRow[]>('/admin/products', true);
  const [status, setStatus] = useState('');
  const [dest, setDest] = useState('');
  const [category, setCategory] = useState('');
  const rows = useMemo(() => (data || []).filter((r) =>
    (!status || r.status === status) && (!dest || r.destination?.slug === dest) && (!category || r.category === category)
  ), [data, status, dest, category]);
  const dests = [...new Map((data || []).filter((r) => r.destination).map((r) => [r.destination!.slug, r.destination!.name])).entries()];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Products</h1>
        <Link to={url('/admin/products/new')} className="a-btn"><Plus size={18} /> New product</Link>
      </div>
      <div className="flex flex-wrap gap-2">
        <select className="a-select" style={{ width: 'auto' }} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All statuses</option><option value="published">Live</option><option value="draft">Draft</option><option value="archived">Archived</option>
        </select>
        <select className="a-select" style={{ width: 'auto' }} value={dest} onChange={(e) => setDest(e.target.value)} aria-label="Destination">
          <option value="">All destinations</option>{dests.map(([s, n]) => <option key={s} value={s}>{n}</option>)}
        </select>
        <select className="a-select" style={{ width: 'auto' }} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          <option value="">All categories</option>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>
      {loading && <p className="a-muted">{slow ? 'Waking the server up — this can take up to a minute…' : 'Loading…'}</p>}
      {error && <ErrorBox message={error.message} />}
      {data && (rows.length === 0 ? <p className="a-muted">No products here yet.</p> : (
        <div className="a-card overflow-x-auto">
          <table className="a-table">
            <thead><tr><th>Product</th><th>Destination</th><th>From</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to={url(`/admin/products/${r.id}`)} className="font-bold underline">{r.title}</Link>
                    <div className="text-xs a-muted">{categoryById(r.category)?.label} · {r.optionCount} option{r.optionCount === 1 ? '' : 's'}{r.sample ? ' · SAMPLE' : ''}</div>
                  </td>
                  <td>{r.destination?.name}</td>
                  <td className="whitespace-nowrap">{r.fromPrice ? inr(r.fromPrice.amount) : '—'}</td>
                  <td><span className={`a-chip ${STATUS_CHIP[r.status] || ''}`}>{r.status === 'published' ? 'Live' : r.status === 'draft' ? 'Draft' : 'Archived'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export function AdminApp() {
  useSeo({ title: 'Admin', path: '/admin' });
  const [user, setUser] = useState<StaffUser | null>(null);
  const [checking, setChecking] = useState(!!getToken());
  const { pathname } = useLocation();

  useEffect(() => {
    if (!getToken()) return;
    api<{ user: StaffUser }>('/auth/me', { auth: true })
      .then((r) => (['admin', 'staff'].includes(r.user.role) ? setUser(r.user) : setToken('')))
      .catch(() => setToken(''))
      .finally(() => setChecking(false));
  }, []);

  if (checking) return <div className="a-wrap py-16 a-muted">Checking your sign-in…</div>;
  if (!user) return <Login onDone={setUser} />;

  const tab = (to: string, label: string) => {
    const active = to === '/admin' ? /\/admin\/?(products.*)?$/.test(pathname) : pathname.includes(to);
    return <Link to={url(to)} className="a-btn a-btn-sm" style={active ? undefined : { background: 'transparent', color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}>{label}</Link>;
  };

  return (
    <div className="flex flex-col flex-1" style={{ background: 'var(--a-surface)' }}>
      <div style={{ background: 'var(--a-primary-dark)' }}>
        <div className="a-wrap flex flex-wrap items-center justify-between gap-3 py-3">
          <span className="flex items-center gap-3"><Logo light size={18} /><span className="text-sm text-white/70">Admin</span></span>
          <nav className="flex flex-wrap gap-2 items-center">
            {tab('/admin', 'Products')}
            {tab('/admin/destinations', 'Destinations')}
            <button type="button" className="a-btn a-btn-sm" style={{ background: 'transparent', color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}
              onClick={() => { setToken(''); setUser(null); }} aria-label="Sign out"><LogOut size={16} /></button>
          </nav>
        </div>
      </div>
      <div className="a-wrap py-6 flex-1">
        <Routes>
          <Route index element={<ProductsList />} />
          <Route path="products/new" element={<ProductEditor key="new" />} />
          <Route path="products/:id" element={<ProductEditor />} />
          <Route path="destinations" element={<DestinationsAdmin />} />
          <Route path="*" element={<ProductsList />} />
        </Routes>
      </div>
      <p className="a-wrap pb-6 text-xs a-muted">Signed in as {user.email}. {brand.name} Admin is never linked from the traveller site.</p>
    </div>
  );
}

export type { Destination };
