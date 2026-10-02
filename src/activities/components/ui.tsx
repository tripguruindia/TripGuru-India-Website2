import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ImageIcon, MessageCircle, Search, ShieldCheck } from 'lucide-react';
import { brand, categoryById, featureLabel, footerLine, LAUNCHED, logoParts, pageTitle, absoluteUrl, url, whatsappLink } from '../config/site';
import { inr, hoursText } from '../lib/format';
import type { ProductCardData } from '../lib/types';

// ---------------------------------------------------------------- page meta
function setMeta(selector: string, make: () => HTMLElement, attr: string, value: string) {
  let el = document.head.querySelector(selector) as HTMLElement | null;
  if (!el) {
    el = make();
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

export function useSeo({ title, description, path }: { title?: string; description?: string; path: string }) {
  useEffect(() => {
    document.title = pageTitle(title);
    setMeta('meta[name="description"]', () => Object.assign(document.createElement('meta'), { name: 'description' }), 'content',
      description || brand.subTagline);
    setMeta('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }), 'href', absoluteUrl(path));
    setMeta('meta[name="robots"]', () => Object.assign(document.createElement('meta'), { name: 'robots' }), 'content',
      LAUNCHED ? 'index, follow' : 'noindex, nofollow');
    setMeta('meta[property="og:title"]', () => { const m = document.createElement('meta'); m.setAttribute('property', 'og:title'); return m; }, 'content', pageTitle(title));
  }, [title, description, path]);
}

// --------------------------------------------------------------------- logo
export function Logo({ size = 22, light = false }: { size?: number; light?: boolean }) {
  const [a, b] = logoParts();
  return (
    <span style={{ fontSize: size, fontWeight: 800, letterSpacing: '-0.03em', color: light ? '#fff' : 'var(--a-primary)' }}>
      {a}
      {b && <span style={{ color: 'var(--a-accent)' }}>{b}</span>}
    </span>
  );
}

// ------------------------------------------------------------------ chrome
export function Header() {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b" style={{ borderColor: 'var(--a-line)' }}>
      <div className="a-wrap flex items-center justify-between gap-3" style={{ height: 64 }}>
        <Link to={url('/')} aria-label={`${brand.name} home`}><Logo /></Link>
        <nav className="flex items-center gap-2">
          <Link to={url('/search')} className="a-btn a-btn-ghost a-btn-sm" aria-label="Search">
            <Search size={18} /> <span className="hidden sm:inline">Search</span>
          </Link>
          <a href={whatsappLink(`Hi ${brand.name}, I need help planning activities for my trip.`)} target="_blank" rel="noopener"
            className="a-btn a-btn-wa a-btn-sm">
            <MessageCircle size={18} /> <span>Help</span>
          </a>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer style={{ background: 'var(--a-primary-dark)', color: '#C3CBDD' }} className="mt-auto">
      <div className="a-wrap py-10 grid gap-8 md:grid-cols-3 text-sm">
        <div className="flex flex-col gap-3">
          <Logo light size={20} />
          <p className="leading-relaxed" style={{ color: '#C3CBDD' }}>{brand.tagline}</p>
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-bold text-white">Help, in {brand.supportLanguages}</span>
          <a href={whatsappLink(`Hi ${brand.name}, I have a question.`)} target="_blank" rel="noopener" className="underline">WhatsApp {brand.supportPhone}</a>
          {brand.supportEmail && <a href={`mailto:${brand.supportEmail}`} className="underline">{brand.supportEmail}</a>}
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-bold text-white">{brand.legalName}</span>
          <span>{footerLine()}</span>
          {brand.gstin && <span>GSTIN {brand.gstin}</span>}
          {brand.registeredAddress && <span>{brand.registeredAddress}</span>}
        </div>
      </div>
    </footer>
  );
}

// ------------------------------------------------------------------ images
// A product with no photo yet still looks deliberate: a tinted tile with
// its category, never a broken image.
export const Photo: React.FC<{
  src?: string; alt: string; tint?: string; label?: string; className?: string; style?: React.CSSProperties;
}> = ({ src, alt, tint = '#2F5D8C', label, className = '', style }) => {
  const [broken, setBroken] = React.useState(false);
  if (src && !broken) {
    return <img src={src} alt={alt} loading="lazy" onError={() => setBroken(true)} className={`object-cover ${className}`} style={style} />;
  }
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ background: tint, ...style }} role="img" aria-label={alt}>
      <span className="flex flex-col items-center gap-1 text-white/85 text-xs font-semibold">
        <ImageIcon size={22} />{label}
      </span>
    </div>
  );
};

