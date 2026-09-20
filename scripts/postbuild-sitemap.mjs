import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const constantsPath = path.resolve(projectRoot, 'src/constants.ts');
const cityPagesPath = path.resolve(projectRoot, 'src/cityLandingPages.ts');
const publicSitemapPath = path.resolve(projectRoot, 'public/sitemap.xml');
const distSitemapPath = path.resolve(projectRoot, 'dist/sitemap.xml');
const packagePagesPath = path.resolve(projectRoot, 'src/packageLandingPages.ts');
const distDir = path.resolve(projectRoot, 'dist');

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
    const priority = route === '/'
      ? '1.0'
      : route.startsWith('/travel-agency-in-')
        ? '0.9'
        : route === '/privacy-policy'
          ? '0.3'
          : '0.8';
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

// The package config is TypeScript; bundle it in memory and import the result
// so the pages below are generated from the same data the app renders.
async function loadPackagePages() {
  const { outputFiles } = buildSync({
    entryPoints: [packagePagesPath],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
  });
  const source = Buffer.from(outputFiles[0].contents).toString('base64');
  const module = await import(`data:text/javascript;base64,${source}`);
  return module.packageLandingPages;
}

const escapeAttr = (value) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// WhatsApp and Facebook read link-preview tags from the raw HTML and never run
// the app, so every route would otherwise preview as the homepage. These pages
// are sent as links inside WhatsApp chats, where the preview card is most of
// the pitch — so each gets its own copy of index.html with its own tags.
// Vercel serves a real file before applying the SPA rewrite.
function writePackagePage(template, page) {
  const url = `${BASE_URL}${page.path}`;
  const title = escapeAttr(page.title);
  const description = escapeAttr(page.description);
  const image = escapeAttr(page.ogImage);

  const setContent = (html, attr, name, value) => {
    const pattern = new RegExp(`(<meta ${attr}="${name}" content=")[^"]*(")`);
    if (!pattern.test(html)) throw new Error(`index.html has no <meta ${attr}="${name}"> to rewrite`);
    return html.replace(pattern, `$1${value}$2`);
  };

  let html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`);

  html = setContent(html, 'name', 'title', title);
  html = setContent(html, 'name', 'description', description);
  html = setContent(html, 'name', 'keywords', escapeAttr(page.keywords));
  for (const [attr, prefix] of [['property', 'og'], ['name', 'twitter']]) {
    html = setContent(html, attr, `${prefix}:url`, url);
    html = setContent(html, attr, `${prefix}:title`, title);
    html = setContent(html, attr, `${prefix}:description`, description);
    html = setContent(html, attr, `${prefix}:image`, image);
    html = setContent(html, attr, `${prefix}:image:alt`, title);
  }

  const outDir = path.join(distDir, page.path);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
}

async function main() {
  const constantsText = fs.readFileSync(constantsPath, 'utf8');
  const cityPagesText = fs.readFileSync(cityPagesPath, 'utf8');

  const destinationSlugs = extractAllMatches(constantsText, /slug:\s*'([^']+)'/g);
  const cityPaths = extractAllMatches(cityPagesText, /path:\s*'([^']+)'/g);
  const packagePages = await loadPackagePages();

  const routes = [
    '/',
    '/offers',
    '/services',
    '/contact',
    '/destinations',
    '/privacy-policy',
    ...cityPaths,
    ...packagePages.map((page) => page.path),
    ...destinationSlugs.map((slug) => `/destinations/${slug}`),
  ];

  const xml = buildSitemapXml(routes);
  fs.writeFileSync(publicSitemapPath, xml, 'utf8');

  if (fs.existsSync(distDir)) {
    fs.writeFileSync(distSitemapPath, xml, 'utf8');

    const template = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');
    packagePages.forEach((page) => writePackagePage(template, page));
    console.log(`Link-preview pages written for ${packagePages.length} packages.`);
  }

  console.log(`Sitemap generated with ${new Set(routes).size} routes.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
