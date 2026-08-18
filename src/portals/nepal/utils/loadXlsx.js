// Loads SheetJS on demand.
//
// This library was previously a blocking <script> in index.html's <head>, so
// every visitor to every page -- including the marketing homepage -- waited on
// a ~900KB CDN download before the page could render, to support Excel export
// and import used only inside the Nepal portal's admin screens.
//
// The script is now injected the first time an export/import actually runs.
// Concurrent callers share one in-flight promise, and a failed load is not
// cached, so a later attempt can retry.

const XLSX_CDN = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';

let pending = null;

export function ensureXLSX() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (pending) return pending;

  pending = new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${XLSX_CDN}"]`);
    const script = existing || document.createElement('script');

    const onLoad = () => resolve(window.XLSX || null);
    const onError = () => {
      // Let a later call try again rather than failing permanently.
      pending = null;
      script.remove();
      resolve(null);
    };

    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });

    if (!existing) {
      script.src = XLSX_CDN;
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return pending;
}

// Convenience wrapper: resolves the library or tells the user it's unavailable.
export async function requireXLSX() {
  const XLSX = await ensureXLSX();
  if (!XLSX && typeof window !== 'undefined') {
    window.alert(
      "Couldn't load the Excel helper library. Please check your connection and try again."
    );
  }
  return XLSX;
}
