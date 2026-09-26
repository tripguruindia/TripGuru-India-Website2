// Shared by the blog build (render.mjs) and the writing agent (agent.mjs), so
// the pages the agent is allowed to link to are exactly the pages that exist.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';
import YAML from 'yaml';

const here = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(here, '../..');
export const contentDir = path.join(projectRoot, 'content/blog');
export const postsDir = path.join(contentDir, 'posts');
export const topicsPath = path.join(contentDir, 'topics.json');
export const guidelinesPath = path.join(contentDir, 'guidelines.md');

export const BASE_URL = 'https://www.tripguruindia.com';

export const CATEGORIES = {
  nepal: { name: 'Nepal', blurb: 'Nepal from India — routes, border crossings, temples, treks and costs.' },
  international: { name: 'International', blurb: 'Holidays abroad from India — visas, budgets, itineraries and when to go.' },
  india: { name: 'India', blurb: 'Trips within India — pilgrimages, hills, beaches and long weekends.' },
};

// The site's own data is TypeScript; bundle it in memory and import the result
// so the blog links to the same destinations, packages and city pages the app
// renders.
let siteDataPromise;
export function loadSiteData() {
  siteDataPromise ??= (async () => {
    const entry = `
      export { DESTINATIONS, CONTACT_INFO, LOGO_URL } from './src/constants';
      export { packageLandingPages } from './src/packageLandingPages';
      export { cityLandingPages } from './src/cityLandingPages';
    `;
    const { outputFiles } = buildSync({
      stdin: { contents: entry, resolveDir: projectRoot, loader: 'ts' },
      bundle: true,
      format: 'esm',
      platform: 'node',
      write: false,
      logLevel: 'silent',
    });
    const source = Buffer.from(outputFiles[0].contents).toString('base64');
    return import(`data:text/javascript;base64,${source}`);
  })();
  return siteDataPromise;
}

/** Every page on the site an article may link to, with what it is. */
export async function internalLinkCatalog() {
  const { DESTINATIONS, packageLandingPages, cityLandingPages } = await loadSiteData();
  const links = [
    { path: '/destinations', label: 'All destinations' },
    { path: '/offers', label: 'Current offers' },
    { path: '/contact', label: 'Contact TripGuru' },
    { path: '/nepal', label: 'Nepal trip planner — build and price a Nepal tour online' },
    ...DESTINATIONS.map((d) => ({ path: `/destinations/${d.slug}`, label: `${d.name} holidays (${d.region})`, image: d.image })),
    ...packageLandingPages.map((p) => ({
      path: p.path,
      label: `${p.name} package${p.priceFrom ? ` — from ₹${p.priceFrom.toLocaleString('en-IN')} per person, ${p.priceNote}` : ''}`,
      image: p.heroImage,
    })),
    ...cityLandingPages.map((c) => ({ path: c.path, label: `Travel agency in ${c.city}` })),
  ];
  return links;
}

function splitFrontmatter(raw, file) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error(`${file}: missing --- frontmatter ---`);
  return { data: YAML.parse(match[1]), body: match[2] };
}

export function serializePost(data, body) {
  return `---\n${YAML.stringify(data, { lineWidth: 0 })}---\n\n${body.trim()}\n`;
}

// Posts are dated in India time. The build runs on UTC servers, where for the
// first five and a half hours of an Indian day it is still yesterday — so
// comparing against UTC would hide a fresh article until the afternoon.
export const todayIST = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

/** Published posts, newest first. Posts dated in the future are held back. */
export function loadPosts({ includeFuture = false } = {}) {
  if (!fs.existsSync(postsDir)) return [];
  const today = todayIST();
  return fs
    .readdirSync(postsDir)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const { data, body } = splitFrontmatter(fs.readFileSync(path.join(postsDir, file), 'utf8'), file);
      for (const key of ['title', 'slug', 'description', 'category', 'date']) {
        if (!data[key]) throw new Error(`${file}: frontmatter is missing "${key}"`);
      }
      if (!CATEGORIES[data.category]) throw new Error(`${file}: unknown category "${data.category}"`);
      const date = String(data.date).slice(0, 10);
      const updated = String(data.updated || data.date).slice(0, 10);
      return { ...data, date, updated, body, file };
    })
    .filter((p) => includeFuture || p.date <= today)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title)));
}

export function wordCount(markdown) {
  return markdown.replace(/[#>*_`|[\]()-]/g, ' ').split(/\s+/).filter(Boolean).length;
}

export function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
    .replace(/-$/, '');
}
