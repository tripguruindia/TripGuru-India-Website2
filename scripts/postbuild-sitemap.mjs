import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const constantsPath = path.resolve(projectRoot, 'src/constants.ts');
const cityPagesPath = path.resolve(projectRoot, 'src/cityLandingPages.ts');
const publicSitemapPath = path.resolve(projectRoot, 'public/sitemap.xml');
const distSitemapPath = path.resolve(projectRoot, 'dist/sitemap.xml');

const BASE_URL = 'https://www.tripguruindia.com';

function extractAllMatches(content, regex) {
  const matches = [];
  let found;
  while ((found = regex.exec(content)) !== null) {
    if (found[1]) matches.push(found[1]);
  }
  return matches;
}

function buildSitemapXml(routes) {
  const today = new Date().toISOString().slice(0, 10);
  const uniqueRoutes = [...new Set(routes)];
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];

  for (const route of uniqueRoutes) {
    const loc = route === '/' ? BASE_URL : `${BASE_URL}${route}`;
    const priority = route === '/' ? '1.0' : route.startsWith('/travel-agency-in-') ? '0.9' : '0.8';
    lines.push(
      '  <url>',
      `    <loc>${loc}</loc>`,
      `    <lastmod>${today}</lastmod>`,
      '    <changefreq>weekly</changefreq>',
      `    <priority>${priority}</priority>`,
      '  </url>'
    );
  }

  lines.push('</urlset>', '');
  return lines.join('\n');
}

function main() {
  const constantsText = fs.readFileSync(constantsPath, 'utf8');
  const cityPagesText = fs.readFileSync(cityPagesPath, 'utf8');

  const destinationSlugs = extractAllMatches(constantsText, /slug:\s*'([^']+)'/g);
  const cityPaths = extractAllMatches(cityPagesText, /path:\s*'([^']+)'/g);

  const routes = [
    '/',
    '/offers',
    '/services',
    '/contact',
    '/destinations',
    ...cityPaths,
    ...destinationSlugs.map((slug) => `/destinations/${slug}`),
  ];

  const xml = buildSitemapXml(routes);
  fs.writeFileSync(publicSitemapPath, xml, 'utf8');

  if (fs.existsSync(path.resolve(projectRoot, 'dist'))) {
    fs.writeFileSync(distSitemapPath, xml, 'utf8');
  }

  console.log(`Sitemap generated with ${new Set(routes).size} routes.`);
}

main();
