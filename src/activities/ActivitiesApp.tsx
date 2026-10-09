// ---------------------------------------------------------------------------
// The activities section: its own pages, header, footer and styles, rendered
// by the marketing site's router at BASE_PATH but sharing none of its layout.
// It imports nothing from the marketing site or the Nepal portal, so it can be
// lifted onto its own domain as it stands.
// ---------------------------------------------------------------------------
import React, { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { BASE_PATH, brand } from './config/site';
import { Footer, Header } from './components/ui';
import { Home } from './pages/Home';
import { DestinationPage, SearchPage } from './pages/Listing';
import { ProductPage } from './pages/Product';
import { NotFound } from './pages/NotFound';
import { AdminApp } from './admin/AdminApp';
import './activities.css';

const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';

// Brand colours become CSS variables, so brand.json is the only place a
// colour is chosen.
const c = brand.colors;
const themeVars = {
  '--a-primary': c.primary, '--a-primary-dark': c.primaryDark, '--a-accent': c.accent, '--a-accent-ink': c.accentInk,
  '--a-accent-soft': c.accentSoft, '--a-success': c.success, '--a-success-soft': c.successSoft, '--a-danger': c.danger,
  '--a-danger-soft': c.dangerSoft, '--a-ink': c.ink, '--a-muted': c.muted, '--a-line': c.line, '--a-surface': c.surface,
  '--a-page': c.page,
} as React.CSSProperties;

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function Site() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Routes>
          <Route index element={<Home />} />
          <Route path="search" element={<SearchPage />} />
          <Route path=":dest" element={<DestinationPage />} />
          <Route path=":dest/:product" element={<ProductPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

export default function ActivitiesApp() {
  useEffect(() => {
    if (!document.querySelector(`link[href="${FONT_HREF}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = FONT_HREF;
      document.head.appendChild(link);
    }
    // The marketing site paints the page body dark; this section is light,
    // including the overscroll area on phones.
    const prev = document.body.style.background;
    document.body.style.background = brand.colors.page;
    return () => { document.body.style.background = prev; };
  }, []);

  return (
    <div className="act-root" style={themeVars}>
      <ScrollTop />
      <Routes>
        <Route path={`${BASE_PATH}/admin/*`} element={<AdminApp />} />
        <Route path={`${BASE_PATH}/*`} element={<Site />} />
      </Routes>
    </div>
  );
}
