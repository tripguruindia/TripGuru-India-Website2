import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BusFront, MapPinned, Search, ShieldPlus, Smartphone, Ticket, TrainFront } from 'lucide-react';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  tour: MapPinned, ticket: Ticket, transfer: BusFront, esim: Smartphone, train: TrainFront, insurance: ShieldPlus,
};
import { brand, CATEGORIES, url, whatsappLink } from '../config/site';
import { useApi } from '../lib/api';
import type { Destination } from '../lib/types';
import { ErrorBox, Photo, TrustStrip, useSeo } from '../components/ui';

export const SearchBox: React.FC<{ initial?: string; dark?: boolean }> = ({ initial = '', dark = false }) => {
  const [q, setQ] = useState(initial);
  const navigate = useNavigate();
  return (
    <form
      role="search"
      className="flex gap-2 w-full"
      onSubmit={(e) => {
        e.preventDefault();
        navigate(url(`/search?q=${encodeURIComponent(q.trim())}`));
      }}
    >
      <label htmlFor="act-q" className="sr-only">Where are you going?</label>
      <input
        id="act-q"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Dubai, Bali, desert safari, eSIM…"
        className="a-input flex-1 min-w-0"
        style={{ minHeight: 52, border: dark ? 'none' : undefined, fontSize: 16 }}
      />
      <button type="submit" className="a-btn" aria-label="Search" style={{ minHeight: 52, width: 52, padding: 0, background: 'var(--a-accent)' }}>
        <Search size={22} />
      </button>
    </form>
  );
};

export function Home() {
  useSeo({ path: '/' });
  const { data, error, loading } = useApi<Destination[]>('/public/destinations');

  return (
    <>
      <section style={{ background: 'var(--a-primary)' }}>
        <div className="a-wrap py-10 md:py-16 flex flex-col gap-4 max-w-3xl">
          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight" style={{ color: '#fff' }}>{brand.tagline}</h1>
          <p className="text-base md:text-lg" style={{ color: '#D6DCEC' }}>{brand.subTagline}</p>
          <div className="mt-2"><SearchBox dark /></div>
        </div>
      </section>
      <TrustStrip />

      <section className="a-wrap py-8 flex flex-col gap-4">
        <h2 className="text-xl md:text-2xl font-extrabold">Where Indians are going</h2>
        {error && <ErrorBox message={error.message} />}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {loading && Array.from({ length: 8 }, (_, i) => <div key={i} className="a-skel" style={{ height: 128 }} />)}
          {data?.map((d) => (
            <Link key={d.id} to={url(`/${d.slug}`)} className="relative rounded-2xl overflow-hidden" style={{ height: 128 }}>
              <Photo src={d.heroImage} alt="" tint={d.tint} className="absolute inset-0 w-full h-full" />
              <span className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,.55), rgba(0,0,0,0) 65%)' }} />
              <span className="absolute left-3 right-3 bottom-3 flex flex-col">
                <span className="text-base font-extrabold text-white">{d.name}</span>
                <span className="text-xs text-white/85 truncate">{d.tagline}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="a-wrap pb-8 flex flex-col gap-4">
        <h2 className="text-xl md:text-2xl font-extrabold">What do you need?</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICONS[c.id] || MapPinned;
            const body = (
              <>
                <span className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#EEF1F8', color: 'var(--a-primary)' }}><Icon size={20} /></span>
                <span className="text-[13px] font-bold leading-tight">{c.label}</span>
                {!c.live && <span className="a-chip a-chip-amber" style={{ fontSize: 10 }}>Coming soon</span>}
              </>
            );
            return c.live ? (
              <Link key={c.id} to={url(`/search?category=${c.id}`)} className="a-card p-3 flex flex-col items-center justify-center gap-2 text-center hover:shadow-md" style={{ minHeight: 112 }}>{body}</Link>
            ) : (
              <div key={c.id} className="a-card p-3 flex flex-col items-center justify-center gap-2 text-center" style={{ minHeight: 112, background: 'var(--a-surface)' }}>{body}</div>
            );
          })}
        </div>
      </section>

      <section className="a-wrap pb-12">
        <div className="rounded-2xl p-6 flex flex-col md:flex-row md:items-center gap-4 justify-between" style={{ background: 'var(--a-success-soft)' }}>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-extrabold" style={{ color: '#12432A' }}>Talk to a real person on WhatsApp</h2>
            <p className="text-sm" style={{ color: '#24513A' }}>In {brand.supportLanguages} — before you book, and while you are on the trip.</p>
          </div>
          <a className="a-btn a-btn-wa" href={whatsappLink(`Hi ${brand.name}, I'd like help planning my trip.`)} target="_blank" rel="noopener">Chat on WhatsApp</a>
        </div>
      </section>
    </>
  );
}
