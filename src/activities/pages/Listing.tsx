import React, { useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { CATEGORIES, categoryById, url } from '../config/site';
import { useApi } from '../lib/api';
import type { Destination, ProductCardData } from '../lib/types';
import { CardGrid, ErrorBox, Loading, Photo, ProductCard, useSeo } from '../components/ui';
import { SearchBox } from './Home';
import { NotFound } from './NotFound';

// The filters an Indian traveller actually asks about, on every listing.
const QUICK_FILTERS: { id: string; label: string; test: (p: ProductCardData) => boolean }[] = [
  { id: 'veg', label: 'Veg / Jain meals', test: (p) => p.features.includes('veg') || p.features.includes('jain') },
  { id: 'pickup', label: 'Hotel pickup', test: (p) => p.features.includes('hotel_pickup') },
  { id: 'free', label: 'Free cancellation', test: (p) => p.freeCancellation },
];

const Filtered: React.FC<{ products: ProductCardData[]; initialCategory?: string }> = ({ products, initialCategory = '' }) => {
  const [category, setCategory] = useState(initialCategory);
  const [quick, setQuick] = useState<string[]>([]);
  const present = CATEGORIES.filter((c) => products.some((p) => p.category === c.id));
  const shown = useMemo(() => products.filter((p) =>
    (!category || p.category === category) && quick.every((q) => QUICK_FILTERS.find((f) => f.id === q)!.test(p))
  ), [products, category, quick]);

  return (
    <div className="flex flex-col gap-4">
      {(present.length > 1 || products.length > 3) && (
        <div className="a-scroll-x -mx-4 px-4">
          <div className="flex gap-2 w-max">
            {present.length > 1 && (
              <>
                <button type="button" className="a-pick a-pick-solid px-4 text-sm font-semibold" style={{ minHeight: 44, borderRadius: 22 }}
                  aria-pressed={!category} onClick={() => setCategory('')}>All</button>
                {present.map((c) => (
                  <button key={c.id} type="button" className="a-pick a-pick-solid px-4 text-sm font-semibold" style={{ minHeight: 44, borderRadius: 22 }}
                    aria-pressed={category === c.id} onClick={() => setCategory(category === c.id ? '' : c.id)}>{c.short}</button>
                ))}
                <span className="w-px mx-1" style={{ background: 'var(--a-line)' }} />
              </>
            )}
            {QUICK_FILTERS.map((f) => (
              <button key={f.id} type="button" className="a-pick px-4 text-sm font-semibold" style={{ minHeight: 44, borderRadius: 22 }}
                aria-pressed={quick.includes(f.id)}
                onClick={() => setQuick(quick.includes(f.id) ? quick.filter((x) => x !== f.id) : [...quick, f.id])}>{f.label}</button>
            ))}
          </div>
        </div>
      )}
      {shown.length ? (
        <CardGrid>{shown.map((p) => <ProductCard key={p.id} p={p} />)}</CardGrid>
      ) : (
        <p className="a-muted py-6">Nothing matches those filters yet. Try removing one, or ask us on WhatsApp — we can often arrange it.</p>
      )}
    </div>
  );
};

export function DestinationPage() {
  const { dest = '' } = useParams();
  const { data, error, loading, slow } = useApi<Destination>(`/public/destinations/${encodeURIComponent(dest)}`);
  useSeo({
    title: data ? `Things to do in ${data.name} — tours, tickets, transfers & eSIMs` : undefined,
    description: data ? `Book ${data.name} tours, attraction tickets, airport transfers and eSIMs in rupees, with the final price upfront.` : undefined,
    path: `/${dest}`,
  });
  if (error?.status === 404) return <NotFound />;

  return (
    <>
      <section className="relative" style={{ background: data?.tint || 'var(--a-primary)' }}>
        {data?.heroImage && <Photo src={data.heroImage} alt="" className="absolute inset-0 w-full h-full" />}
        <span className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,.6), rgba(0,0,0,.15))' }} />
        <div className="a-wrap relative py-10 md:py-14 flex flex-col gap-2">
          <nav className="text-sm text-white/80"><Link to={url('/')} className="underline">Home</Link> / {data?.name || '…'}</nav>
          <h1 className="text-3xl md:text-4xl font-extrabold" style={{ color: '#fff' }}>Things to do in {data?.name || '…'}</h1>
          {data?.tagline && <p className="text-white/90">{data.tagline}</p>}
        </div>
      </section>
      <div className="a-wrap py-6 flex flex-col gap-5">
        {data?.description && <p className="a-prose max-w-3xl">{data.description}</p>}
        {loading && <Loading slow={slow} />}
        {error && <ErrorBox message={error.message} />}
        {data && (data.products?.length
          ? <Filtered products={data.products} />
          : <p className="a-muted py-6">We are adding {data.name} experiences right now. Tell us on WhatsApp what you are looking for and we will arrange it.</p>)}
      </div>
    </>
  );
}

export function SearchPage() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const cat = categoryById(category);
  const qs = new URLSearchParams();
  if (q) qs.set('q', q);
  if (cat) qs.set('category', cat.id);
  const { data, error, loading, slow } = useApi<ProductCardData[]>(`/public/products?${qs.toString()}`);
  useSeo({ title: q ? `Search: ${q}` : cat ? cat.label : 'Search', path: '/search' });

  return (
    <div className="a-wrap py-6 flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold">{q ? `Results for “${q}”` : cat ? cat.label : 'Find something to do'}</h1>
      <SearchBox key={q} initial={q} />
      {loading && <Loading slow={slow} />}
      {error && <ErrorBox message={error.message} />}
      {data && (data.length
        ? <Filtered key={search} products={data} initialCategory={cat?.id} />
        : <p className="a-muted py-6">Nothing found{q ? ` for “${q}”` : ''} yet. Ask us on WhatsApp — we can often arrange it.</p>)}
    </div>
  );
}