// ------------------------------------------------------------- product card
export const ProductCard: React.FC<{ p: ProductCardData }> = ({ p }) => {
  const cat = categoryById(p.category);
  const href = url(`/${p.destination?.slug}/${p.slug}`);
  const perText = p.fromPrice?.per === 'unit'
    ? (p.category === 'transfer' ? 'per vehicle' : p.category === 'esim' ? 'per eSIM' : 'each')
    : 'per adult';
  return (
    <Link to={href} className="a-card overflow-hidden flex flex-col hover:shadow-lg transition-shadow" style={{ color: 'var(--a-ink)' }}>
      <Photo src={p.image} alt={p.title} label={cat?.short} className="w-full" style={{ aspectRatio: '16 / 10' }} />
      <div className="p-4 flex flex-col gap-2 flex-1">
        <span className="text-xs font-semibold a-muted flex items-center gap-1">
          {cat?.label}{p.durationText && <> · <Clock size={12} /> {p.durationText}</>}
        </span>
        <span className="text-base font-bold leading-snug">{p.title}</span>
        {p.features.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {p.features.slice(0, 3).map((f) => <span key={f} className="a-chip">{featureLabel(f)}</span>)}
          </div>
        )}
        {p.freeCancellation && p.freeCancellationHours !== null && (
          <span className="text-[13px] font-semibold flex items-center gap-1" style={{ color: 'var(--a-success)' }}>
            <ShieldCheck size={15} /> Free cancellation up to {hoursText(p.freeCancellationHours)} before
          </span>
        )}
        <div className="mt-auto pt-1 flex items-baseline gap-1.5 flex-wrap">
          {p.fromPrice ? (
            <>
              <span className="text-xs a-muted">from</span>
              <span className="text-xl font-extrabold">{inr(p.fromPrice.amount)}</span>
              <span className="text-xs a-muted">{perText} · final price</span>
            </>
          ) : <span className="text-sm a-muted">Price on request</span>}
        </div>
      </div>
    </Link>
  );
};

export function CardGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

// ------------------------------------------------------------- load states
export function Loading({ slow, rows = 3 }: { slow?: boolean; rows?: number }) {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      {slow && (
        <p className="text-sm a-muted">Waking the server up — the first visit after a quiet spell can take up to a minute.</p>
      )}
      <CardGrid>{Array.from({ length: rows }, (_, i) => <div key={i} className="a-skel" style={{ height: 300 }} />)}</CardGrid>
    </div>
  );
}

export function ErrorBox({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="a-card p-5 flex flex-col gap-3" style={{ background: 'var(--a-danger-soft)', borderColor: '#f0c8c8' }}>
      <span className="font-bold" style={{ color: 'var(--a-danger)' }}>{message}</span>
      {retry && <button type="button" className="a-btn a-btn-ghost a-btn-sm self-start" onClick={retry}>Try again</button>}
    </div>
  );
}

export function TrustStrip() {
  const items = [
    ['Final price in ₹, upfront', 'GST included, no forex or card markup'],
    ['UPI, cards, net banking', 'Indian payment methods'],
    ['GST invoice every time', `From ${brand.legalName}`],
    [`Help in ${brand.supportLanguages}`, 'A real person on WhatsApp'],
  ];
  return (
    <div style={{ background: 'var(--a-surface)', borderBottom: '1px solid var(--a-line)' }}>
      <div className="a-wrap grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
        {items.map(([t, s]) => (
          <div key={t} className="flex flex-col">
            <span className="text-[13px] font-bold">{t}</span>
            <span className="text-xs a-muted">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
